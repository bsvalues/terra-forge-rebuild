// TerraFusion OS — Data Quality Scoring Engine
// Per-parcel completeness, neighborhood aggregation, stale-data detection
// Agent Librarian: "My quality scores taste like crayons and IAAO compliance" 🖍️📎

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Scoring Weights ────────────────────────────────────────────
// Fields weighted by their importance to valuation defensibility
const FIELD_WEIGHTS: Record<string, number> = {
  assessed_value: 15,
  building_area: 12,
  land_area: 10,
  year_built: 10,
  bedrooms: 8,
  bathrooms: 8,
  coordinates: 12,
  property_class: 10,
  neighborhood_code: 15,
};

const TOTAL_WEIGHT = Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0);

// ── Types ──────────────────────────────────────────────────────

export interface ParcelScore {
  id: string;
  parcelNumber: string;
  address: string;
  city: string | null;
  neighborhoodCode: string | null;
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  missingFields: string[];
  isStale: boolean;
  daysSinceUpdate: number;
}

export interface NeighborhoodQuality {
  code: string;
  parcelCount: number;
  avgScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  completeParcels: number;
  staleParcels: number;
  worstFields: { field: string; missingPct: number }[];
}

export interface StaleAlert {
  id: string;
  parcelNumber: string;
  address: string;
  neighborhoodCode: string | null;
  daysSinceUpdate: number;
  severity: "warning" | "critical";
}

export interface QualityScoringData {
  totalParcels: number;
  avgScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  gradeDistribution: Record<"A" | "B" | "C" | "D" | "F", number>;
  neighborhoodQuality: NeighborhoodQuality[];
  staleAlerts: StaleAlert[];
  lowestScoreParcels: ParcelScore[];
  fieldCoverage: { field: string; label: string; weight: number; coveragePct: number }[];
}

// ── Helpers ────────────────────────────────────────────────────

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

const FIELD_LABELS: Record<string, string> = {
  assessed_value: "Assessed Value",
  building_area: "Building Area",
  land_area: "Land Area",
  year_built: "Year Built",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  coordinates: "Coordinates",
  property_class: "Property Class",
  neighborhood_code: "Neighborhood",
};

const STALE_WARN_DAYS = 90;
const STALE_CRITICAL_DAYS = 180;

// ── Hook ───────────────────────────────────────────────────────

export function useDataQualityScoring() {
  return useQuery({
    queryKey: ["data-quality-scoring"],
    queryFn: async (): Promise<QualityScoringData> => {
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, city, assessed_value, building_area, land_area, year_built, bedrooms, bathrooms, latitude, longitude, property_class, neighborhood_code, updated_at");

      if (error) throw error;
      if (!parcels || parcels.length === 0) {
        return {
          totalParcels: 0,
          avgScore: 0,
          overallGrade: "F",
          gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
          neighborhoodQuality: [],
          staleAlerts: [],
          lowestScoreParcels: [],
          fieldCoverage: [],
        };
      }

      const now = Date.now();
      const gradeDistribution: Record<"A" | "B" | "C" | "D" | "F", number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      const allScores: ParcelScore[] = [];
      const staleAlerts: StaleAlert[] = [];

      // Neighborhood accumulator
      const nbhdMap = new Map<string, {
        scores: number[];
        complete: number;
        stale: number;
        fieldMissing: Record<string, number>;
        total: number;
      }>();

      // Global field coverage counters
      const fieldHits: Record<string, number> = {};
      Object.keys(FIELD_WEIGHTS).forEach((f) => (fieldHits[f] = 0));

      parcels.forEach((p) => {
        // Compute per-parcel score
        let weightedScore = 0;
        const missing: string[] = [];

        const checks: [string, boolean][] = [
          ["assessed_value", p.assessed_value != null],
          ["building_area", p.building_area != null],
          ["land_area", p.land_area != null],
          ["year_built", p.year_built != null],
          ["bedrooms", p.bedrooms != null],
          ["bathrooms", p.bathrooms != null],
          ["coordinates", p.latitude != null && p.longitude != null],
          ["property_class", p.property_class != null],
          ["neighborhood_code", p.neighborhood_code != null],
        ];

        checks.forEach(([field, present]) => {
          if (present) {
            weightedScore += FIELD_WEIGHTS[field];
            fieldHits[field]++;
          } else {
            missing.push(field);
          }
        });

        const score = Math.round((weightedScore / TOTAL_WEIGHT) * 100);
        const grade = scoreToGrade(score);
        gradeDistribution[grade]++;

        // Staleness check
        const daysSinceUpdate = p.updated_at
          ? Math.floor((now - new Date(p.updated_at).getTime()) / 86400000)
          : 999;
        const isStale = daysSinceUpdate >= STALE_WARN_DAYS;

        const parcelScore: ParcelScore = {
          id: p.id,
          parcelNumber: p.parcel_number,
          address: p.address,
          city: p.city,
          neighborhoodCode: p.neighborhood_code,
          score,
          grade,
          missingFields: missing,
          isStale,
          daysSinceUpdate,
        };
        allScores.push(parcelScore);

        if (daysSinceUpdate >= STALE_WARN_DAYS) {
          staleAlerts.push({
            id: p.id,
            parcelNumber: p.parcel_number,
            address: p.address,
            neighborhoodCode: p.neighborhood_code,
            daysSinceUpdate,
            severity: daysSinceUpdate >= STALE_CRITICAL_DAYS ? "critical" : "warning",
          });
        }

        // Neighborhood aggregation
        const nbhd = p.neighborhood_code || "UNASSIGNED";
        if (!nbhdMap.has(nbhd)) {
          nbhdMap.set(nbhd, {
            scores: [],
            complete: 0,
            stale: 0,
            fieldMissing: Object.fromEntries(Object.keys(FIELD_WEIGHTS).map((f) => [f, 0])),
            total: 0,
          });
        }
        const nd = nbhdMap.get(nbhd)!;
        nd.scores.push(score);
        nd.total++;
        if (score === 100) nd.complete++;
        if (isStale) nd.stale++;
        missing.forEach((f) => (nd.fieldMissing[f] = (nd.fieldMissing[f] || 0) + 1));
      });

      const totalParcels = parcels.length;
      const avgScore = Math.round(allScores.reduce((s, p) => s + p.score, 0) / totalParcels);

      // Build neighborhood quality array
      const neighborhoodQuality: NeighborhoodQuality[] = Array.from(nbhdMap.entries())
        .map(([code, data]) => {
          const avg = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.total);
          const worstFields = Object.entries(data.fieldMissing)
            .map(([field, count]) => ({ field, missingPct: Math.round((count / data.total) * 100) }))
            .filter((f) => f.missingPct > 0)
            .sort((a, b) => b.missingPct - a.missingPct)
            .slice(0, 3);

          return {
            code,
            parcelCount: data.total,
            avgScore: avg,
            grade: scoreToGrade(avg),
            completeParcels: data.complete,
            staleParcels: data.stale,
            worstFields,
          };
        })
        .sort((a, b) => a.avgScore - b.avgScore);

      // Worst parcels
      const lowestScoreParcels = [...allScores]
        .sort((a, b) => a.score - b.score)
        .slice(0, 20);

      // Stale alerts sorted by severity
      staleAlerts.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

      // Field coverage
      const fieldCoverage = Object.entries(FIELD_WEIGHTS).map(([field, weight]) => ({
        field,
        label: FIELD_LABELS[field] || field,
        weight,
        coveragePct: totalParcels > 0 ? Math.round((fieldHits[field] / totalParcels) * 100) : 0,
      }));

      return {
        totalParcels,
        avgScore,
        overallGrade: scoreToGrade(avgScore),
        gradeDistribution,
        neighborhoodQuality,
        staleAlerts: staleAlerts.slice(0, 50),
        lowestScoreParcels,
        fieldCoverage,
      };
    },
    staleTime: 60_000,
  });
}

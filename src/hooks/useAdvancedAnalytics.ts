// TerraFusion OS — Advanced Analytics Hooks
// Phase 25: Trend sparklines, forecasting, outlier detection, neighborhood clustering

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── 25.1: Ratio Trend Sparkline Data ──────────────────────────────

export interface RatioTrendPoint {
  year: number;
  medianRatio: number;
  cod: number;
  prd: number;
  sampleSize: number;
}

export function useRatioTrendSpark(salesStart: string, salesEnd: string, yearsBack = 5) {
  return useQuery({
    queryKey: ["ratio-trend-spark", salesStart, salesEnd, yearsBack],
    queryFn: async (): Promise<RatioTrendPoint[]> => {
      const { data: yearData, error: yearError } = await supabase
        .from("assessments")
        .select("tax_year")
        .order("tax_year", { ascending: false });
      if (yearError) throw yearError;

      const years = [...new Set(yearData?.map((d) => d.tax_year) || [])]
        .sort((a, b) => b - a)
        .slice(0, yearsBack);

      if (years.length === 0) return [];

      const results = await Promise.all(
        years.map(async (year) => {
          const { data, error } = await (supabase.rpc as Function)("compute_ratio_statistics", {
            p_tax_year: year,
            p_sales_start_date: salesStart,
            p_sales_end_date: salesEnd,
            p_outlier_method: "iqr",
          });
          if (error) return null;
          const stats = Array.isArray(data) ? data[0] : data;
          if (!stats || stats.sample_size === 0) return null;
          return {
            year,
            medianRatio: stats.median_ratio ?? 1,
            cod: stats.cod ?? 0,
            prd: stats.prd ?? 1,
            sampleSize: stats.sample_size ?? 0,
          } as RatioTrendPoint;
        })
      );

      return results
        .filter((r): r is RatioTrendPoint => r !== null)
        .sort((a, b) => a.year - b.year);
    },
    staleTime: 5 * 60_000,
  });
}

// ── 25.2: Assessment Value Forecast ───────────────────────────────

export interface ForecastPoint {
  year: number;
  avgValue: number;
  count: number;
  isForecast: boolean;
  lower?: number;
  upper?: number;
}

export function useAssessmentForecast(forecastYears = 3) {
  return useQuery({
    queryKey: ["assessment-forecast", forecastYears],
    queryFn: async (): Promise<ForecastPoint[]> => {
      const { data, error } = await supabase
        .from("assessments")
        .select("tax_year, total_value")
        .order("tax_year")
        .limit(1000);
      if (error) throw error;

      // Aggregate by year
      const map = new Map<number, { sum: number; count: number }>();
      for (const a of data ?? []) {
        const entry = map.get(a.tax_year) ?? { sum: 0, count: 0 };
        entry.sum += a.total_value ?? 0;
        entry.count++;
        map.set(a.tax_year, entry);
      }

      const historical: ForecastPoint[] = Array.from(map.entries())
        .map(([year, v]) => ({
          year,
          avgValue: Math.round(v.sum / v.count),
          count: v.count,
          isForecast: false,
        }))
        .sort((a, b) => a.year - b.year);

      if (historical.length < 2) return historical;

      // Linear regression for forecasting
      const n = historical.length;
      const xs = historical.map((p) => p.year);
      const ys = historical.map((p) => p.avgValue);
      const xMean = xs.reduce((a, b) => a + b, 0) / n;
      const yMean = ys.reduce((a, b) => a + b, 0) / n;
      let ssXY = 0, ssXX = 0, ssResidual = 0;
      for (let i = 0; i < n; i++) {
        ssXY += (xs[i] - xMean) * (ys[i] - yMean);
        ssXX += (xs[i] - xMean) ** 2;
      }
      const slope = ssXX > 0 ? ssXY / ssXX : 0;
      const intercept = yMean - slope * xMean;

      // Calculate residual std error for confidence bands
      for (let i = 0; i < n; i++) {
        const pred = intercept + slope * xs[i];
        ssResidual += (ys[i] - pred) ** 2;
      }
      const stdError = Math.sqrt(ssResidual / Math.max(n - 2, 1));

      const lastYear = xs[xs.length - 1];
      const forecasted: ForecastPoint[] = [];
      for (let f = 1; f <= forecastYears; f++) {
        const fy = lastYear + f;
        const predicted = Math.round(intercept + slope * fy);
        const band = Math.round(stdError * 1.96 * Math.sqrt(1 + 1 / n + ((fy - xMean) ** 2) / ssXX));
        forecasted.push({
          year: fy,
          avgValue: predicted,
          count: 0,
          isForecast: true,
          lower: predicted - band,
          upper: predicted + band,
        });
      }

      return [...historical, ...forecasted];
    },
    staleTime: 5 * 60_000,
  });
}

// ── 25.3: Automated Outlier Detection ─────────────────────────────

export interface OutlierParcel {
  id: string;
  parcelNumber: string;
  address: string;
  assessedValue: number;
  ratio: number | null;
  zScore: number;
  method: "zscore" | "iqr";
  reason: string;
}

export function useOutlierDetection(taxYear: number, threshold = 2.5) {
  return useQuery({
    queryKey: ["outlier-detection", taxYear, threshold],
    queryFn: async (): Promise<{ outliers: OutlierParcel[]; stats: { mean: number; median: number; stdDev: number; q1: number; q3: number; iqr: number; totalParcels: number } }> => {
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value")
        .gt("assessed_value", 0)
        .limit(1000);
      if (error) throw error;

      const values = (parcels ?? []).map((p) => p.assessed_value).sort((a, b) => a - b);
      const n = values.length;
      if (n < 10) return { outliers: [], stats: { mean: 0, median: 0, stdDev: 0, q1: 0, q3: 0, iqr: 0, totalParcels: n } };

      const mean = values.reduce((a, b) => a + b, 0) / n;
      const median = values[Math.floor(n / 2)];
      const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
      const stdDev = Math.sqrt(variance);
      const q1 = values[Math.floor(n * 0.25)];
      const q3 = values[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const iqrLower = q1 - 1.5 * iqr;
      const iqrUpper = q3 + 1.5 * iqr;

      const outliers: OutlierParcel[] = [];

      for (const p of parcels ?? []) {
        const z = stdDev > 0 ? (p.assessed_value - mean) / stdDev : 0;
        const isZOutlier = Math.abs(z) > threshold;
        const isIqrOutlier = p.assessed_value < iqrLower || p.assessed_value > iqrUpper;

        if (isZOutlier || isIqrOutlier) {
          const reasons: string[] = [];
          if (isZOutlier) reasons.push(`Z-score: ${z.toFixed(2)}`);
          if (isIqrOutlier) reasons.push(p.assessed_value < iqrLower ? "Below IQR" : "Above IQR");
          outliers.push({
            id: p.id,
            parcelNumber: p.parcel_number,
            address: p.address,
            assessedValue: p.assessed_value,
            ratio: null,
            zScore: z,
            method: isZOutlier ? "zscore" : "iqr",
            reason: reasons.join(", "),
          });
        }
      }

      outliers.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

      return {
        outliers: outliers.slice(0, 50),
        stats: { mean, median, stdDev, q1, q3, iqr, totalParcels: n },
      };
    },
    staleTime: 5 * 60_000,
  });
}

// ── 25.4: Neighborhood Clustering ─────────────────────────────────

export interface ClusterResult {
  clusters: NeighborhoodCluster[];
  centroids: ClusterCentroid[];
}

export interface NeighborhoodCluster {
  code: string;
  clusterId: number;
  clusterLabel: string;
  parcelCount: number;
  avgValue: number;
  avgSqft: number;
  avgAge: number;
  distance: number; // distance to centroid
}

export interface ClusterCentroid {
  id: number;
  label: string;
  avgValue: number;
  avgSqft: number;
  avgAge: number;
  count: number;
}

const CLUSTER_LABELS = ["Urban Core", "Suburban", "Rural/Large Lot", "Premium"];
const CLUSTER_COUNT = 3;

export function useNeighborhoodClustering() {
  return useQuery({
    queryKey: ["neighborhood-clustering"],
    queryFn: async (): Promise<ClusterResult> => {
      const { data, error } = await supabase
        .from("parcels")
        .select("neighborhood_code, assessed_value, building_area, year_built")
        .not("neighborhood_code", "is", null)
        .gt("assessed_value", 0)
        .limit(1000);
      if (error) throw error;

      // Aggregate by neighborhood
      const nbhdMap = new Map<string, { values: number[]; sqfts: number[]; ages: number[] }>();
      const currentYear = new Date().getFullYear();
      for (const p of data ?? []) {
        const code = p.neighborhood_code!;
        const entry = nbhdMap.get(code) ?? { values: [], sqfts: [], ages: [] };
        entry.values.push(p.assessed_value);
        if (p.building_area) entry.sqfts.push(p.building_area);
        if (p.year_built) entry.ages.push(currentYear - p.year_built);
        nbhdMap.set(code, entry);
      }

      // Convert to feature vectors [avgValue, avgSqft, avgAge]
      const neighborhoods: { code: string; count: number; features: number[] }[] = [];
      for (const [code, agg] of nbhdMap.entries()) {
        if (agg.values.length < 3) continue;
        const avgVal = agg.values.reduce((a, b) => a + b, 0) / agg.values.length;
        const avgSqft = agg.sqfts.length > 0 ? agg.sqfts.reduce((a, b) => a + b, 0) / agg.sqfts.length : 0;
        const avgAge = agg.ages.length > 0 ? agg.ages.reduce((a, b) => a + b, 0) / agg.ages.length : 0;
        neighborhoods.push({ code, count: agg.values.length, features: [avgVal, avgSqft, avgAge] });
      }

      if (neighborhoods.length < CLUSTER_COUNT) {
        return { clusters: [], centroids: [] };
      }

      // Normalize features
      const mins = [Infinity, Infinity, Infinity];
      const maxs = [-Infinity, -Infinity, -Infinity];
      for (const n of neighborhoods) {
        for (let i = 0; i < 3; i++) {
          mins[i] = Math.min(mins[i], n.features[i]);
          maxs[i] = Math.max(maxs[i], n.features[i]);
        }
      }
      const ranges = mins.map((m, i) => maxs[i] - m || 1);
      const normalized = neighborhoods.map((n) => ({
        ...n,
        norm: n.features.map((f, i) => (f - mins[i]) / ranges[i]),
      }));

      // K-means (simple implementation, 20 iterations)
      const k = Math.min(CLUSTER_COUNT, neighborhoods.length);
      let centroids = normalized.slice(0, k).map((n) => [...n.norm]);
      let assignments = new Array(normalized.length).fill(0);

      for (let iter = 0; iter < 20; iter++) {
        // Assign
        for (let i = 0; i < normalized.length; i++) {
          let minDist = Infinity;
          for (let c = 0; c < k; c++) {
            const dist = normalized[i].norm.reduce((sum, v, d) => sum + (v - centroids[c][d]) ** 2, 0);
            if (dist < minDist) {
              minDist = dist;
              assignments[i] = c;
            }
          }
        }
        // Update centroids
        const newCentroids = Array.from({ length: k }, () => [0, 0, 0]);
        const counts = new Array(k).fill(0);
        for (let i = 0; i < normalized.length; i++) {
          const c = assignments[i];
          counts[c]++;
          for (let d = 0; d < 3; d++) newCentroids[c][d] += normalized[i].norm[d];
        }
        for (let c = 0; c < k; c++) {
          if (counts[c] > 0) {
            for (let d = 0; d < 3; d++) newCentroids[c][d] /= counts[c];
          }
        }
        centroids = newCentroids;
      }

      // Denormalize centroids
      const centroidResults: ClusterCentroid[] = centroids.map((c, i) => {
        const count = assignments.filter((a: number) => a === i).length;
        return {
          id: i,
          label: CLUSTER_LABELS[i] || `Cluster ${i + 1}`,
          avgValue: Math.round(c[0] * ranges[0] + mins[0]),
          avgSqft: Math.round(c[1] * ranges[1] + mins[1]),
          avgAge: Math.round(c[2] * ranges[2] + mins[2]),
          count,
        };
      });

      // Build cluster results
      const clusters: NeighborhoodCluster[] = normalized.map((n, i) => {
        const c = assignments[i];
        const dist = Math.sqrt(n.norm.reduce((sum, v, d) => sum + (v - centroids[c][d]) ** 2, 0));
        return {
          code: n.code,
          clusterId: c,
          clusterLabel: centroidResults[c].label,
          parcelCount: n.count,
          avgValue: Math.round(n.features[0]),
          avgSqft: Math.round(n.features[1]),
          avgAge: Math.round(n.features[2]),
          distance: parseFloat(dist.toFixed(3)),
        };
      });

      clusters.sort((a, b) => a.clusterId - b.clusterId || a.distance - b.distance);

      return { clusters, centroids: centroidResults };
    },
    staleTime: 5 * 60_000,
  });
}

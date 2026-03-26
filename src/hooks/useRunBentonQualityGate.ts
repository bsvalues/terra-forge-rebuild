// TerraFusion OS — Benton Quality Gate & Join-Rate Audit (Phase 83.8)
// ═══════════════════════════════════════════════════════════
// Post-seed validation that answers:
//   - What % of parcels have a parcel_geom / coordinates?
//   - What % of parcels have a neighborhood_code (hood_cd)?
//   - How many GIS parcel features are present vs parcels?
//   - How many boundary layers exist?
//   - Does a GIS feature <-> parcel join opportunity exist?
//   - Is the Benton county study period active?
//   - Are any major data source gaps present?
//
// Together these produce a pass/fail quality report that can
// gate Phase 83.8 "Benton is seed-complete" assertion.
// ═══════════════════════════════════════════════════════════

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ────────────────────────────────────────────────────────────
// Thresholds (adjust per county SLA)
// ────────────────────────────────────────────────────────────

const COORD_COVERAGE_THRESHOLD_PCT = 80; // ≥80% parcels must have coordinates
const HOOD_CD_COVERAGE_THRESHOLD_PCT = 70; // ≥70% parcels must have neighborhood_code
const GIS_PARCEL_COVERAGE_THRESHOLD_PCT = 80; // ≥80% of parcels must have a matching GIS feature

// ────────────────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────────────────

export type QualityGateStatus = "pass" | "warn" | "fail" | "skip";

export interface QualityMetric {
  id: string;
  title: string;
  status: QualityGateStatus;
  /** Numerator count */
  count: number | null;
  /** Denominator count (if applicable) */
  total: number | null;
  /** Derived coverage percentage (0–100) */
  coveragePct: number | null;
  /** Threshold percentage that must be met (for percentage metrics) */
  thresholdPct?: number;
  detail: string;
  nextAction?: string;
}

export interface BentonQualityReport {
  overallStatus: QualityGateStatus;
  executedAt: string;
  countyId: string | null;
  countyName: string | null;
  metrics: QualityMetric[];
  passCount: number;
  warnCount: number;
  failCount: number;
  skipCount: number;
  /** True when the report meets all hard gates for seed-complete assertion */
  seedComplete: boolean;
}

// ────────────────────────────────────────────────────────────
// gis_layers helper — avoids Supabase TS type-instantiation depth limit
// ────────────────────────────────────────────────────────────
type GisLayerRow = { id: string; name: string; feature_count: number | null };
const gisLayersQuery = (cid: string, layerType: string): Promise<{ data: GisLayerRow[] | null; error: unknown }> => {
   
  const db: any = supabase;
  return db.from("gis_layers").select("id, name, feature_count").eq("county_id", cid).eq("layer_type", layerType) as Promise<{ data: GisLayerRow[] | null; error: unknown }>;
};

// ────────────────────────────────────────────────────────────
// Core runner
// ────────────────────────────────────────────────────────────

async function runBentonQualityGate(): Promise<BentonQualityReport> {
  const executedAt = new Date().toISOString();

  // Resolve Benton county
  const { data: bentonCounty, error: countyError } = await supabase
    .from("counties")
    .select("id, name")
    .eq("fips_code", "53005")
    .maybeSingle();
  if (countyError) throw new Error(countyError.message);

  const countyId = bentonCounty?.id ?? null;
  const countyName = bentonCounty?.name ?? null;

  const metrics: QualityMetric[] = [];

  if (!countyId) {
    metrics.push({
      id: "county",
      title: "Benton County Tenant",
      status: "fail",
      count: 0,
      total: null,
      coveragePct: null,
      detail: "Benton county does not exist. Run bootstrap initialization first.",
      nextAction: "Create Benton County tenant from the bootstrap panel.",
    });
    return buildReport(executedAt, countyId, countyName, metrics);
  }

  // Fire all DB queries in parallel
  const [
    parcelCountRes,
    coordCountRes,
    hoodCountRes,
    gisParcelLayerRes,
    gisBoundaryLayerRes,
    gisFeatureCountRes,
    studyPeriodRes,
    dataSourceRes,
  ] = await Promise.all([
    // Total Benton parcels
    supabase
      .from("parcels")
      .select("id", { count: "exact", head: true })
      .eq("county_id", countyId),

    // Parcels with coordinates populated
    supabase
      .from("parcels")
      .select("id", { count: "exact", head: true })
      .eq("county_id", countyId)
      .not("latitude", "is", null),

    // Parcels with neighborhood_code (hood_cd proxy)
    supabase
      .from("parcels")
      .select("id", { count: "exact", head: true })
      .eq("county_id", countyId)
      .not("neighborhood_code", "is", null),

    // GIS parcel layers for Benton
    gisLayersQuery(countyId, "parcel"),

    // GIS boundary layers for Benton
    gisLayersQuery(countyId, "boundary"),

    // GIS features linked to a parcel_id (join opportunity)
    supabase
      .from("gis_features")
      .select("id", { count: "exact", head: true })
      .eq("county_id", countyId)
      .not("parcel_id", "is", null),

    // Active study period
    supabase
      .from("study_periods")
      .select("id, name, status")
      .eq("county_id", countyId)
      .eq("status", "active")
      .maybeSingle(),

    // Data sources registered for Benton
    supabase
      .from("data_sources")
      .select("id, name, source_type")
      .eq("county_id", countyId),
  ]);

  const totalParcels = parcelCountRes.count ?? 0;
  const coordParcels = coordCountRes.count ?? 0;
  const hoodParcels = hoodCountRes.count ?? 0;
  const parcelLayers = (gisParcelLayerRes.data ?? []) as Array<{ id: string; name: string; feature_count: number | null }>;
  const boundaryLayers = (gisBoundaryLayerRes.data ?? []) as Array<{ id: string; name: string; feature_count: number | null }>;
  const joinableFeatures = gisFeatureCountRes.count ?? 0;
  const activeStudyPeriod = studyPeriodRes.data ?? null;
  const dataSources = (dataSourceRes.data ?? []) as Array<{ id: string; name: string; source_type: string }>;

  // Total GIS features in parcel layers (sum of feature_count)
  const totalGISParcelFeatures = parcelLayers.reduce(
    (sum, l) => sum + (l.feature_count ?? 0),
    0
  );

  // ── Metric 1: Parcel count ──────────────────────────────
  metrics.push({
    id: "parcel-count",
    title: "Parcel Spine",
    status: totalParcels > 0 ? "pass" : "fail",
    count: totalParcels,
    total: null,
    coveragePct: null,
    detail:
      totalParcels > 0
        ? `${totalParcels.toLocaleString()} Benton parcels loaded.`
        : "No parcels found. PACS property core and valuation seed has not run.",
    nextAction: totalParcels > 0 ? undefined : "Run Benton PACS seed (property_core product) from the bootstrap panel.",
  });

  // ── Metric 2: Coordinate coverage ─────────────────────
  const coordPct = totalParcels > 0
    ? Math.round((coordParcels / totalParcels) * 100)
    : null;
  const coordStatus: QualityGateStatus =
    coordPct === null
      ? "skip"
      : coordPct >= COORD_COVERAGE_THRESHOLD_PCT
      ? "pass"
      : coordPct >= 50
      ? "warn"
      : "fail";

  metrics.push({
    id: "coord-coverage",
    title: "Coordinate Coverage",
    status: coordStatus,
    count: coordParcels,
    total: totalParcels,
    coveragePct: coordPct,
    thresholdPct: COORD_COVERAGE_THRESHOLD_PCT,
    detail:
      coordPct !== null
        ? `${coordParcels.toLocaleString()} / ${totalParcels.toLocaleString()} parcels have lat/lng (${coordPct}%).`
        : "Cannot assess — no parcels loaded.",
    nextAction:
      coordStatus !== "pass" && coordStatus !== "skip"
        ? "Enrich parcel coordinates from the situs.csv export or ArcGIS centroid sync."
        : undefined,
  });

  // ── Metric 3: Neighborhood code (hood_cd) coverage ────
  const hoodPct = totalParcels > 0
    ? Math.round((hoodParcels / totalParcels) * 100)
    : null;
  const hoodStatus: QualityGateStatus =
    hoodPct === null
      ? "skip"
      : hoodPct >= HOOD_CD_COVERAGE_THRESHOLD_PCT
      ? "pass"
      : hoodPct >= 40
      ? "warn"
      : "fail";

  metrics.push({
    id: "hood-cd-coverage",
    title: "Neighborhood Code (hood_cd)",
    status: hoodStatus,
    count: hoodParcels,
    total: totalParcels,
    coveragePct: hoodPct,
    thresholdPct: HOOD_CD_COVERAGE_THRESHOLD_PCT,
    detail:
      hoodPct !== null
        ? `${hoodParcels.toLocaleString()} / ${totalParcels.toLocaleString()} parcels have a neighborhood code (${hoodPct}%).`
        : "Cannot assess — no parcels loaded.",
    nextAction:
      hoodStatus !== "pass" && hoodStatus !== "skip"
        ? "Join property_val.csv or run the neighborhood_dim PACS product to populate hood_cd."
        : undefined,
  });

  // ── Metric 4: GIS parcel layer presence ───────────────
  const gisParcelStatus: QualityGateStatus =
    parcelLayers.length > 0 ? "pass" : "fail";

  metrics.push({
    id: "gis-parcel-layer",
    title: "GIS Parcel Layer",
    status: gisParcelStatus,
    count: parcelLayers.length,
    total: null,
    coveragePct: null,
    detail:
      parcelLayers.length > 0
        ? `${parcelLayers.length} parcel layer(s): ${parcelLayers.map((l) => l.name).join(", ")} — ${totalGISParcelFeatures.toLocaleString()} total features.`
        : "No parcel GIS layer loaded. Seed the Benton FGDB Parcel layer from GIS Ops.",
    nextAction:
      gisParcelStatus !== "pass"
        ? "Run Seed GIS from the bootstrap panel with featureServerUrl or use scripts/seed_benton_gis.py."
        : undefined,
  });

  // ── Metric 5: GIS boundary layers ─────────────────────
  const gisBoundaryStatus: QualityGateStatus =
    boundaryLayers.length >= 3
      ? "pass"
      : boundaryLayers.length > 0
      ? "warn"
      : "fail";

  metrics.push({
    id: "gis-boundary-layers",
    title: "GIS Boundary Layers",
    status: gisBoundaryStatus,
    count: boundaryLayers.length,
    total: 3, // jurisdictions + taxing-districts + neighborhoods
    coveragePct: Math.round((boundaryLayers.length / 3) * 100),
    thresholdPct: 100,
    detail:
      boundaryLayers.length > 0
        ? `${boundaryLayers.length}/3 boundary layers loaded: ${boundaryLayers.map((l) => l.name).join(", ")}.`
        : "No boundary layers loaded (jurisdictions, taxing districts, neighborhoods).",
    nextAction:
      gisBoundaryStatus !== "pass"
        ? "Seed all four Benton GIS layers (parcels → jurisdictions → taxing-districts → neighborhoods)."
        : undefined,
  });

  // ── Metric 6: GIS ↔ Parcel join rate ─────────────────
  const joinPct =
    totalParcels > 0 && totalGISParcelFeatures > 0
      ? Math.round((joinableFeatures / totalParcels) * 100)
      : null;
  const joinStatus: QualityGateStatus =
    joinPct === null
      ? "skip"
      : joinPct >= GIS_PARCEL_COVERAGE_THRESHOLD_PCT
      ? "pass"
      : joinPct >= 50
      ? "warn"
      : "fail";

  metrics.push({
    id: "gis-parcel-join",
    title: "GIS ↔ Parcel Join Rate",
    status: joinStatus,
    count: joinableFeatures,
    total: totalParcels,
    coveragePct: joinPct,
    thresholdPct: GIS_PARCEL_COVERAGE_THRESHOLD_PCT,
    detail:
      joinPct !== null
        ? `${joinableFeatures.toLocaleString()} GIS features can join to parcels via parcel_id (${joinPct}% of ${totalParcels.toLocaleString()} parcels).`
        : "Join rate unavailable — parcels or GIS parcel features are missing.",
    nextAction:
      joinStatus !== "pass" && joinStatus !== "skip"
        ? "The parcel_id field must be populated during GIS ingest. Re-seed with the correct parcelIdField (geo_id or prop_id)."
        : undefined,
  });

  // ── Metric 7: Active study period ─────────────────────
  metrics.push({
    id: "study-period",
    title: "Active Study Period",
    status: activeStudyPeriod ? "pass" : "warn",
    count: activeStudyPeriod ? 1 : 0,
    total: null,
    coveragePct: null,
    detail: activeStudyPeriod
      ? `Active: ${activeStudyPeriod.name}`
      : "No active study period — quality modeling views will be empty.",
    nextAction: activeStudyPeriod
      ? undefined
      : "Create or activate a Benton study period from the bootstrap panel.",
  });

  // ── Metric 8: Data source registry ────────────────────
  const hasPACSSource = dataSources.some((s) => s.source_type === "legacy_cama");
  metrics.push({
    id: "data-sources",
    title: "Source Registry",
    status: dataSources.length >= 4 && hasPACSSource ? "pass" : dataSources.length > 0 ? "warn" : "fail",
    count: dataSources.length,
    total: 4,
    coveragePct: Math.round((Math.min(dataSources.length, 4) / 4) * 100),
    thresholdPct: 100,
    detail: `${dataSources.length}/4 Benton operational sources registered. PACS lane: ${hasPACSSource ? "present" : "MISSING"}.`,
    nextAction:
      !hasPACSSource || dataSources.length < 4
        ? "Re-run bootstrap initialization to register all Benton source registry entries."
        : undefined,
  });

  return buildReport(executedAt, countyId, countyName, metrics);
}

function buildReport(
  executedAt: string,
  countyId: string | null,
  countyName: string | null,
  metrics: QualityMetric[]
): BentonQualityReport {
  const passCount = metrics.filter((m) => m.status === "pass").length;
  const warnCount = metrics.filter((m) => m.status === "warn").length;
  const failCount = metrics.filter((m) => m.status === "fail").length;
  const skipCount = metrics.filter((m) => m.status === "skip").length;

  const overallStatus: QualityGateStatus =
    failCount > 0 ? "fail" : warnCount > 0 ? "warn" : skipCount === metrics.length ? "skip" : "pass";

  // Hard gates: parcel spine + GIS parcel layer + active study period must all pass
  const hardGateIds = ["parcel-count", "gis-parcel-layer", "study-period"];
  const seedComplete =
    metrics
      .filter((m) => hardGateIds.includes(m.id))
      .every((m) => m.status === "pass") && failCount === 0;

  return {
    overallStatus,
    executedAt,
    countyId,
    countyName,
    metrics,
    passCount,
    warnCount,
    failCount,
    skipCount,
    seedComplete,
  };
}

// ────────────────────────────────────────────────────────────
// React hook
// ────────────────────────────────────────────────────────────

/**
 * Hook: run the Benton quality gate and join-rate audit.
 *
 * Use this after seeding PACS and GIS layers to evaluate whether
 * Benton meets all required coverage thresholds for Phase 83.8.
 */
export function useRunBentonQualityGate() {
  return useMutation({
    mutationFn: runBentonQualityGate,
    onSuccess: (report) => {
      const { overallStatus, passCount, warnCount, failCount, seedComplete } = report;

      if (overallStatus === "pass") {
        toast.success(
          seedComplete
            ? `Benton quality gate PASS · ${passCount} metrics passed · seed-complete ✓`
            : `Benton quality gate passed (${passCount} pass, ${warnCount} warn)`
        );
      } else if (overallStatus === "warn") {
        toast.warning(
          `Benton quality gate: ${passCount} pass, ${warnCount} warn, ${failCount} fail`,
          {
            description: seedComplete
              ? "Hard gates met — soft thresholds below target."
              : "One or more hard gates need attention before asserting seed-complete.",
          }
        );
      } else {
        toast.error(`Benton quality gate FAIL · ${failCount} metric(s) failed`, {
          description: "Resolve all failures before asserting seed-complete.",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Benton quality gate runner failed", { description: error.message });
    },
  });
}

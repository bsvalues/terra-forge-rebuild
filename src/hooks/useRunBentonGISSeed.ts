// TerraFusion OS — Benton GIS Layer Seed Orchestrator (React hook)
// ═══════════════════════════════════════════════════════════
// Coordinates seeding all four Benton polygon datasets in the
// required order:
//   1. parcel-layer       → arcgis-polygon-ingest (benton-parcels)
//   2. jurisdictions      → arcgis-polygon-ingest (benton-jurisdictions)
//   3. taxing-districts   → arcgis-polygon-ingest (benton-taxing-districts)
//   4. neighborhoods      → arcgis-polygon-ingest (benton-neighborhoods)
//
// Two ingest paths are supported:
//   A. featureServerUrl: live ArcGIS REST endpoint (production)
//   B. uploadedFileUrl: GeoJSON pre-uploaded to Supabase Storage
//      "gis-files" bucket (dev seeding via seed_benton_gis.py)
//
// The hook also exposes a live-job monitor (useQuery) that polls
// gis_ingest_jobs for Benton jobs created in the current session.
// ═══════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BENTON_GIS_SOURCE_MAP, type BentonGISDatasetId } from "@/config/bentonGISSources";
import { invalidateBentonBootstrap } from "@/lib/queryInvalidation";

// ────────────────────────────────────────────────────────────
// Seed order (dependency-safe: parcel geometry first)
// ────────────────────────────────────────────────────────────

const GIS_SEED_ORDER: BentonGISDatasetId[] = [
  "parcel-layer",
  "jurisdictions",
  "taxing-districts",
  "neighborhoods",
];

// ────────────────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────────────────

/** Per-dataset seed config: provide one of the two URL types */
export interface BentonGISDatasetSeedConfig {
  datasetId: BentonGISDatasetId;
  /** Live ArcGIS FeatureServer URL (e.g. .../FeatureServer/0) */
  featureServerUrl?: string;
  /** Filename in the Supabase "gis-files" Storage bucket */
  uploadedFileName?: string;
  /** ArcGIS parcel-id field override (default: "Parcel_ID") */
  parcelIdField?: string;
}

export interface BentonGISSeedOptions {
  /** Per-dataset configuration. Datasets without a URL are skipped. */
  datasets?: BentonGISDatasetSeedConfig[];
  /** Which dataset IDs to include; all four if omitted */
  datasetIds?: BentonGISDatasetId[];
}

export interface BentonGISDatasetSeedResult {
  datasetId: BentonGISDatasetId;
  label: string;
  status: "success" | "skipped" | "failed" | "no-source";
  jobId?: string;
  featuresLoaded?: number;
  layerId?: string;
  error?: string;
  durationMs: number;
}

export interface BentonGISSeedResult {
  datasets: BentonGISDatasetSeedResult[];
  datasetsSeeded: number;
  datasetsFailed: number;
  datasetsSkipped: number;
  totalFeatures: number;
  durationMs: number;
}

// ────────────────────────────────────────────────────────────
// Core runner
// ────────────────────────────────────────────────────────────

async function runBentonGISSeed(options: BentonGISSeedOptions = {}): Promise<BentonGISSeedResult> {
  const start = Date.now();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("You must be signed in to seed Benton GIS layers.");

  // Resolve county ID
  const { data: bentonCounty, error: countyError } = await supabase
    .from("counties")
    .select("id")
    .eq("fips_code", "53005")
    .maybeSingle();
  if (countyError) throw new Error(countyError.message);
  if (!bentonCounty?.id) throw new Error("Benton county does not exist. Run bootstrap initialization first.");

  const datasetIds = options.datasetIds ?? GIS_SEED_ORDER;
  const configMap = new Map<BentonGISDatasetId, BentonGISDatasetSeedConfig>(
    (options.datasets ?? []).map((d) => [d.datasetId, d])
  );

  const results: BentonGISDatasetSeedResult[] = [];
  let totalFeatures = 0;

  for (const id of datasetIds) {
    const source = BENTON_GIS_SOURCE_MAP.find((s) => s.id === id);
    if (!source) continue;

    const config = configMap.get(id);
    const dsStart = Date.now();

    // We need either a featureServerUrl or an uploadedFileName
    const featureServerUrl = config?.featureServerUrl;
    const uploadedFileName = config?.uploadedFileName;

    if (!featureServerUrl && !uploadedFileName) {
      results.push({
        datasetId: id,
        label: source.label,
        status: "no-source",
        error: "No featureServerUrl or uploadedFileName provided for this dataset.",
        durationMs: Date.now() - dsStart,
      });
      continue;
    }

    try {
      if (featureServerUrl) {
        // Path A: live ArcGIS FeatureServer
        const { data, error } = await supabase.functions.invoke("arcgis-polygon-ingest", {
          body: {
            action: "start",
            featureServerUrl,
            dataset: source.ingestDatasetId ?? id,
            parcelIdField: config?.parcelIdField ?? "Parcel_ID",
          },
        });
        if (error) throw new Error(error.message);
        if (data?.success === false) throw new Error(data.error ?? "Ingest returned failure");

        const featuresLoaded: number = data?.totalFeaturesLoaded ?? data?.features_loaded ?? 0;
        totalFeatures += featuresLoaded;
        results.push({
          datasetId: id,
          label: source.label,
          status: "success",
          jobId: data?.jobId,
          layerId: data?.layerId,
          featuresLoaded,
          durationMs: Date.now() - dsStart,
        });
      } else if (uploadedFileName) {
        // Path B: pre-uploaded GeoJSON in Storage "gis-files"
        const { data, error } = await supabase.functions.invoke("gis-parse", {
          body: {
            fileName: uploadedFileName,
            layerName: source.label,
          },
        });
        if (error) throw new Error(error.message);

        const featuresLoaded: number = data?.features_stored ?? data?.featureCount ?? 0;
        totalFeatures += featuresLoaded;
        results.push({
          datasetId: id,
          label: source.label,
          status: "success",
          featuresLoaded,
          durationMs: Date.now() - dsStart,
        });
      }
    } catch (err) {
      results.push({
        datasetId: id,
        label: source.label,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - dsStart,
      });
    }
  }

  const datasetsSeeded = results.filter((r) => r.status === "success").length;
  const datasetsFailed = results.filter((r) => r.status === "failed").length;
  const datasetsSkipped = results.filter(
    (r) => r.status === "skipped" || r.status === "no-source"
  ).length;

  return {
    datasets: results,
    datasetsSeeded,
    datasetsFailed,
    datasetsSkipped,
    totalFeatures,
    durationMs: Date.now() - start,
  };
}

// ────────────────────────────────────────────────────────────
// React hooks
// ────────────────────────────────────────────────────────────

/**
 * Hook: seed Benton GIS polygon layers in dependency order.
 *
 * Provide `datasets` array with featureServerUrl (live ArcGIS)
 * or uploadedFileName (pre-uploaded GeoJSON from seed_benton_gis.py)
 * for each dataset you want to seed. Datasets without a source
 * config are reported as "no-source" and do not raise errors.
 */
export function useRunBentonGISSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: BentonGISSeedOptions) => runBentonGISSeed(options ?? {}),

    onSuccess: (result) => {
      invalidateBentonBootstrap(queryClient);
      queryClient.invalidateQueries({ queryKey: ["benton-gis-ingest-jobs"] });

      const { datasetsSeeded, datasetsFailed, datasetsSkipped, totalFeatures } = result;

      if (datasetsFailed === 0 && datasetsSeeded > 0) {
        toast.success(
          `Benton GIS seed complete — ${datasetsSeeded} datasets, ${totalFeatures} features`,
          {
            description:
              datasetsSkipped > 0
                ? `${datasetsSkipped} dataset(s) skipped — no source URL provided.`
                : undefined,
          }
        );
      } else if (datasetsSeeded === 0 && datasetsFailed === 0) {
        toast.info(
          "Benton GIS seed: no datasets were seeded",
          {
            description:
              "Provide featureServerUrl or uploadedFileName for each dataset to seed. " +
              "Use scripts/seed_benton_gis.py to upload FGDB layers to Supabase Storage.",
          }
        );
      } else {
        toast.warning(
          `Benton GIS seed finished with ${datasetsFailed} failure(s)`,
          {
            description: `${datasetsSeeded} seeded · ${datasetsFailed} failed · ${datasetsSkipped} skipped`,
          }
        );
      }
    },

    onError: (error: Error) => {
      toast.error("Benton GIS seed runner failed", { description: error.message });
    },
  });
}

/**
 * Hook: poll recent Benton GIS ingest jobs from gis_ingest_jobs.
 *
 * Refreshes every 10 s while any job is in "running" state.
 * Used by BentonBootstrapPanel to show live job progress.
 */
export function useBentonGISIngestJobs(enabled = true) {
  return useQuery({
    queryKey: ["benton-gis-ingest-jobs"],
    queryFn: async () => {
      const { data: bentonCounty } = await supabase
        .from("counties")
        .select("id")
        .eq("fips_code", "53005")
        .maybeSingle();

      if (!bentonCounty?.id) return [];

      const { data, error } = await supabase
        .from("gis_ingest_jobs")
        .select("id, dataset, status, total_upserted, total_fetched, created_at, started_at, completed_at, last_error")
        .eq("county_id", bentonCounty.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled,
    refetchInterval: (query) => {
      const jobs = query.state.data ?? [];
      const hasRunning = (jobs as Array<{ status: string }>).some((j) => j.status === "running");
      return hasRunning ? 10_000 : false;
    },
    staleTime: 5_000,
  });
}

/**
 * The four Benton GIS dataset IDs in canonical seed order.
 */
export const BENTON_GIS_SEED_DATASET_IDS: BentonGISDatasetId[] = [...GIS_SEED_ORDER];

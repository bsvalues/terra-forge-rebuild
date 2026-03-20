// TerraFusion OS — Salt Lake County Ingestion Pipeline Hook
// Tracks the 4-source acquisition plan, pipeline stages, and mart readiness.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Source Definitions ─────────────────────────────────────────────
export type SLCOSourceId = "ugrc_sgid" | "slco_open_gis" | "assessor_cama" | "recorder_services";

export type SourceStatus = "not_started" | "fetching" | "ingested" | "stale" | "error";
export type PipelineStage = "raw_ingest" | "standardize" | "identity_resolve" | "spatial_join" | "commercial_enrich" | "recorder_enrich" | "publish_marts";
export type StageStatus = "pending" | "running" | "complete" | "failed";
export type MartId = "workbench_summary" | "forge_cost_context" | "atlas_context" | "dossier_index";

export interface SLCOSource {
  id: SLCOSourceId;
  label: string;
  description: string;
  priority: number;
  transport: string;
  cadence: string;
  status: SourceStatus;
  recordCount: number;
  lastFetchedAt: string | null;
  rawTable: string;
  confidence: "high" | "medium" | "low";
  fetchPolicy: string;
}

export interface PipelineStageRow {
  id: PipelineStage;
  label: string;
  description: string;
  status: StageStatus;
  rowsProcessed: number;
  lastRunAt: string | null;
}

export interface MartStatus {
  id: MartId;
  label: string;
  suite: string;
  rowCount: number;
  lastPublished: string | null;
  ready: boolean;
}

export interface SLCOPipelineState {
  sources: SLCOSource[];
  stages: PipelineStageRow[];
  marts: MartStatus[];
  overallProgress: number; // 0-100
  totalRawRecords: number;
  totalPublishedRecords: number;
}

// ── Static Source Registry ─────────────────────────────────────────
const SOURCE_REGISTRY: Omit<SLCOSource, "status" | "recordCount" | "lastFetchedAt">[] = [
  {
    id: "ugrc_sgid",
    label: "UGRC / SGID Parcels",
    description: "Countywide parcel backbone — geometry + tax-roll attributes from Utah's public statewide dataset.",
    priority: 1,
    transport: "ArcGIS REST / Bulk Download",
    cadence: "Weekly full refresh",
    rawTable: "raw_slco_sgid_parcels",
    confidence: "high",
    fetchPolicy: "download and query first",
  },
  {
    id: "slco_open_gis",
    label: "SLCo Open Data / Assessor Maps",
    description: "Tax districts, model areas, and thematic map layers from Salt Lake County's Open Data Portal.",
    priority: 2,
    transport: "Layer download / Feature service",
    cadence: "Weekly or monthly",
    rawTable: "raw_slco_public_layers",
    confidence: "high",
    fetchPolicy: "download and query first",
  },
  {
    id: "assessor_cama",
    label: "Assessor CAMA Database",
    description: "Official 2025 CAMA database with residential & commercial property characteristics. Purchase preferred.",
    priority: 3,
    transport: "Purchased file / Targeted HTML fallback",
    cadence: "Annual purchase + midyear refresh",
    rawTable: "raw_slco_assessor_cama_snapshot",
    confidence: "high",
    fetchPolicy: "purchase second",
  },
  {
    id: "recorder_services",
    label: "Recorder Data Services",
    description: "Ownership history, legal descriptions, recorded documents, parcel history via official subscription.",
    priority: 4,
    transport: "Account-backed service / Approved export",
    cadence: "Nightly incremental",
    rawTable: "raw_slco_recorder_property_index",
    confidence: "high",
    fetchPolicy: "purchase second",
  },
];

// ── Static Pipeline Stages ─────────────────────────────────────────
const PIPELINE_STAGES: Omit<PipelineStageRow, "status" | "rowsProcessed" | "lastRunAt">[] = [
  { id: "raw_ingest", label: "Raw Ingest", description: "Pull each source into raw tables without transformation" },
  { id: "standardize", label: "Standardization", description: "Normalize parcel IDs, addresses, dates, geometry reprojection" },
  { id: "identity_resolve", label: "Identity Resolution", description: "Canonical parcel key selection and split/merge tracking" },
  { id: "spatial_join", label: "Spatial Joins", description: "Join parcels to tax districts, model areas, municipalities" },
  { id: "commercial_enrich", label: "Commercial Enrichment", description: "Filter and enrich commercial parcels from CAMA sources" },
  { id: "recorder_enrich", label: "Recorder Enrichment", description: "Attach owner of record, legal descriptions, document metadata" },
  { id: "publish_marts", label: "Publish Marts", description: "Build TerraFusion-ready data marts for Workbench, Forge, Atlas, Dossier" },
];

// ── Static Mart Definitions ────────────────────────────────────────
const MART_DEFS: Omit<MartStatus, "rowCount" | "lastPublished" | "ready">[] = [
  { id: "workbench_summary", label: "Workbench Summary", suite: "OS Core" },
  { id: "forge_cost_context", label: "Forge Cost Context", suite: "TerraForge" },
  { id: "atlas_context", label: "Atlas Context", suite: "TerraAtlas" },
  { id: "dossier_index", label: "Dossier Index", suite: "TerraDossier" },
];

// ── Live Data Fetcher ──────────────────────────────────────────────
async function fetchSLCOPipelineState(): Promise<SLCOPipelineState> {
  // Query data_sources for SLCO source status
  const { data: dataSources } = await supabase
    .from("data_sources")
    .select("name, source_type, sync_status, last_sync_at, record_count")
    .or("name.ilike.%slco%,name.ilike.%salt lake%,name.ilike.%ugrc%,name.ilike.%sgid%");

  // Query pipeline_events for latest stage statuses
  const { data: pipelineEvents } = await supabase
    .from("pipeline_events")
    .select("stage, status, rows_affected, finished_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Query ingest_jobs for SLCO-related jobs
  const { data: ingestJobs } = await supabase
    .from("ingest_jobs")
    .select("file_name, status, rows_imported, updated_at")
    .or("file_name.ilike.%slco%,file_name.ilike.%salt_lake%,file_name.ilike.%ugrc%")
    .order("updated_at", { ascending: false })
    .limit(20);

  // Build source status from live data
  const sourceMap = new Map<string, any>();
  (dataSources || []).forEach((ds) => {
    const name = ds.name.toLowerCase();
    if (name.includes("ugrc") || name.includes("sgid")) sourceMap.set("ugrc_sgid", ds);
    else if (name.includes("open") || name.includes("gis")) sourceMap.set("slco_open_gis", ds);
    else if (name.includes("cama") || name.includes("assessor")) sourceMap.set("assessor_cama", ds);
    else if (name.includes("recorder")) sourceMap.set("recorder_services", ds);
  });

  const sources: SLCOSource[] = SOURCE_REGISTRY.map((def) => {
    const live = sourceMap.get(def.id);
    return {
      ...def,
      status: live ? mapSyncStatus(live.sync_status) : "not_started",
      recordCount: live?.record_count ?? 0,
      lastFetchedAt: live?.last_sync_at ?? null,
    };
  });

  // Build stage status from pipeline events
  const stageMap = new Map<string, { stage: string; status: string; rows_affected?: number; finished_at?: string }>();
  (pipelineEvents ?? []).forEach((ev) => {
    const e = ev as { stage: string; status: string; rows_affected?: number; finished_at?: string };
    if (!stageMap.has(e.stage)) stageMap.set(e.stage, e);
  });

  const stages: PipelineStageRow[] = PIPELINE_STAGES.map((def) => {
    const ev = stageMap.get(def.id);
    return {
      ...def,
      status: ev ? mapStageStatus(ev.status) : "pending",
      rowsProcessed: ev?.rows_affected ?? 0,
      lastRunAt: ev?.finished_at ?? null,
    };
  });

  // Build mart status
  const marts: MartStatus[] = MART_DEFS.map((def) => ({
    ...def,
    rowCount: 0,
    lastPublished: null,
    ready: false,
  }));

  // Compute overall progress
  const completedStages = stages.filter((s) => s.status === "complete").length;
  const totalRaw = sources.reduce((acc, s) => acc + s.recordCount, 0);
  const overallProgress = Math.round((completedStages / stages.length) * 100);

  return {
    sources,
    stages,
    marts,
    overallProgress,
    totalRawRecords: totalRaw,
    totalPublishedRecords: 0,
  };
}

function mapSyncStatus(status: string | null): SourceStatus {
  if (!status) return "not_started";
  switch (status) {
    case "syncing": return "fetching";
    case "synced": return "ingested";
    case "error": return "error";
    case "stale": return "stale";
    default: return "not_started";
  }
}

function mapStageStatus(status: string): StageStatus {
  switch (status) {
    case "running": return "running";
    case "success": return "complete";
    case "failed": return "failed";
    default: return "pending";
  }
}

// ── Exported Hook ──────────────────────────────────────────────────
export function useSLCOIngestion() {
  return useQuery({
    queryKey: ["slco-ingestion-pipeline"],
    queryFn: fetchSLCOPipelineState,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// Re-export statics for UI use
export { SOURCE_REGISTRY, PIPELINE_STAGES, MART_DEFS };

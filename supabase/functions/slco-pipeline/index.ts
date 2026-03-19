// TerraFusion OS — SLCO Pipeline Orchestrator
// Executes the 7-stage ingestion pipeline for Salt Lake County canonical schema.
// Stages: raw_ingest → standardize → identity_resolve → spatial_join → commercial_enrich → recorder_enrich → publish_marts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STAGES = [
  "raw_ingest",
  "standardize",
  "identity_resolve",
  "spatial_join",
  "commercial_enrich",
  "recorder_enrich",
  "publish_marts",
] as const;

type Stage = typeof STAGES[number];

interface PipelineRequest {
  action: "run_stage" | "run_all" | "status" | "reset";
  stage?: Stage;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const params: PipelineRequest = await req.json();

    if (params.action === "status") {
      return await handleStatus(supabase);
    }

    if (params.action === "reset") {
      return await handleReset(supabase);
    }

    if (params.action === "run_stage" && params.stage) {
      return await handleRunStage(supabase, params.stage);
    }

    if (params.action === "run_all") {
      return await handleRunAll(supabase);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("slco-pipeline error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// ── Status ─────────────────────────────────────────────────────────
async function handleStatus(supabase: any) {
  // Get latest run per stage
  const { data: runs } = await supabase
    .from("slco_pipeline_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Get canonical table counts
  const counts: Record<string, number> = {};
  const tables = [
    "slco_parcel_master",
    "slco_parcel_source_registry",
    "slco_parcel_geometry_snapshot",
    "slco_parcel_assessment_summary",
    "slco_parcel_commercial_characteristics",
    "slco_parcel_value_history",
    "slco_recorder_document_index",
    "slco_parcel_identifier_history",
    "slco_parcel_spatial_context",
    "slco_parcel_evidence_registry",
  ];

  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    counts[table] = count || 0;
  }

  // Build stage statuses from latest runs
  const stageStatus: Record<string, any> = {};
  for (const stage of STAGES) {
    const latestRun = (runs || []).find((r: any) => r.stage === stage);
    stageStatus[stage] = latestRun || { stage, status: "pending", rows_in: 0, rows_out: 0 };
  }

  return json({ stages: stageStatus, tableCounts: counts, runs: runs || [] });
}

// ── Reset ──────────────────────────────────────────────────────────
async function handleReset(supabase: any) {
  // Only reset pipeline_runs, not the data tables
  await supabase.from("slco_pipeline_runs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  return json({ ok: true, message: "Pipeline runs cleared" });
}

// ── Run Single Stage ───────────────────────────────────────────────
async function handleRunStage(supabase: any, stage: Stage) {
  // Create run record
  const { data: run } = await supabase
    .from("slco_pipeline_runs")
    .insert({
      stage,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  try {
    const result = await executeStage(supabase, stage);

    await supabase
      .from("slco_pipeline_runs")
      .update({
        status: "complete",
        rows_in: result.rowsIn,
        rows_out: result.rowsOut,
        rows_rejected: result.rowsRejected,
        completed_at: new Date().toISOString(),
        metadata: result.metadata || {},
      })
      .eq("id", run.id);

    return json({ ok: true, stage, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("slco_pipeline_runs")
      .update({
        status: "failed",
        error_message: msg,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return json({ ok: false, stage, error: msg }, 500);
  }
}

// ── Run All Stages Sequentially ────────────────────────────────────
async function handleRunAll(supabase: any) {
  const results: Record<string, any> = {};

  for (const stage of STAGES) {
    const resp = await handleRunStage(supabase, stage);
    const body = await resp.json();
    results[stage] = body;

    if (!body.ok) {
      return json({
        ok: false,
        failedAt: stage,
        results,
        message: `Pipeline halted at ${stage}: ${body.error}`,
      });
    }
  }

  return json({ ok: true, results });
}

// ── Stage Executors ────────────────────────────────────────────────
interface StageResult {
  rowsIn: number;
  rowsOut: number;
  rowsRejected: number;
  metadata?: Record<string, any>;
}

async function executeStage(supabase: any, stage: Stage): Promise<StageResult> {
  switch (stage) {
    case "raw_ingest":
      return executeRawIngest(supabase);
    case "standardize":
      return executeStandardize(supabase);
    case "identity_resolve":
      return executeIdentityResolve(supabase);
    case "spatial_join":
      return executeSpatialJoin(supabase);
    case "commercial_enrich":
      return executeCommercialEnrich(supabase);
    case "recorder_enrich":
      return executeRecorderEnrich(supabase);
    case "publish_marts":
      return executePublishMarts(supabase);
    default:
      throw new Error(`Unknown stage: ${stage}`);
  }
}

// Stage 1: Raw Ingest — Transform gis_features into canonical parcel_master
async function executeRawIngest(supabase: any): Promise<StageResult> {
  // Get all UGRC-ingested features for SLCo county
  const { data: features, count } = await supabase
    .from("gis_features")
    .select("properties, centroid_lat, centroid_lng, coordinates, source_object_id, county_id", { count: "exact" })
    .not("properties", "is", null)
    .limit(1000);

  if (!features || features.length === 0) {
    return { rowsIn: 0, rowsOut: 0, rowsRejected: 0, metadata: { message: "No raw features to ingest" } };
  }

  let inserted = 0;
  let rejected = 0;

  // Batch process features into slco_parcel_master
  const batch: any[] = [];
  for (const f of features) {
    const attrs = f.properties || {};
    const parcelId = attrs.PARCEL_ID || attrs.parcel_id || attrs.SERIAL_NUM || "";
    if (!parcelId) { rejected++; continue; }

    const normalized = normalizeParcelId(parcelId);

    batch.push({
      county_id: "49035",
      parcel_id: parcelId,
      parcel_id_normalized: normalized,
      source_preferred: "sgid",
      situs_address: attrs.PARCEL_ADD || attrs.ADDRESS || null,
      situs_city: attrs.PARCEL_CITY || attrs.CITY || null,
      situs_zip: attrs.PARCEL_ZIP || attrs.ZIP || null,
      owner_name: attrs.OWN_NAME || attrs.OWNER || null,
      property_type_code: attrs.PROP_CLASS || attrs.PROPERTY_CLASS || null,
      property_type_label: attrs.PROP_CLASS || null,
      land_use_code: attrs.LAND_USE || null,
      acreage: attrs.ACRES ? parseFloat(attrs.ACRES) : null,
      geom_source: "ugrc_sgid",
      active_flag: true,
    });

    // Also create source registry and geometry snapshot entries
    if (batch.length >= 200) {
      const { error } = await supabase.from("slco_parcel_master").upsert(batch, {
        onConflict: "county_id,parcel_id_normalized,valid_from",
        ignoreDuplicates: true,
      });
      if (error) { rejected += batch.length; console.error("Upsert err:", error.message); }
      else { inserted += batch.length; }
      batch.length = 0;
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    const { error } = await supabase.from("slco_parcel_master").upsert(batch, {
      onConflict: "county_id,parcel_id_normalized,valid_from",
      ignoreDuplicates: true,
    });
    if (error) { rejected += batch.length; console.error("Final upsert err:", error.message); }
    else { inserted += batch.length; }
  }

  return {
    rowsIn: features.length,
    rowsOut: inserted,
    rowsRejected: rejected,
    metadata: { totalAvailable: count },
  };
}

// Stage 2: Standardize — Normalize fields
async function executeStandardize(supabase: any): Promise<StageResult> {
  const { data: parcels, count } = await supabase
    .from("slco_parcel_master")
    .select("parcel_sk, owner_name, situs_address, situs_city, situs_zip", { count: "exact" })
    .eq("county_id", "49035")
    .limit(1000);

  if (!parcels || parcels.length === 0) {
    return { rowsIn: 0, rowsOut: 0, rowsRejected: 0 };
  }

  let updated = 0;
  for (const p of parcels) {
    const updates: Record<string, any> = {};
    if (p.owner_name) updates.owner_name = p.owner_name.toUpperCase().trim();
    if (p.situs_address) updates.situs_address = p.situs_address.toUpperCase().trim();
    if (p.situs_city) updates.situs_city = p.situs_city.toUpperCase().trim();
    if (p.situs_zip) updates.situs_zip = (p.situs_zip || "").toString().trim().slice(0, 10);

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase.from("slco_parcel_master").update(updates).eq("parcel_sk", p.parcel_sk);
      updated++;
    }
  }

  return { rowsIn: parcels.length, rowsOut: updated, rowsRejected: 0, metadata: { totalRecords: count } };
}

// Stage 3: Identity Resolution — Ensure canonical keys
async function executeIdentityResolve(supabase: any): Promise<StageResult> {
  // Count distinct parcel_id_normalized values
  const { count: masterCount } = await supabase
    .from("slco_parcel_master")
    .select("parcel_id_normalized", { count: "exact", head: true })
    .eq("county_id", "49035")
    .eq("active_flag", true);

  // Create source registry entries for all master records without one
  const { data: unregistered } = await supabase
    .from("slco_parcel_master")
    .select("parcel_id_normalized, source_preferred, parcel_id")
    .eq("county_id", "49035")
    .limit(500);

  let registered = 0;
  if (unregistered && unregistered.length > 0) {
    const registryRows = unregistered.map((p: any) => ({
      county_id: "49035",
      parcel_id_normalized: p.parcel_id_normalized,
      source_system: p.source_preferred || "sgid",
      source_dataset: "ugrc_sgid_parcels",
      retrieved_at: new Date().toISOString(),
      raw_payload_hash: simpleHash(p.parcel_id_normalized),
    }));

    const { error } = await supabase.from("slco_parcel_source_registry").insert(registryRows);
    if (!error) registered = registryRows.length;
  }

  return {
    rowsIn: masterCount || 0,
    rowsOut: registered,
    rowsRejected: 0,
    metadata: { canonicalParcels: masterCount },
  };
}

// Stage 4: Spatial Join — Link parcels to tax districts, model areas
async function executeSpatialJoin(supabase: any): Promise<StageResult> {
  const { data: parcels } = await supabase
    .from("slco_parcel_master")
    .select("parcel_id_normalized, property_type_code")
    .eq("county_id", "49035")
    .eq("active_flag", true)
    .limit(500);

  if (!parcels || parcels.length === 0) {
    return { rowsIn: 0, rowsOut: 0, rowsRejected: 0 };
  }

  // Create spatial context entries (simplified — real impl would use PostGIS ST_Intersects)
  const contextRows = parcels.map((p: any) => ({
    county_id: "49035",
    parcel_id_normalized: p.parcel_id_normalized,
    tax_district_id: "SLCO-DEFAULT",
    model_area_id: null,
    municipality: "SALT LAKE COUNTY",
    source_system: "spatial_join_v1",
  }));

  const { error } = await supabase.from("slco_parcel_spatial_context").insert(contextRows);

  return {
    rowsIn: parcels.length,
    rowsOut: error ? 0 : contextRows.length,
    rowsRejected: error ? contextRows.length : 0,
    metadata: { strategy: "default_district_assignment" },
  };
}

// Stage 5: Commercial Enrichment
async function executeCommercialEnrich(supabase: any): Promise<StageResult> {
  // Find commercial parcels from master
  const { data: commercialParcels } = await supabase
    .from("slco_parcel_master")
    .select("parcel_id_normalized, property_type_code")
    .eq("county_id", "49035")
    .eq("active_flag", true)
    .or("property_type_code.ilike.%commercial%,property_type_code.ilike.%C%,property_type_code.eq.C")
    .limit(200);

  if (!commercialParcels || commercialParcels.length === 0) {
    return { rowsIn: 0, rowsOut: 0, rowsRejected: 0, metadata: { message: "No commercial parcels identified yet" } };
  }

  const rows = commercialParcels.map((p: any) => ({
    county_id: "49035",
    parcel_id_normalized: p.parcel_id_normalized,
    source_system: "sgid_classification",
    snapshot_date: new Date().toISOString().split("T")[0],
  }));

  const { error } = await supabase.from("slco_parcel_commercial_characteristics").insert(rows);

  return {
    rowsIn: commercialParcels.length,
    rowsOut: error ? 0 : rows.length,
    rowsRejected: error ? rows.length : 0,
  };
}

// Stage 6: Recorder Enrichment
async function executeRecorderEnrich(supabase: any): Promise<StageResult> {
  // Placeholder — real impl would pull from Recorder Data Services subscription
  return {
    rowsIn: 0,
    rowsOut: 0,
    rowsRejected: 0,
    metadata: { message: "Recorder Data Services subscription required — stage ready for onboarding" },
  };
}

// Stage 7: Publish Marts
async function executePublishMarts(supabase: any): Promise<StageResult> {
  // Verify mart views are queryable
  const { count: workbenchCount } = await supabase
    .from("mart_slco_workbench_summary")
    .select("*", { count: "exact", head: true });

  const { count: forgeCount } = await supabase
    .from("mart_slco_forge_cost_context")
    .select("*", { count: "exact", head: true });

  const { count: dossierCount } = await supabase
    .from("mart_slco_dossier_index")
    .select("*", { count: "exact", head: true });

  return {
    rowsIn: (workbenchCount || 0) + (forgeCount || 0) + (dossierCount || 0),
    rowsOut: (workbenchCount || 0) + (forgeCount || 0) + (dossierCount || 0),
    rowsRejected: 0,
    metadata: {
      marts: {
        workbench_summary: workbenchCount || 0,
        forge_cost_context: forgeCount || 0,
        dossier_index: dossierCount || 0,
      },
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────
function normalizeParcelId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

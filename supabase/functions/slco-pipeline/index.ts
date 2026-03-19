// TerraFusion OS — SLCO Pipeline Orchestrator v2
// Phase 61: Stage-gate validation, auto-retry with exponential backoff,
// prerequisite enforcement, and run history tracking.

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

// ── Stage-Gate Prerequisites ───────────────────────────────────────
// Each stage declares what must be true before it can run.
const STAGE_GATES: Record<Stage, {
  requiredStages: Stage[];          // predecessor stages that must be "complete"
  minRowsRequired?: { table: string; count: number }; // minimum rows in a table
  description: string;
}> = {
  raw_ingest: {
    requiredStages: [],
    description: "No prerequisites — entry point. Requires GIS features in gis_features table.",
  },
  standardize: {
    requiredStages: ["raw_ingest"],
    minRowsRequired: { table: "slco_parcel_master", count: 1 },
    description: "Requires raw_ingest to have populated slco_parcel_master.",
  },
  identity_resolve: {
    requiredStages: ["standardize"],
    minRowsRequired: { table: "slco_parcel_master", count: 1 },
    description: "Requires standardized parcel master records.",
  },
  spatial_join: {
    requiredStages: ["identity_resolve"],
    minRowsRequired: { table: "slco_parcel_source_registry", count: 1 },
    description: "Requires resolved parcel identities with source registry.",
  },
  commercial_enrich: {
    requiredStages: ["spatial_join"],
    description: "Requires spatial context assignments.",
  },
  recorder_enrich: {
    requiredStages: ["identity_resolve"],
    description: "Requires canonical parcel keys. Recorder Data Services subscription needed.",
  },
  publish_marts: {
    requiredStages: ["spatial_join"],
    description: "Requires spatial context. Commercial/recorder enrichment optional.",
  },
};

// ── Retry Configuration ────────────────────────────────────────────
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

interface PipelineRequest {
  action: "run_stage" | "run_all" | "status" | "reset" | "validate_gate";
  stage?: Stage;
  skipGateCheck?: boolean;  // Allow force-running past gate failures
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

    switch (params.action) {
      case "status":
        return await handleStatus(supabase);
      case "reset":
        return await handleReset(supabase);
      case "validate_gate":
        if (!params.stage) return json({ error: "stage required" }, 400);
        return await handleValidateGate(supabase, params.stage);
      case "run_stage":
        if (!params.stage) return json({ error: "stage required" }, 400);
        return await handleRunStage(supabase, params.stage, params.skipGateCheck);
      case "run_all":
        return await handleRunAll(supabase);
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("slco-pipeline error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// ── Gate Validation ────────────────────────────────────────────────
interface GateResult {
  passed: boolean;
  stage: string;
  checks: { check: string; passed: boolean; detail: string }[];
}

async function validateGate(supabase: any, stage: Stage): Promise<GateResult> {
  const gate = STAGE_GATES[stage];
  const checks: GateResult["checks"] = [];

  // Check required predecessor stages
  for (const req of gate.requiredStages) {
    const { data: latestRun } = await supabase
      .from("slco_pipeline_runs")
      .select("status")
      .eq("stage", req)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const passed = !!latestRun;
    checks.push({
      check: `stage_${req}_complete`,
      passed,
      detail: passed
        ? `Prerequisite stage "${req}" has completed successfully.`
        : `Prerequisite stage "${req}" has not completed. Run it first.`,
    });
  }

  // Check minimum row requirements
  if (gate.minRowsRequired) {
    const { count } = await supabase
      .from(gate.minRowsRequired.table)
      .select("*", { count: "exact", head: true });

    const actual = count || 0;
    const passed = actual >= gate.minRowsRequired.count;
    checks.push({
      check: `min_rows_${gate.minRowsRequired.table}`,
      passed,
      detail: passed
        ? `Table "${gate.minRowsRequired.table}" has ${actual} rows (min: ${gate.minRowsRequired.count}).`
        : `Table "${gate.minRowsRequired.table}" has ${actual} rows but needs at least ${gate.minRowsRequired.count}.`,
    });
  }

  return {
    passed: checks.every((c) => c.passed),
    stage,
    checks,
  };
}

async function handleValidateGate(supabase: any, stage: Stage) {
  const result = await validateGate(supabase, stage);
  return json(result);
}

// ── Status (enhanced with gate info) ───────────────────────────────
async function handleStatus(supabase: any) {
  const { data: runs } = await supabase
    .from("slco_pipeline_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // Table counts
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

  // Build stage statuses from latest completed runs
  const stageStatus: Record<string, any> = {};
  const gateResults: Record<string, GateResult> = {};

  for (const stage of STAGES) {
    const latestRun = (runs || []).find((r: any) => r.stage === stage);
    stageStatus[stage] = latestRun || { stage, status: "pending", rows_in: 0, rows_out: 0 };

    // Compute gate validation for each stage
    gateResults[stage] = await validateGate(supabase, stage);
  }

  // Build run history timeline (last 20 runs)
  const history = (runs || []).slice(0, 20).map((r: any) => ({
    id: r.id,
    stage: r.stage,
    status: r.status,
    rows_in: r.rows_in,
    rows_out: r.rows_out,
    rows_rejected: r.rows_rejected,
    error_message: r.error_message,
    started_at: r.started_at,
    completed_at: r.completed_at,
    duration_ms: r.started_at && r.completed_at
      ? new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()
      : null,
    metadata: r.metadata,
  }));

  return json({
    stages: stageStatus,
    gates: gateResults,
    tableCounts: counts,
    runs: runs || [],
    history,
  });
}

// ── Reset ──────────────────────────────────────────────────────────
async function handleReset(supabase: any) {
  await supabase.from("slco_pipeline_runs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  return json({ ok: true, message: "Pipeline runs cleared" });
}

// ── Run Stage with Gate Check + Auto-Retry ─────────────────────────
async function handleRunStage(supabase: any, stage: Stage, skipGateCheck?: boolean) {
  // Stage-gate validation
  if (!skipGateCheck) {
    const gateResult = await validateGate(supabase, stage);
    if (!gateResult.passed) {
      const failedChecks = gateResult.checks.filter((c) => !c.passed);
      return json({
        ok: false,
        stage,
        gateBlocked: true,
        gateResult,
        error: `Stage gate blocked: ${failedChecks.map((c) => c.detail).join("; ")}`,
      }, 422);
    }
  }

  // Create run record
  const { data: run } = await supabase
    .from("slco_pipeline_runs")
    .insert({
      stage,
      status: "running",
      started_at: new Date().toISOString(),
      metadata: { retryCount: 0, gateSkipped: !!skipGateCheck },
    })
    .select("*")
    .single();

  // Execute with auto-retry
  let lastError: string | null = null;
  let result: StageResult | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      result = await executeStage(supabase, stage);

      // Quality gate: check if output is acceptable
      const qualityCheck = validateStageOutput(stage, result);
      if (!qualityCheck.passed) {
        console.warn(`Quality check failed for ${stage}: ${qualityCheck.reason}`);
        result.metadata = {
          ...result.metadata,
          qualityWarning: qualityCheck.reason,
        };
      }

      // Success — update run record
      await supabase
        .from("slco_pipeline_runs")
        .update({
          status: "complete",
          rows_in: result.rowsIn,
          rows_out: result.rowsOut,
          rows_rejected: result.rowsRejected,
          completed_at: new Date().toISOString(),
          metadata: {
            ...result.metadata,
            retryCount: attempt,
            gateSkipped: !!skipGateCheck,
            qualityPassed: validateStageOutput(stage, result).passed,
          },
        })
        .eq("id", run.id);

      return json({ ok: true, stage, attempt, ...result });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`Stage ${stage} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, lastError);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.log(`Retrying ${stage} in ${backoff}ms...`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  // All retries exhausted
  await supabase
    .from("slco_pipeline_runs")
    .update({
      status: "failed",
      error_message: `Failed after ${MAX_RETRIES + 1} attempts: ${lastError}`,
      completed_at: new Date().toISOString(),
      metadata: { retryCount: MAX_RETRIES, lastError },
    })
    .eq("id", run.id);

  return json({
    ok: false,
    stage,
    error: `Failed after ${MAX_RETRIES + 1} attempts: ${lastError}`,
    retriesExhausted: true,
  }, 500);
}

// ── Run All with Gate Enforcement ──────────────────────────────────
async function handleRunAll(supabase: any) {
  const results: Record<string, any> = {};

  for (const stage of STAGES) {
    const resp = await handleRunStage(supabase, stage, false);
    const body = await resp.json();
    results[stage] = body;

    if (!body.ok) {
      return json({
        ok: false,
        failedAt: stage,
        results,
        message: body.gateBlocked
          ? `Pipeline halted: stage "${stage}" gate check failed.`
          : `Pipeline halted at "${stage}": ${body.error}`,
      });
    }
  }

  return json({ ok: true, results });
}

// ── Quality Validation ─────────────────────────────────────────────
interface QualityResult {
  passed: boolean;
  reason?: string;
}

function validateStageOutput(stage: Stage, result: StageResult): QualityResult {
  // No rows processed at all — warn but don't fail
  if (result.rowsIn === 0) {
    return { passed: true, reason: "No input rows — stage had nothing to process." };
  }

  // High rejection rate (> 50%)
  const rejectionRate = result.rowsRejected / result.rowsIn;
  if (rejectionRate > 0.5) {
    return {
      passed: false,
      reason: `High rejection rate: ${(rejectionRate * 100).toFixed(1)}% of ${result.rowsIn} rows rejected.`,
    };
  }

  // Zero output when there was input
  if (result.rowsOut === 0 && result.rowsIn > 0 && result.rowsRejected === 0) {
    return {
      passed: false,
      reason: `Zero rows output from ${result.rowsIn} input rows — possible silent failure.`,
    };
  }

  return { passed: true };
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

// Stage 1: Raw Ingest
async function executeRawIngest(supabase: any): Promise<StageResult> {
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
  const batch: any[] = [];

  for (const f of features) {
    const attrs = f.properties || {};
    const parcelId = attrs.PARCEL_ID || attrs.parcel_id || attrs.SERIAL_NUM || "";
    if (!parcelId) { rejected++; continue; }

    batch.push({
      county_id: "49035",
      parcel_id: parcelId,
      parcel_id_normalized: normalizeParcelId(parcelId),
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

  if (batch.length > 0) {
    const { error } = await supabase.from("slco_parcel_master").upsert(batch, {
      onConflict: "county_id,parcel_id_normalized,valid_from",
      ignoreDuplicates: true,
    });
    if (error) { rejected += batch.length; } else { inserted += batch.length; }
  }

  // Also create geometry snapshots from features with coordinates
  let geomCount = 0;
  const geomBatch: any[] = [];
  for (const f of features) {
    const attrs = f.properties || {};
    const parcelId = attrs.PARCEL_ID || attrs.parcel_id || attrs.SERIAL_NUM || "";
    if (!parcelId || !f.coordinates) continue;

    geomBatch.push({
      county_id: "49035",
      parcel_id_normalized: normalizeParcelId(parcelId),
      geometry_version: 1,
      centroid_lat: f.centroid_lat,
      centroid_lng: f.centroid_lng,
      coordinates: f.coordinates,
      source_system: "ugrc_sgid",
      area_acres: attrs.ACRES ? parseFloat(attrs.ACRES) : null,
    });
  }

  if (geomBatch.length > 0) {
    const { error } = await supabase.from("slco_parcel_geometry_snapshot").insert(geomBatch);
    if (!error) geomCount = geomBatch.length;
  }

  // Create assessment summary from UGRC value attributes
  let assessCount = 0;
  const assessBatch: any[] = [];
  for (const f of features) {
    const attrs = f.properties || {};
    const parcelId = attrs.PARCEL_ID || attrs.parcel_id || attrs.SERIAL_NUM || "";
    const totalMkt = parseFloat(attrs.TOTAL_MKT_VALUE || "0");
    if (!parcelId || totalMkt <= 0) continue;

    assessBatch.push({
      county_id: "49035",
      parcel_id_normalized: normalizeParcelId(parcelId),
      tax_year: new Date().getFullYear(),
      land_value: parseFloat(attrs.LAND_MKT_VALUE || "0") || null,
      improvement_value: parseFloat(attrs.BLDG_MKT_VALUE || "0") || null,
      total_market_value: totalMkt,
      property_type_code: attrs.PROP_CLASS || null,
      source_system: "ugrc_sgid",
      snapshot_date: new Date().toISOString().split("T")[0],
    });
  }

  if (assessBatch.length > 0) {
    const { error } = await supabase.from("slco_parcel_assessment_summary").upsert(assessBatch, {
      onConflict: "county_id,parcel_id_normalized,tax_year,source_system",
      ignoreDuplicates: true,
    });
    if (!error) assessCount = assessBatch.length;
  }

  return {
    rowsIn: features.length,
    rowsOut: inserted,
    rowsRejected: rejected,
    metadata: { totalAvailable: count, geometrySnapshots: geomCount, assessmentSummaries: assessCount },
  };
}

// Stage 2: Standardize
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

// Stage 3: Identity Resolution
async function executeIdentityResolve(supabase: any): Promise<StageResult> {
  const { count: masterCount } = await supabase
    .from("slco_parcel_master")
    .select("parcel_id_normalized", { count: "exact", head: true })
    .eq("county_id", "49035")
    .eq("active_flag", true);

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
      raw_payload_hash: simpleHash(p.parcel_id_normalized + new Date().toISOString()),
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

// Stage 4: Spatial Join
async function executeSpatialJoin(supabase: any): Promise<StageResult> {
  const { data: parcels } = await supabase
    .from("slco_parcel_master")
    .select("parcel_id_normalized, property_type_code, tax_district_id")
    .eq("county_id", "49035")
    .eq("active_flag", true)
    .limit(500);

  if (!parcels || parcels.length === 0) {
    return { rowsIn: 0, rowsOut: 0, rowsRejected: 0 };
  }

  // Check for existing spatial context to avoid duplicates
  const { count: existingCount } = await supabase
    .from("slco_parcel_spatial_context")
    .select("*", { count: "exact", head: true })
    .eq("county_id", "49035");

  if ((existingCount || 0) > 0) {
    return {
      rowsIn: parcels.length,
      rowsOut: 0,
      rowsRejected: 0,
      metadata: { message: `Spatial context already exists (${existingCount} rows). Delete first to re-run.`, existingCount },
    };
  }

  const contextRows = parcels.map((p: any) => ({
    county_id: "49035",
    parcel_id_normalized: p.parcel_id_normalized,
    tax_district_id: p.tax_district_id || "SLCO-DEFAULT",
    model_area_id: null,
    municipality: "SALT LAKE COUNTY",
    source_system: "spatial_join_v2",
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
  return {
    rowsIn: 0,
    rowsOut: 0,
    rowsRejected: 0,
    metadata: { message: "Recorder Data Services subscription required — stage ready for onboarding" },
  };
}

// Stage 7: Publish Marts
async function executePublishMarts(supabase: any): Promise<StageResult> {
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

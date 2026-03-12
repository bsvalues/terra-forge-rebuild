// TerraFusion OS — ArcGIS Polygon Ingester (Resumable, Stateful, Auditable)
// Actions: start | resume | pause | status
// Auth: JWT-verified admin → service-role for writes
// State: gis_ingest_jobs + gis_ingest_job_events (append-only)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIME_BUDGET_MS = 25_000;
const PAGE_BACKOFF_MS = 150;
const MAX_PAGES_PER_CALL = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let auth;
    try {
      auth = await requireAdmin(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const supabase = createServiceClient();
    const body = await req.json();
    const action: string = body.action;

    if (action === "status") {
      return await handleStatus(supabase, body, auth.countyId);
    }
    if (action === "pause") {
      return await handlePause(supabase, body, auth.userId);
    }
    if (action === "start") {
      return await handleStart(supabase, body, auth);
    }
    if (action === "resume") {
      return await handleResume(supabase, body, auth);
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[arcgis-polygon-ingest] Fatal:", msg);
    return jsonResponse({ success: false, error: msg }, 500);
  }
});

// ─── ACTION HANDLERS ───────────────────────────────────────

async function handleStatus(supabase: any, body: any, countyId: string) {
  const { jobId } = body;

  if (jobId) {
    const { data: job, error } = await supabase
      .from("gis_ingest_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("county_id", countyId)
      .single();
    if (error) return jsonResponse({ error: error.message }, 404);

    const { data: events } = await supabase
      .from("gis_ingest_job_events")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(20);

    return jsonResponse({ job, events: events || [] });
  }

  // List recent jobs for county
  const { data: jobs } = await supabase
    .from("gis_ingest_jobs")
    .select("*")
    .eq("county_id", countyId)
    .order("created_at", { ascending: false })
    .limit(10);

  return jsonResponse({ jobs: jobs || [] });
}

async function handlePause(supabase: any, body: any, userId: string) {
  const { jobId } = body;
  if (!jobId) return jsonResponse({ error: "jobId required" }, 400);

  const { data: job, error } = await supabase
    .from("gis_ingest_jobs")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "running")
    .select()
    .single();

  if (error || !job) return jsonResponse({ error: "Job not found or not running" }, 404);

  await emitEvent(supabase, jobId, "pause", { paused_by: userId });
  return jsonResponse({ success: true, job });
}

async function handleStart(supabase: any, body: any, auth: any) {
  const {
    featureServerUrl,
    dataset,
    parcelIdField = "Parcel_ID",
    pageSize = 2000,
    maxPages = MAX_PAGES_PER_CALL,
  } = body;

  if (!featureServerUrl || !dataset) {
    return jsonResponse({ error: "featureServerUrl and dataset required" }, 400);
  }

  try {
    const u = new URL(featureServerUrl);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad");
  } catch {
    return jsonResponse({ error: "featureServerUrl must be valid HTTP(S)" }, 400);
  }

  // Register layer (county-scoped)
  const layerId = await ensureLayer(supabase, auth.countyId, featureServerUrl, parcelIdField);

  // Create job
  const { data: job, error: jobErr } = await supabase
    .from("gis_ingest_jobs")
    .insert({
      county_id: auth.countyId,
      dataset,
      feature_server_url: featureServerUrl,
      parcel_id_field: parcelIdField,
      page_size: pageSize,
      status: "running",
      layer_id: layerId,
      created_by: auth.userId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (jobErr) throw new Error(`Failed to create job: ${jobErr.message}`);

  await emitEvent(supabase, job.id, "start", {
    feature_server_url: featureServerUrl,
    dataset,
    started_by: auth.userId,
  });

  // Run ingestion loop
  const result = await runIngestLoop(supabase, job, maxPages);
  return jsonResponse(result);
}

async function handleResume(supabase: any, body: any, auth: any) {
  const { jobId, maxPages = MAX_PAGES_PER_CALL } = body;
  if (!jobId) return jsonResponse({ error: "jobId required" }, 400);

  const { data: job, error } = await supabase
    .from("gis_ingest_jobs")
    .select("*")
    .eq("id", jobId)
    .in("status", ["paused", "failed"])
    .single();

  if (error || !job) return jsonResponse({ error: "Job not found or not resumable" }, 404);

  // Mark running
  await supabase
    .from("gis_ingest_jobs")
    .update({ status: "running", updated_at: new Date().toISOString(), last_error: null })
    .eq("id", jobId);

  await emitEvent(supabase, jobId, "resume", {
    resumed_by: auth.userId,
    cursor_offset: job.cursor_offset,
  });

  const result = await runIngestLoop(supabase, job, maxPages);
  return jsonResponse(result);
}

// ─── CORE INGEST LOOP ─────────────────────────────────────

async function runIngestLoop(supabase: any, job: any, maxPages: number) {
  const started = Date.now();
  let offset = job.cursor_offset;
  let totalFetched = job.total_fetched;
  let totalUpserted = job.total_upserted;
  let totalMatched = job.total_matched;
  let page = 0;
  let hasMore = true;
  let timeBudgetExceeded = false;

  const outFields = [
    job.parcel_id_field, "neighborhood_code", "GlobalID", "OBJECTID",
  ].join(",");

  while (hasMore && page < maxPages) {
    // Check if paused externally
    if (page > 0 && page % 2 === 0) {
      const { data: current } = await supabase
        .from("gis_ingest_jobs")
        .select("status")
        .eq("id", job.id)
        .single();
      if (current?.status === "paused") {
        console.log(`[ingest] Job ${job.id} paused externally at page ${page}`);
        break;
      }
    }

    // Time budget
    if (Date.now() - started > TIME_BUDGET_MS) {
      timeBudgetExceeded = true;
      console.log(`[ingest] Time budget at page ${page + 1}`);
      break;
    }

    const queryUrl =
      `${job.feature_server_url}/query?where=1%3D1` +
      `&outFields=${encodeURIComponent(outFields)}` +
      `&returnGeometry=true&outSR=4326&f=geojson` +
      `&resultOffset=${offset}&resultRecordCount=${job.page_size}`;

    try {
      const resp = await fetch(queryUrl);
      if (!resp.ok) throw new Error(`ArcGIS HTTP ${resp.status}`);
      const geojson = await resp.json();
      if (geojson.error) throw new Error(geojson.error.message || JSON.stringify(geojson.error));

      const features = geojson.features || [];
      if (features.length === 0) { hasMore = false; break; }

      // Build bulk rows
      const rows = buildBulkRows(features, job.parcel_id_field);

      if (rows.length > 0) {
        const { data: bulkRes, error: bulkErr } = await supabase.rpc(
          "upsert_parcel_polygons_bulk",
          { p_county_id: job.county_id, p_layer_id: job.layer_id, p_rows: rows }
        );
        if (bulkErr) throw new Error(`Bulk upsert: ${bulkErr.message}`);

        const res = bulkRes as { upserted_features: number; matched_parcels: number } | null;
        totalUpserted += res?.upserted_features ?? 0;
        totalMatched += res?.matched_parcels ?? 0;
      }

      totalFetched += features.length;
      offset += features.length;
      page++;
      hasMore = features.length === job.page_size;

      // Emit page event
      await emitEvent(supabase, job.id, "page_ok", {
        page,
        offset,
        fetched: features.length,
        upserted: rows.length,
        elapsed_ms: Date.now() - started,
      });

      // Update cursor
      await supabase
        .from("gis_ingest_jobs")
        .update({
          cursor_offset: offset,
          total_fetched: totalFetched,
          total_upserted: totalUpserted,
          total_matched: totalMatched,
          pages_processed: job.pages_processed + page,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (hasMore && page < maxPages) {
        await new Promise(r => setTimeout(r, PAGE_BACKOFF_MS));
      }
    } catch (pageErr: any) {
      const errMsg = pageErr.message || "Unknown page error";
      console.error(`[ingest] Page ${page + 1} failed: ${errMsg}`);

      await emitEvent(supabase, job.id, "page_fail", {
        page: page + 1,
        offset,
        error: errMsg,
      });

      // Mark failed with cursor preserved
      await supabase
        .from("gis_ingest_jobs")
        .update({
          status: "failed",
          last_error: errMsg,
          cursor_offset: offset,
          total_fetched: totalFetched,
          total_upserted: totalUpserted,
          total_matched: totalMatched,
          pages_processed: job.pages_processed + page,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return {
        success: false,
        jobId: job.id,
        error: errMsg,
        cursorOffset: offset,
        totalFetched,
        totalUpserted,
        pagesProcessed: job.pages_processed + page,
      };
    }
  }

  // Final status
  const done = !hasMore;
  const finalStatus = done ? "complete" : timeBudgetExceeded ? "paused" : "paused";

  await supabase
    .from("gis_ingest_jobs")
    .update({
      status: finalStatus,
      cursor_offset: offset,
      total_fetched: totalFetched,
      total_upserted: totalUpserted,
      total_matched: totalMatched,
      pages_processed: job.pages_processed + page,
      updated_at: new Date().toISOString(),
      ...(done ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", job.id);

  if (done) {
    await emitEvent(supabase, job.id, "complete", {
      total_fetched: totalFetched,
      total_upserted: totalUpserted,
      total_matched: totalMatched,
      elapsed_ms: Date.now() - started,
    });
  }

  // Update layer metadata
  await supabase
    .from("gis_layers")
    .update({ feature_count: totalFetched, updated_at: new Date().toISOString() })
    .eq("id", job.layer_id);

  return {
    success: true,
    jobId: job.id,
    status: finalStatus,
    cursorOffset: offset,
    totalFetched,
    totalUpserted,
    totalMatched,
    pagesProcessed: job.pages_processed + page,
    done,
    timeBudgetExceeded,
    elapsedMs: Date.now() - started,
  };
}

// ─── HELPERS ───────────────────────────────────────────────

function buildBulkRows(features: any[], parcelIdField: string) {
  const rows: any[] = [];
  for (const feature of features) {
    const props = feature.properties || {};
    const parcelNumber = props[parcelIdField];
    const geom = feature.geometry;
    if (!parcelNumber || !geom) continue;
    if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") continue;

    const parcelNumStr = String(parcelNumber).trim();
    if (!parcelNumStr) continue;

    const multiGeom = geom.type === "Polygon"
      ? { type: "MultiPolygon", coordinates: [geom.coordinates] }
      : geom;

    const sourceObjId = props.GlobalID || String(props.OBJECTID || "");
    if (!sourceObjId) continue;

    rows.push({
      parcel_number: parcelNumStr,
      source_object_id: sourceObjId,
      geom: multiGeom,
      props: {
        [parcelIdField]: parcelNumStr,
        neighborhood_code: props.neighborhood_code ?? null,
        GlobalID: props.GlobalID ?? null,
        OBJECTID: props.OBJECTID ?? null,
      },
    });
  }
  return rows;
}

async function ensureLayer(supabase: any, countyId: string, featureServerUrl: string, parcelIdField: string) {
  // County-scoped layer lookup to prevent cross-county collisions
  const layerName = `ParcelsAndAssess`;
  const { data: existing } = await supabase
    .from("gis_layers")
    .select("id")
    .eq("name", layerName)
    .eq("properties_schema->>source_url", featureServerUrl)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: inserted, error } = await supabase
    .from("gis_layers")
    .insert({
      name: layerName,
      layer_type: "polygon",
      srid: 4326,
      file_format: "arcgis_featureserver",
      properties_schema: {
        parcel_id_field: parcelIdField,
        source_url: featureServerUrl,
        county_id: countyId,
      },
    })
    .select("id")
    .single();

  if (error) throw new Error(`Layer registration failed: ${error.message}`);
  return inserted.id;
}

async function emitEvent(supabase: any, jobId: string, eventType: string, payload: any) {
  await supabase.from("gis_ingest_job_events").insert({
    job_id: jobId,
    event_type: eventType,
    payload,
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

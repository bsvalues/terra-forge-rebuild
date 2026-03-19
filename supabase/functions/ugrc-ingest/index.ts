// TerraFusion OS — UGRC/SGID Parcel Ingestion Engine
// Queries Utah's SGID ArcGIS REST API for Salt Lake County parcel geometry + tax-roll attributes.
// Supports paginated fetch with OBJECTID cursor, resumable jobs, and spatial normalization.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Salt Lake County FIPS = 49035, County code = 035
// UGRC SGID Parcels endpoint (statewide parcels layer)
const SGID_PARCELS_URL =
  "https://opendata.gis.utah.gov/datasets/utah-parcels/FeatureServer/0/query";

const DEFAULT_PAGE_SIZE = 250;
const TIME_BUDGET_MS = 20_000; // 20s per invocation
const BACKOFF_MS = 150;

interface FetchParams {
  action: "start" | "resume" | "status" | "pause";
  pageSize?: number;
  maxPages?: number;
  jobId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const params: FetchParams = await req.json();
    const { action } = params;

    if (action === "status") {
      return await handleStatus(supabase, params.jobId);
    }

    if (action === "pause") {
      return await handlePause(supabase, params.jobId!);
    }

    if (action === "start") {
      return await handleStart(supabase, params);
    }

    if (action === "resume") {
      return await handleResume(supabase, params);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("ugrc-ingest error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// ── Handlers ───────────────────────────────────────────────────────

async function handleStatus(supabase: any, jobId?: string) {
  if (jobId) {
    const { data: job } = await supabase
      .from("gis_ingest_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    const { data: events } = await supabase
      .from("gis_ingest_job_events")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(20);
    return json({ job, events });
  }

  const { data: jobs } = await supabase
    .from("gis_ingest_jobs")
    .select("*")
    .ilike("dataset", "%ugrc%")
    .order("created_at", { ascending: false })
    .limit(10);
  return json({ jobs });
}

async function handlePause(supabase: any, jobId: string) {
  await supabase
    .from("gis_ingest_jobs")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", jobId);
  return json({ ok: true, status: "paused" });
}

async function handleStart(supabase: any, params: FetchParams) {
  const pageSize = params.pageSize || DEFAULT_PAGE_SIZE;

  // Get or create the Benton county record for SLCo
  const { data: county } = await supabase
    .from("counties")
    .select("id")
    .eq("fips_code", "49035")
    .single();

  let countyId: string;
  if (county) {
    countyId = county.id;
  } else {
    // Create Salt Lake County entry
    const { data: newCounty } = await supabase
      .from("counties")
      .insert({
        name: "Salt Lake County",
        fips_code: "49035",
        state: "UT",
        config: { tier: "metro", source_preference: "ugrc_sgid" },
      })
      .select("id")
      .single();
    countyId = newCounty.id;
  }

  // Ensure layer exists
  const layerName = `UGRC SGID Parcels: Salt Lake County`;
  let { data: layer } = await supabase
    .from("gis_layers")
    .select("id")
    .eq("name", layerName)
    .single();

  if (!layer) {
    const { data: newLayer } = await supabase
      .from("gis_layers")
      .insert({
        name: layerName,
        layer_type: "polygon",
        file_format: "arcgis_rest",
        srid: 4326,
        properties_schema: {
          source_url: SGID_PARCELS_URL,
          county_fips: "49035",
          parcel_id_field: "PARCEL_ID",
        },
      })
      .select("id")
      .single();
    layer = newLayer;
  }

  // Create ingest job
  const { data: job } = await supabase
    .from("gis_ingest_jobs")
    .insert({
      county_id: countyId,
      dataset: "ugrc_sgid_parcels",
      feature_server_url: SGID_PARCELS_URL,
      parcel_id_field: "PARCEL_ID",
      page_size: pageSize,
      status: "running",
      cursor_type: "objectid",
      cursor_offset: 0,
      layer_id: layer.id,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  // Start fetching
  const result = await fetchPages(supabase, job, params.maxPages || 50);
  return json(result);
}

async function handleResume(supabase: any, params: FetchParams) {
  const { data: job } = await supabase
    .from("gis_ingest_jobs")
    .select("*")
    .eq("id", params.jobId)
    .single();

  if (!job) return json({ error: "Job not found" }, 404);

  await supabase
    .from("gis_ingest_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", job.id);

  const result = await fetchPages(supabase, { ...job, status: "running" }, params.maxPages || 50);
  return json(result);
}

// ── Core Fetch Loop ────────────────────────────────────────────────

async function fetchPages(supabase: any, job: any, maxPages: number) {
  const startTime = Date.now();
  let cursor = job.cursor_offset || 0;
  let totalFetched = job.total_fetched || 0;
  let totalUpserted = job.total_upserted || 0;
  let pagesProcessed = job.pages_processed || 0;
  let lastError: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    if (Date.now() - startTime > TIME_BUDGET_MS) break;

    try {
      // Query UGRC with Salt Lake County filter (County FIPS 49035)
      const queryParams = new URLSearchParams({
        where: `OBJECTID > ${cursor} AND CountyID = '49035'`,
        outFields: "OBJECTID,PARCEL_ID,PARCEL_ADD,PARCEL_CITY,PARCEL_ZIP,OWN_NAME,TAX_DIST,ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_MKT_VALUE,PROP_CLASS,YEAR_BUILT",
        outSR: "4326",
        f: "json",
        resultRecordCount: String(job.page_size),
        orderByFields: "OBJECTID ASC",
        returnGeometry: "true",
      });

      const url = `${job.feature_server_url}?${queryParams}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`UGRC API ${resp.status}: ${resp.statusText}`);

      const data = await resp.json();
      const features = data.features || [];

      if (features.length === 0) {
        // Done — no more records
        await supabase
          .from("gis_ingest_jobs")
          .update({
            status: "complete",
            cursor_offset: cursor,
            total_fetched: totalFetched,
            total_upserted: totalUpserted,
            pages_processed: pagesProcessed,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        await emitEvent(supabase, job.id, "complete", {
          totalFetched,
          totalUpserted,
          pagesProcessed,
        });

        return {
          status: "complete",
          jobId: job.id,
          totalFetched,
          totalUpserted,
          pagesProcessed,
        };
      }

      // Process features — upsert into gis_features
      const rows = features.map((f: any) => ({
        layer_id: job.layer_id,
        county_id: job.county_id,
        geometry_type: f.geometry?.rings ? "Polygon" : "Point",
        coordinates: f.geometry || {},
        properties: f.attributes || {},
        source_object_id: String(f.attributes?.OBJECTID || ""),
        parcel_id: null, // Will be resolved in spatial join stage
        centroid_lat: f.geometry?.rings
          ? avgCoord(f.geometry.rings, 1)
          : f.geometry?.y,
        centroid_lng: f.geometry?.rings
          ? avgCoord(f.geometry.rings, 0)
          : f.geometry?.x,
      }));

      const { error: upsertErr } = await supabase.from("gis_features").insert(rows);

      if (upsertErr) {
        console.error("Upsert error:", upsertErr);
        lastError = upsertErr.message;
      }

      const maxOid = Math.max(...features.map((f: any) => f.attributes?.OBJECTID || 0));
      cursor = maxOid;
      totalFetched += features.length;
      totalUpserted += upsertErr ? 0 : features.length;
      pagesProcessed++;

      // Update job progress
      await supabase
        .from("gis_ingest_jobs")
        .update({
          cursor_offset: cursor,
          total_fetched: totalFetched,
          total_upserted: totalUpserted,
          pages_processed: pagesProcessed,
          last_error: lastError,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      // Emit page event
      await emitEvent(supabase, job.id, "page_complete", {
        page: pagesProcessed,
        fetched: features.length,
        cursor,
      });

      // Backoff
      await new Promise((r) => setTimeout(r, BACKOFF_MS));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`Page ${pagesProcessed + 1} failed:`, lastError);

      await supabase
        .from("gis_ingest_jobs")
        .update({
          status: "failed",
          last_error: lastError,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await emitEvent(supabase, job.id, "error", { error: lastError, page: pagesProcessed + 1 });

      return {
        status: "failed",
        jobId: job.id,
        error: lastError,
        totalFetched,
        totalUpserted,
        pagesProcessed,
      };
    }
  }

  // Time budget or page limit reached — pause
  await supabase
    .from("gis_ingest_jobs")
    .update({
      status: "paused",
      cursor_offset: cursor,
      total_fetched: totalFetched,
      total_upserted: totalUpserted,
      pages_processed: pagesProcessed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return {
    status: "paused",
    jobId: job.id,
    totalFetched,
    totalUpserted,
    pagesProcessed,
    cursor,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function avgCoord(rings: number[][][], idx: number): number | null {
  try {
    const coords = rings[0];
    if (!coords || coords.length === 0) return null;
    const sum = coords.reduce((acc, c) => acc + (c[idx] || 0), 0);
    return sum / coords.length;
  } catch {
    return null;
  }
}

async function emitEvent(supabase: any, jobId: string, eventType: string, payload: any) {
  await supabase.from("gis_ingest_job_events").insert({
    job_id: jobId,
    event_type: eventType,
    payload,
  });
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

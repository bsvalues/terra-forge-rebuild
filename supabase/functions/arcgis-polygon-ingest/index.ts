// TerraFusion OS — ArcGIS Polygon Layer Ingester (Bulk Mode, Resumable)
// Pages through ArcGIS FeatureServer (2K/batch), requests GeoJSON in WGS84,
// and bulk-upserts via upsert_parcel_polygons_bulk RPC (one call per page).
// Supports startOffset, time-budget cutoff, and inter-page backoff.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IngestRequest {
  featureServerUrl: string;
  countyId: string;
  parcelIdField?: string;
  maxPages?: number;
  startOffset?: number;
}

// Time budget: stop before platform timeout (25s safe margin)
const TIME_BUDGET_MS = 25_000;
// Inter-page backoff to prevent DB pool saturation
const PAGE_BACKOFF_MS = 150;

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
    const body: IngestRequest = await req.json();
    const {
      featureServerUrl,
      countyId,
      parcelIdField = "Parcel_ID",
      maxPages = 5,
      startOffset = 0,
    } = body;

    if (!featureServerUrl || !countyId) {
      return new Response(
        JSON.stringify({ error: "featureServerUrl and countyId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const u = new URL(featureServerUrl);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad");
    } catch {
      return new Response(
        JSON.stringify({ error: "featureServerUrl must be valid HTTP(S)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[arcgis-polygon-ingest] Admin ${auth.userId} ingesting from offset ${startOffset}: ${featureServerUrl}`);

    const started = Date.now();

    // 1) Register layer in gis_layers
    let layerId: string;
    const { data: existingLayer } = await supabase
      .from("gis_layers")
      .select("id")
      .eq("name", "ParcelsAndAssess")
      .limit(1)
      .maybeSingle();

    if (existingLayer) {
      layerId = existingLayer.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("gis_layers")
        .insert({
          name: "ParcelsAndAssess",
          layer_type: "polygon",
          srid: 4326,
          file_format: "arcgis_featureserver",
          properties_schema: { parcel_id_field: parcelIdField, source_url: featureServerUrl },
        })
        .select("id")
        .single();
      if (insertErr) throw new Error(`Failed to register layer: ${insertErr.message}`);
      layerId = inserted.id;
    }

    // 2) Page through ArcGIS FeatureServer
    const pageSize = 2000;
    let offset = startOffset;
    let totalFetched = 0;
    let totalUpserted = 0;
    let totalMatched = 0;
    let page = 0;
    let hasMore = true;
    let timeBudgetExceeded = false;

    // Only request essential fields to reduce payload
    const outFields = [
      parcelIdField, "neighborhood_code", "GlobalID", "OBJECTID",
    ].join(",");

    while (hasMore && page < maxPages) {
      // Time budget check
      if (Date.now() - started > TIME_BUDGET_MS) {
        console.log(`[arcgis-polygon-ingest] Time budget exceeded at page ${page + 1}, stopping.`);
        timeBudgetExceeded = true;
        break;
      }

      const queryUrl =
        `${featureServerUrl}/query?where=1%3D1` +
        `&outFields=${encodeURIComponent(outFields)}` +
        `&returnGeometry=true&outSR=4326&f=geojson` +
        `&resultOffset=${offset}&resultRecordCount=${pageSize}`;

      console.log(`[arcgis-polygon-ingest] Page ${page + 1}, offset ${offset}`);

      const resp = await fetch(queryUrl);
      if (!resp.ok) throw new Error(`ArcGIS query failed: ${resp.status}`);
      const geojson = await resp.json();
      if (geojson.error) throw new Error(`ArcGIS error: ${geojson.error.message || JSON.stringify(geojson.error)}`);

      const features = geojson.features || [];
      if (features.length === 0) { hasMore = false; break; }

      // 3) Build slim bulk rows (only essential props)
      const rows: { parcel_number: string; source_object_id: string; geom: unknown; props: unknown }[] = [];

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

        // Slim props: only what we write-through
        const propsLite = {
          [parcelIdField]: parcelNumStr,
          neighborhood_code: props.neighborhood_code ?? null,
          GlobalID: props.GlobalID ?? null,
          OBJECTID: props.OBJECTID ?? null,
        };

        rows.push({
          parcel_number: parcelNumStr,
          source_object_id: sourceObjId,
          geom: multiGeom,
          props: propsLite,
        });
      }

      // 4) Bulk upsert via RPC
      if (rows.length > 0) {
        const { data: bulkRes, error: bulkErr } = await supabase.rpc(
          "upsert_parcel_polygons_bulk",
          { p_county_id: countyId, p_layer_id: layerId, p_rows: rows }
        );

        if (bulkErr) {
          console.error(`[arcgis-polygon-ingest] Bulk error page ${page + 1}: ${bulkErr.message}`);
          throw new Error(`Bulk upsert failed on page ${page + 1}: ${bulkErr.message}`);
        }

        const res = bulkRes as { upserted_features: number; matched_parcels: number } | null;
        totalUpserted += res?.upserted_features ?? 0;
        totalMatched += res?.matched_parcels ?? 0;
      }

      totalFetched += features.length;
      offset += features.length;
      page++;
      hasMore = features.length === pageSize;

      console.log(
        `[arcgis-polygon-ingest] Progress: ${totalFetched} fetched, ${totalUpserted} upserted, ${totalMatched} matched (${Date.now() - started}ms elapsed)`
      );

      // Inter-page backoff to let DB breathe
      if (hasMore && page < maxPages) {
        await new Promise(r => setTimeout(r, PAGE_BACKOFF_MS));
      }
    }

    // 5) Update layer metadata
    await supabase
      .from("gis_layers")
      .update({ feature_count: startOffset + totalFetched, updated_at: new Date().toISOString() })
      .eq("id", layerId);

    // 6) Trace event
    await supabase.from("trace_events" as any).insert({
      county_id: countyId,
      source_module: "arcgis-polygon-ingest",
      event_type: "layer_ingested",
      event_data: {
        layer_id: layerId,
        feature_server_url: featureServerUrl,
        total_fetched: totalFetched,
        total_upserted: totalUpserted,
        total_matched: totalMatched,
        pages_processed: page,
        start_offset: startOffset,
        next_offset: hasMore ? offset : null,
        time_budget_exceeded: timeBudgetExceeded,
        elapsed_ms: Date.now() - started,
        parcel_id_field: parcelIdField,
      },
    });

    const summary = {
      success: true,
      layerId,
      totalFetched,
      totalUpserted,
      totalMatched,
      pagesProcessed: page,
      startOffset,
      nextOffset: hasMore ? offset : null,
      done: !hasMore,
      timeBudgetExceeded,
      elapsedMs: Date.now() - started,
    };

    console.log(`[arcgis-polygon-ingest] Complete:`, JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[arcgis-polygon-ingest] Fatal:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

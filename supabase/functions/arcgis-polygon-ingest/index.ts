// TerraFusion OS — ArcGIS Polygon Layer Ingester
// Pages through ArcGIS FeatureServer, requests GeoJSON in WGS84 (outSR=4326),
// and upserts parcel polygons via upsert_parcel_polygon RPC.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IngestRequest {
  featureServerUrl: string;
  layerId?: string;
  countyId: string;
  parcelIdField?: string; // ArcGIS attribute name for parcel number
  maxPages?: number; // safety cap (default 100 = 200K features)
}

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
      maxPages = 100,
    } = body;

    if (!featureServerUrl || !countyId) {
      return new Response(
        JSON.stringify({ error: "featureServerUrl and countyId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL
    try {
      const u = new URL(featureServerUrl);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad");
    } catch {
      return new Response(
        JSON.stringify({ error: "featureServerUrl must be valid HTTP(S)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[arcgis-polygon-ingest] Admin ${auth.userId} ingesting polygons from: ${featureServerUrl}`);

    // 1) Register layer in gis_layers
    const { data: layerRow, error: layerErr } = await supabase
      .from("gis_layers")
      .upsert(
        {
          name: "ParcelsAndAssess",
          layer_type: "polygon",
          srid: 4326, // we request outSR=4326
          file_format: "arcgis_featureserver",
          properties_schema: { parcel_id_field: parcelIdField },
        },
        { onConflict: "name" }
      )
      .select("id")
      .single();

    // If upsert fails due to no unique constraint on name, just insert
    let layerId: string;
    if (layerErr) {
      const { data: inserted, error: insertErr } = await supabase
        .from("gis_layers")
        .insert({
          name: "ParcelsAndAssess",
          layer_type: "polygon",
          srid: 4326,
          file_format: "arcgis_featureserver",
          properties_schema: { parcel_id_field: parcelIdField },
        })
        .select("id")
        .single();
      if (insertErr) throw new Error(`Failed to register layer: ${insertErr.message}`);
      layerId = inserted.id;
    } else {
      layerId = layerRow.id;
    }

    console.log(`[arcgis-polygon-ingest] Layer registered: ${layerId}`);

    // 2) Page through ArcGIS FeatureServer
    //    Request GeoJSON format with outSR=4326 so we get WGS84 directly
    const pageSize = 2000; // maxRecordCount for this service
    let offset = 0;
    let totalFetched = 0;
    let totalMatched = 0;
    let totalUnmatched = 0;
    let page = 0;
    let hasMore = true;

    // Build outFields list — get key assessment fields too
    const outFields = [
      parcelIdField,
      "owner_name",
      "situs_address",
      "neighborhood_code",
      "neighborhood_name",
      "appraised_val",
      "legal_acres",
      "land_sqft",
      "year_blt",
      "primary_use",
      "tax_code_area",
      "geo_id",
      "GlobalID",
      "OBJECTID",
    ].join(",");

    while (hasMore && page < maxPages) {
      const queryUrl =
        `${featureServerUrl}/query?` +
        `where=1%3D1` +
        `&outFields=${encodeURIComponent(outFields)}` +
        `&returnGeometry=true` +
        `&outSR=4326` +
        `&f=geojson` +
        `&resultOffset=${offset}` +
        `&resultRecordCount=${pageSize}`;

      console.log(`[arcgis-polygon-ingest] Page ${page + 1}, offset ${offset}`);

      const resp = await fetch(queryUrl);
      if (!resp.ok) throw new Error(`ArcGIS query failed: ${resp.status} ${resp.statusText}`);

      const geojson = await resp.json();

      if (geojson.error) {
        throw new Error(`ArcGIS error: ${geojson.error.message || JSON.stringify(geojson.error)}`);
      }

      const features = geojson.features || [];
      if (features.length === 0) {
        hasMore = false;
        break;
      }

      // 3) Process each feature — call upsert_parcel_polygon RPC
      for (const feature of features) {
        const props = feature.properties || {};
        const parcelNumber = props[parcelIdField];
        if (!parcelNumber) {
          totalUnmatched++;
          continue;
        }

        const parcelNumStr = String(parcelNumber).trim();
        if (!parcelNumStr) {
          totalUnmatched++;
          continue;
        }

        // The geometry is already GeoJSON in WGS84
        const geojsonGeom = feature.geometry;
        if (!geojsonGeom) {
          totalUnmatched++;
          continue;
        }

        // Ensure it's a proper polygon/multipolygon
        if (geojsonGeom.type !== "Polygon" && geojsonGeom.type !== "MultiPolygon") {
          totalUnmatched++;
          continue;
        }

        // Convert Polygon to MultiPolygon for consistency
        const multiGeom =
          geojsonGeom.type === "Polygon"
            ? { type: "MultiPolygon", coordinates: [geojsonGeom.coordinates] }
            : geojsonGeom;

        const sourceObjId = props.GlobalID || String(props.OBJECTID || "");

        const { data: result, error: rpcErr } = await supabase.rpc(
          "upsert_parcel_polygon",
          {
            p_county_id: countyId,
            p_layer_id: layerId,
            p_parcel_number: parcelNumStr,
            p_geojson_geometry: multiGeom,
            p_properties: props,
            p_source_object_id: sourceObjId,
          }
        );

        if (rpcErr) {
          console.error(`[arcgis-polygon-ingest] RPC error for ${parcelNumStr}: ${rpcErr.message}`);
          totalUnmatched++;
        } else {
          const res = result as { matched: boolean };
          if (res?.matched) {
            totalMatched++;
          } else {
            totalUnmatched++;
          }
        }
      }

      totalFetched += features.length;
      offset += features.length;
      page++;

      // Check if there are more
      hasMore = features.length === pageSize;

      // Log progress every page
      console.log(
        `[arcgis-polygon-ingest] Progress: ${totalFetched} fetched, ${totalMatched} matched, ${totalUnmatched} unmatched`
      );
    }

    // 4) Update layer feature count
    await supabase
      .from("gis_layers")
      .update({ feature_count: totalFetched, updated_at: new Date().toISOString() })
      .eq("id", layerId);

    // 5) Emit trace event
    await supabase.from("trace_events" as any).insert({
      county_id: countyId,
      source_module: "arcgis-polygon-ingest",
      event_type: "layer_ingested",
      event_data: {
        layer_id: layerId,
        feature_server_url: featureServerUrl,
        total_fetched: totalFetched,
        total_matched: totalMatched,
        total_unmatched: totalUnmatched,
        pages_processed: page,
        parcel_id_field: parcelIdField,
      },
    });

    const summary = {
      success: true,
      layerId,
      totalFetched,
      totalMatched,
      totalUnmatched,
      pagesProcessed: page,
      parcelIdField,
    };

    console.log(`[arcgis-polygon-ingest] Complete:`, JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[arcgis-polygon-ingest] Fatal:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { requireAdmin, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  sourceId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin for GIS sync
    let auth;
    try {
      auth = await requireAdmin(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const supabase = createServiceClient();

    const { sourceId }: SyncRequest = await req.json();

    if (!sourceId || typeof sourceId !== "string") {
      return new Response(JSON.stringify({ error: "sourceId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[gis-sync] Admin ${auth.userId} syncing source: ${sourceId}`);

    const { data: source, error: sourceError } = await supabase
      .from("gis_data_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) throw new Error("Data source not found");

    await supabase.from("gis_data_sources").update({ sync_status: "syncing", sync_error: null }).eq("id", sourceId);

    let result;
    try {
      switch (source.source_type) {
        case "ftp": result = await syncFTPSource(supabase, source); break;
        case "arcgis": result = await syncArcGISSource(supabase, source); break;
        default: throw new Error(`Unsupported source type: ${source.source_type}`);
      }

      await supabase.from("gis_data_sources").update({
        sync_status: "success", last_sync_at: new Date().toISOString(),
        metadata: { ...source.metadata, lastSyncResult: result },
      }).eq("id", sourceId);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (syncError: any) {
      await supabase.from("gis_data_sources").update({ sync_status: "error", sync_error: syncError.message }).eq("id", sourceId);
      throw syncError;
    }
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncFTPSource(supabase: any, source: any) {
  const url = source.connection_url;
  if (!url) throw new Error("FTP URL not configured");
  console.log(`Syncing FTP source: ${url}`);
  const simulatedFiles = [
    { name: "parcels_2024.shp", size: 15000000, modified: new Date().toISOString() },
    { name: "parcels_2024.dbf", size: 8000000, modified: new Date().toISOString() },
    { name: "parcels_2024.shx", size: 500000, modified: new Date().toISOString() },
    { name: "boundaries.geojson", size: 2000000, modified: new Date().toISOString() },
  ];
  const shapefileGroups = new Map<string, string[]>();
  simulatedFiles.forEach((file) => {
    const baseName = file.name.replace(/\.(shp|shx|dbf|prj)$/i, "");
    if (!shapefileGroups.has(baseName)) shapefileGroups.set(baseName, []);
    shapefileGroups.get(baseName)!.push(file.name);
  });
  return { filesDiscovered: simulatedFiles.length, layersIdentified: shapefileGroups.size, message: "FTP sync simulation complete." };
}

async function syncArcGISSource(supabase: any, source: any) {
  const url = source.connection_url;
  if (!url) throw new Error("ArcGIS endpoint not configured");
  // Validate URL
  try { const u = new URL(url); if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad"); } catch { throw new Error("Invalid ArcGIS URL"); }

  console.log(`Syncing ArcGIS source: ${url}`);
  const metadataUrl = `${url}?f=json`;
  const metaResponse = await fetch(metadataUrl);
  if (!metaResponse.ok) throw new Error(`Failed to fetch ArcGIS metadata: ${metaResponse.status}`);
  const metadata = await metaResponse.json();

  if (metadata.layers && Array.isArray(metadata.layers)) {
    const layerResults = [];
    for (const layer of metadata.layers) {
      const { data: existingLayer } = await supabase.from("gis_layers").select("id").eq("data_source_id", source.id).eq("name", layer.name).single();
      const layerRecord = { data_source_id: source.id, name: layer.name, layer_type: getLayerType(layer.geometryType), file_format: "arcgis" as any, properties_schema: { arcgisId: layer.id } };
      if (existingLayer) await supabase.from("gis_layers").update(layerRecord).eq("id", existingLayer.id);
      else await supabase.from("gis_layers").insert(layerRecord);

      const featuresUrl = `${url}/${layer.id}/query?where=1=1&outFields=*&f=geojson&resultRecordCount=1000`;
      const featuresResponse = await fetch(featuresUrl);
      if (featuresResponse.ok) {
        const geojson = await featuresResponse.json();
        if (geojson.features) {
          const { data: layerData } = await supabase.from("gis_layers").select("id").eq("data_source_id", source.id).eq("name", layer.name).single();
          if (layerData) {
            await supabase.from("gis_features").delete().eq("layer_id", layerData.id);
            const features = geojson.features.map((f: any) => ({ layer_id: layerData.id, geometry_type: f.geometry?.type || "Point", coordinates: f.geometry?.coordinates || [], properties: f.properties || {}, centroid_lat: getCentroidLat(f.geometry), centroid_lng: getCentroidLng(f.geometry) }));
            for (let i = 0; i < features.length; i += 100) await supabase.from("gis_features").insert(features.slice(i, i + 100));
            await supabase.from("gis_layers").update({ feature_count: features.length }).eq("id", layerData.id);
            layerResults.push({ name: layer.name, featuresImported: features.length });
          }
        }
      }
    }
    return { serviceName: metadata.name || "ArcGIS Service", layersProcessed: layerResults.length, layers: layerResults };
  }
  return { message: "ArcGIS service metadata retrieved", metadata };
}

function getLayerType(geometryType: string): "point" | "line" | "polygon" | "parcel" | "boundary" {
  switch (geometryType) {
    case "esriGeometryPoint": case "esriGeometryMultipoint": return "point";
    case "esriGeometryPolyline": return "line";
    default: return "polygon";
  }
}

function getCentroidLat(geometry: any): number | null {
  if (!geometry?.coordinates) return null;
  if (geometry.type === "Point") return geometry.coordinates[1];
  const coords = flattenCoords(geometry.coordinates);
  return coords.length === 0 ? null : coords.reduce((s, c) => s + c[1], 0) / coords.length;
}

function getCentroidLng(geometry: any): number | null {
  if (!geometry?.coordinates) return null;
  if (geometry.type === "Point") return geometry.coordinates[0];
  const coords = flattenCoords(geometry.coordinates);
  return coords.length === 0 ? null : coords.reduce((s, c) => s + c[0], 0) / coords.length;
}

function flattenCoords(coords: any, result: number[][] = []): number[][] {
  if (!Array.isArray(coords)) return result;
  if (typeof coords[0] === "number") { result.push(coords as number[]); }
  else { for (const c of coords) flattenCoords(c, result); }
  return result;
}

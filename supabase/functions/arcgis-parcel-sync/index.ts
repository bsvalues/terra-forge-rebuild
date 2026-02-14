import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { requireAdmin, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  arcgisUrl: string;
  parcelNumberField?: string;
  sourceId?: string;
  maxFeatures?: number;
}

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: {
    x?: number;
    y?: number;
    rings?: number[][][];
    paths?: number[][][];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin for ArcGIS sync
    let auth;
    try {
      auth = await requireAdmin(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const supabase = createServiceClient();

    const { arcgisUrl, parcelNumberField = "PARCEL_ID", sourceId, maxFeatures = 5000 }: SyncRequest = await req.json();

    // Input validation
    if (!arcgisUrl || typeof arcgisUrl !== "string") {
      return new Response(JSON.stringify({ success: false, error: "arcgisUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const u = new URL(arcgisUrl);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad");
    } catch {
      return new Response(JSON.stringify({ success: false, error: "arcgisUrl must be a valid HTTP/HTTPS URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof parcelNumberField !== "string" || parcelNumberField.length > 100) {
      return new Response(JSON.stringify({ success: false, error: "Invalid parcelNumberField" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[arcgis-parcel-sync] Admin ${auth.userId} syncing from: ${arcgisUrl}`);

    if (sourceId) {
      await supabase.from("gis_data_sources").update({ sync_status: "syncing", sync_error: null }).eq("id", sourceId);
    }

    const metaUrl = arcgisUrl.includes("?") ? arcgisUrl : `${arcgisUrl}?f=json`;
    const metaResponse = await fetch(metaUrl);
    if (!metaResponse.ok) throw new Error(`Failed to fetch ArcGIS metadata: ${metaResponse.status}`);
    const metadata = await metaResponse.json();
    if (metadata.error) throw new Error(`ArcGIS error: ${metadata.error.message || JSON.stringify(metadata.error)}`);

    const fields = metadata.fields || [];
    const parcelField = fields.find((f: { name: string }) =>
      f.name.toUpperCase() === parcelNumberField.toUpperCase() ||
      f.name.toUpperCase().includes("PARCEL") ||
      f.name.toUpperCase().includes("PIN") ||
      f.name.toUpperCase().includes("APN")
    );
    const actualParcelField = parcelField?.name || parcelNumberField;

    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;
    const pageSize = 500;
    let hasMore = true;
    const featureLimit = Math.min(maxFeatures, 10000);

    while (hasMore && allFeatures.length < featureLimit) {
      const remaining = featureLimit - allFeatures.length;
      const batchSize = Math.min(pageSize, remaining);
      const queryUrl = `${arcgisUrl}/query?where=1=1&outFields=${encodeURIComponent(actualParcelField)}&returnGeometry=true&outSR=4326&f=json&resultOffset=${offset}&resultRecordCount=${batchSize}`;
      const queryResponse = await fetch(queryUrl);
      if (!queryResponse.ok) throw new Error(`Query failed: ${queryResponse.status}`);
      const queryResult = await queryResponse.json();
      if (queryResult.error) throw new Error(`Query error: ${queryResult.error.message}`);
      const features = queryResult.features || [];
      allFeatures = allFeatures.concat(features);
      hasMore = features.length === batchSize && queryResult.exceededTransferLimit !== false;
      offset += batchSize;
    }

    const updateMap = new Map<string, { lat: number; lng: number }>();
    for (const feature of allFeatures) {
      const parcelNum = feature.attributes[actualParcelField];
      if (!parcelNum) continue;
      const parcelNumStr = String(parcelNum).trim();
      const coords = extractCentroid(feature.geometry, metadata.geometryType);
      if (coords && parcelNumStr) updateMap.set(parcelNumStr, coords);
    }

    const { data: existingParcels, error: fetchError } = await supabase.from("parcels").select("id, parcel_number, latitude, longitude").limit(10000);
    if (fetchError) throw new Error(`Failed to fetch parcels: ${fetchError.message}`);

    let matchedCount = 0;
    let updatedCount = 0;
    const updates: { id: string; latitude: number; longitude: number }[] = [];

    for (const parcel of existingParcels || []) {
      let coords = updateMap.get(parcel.parcel_number);
      if (!coords) coords = updateMap.get(parcel.parcel_number.replace(/^0+/, ""));
      if (!coords) coords = updateMap.get(parcel.parcel_number.replace(/-/g, ""));
      if (coords) {
        matchedCount++;
        if (parcel.latitude !== coords.lat || parcel.longitude !== coords.lng) {
          updates.push({ id: parcel.id, latitude: coords.lat, longitude: coords.lng });
        }
      }
    }

    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(u => supabase.from("parcels").update({ latitude: u.latitude, longitude: u.longitude }).eq("id", u.id)));
      updatedCount += results.filter(r => !r.error).length;
    }

    const result = { success: true, featuresRetrieved: allFeatures.length, centroidsExtracted: updateMap.size, parcelsMatched: matchedCount, parcelsUpdated: updatedCount, parcelFieldUsed: actualParcelField };

    if (sourceId) {
      await supabase.from("gis_data_sources").update({ sync_status: "success", last_sync_at: new Date().toISOString(), sync_error: null, metadata: { lastSyncResult: result } }).eq("id", sourceId);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("ArcGIS sync error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractCentroid(geometry: ArcGISFeature["geometry"], geometryType?: string): { lat: number; lng: number } | null {
  if (!geometry) return null;
  if (geometry.x !== undefined && geometry.y !== undefined) return { lat: geometry.y, lng: geometry.x };
  if (geometry.rings && geometry.rings.length > 0) {
    const ring = geometry.rings[0];
    if (ring.length === 0) return null;
    let sumX = 0, sumY = 0;
    for (const coord of ring) { sumX += coord[0]; sumY += coord[1]; }
    return { lat: sumY / ring.length, lng: sumX / ring.length };
  }
  if (geometry.paths && geometry.paths.length > 0) {
    const path = geometry.paths[0];
    if (path.length === 0) return null;
    const midIdx = Math.floor(path.length / 2);
    return { lat: path[midIdx][1], lng: path[midIdx][0] };
  }
  return null;
}

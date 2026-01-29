import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  arcgisUrl: string;
  parcelNumberField?: string; // Field name in ArcGIS that contains parcel number
  sourceId?: string; // Optional: link to gis_data_sources record
  maxFeatures?: number; // Limit features to process (default: 5000)
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { arcgisUrl, parcelNumberField = "PARCEL_ID", sourceId, maxFeatures = 5000 }: SyncRequest = await req.json();

    if (!arcgisUrl) {
      throw new Error("arcgisUrl is required");
    }

    console.log(`Starting ArcGIS parcel sync from: ${arcgisUrl}`);
    console.log(`Using parcel number field: ${parcelNumberField}`);

    // Update source status if provided
    if (sourceId) {
      await supabase
        .from("gis_data_sources")
        .update({ sync_status: "syncing", sync_error: null })
        .eq("id", sourceId);
    }

    // Step 1: Query service metadata to get fields and geometry type
    const metaUrl = arcgisUrl.includes("?") ? arcgisUrl : `${arcgisUrl}?f=json`;
    console.log(`Fetching metadata from: ${metaUrl}`);
    
    const metaResponse = await fetch(metaUrl);
    if (!metaResponse.ok) {
      throw new Error(`Failed to fetch ArcGIS metadata: ${metaResponse.status}`);
    }
    const metadata = await metaResponse.json();
    
    if (metadata.error) {
      throw new Error(`ArcGIS error: ${metadata.error.message || JSON.stringify(metadata.error)}`);
    }

    console.log(`Service name: ${metadata.name}, Geometry type: ${metadata.geometryType}`);

    // Find the parcel number field (case-insensitive search)
    const fields = metadata.fields || [];
    const parcelField = fields.find((f: { name: string }) => 
      f.name.toUpperCase() === parcelNumberField.toUpperCase() ||
      f.name.toUpperCase().includes("PARCEL") ||
      f.name.toUpperCase().includes("PIN") ||
      f.name.toUpperCase().includes("APN")
    );
    
    const actualParcelField = parcelField?.name || parcelNumberField;
    console.log(`Resolved parcel field: ${actualParcelField}`);

    // Step 2: Query features with pagination (limited for CPU constraints)
    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;
    const pageSize = 500; // Smaller pages for efficiency
    let hasMore = true;
    const featureLimit = Math.min(maxFeatures, 10000); // Cap at 10k per request

    console.log(`Fetching up to ${featureLimit} features...`);

    while (hasMore && allFeatures.length < featureLimit) {
      const remaining = featureLimit - allFeatures.length;
      const batchSize = Math.min(pageSize, remaining);
      
      const queryUrl = `${arcgisUrl}/query?where=1=1&outFields=${actualParcelField}&returnGeometry=true&outSR=4326&f=json&resultOffset=${offset}&resultRecordCount=${batchSize}`;
      
      const queryResponse = await fetch(queryUrl);
      if (!queryResponse.ok) {
        throw new Error(`Query failed: ${queryResponse.status}`);
      }
      
      const queryResult = await queryResponse.json();
      
      if (queryResult.error) {
        throw new Error(`Query error: ${queryResult.error.message}`);
      }

      const features = queryResult.features || [];
      allFeatures = allFeatures.concat(features);
      
      hasMore = features.length === batchSize && queryResult.exceededTransferLimit !== false;
      offset += batchSize;

      console.log(`Fetched ${allFeatures.length}/${featureLimit} features`);
    }

    console.log(`Total features retrieved: ${allFeatures.length}`);

    // Step 3: Extract centroids and build update map
    const updateMap = new Map<string, { lat: number; lng: number }>();

    for (const feature of allFeatures) {
      const parcelNum = feature.attributes[actualParcelField];
      if (!parcelNum) continue;

      const parcelNumStr = String(parcelNum).trim();
      const coords = extractCentroid(feature.geometry, metadata.geometryType);
      
      if (coords && parcelNumStr) {
        updateMap.set(parcelNumStr, coords);
      }
    }

    console.log(`Extracted centroids for ${updateMap.size} parcels`);

    // Step 4: Fetch existing parcels from database
    const { data: existingParcels, error: fetchError } = await supabase
      .from("parcels")
      .select("id, parcel_number, latitude, longitude")
      .limit(10000);

    if (fetchError) {
      throw new Error(`Failed to fetch parcels: ${fetchError.message}`);
    }

    console.log(`Found ${existingParcels?.length || 0} parcels in database`);

    // Step 5: Match and update parcels
    let matchedCount = 0;
    let updatedCount = 0;
    const updates: { id: string; latitude: number; longitude: number }[] = [];

    for (const parcel of existingParcels || []) {
      // Try exact match first
      let coords = updateMap.get(parcel.parcel_number);
      
      // Try without leading zeros
      if (!coords) {
        const normalized = parcel.parcel_number.replace(/^0+/, "");
        coords = updateMap.get(normalized);
      }
      
      // Try with common formatting variations
      if (!coords) {
        const noHyphens = parcel.parcel_number.replace(/-/g, "");
        coords = updateMap.get(noHyphens);
      }

      if (coords) {
        matchedCount++;
        
        // Only update if coordinates are different or missing
        if (parcel.latitude !== coords.lat || parcel.longitude !== coords.lng) {
          updates.push({
            id: parcel.id,
            latitude: coords.lat,
            longitude: coords.lng,
          });
        }
      }
    }

    console.log(`Matched ${matchedCount} parcels, ${updates.length} need coordinate updates`);

    // Step 6: Batch update parcels using upsert for efficiency
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // Update in parallel within batch
      const results = await Promise.all(
        batch.map(update =>
          supabase
            .from("parcels")
            .update({ latitude: update.latitude, longitude: update.longitude })
            .eq("id", update.id)
        )
      );
      
      updatedCount += results.filter(r => !r.error).length;
    }

    const result = {
      success: true,
      featuresRetrieved: allFeatures.length,
      centroidsExtracted: updateMap.size,
      parcelsMatched: matchedCount,
      parcelsUpdated: updatedCount,
      parcelFieldUsed: actualParcelField,
    };

    console.log("Sync complete:", result);

    // Update source status if provided
    if (sourceId) {
      await supabase
        .from("gis_data_sources")
        .update({
          sync_status: "success",
          last_sync_at: new Date().toISOString(),
          sync_error: null,
          metadata: { lastSyncResult: result },
        })
        .eq("id", sourceId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("ArcGIS sync error:", errorMessage);

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractCentroid(
  geometry: ArcGISFeature["geometry"],
  geometryType?: string
): { lat: number; lng: number } | null {
  if (!geometry) return null;

  // Point geometry - direct coordinates
  if (geometry.x !== undefined && geometry.y !== undefined) {
    return { lat: geometry.y, lng: geometry.x };
  }

  // Polygon geometry - calculate centroid from rings
  if (geometry.rings && geometry.rings.length > 0) {
    const ring = geometry.rings[0]; // Use exterior ring
    if (ring.length === 0) return null;

    let sumX = 0;
    let sumY = 0;
    for (const coord of ring) {
      sumX += coord[0];
      sumY += coord[1];
    }
    return {
      lat: sumY / ring.length,
      lng: sumX / ring.length,
    };
  }

  // Polyline geometry - midpoint
  if (geometry.paths && geometry.paths.length > 0) {
    const path = geometry.paths[0];
    if (path.length === 0) return null;

    const midIdx = Math.floor(path.length / 2);
    return {
      lat: path[midIdx][1],
      lng: path[midIdx][0],
    };
  }

  return null;
}

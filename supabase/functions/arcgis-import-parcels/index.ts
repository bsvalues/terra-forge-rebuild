import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  arcgisUrl: string;
  maxFeatures?: number;
}

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: {
    rings?: number[][][];
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

    const { arcgisUrl, maxFeatures = 2000 }: ImportRequest = await req.json();

    if (!arcgisUrl) {
      throw new Error("arcgisUrl is required");
    }

    console.log(`Importing parcels from: ${arcgisUrl}`);

    // Fields to fetch from ArcGIS
    const outFields = [
      "Parcel_ID", "situs_address", "appraised_val", "neighborhood_code",
      "neighborhood_name", "land_sqft", "year_blt", "primary_use",
      "CENTROID_X", "CENTROID_Y", "owner_name", "legal_acres"
    ].join(",");

    // Fetch features with pagination
    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore && allFeatures.length < maxFeatures) {
      const remaining = maxFeatures - allFeatures.length;
      const batchSize = Math.min(pageSize, remaining);

      const queryUrl = `${arcgisUrl}/query?where=1=1&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json&resultOffset=${offset}&resultRecordCount=${batchSize}`;

      const response = await fetch(queryUrl);
      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(`ArcGIS error: ${result.error.message}`);
      }

      const features = result.features || [];
      allFeatures = allFeatures.concat(features);

      hasMore = features.length === batchSize;
      offset += batchSize;

      console.log(`Fetched ${allFeatures.length}/${maxFeatures} features`);
    }

    console.log(`Total features: ${allFeatures.length}`);

    // Map ArcGIS primary_use to our property_class values
    const mapPropertyClass = (primaryUse: string | null): string | null => {
      if (!primaryUse) return null;
      const use = primaryUse.toUpperCase();
      if (use.includes("RES") || use.includes("SFR") || use.includes("MFR") || use === "R" || use === "R1" || use === "R2") {
        return "residential";
      } else if (use.includes("COM") || use.includes("OFF") || use.includes("RET") || use === "C") {
        return "commercial";
      } else if (use.includes("IND") || use.includes("MAN") || use.includes("WAR") || use === "I") {
        return "industrial";
      } else if (use.includes("AG") || use.includes("FARM") || use.includes("RAN") || use === "A") {
        return "agricultural";
      } else if (use.includes("VAC") || use.includes("UND") || use === "V") {
        return "vacant";
      }
      return null; // Let it be null if we can't map it
    };

    // Transform to parcels format
    const parcels = allFeatures.map((feature) => {
      const attrs = feature.attributes;
      
      // Calculate centroid from geometry if not provided
      let lat = null;
      let lng = null;
      
      if (feature.geometry?.rings && feature.geometry.rings.length > 0) {
        const ring = feature.geometry.rings[0];
        if (ring.length > 0) {
          let sumX = 0, sumY = 0;
          for (const coord of ring) {
            sumX += coord[0];
            sumY += coord[1];
          }
          lng = sumX / ring.length;
          lat = sumY / ring.length;
        }
      }

      return {
        parcel_number: String(attrs.Parcel_ID || ""),
        address: String(attrs.situs_address || "Unknown"),
        assessed_value: Number(attrs.appraised_val) || 0,
        neighborhood_code: attrs.neighborhood_code ? String(attrs.neighborhood_code) : null,
        land_area: attrs.land_sqft ? Number(attrs.land_sqft) : (attrs.legal_acres ? Number(attrs.legal_acres) * 43560 : null),
        year_built: attrs.year_blt ? Number(attrs.year_blt) : null,
        property_class: mapPropertyClass(attrs.primary_use as string | null),
        latitude: lat,
        longitude: lng,
        state: "WA",
      };
    }).filter(p => p.parcel_number && p.assessed_value > 0);

    console.log(`Valid parcels to insert: ${parcels.length}`);

    // Insert in batches
    let insertedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < parcels.length; i += batchSize) {
      const batch = parcels.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from("parcels")
        .insert(batch);

      if (error) {
        console.error(`Batch insert error at ${i}:`, error.message);
      } else {
        insertedCount += batch.length;
      }
    }

    const result = {
      success: true,
      featuresRetrieved: allFeatures.length,
      parcelsInserted: insertedCount,
    };

    console.log("Import complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Import error:", errorMessage);

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

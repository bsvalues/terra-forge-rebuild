// TerraFusion OS — Spatial Healing Edge Function (v2)
// Fetches SLCO parcel centroids + LIR characteristics from UGRC SGID
// Uses bulk_spatial_heal RPC for high-performance updates
// "I healed the parcels. They were broken inside." — Ralph Wiggum

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UGRC_LIR_URL =
  "https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query";

const PAGE_SIZE = 2000;

interface UGRCFeature {
  attributes: {
    OBJECTID: number;
    PARCEL_ID: string;
    PARCEL_ADD?: string;
    PARCEL_CITY?: string;
    BLDG_SQFT?: number;
    BUILT_YR?: number;
    PROP_CLASS?: string;
    PARCEL_ACRES?: number;
    TOTAL_MKT_VALUE?: number;
    LAND_MKT_VALUE?: number;
  };
  geometry?: {
    rings?: number[][][];
  };
}

// ── Centroid from polygon rings ───────────────────────────────────
function computeCentroid(rings: number[][][]): { lng: number; lat: number } | null {
  if (!rings || rings.length === 0 || rings[0].length === 0) return null;
  const outer = rings[0];
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of outer) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lng: sumLng / outer.length, lat: sumLat / outer.length };
}

// ── Fetch one page from UGRC ─────────────────────────────────────
async function fetchPage(offset: number): Promise<{ features: UGRCFeature[]; exceededTransferLimit: boolean }> {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "OBJECTID,PARCEL_ID,PARCEL_ADD,PARCEL_CITY,BLDG_SQFT,BUILT_YR,PROP_CLASS,PARCEL_ACRES",
    returnGeometry: "true",
    outSR: "4326",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
    orderByFields: "OBJECTID ASC",
    f: "json",
  });

  const res = await fetch(`${UGRC_LIR_URL}?${params}`);
  if (!res.ok) throw new Error(`UGRC fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`UGRC error: ${JSON.stringify(data.error)}`);
  return {
    features: data.features || [],
    exceededTransferLimit: data.exceededTransferLimit === true,
  };
}

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "run";
    const countyId = body.county_id || "00000000-0000-0000-0000-000000000002";
    const startOffset = body.start_offset || 0;
    const maxPages = body.max_pages || 10;

    // ── Status action ──────────────────────────────────────────────
    if (action === "status") {
      const { data, error } = await supabase.rpc("get_county_vitals", { p_county_id: countyId });
      
      // Quick counts for spatial-specific stats
      const [coordsRes, classRes, sqftRes] = await Promise.all([
        supabase.from("parcels").select("id", { count: "exact", head: true })
          .eq("county_id", countyId).not("latitude_wgs84", "is", null),
        supabase.from("parcels").select("id", { count: "exact", head: true })
          .eq("county_id", countyId).not("property_class", "is", null),
        supabase.from("parcels").select("id", { count: "exact", head: true })
          .eq("county_id", countyId).not("building_area", "is", null).gt("building_area", 0),
      ]);

      const total = data?.parcels_total || 0;
      return new Response(JSON.stringify({
        ok: true,
        stats: {
          total_parcels: total,
          with_coords: coordsRes.count || 0,
          with_property_class: classRes.count || 0,
          with_building_area: sqftRes.count || 0,
          missing_coords: total - (coordsRes.count || 0),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Run healing via bulk RPC ────────────────────────────────────
    let offset = startOffset;
    let totalFetched = 0;
    let totalUpdated = 0;
    let pagesProcessed = 0;

    for (let page = 0; page < maxPages; page++) {
      const { features, exceededTransferLimit } = await fetchPage(offset);
      if (features.length === 0) break;

      totalFetched += features.length;
      pagesProcessed++;

      // Build JSONB update array for the RPC
      const updates = features
        .filter((f) => f.attributes.PARCEL_ID)
        .map((f) => {
          const centroid = f.geometry?.rings ? computeCentroid(f.geometry.rings) : null;
          const rec: Record<string, unknown> = {
            parcel_number: f.attributes.PARCEL_ID,
          };
          if (centroid) {
            rec.lat = centroid.lat;
            rec.lng = centroid.lng;
            rec.coord_source = "ugrc_lir_centroid";
          }
          if (f.attributes.PARCEL_CITY) rec.city = f.attributes.PARCEL_CITY;
          if (f.attributes.PROP_CLASS) rec.property_class = f.attributes.PROP_CLASS;
          if (f.attributes.BLDG_SQFT && f.attributes.BLDG_SQFT > 0) {
            rec.building_area = f.attributes.BLDG_SQFT;
          }
          if (f.attributes.BUILT_YR && f.attributes.BUILT_YR > 1700) {
            rec.year_built = f.attributes.BUILT_YR;
          }
          if (f.attributes.PARCEL_ACRES && f.attributes.PARCEL_ACRES > 0) {
            rec.land_area = f.attributes.PARCEL_ACRES;
          }
          if (f.attributes.PARCEL_ADD) rec.address = f.attributes.PARCEL_ADD;
          return rec;
        });

      // Call the bulk RPC
      const { data: result, error: rpcErr } = await supabase.rpc("bulk_spatial_heal", {
        p_county_id: countyId,
        p_updates: updates,
      });

      if (rpcErr) {
        console.error("RPC error:", rpcErr);
      } else {
        totalUpdated += (result as any)?.updated || 0;
      }

      offset += PAGE_SIZE;
      if (!exceededTransferLimit) break;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        summary: {
          pages_processed: pagesProcessed,
          total_fetched: totalFetched,
          total_updated: totalUpdated,
          next_offset: offset,
          has_more: pagesProcessed === maxPages,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Spatial healing error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

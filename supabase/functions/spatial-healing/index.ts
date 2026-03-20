// TerraFusion OS — Spatial Healing Edge Function
// Fetches SLCO parcel centroids + LIR characteristics from UGRC SGID ArcGIS FeatureServer
// and backfills coordinates, property class, building area, year built, city into parcels table.
// "I healed the parcels. They were broken inside." — Ralph Wiggum

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UGRC_LIR_URL =
  "https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query";

const PAGE_SIZE = 2000; // ArcGIS max
const BATCH_SIZE = 500; // DB update batch

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
    outFields: "OBJECTID,PARCEL_ID,PARCEL_ADD,PARCEL_CITY,BLDG_SQFT,BUILT_YR,PROP_CLASS,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE",
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
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is authenticated
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
    const maxPages = body.max_pages || 5; // default: 5 pages = 10k parcels per invocation

    if (action === "status") {
      // Return current healing stats
      const { count: totalParcels } = await supabase
        .from("parcels")
        .select("id", { count: "exact", head: true })
        .eq("county_id", countyId);

      const { count: withCoords } = await supabase
        .from("parcels")
        .select("id", { count: "exact", head: true })
        .eq("county_id", countyId)
        .not("latitude_wgs84", "is", null);

      const { count: withClass } = await supabase
        .from("parcels")
        .select("id", { count: "exact", head: true })
        .eq("county_id", countyId)
        .not("property_class", "is", null);

      const { count: withSqft } = await supabase
        .from("parcels")
        .select("id", { count: "exact", head: true })
        .eq("county_id", countyId)
        .not("building_area", "is", null)
        .gt("building_area", 0);

      return new Response(JSON.stringify({
        ok: true,
        stats: {
          total_parcels: totalParcels || 0,
          with_coords: withCoords || 0,
          with_property_class: withClass || 0,
          with_building_area: withSqft || 0,
          missing_coords: (totalParcels || 0) - (withCoords || 0),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Run healing ────────────────────────────────────────────────
    let offset = startOffset;
    let totalFetched = 0;
    let totalMatched = 0;
    let totalUpdated = 0;
    let pagesProcessed = 0;

    for (let page = 0; page < maxPages; page++) {
      const { features, exceededTransferLimit } = await fetchPage(offset);
      if (features.length === 0) break;

      totalFetched += features.length;
      pagesProcessed++;

      // Extract parcel IDs to match against our DB
      const parcelIds = features
        .map((f) => f.attributes.PARCEL_ID)
        .filter(Boolean);

      // Look up our internal parcel UUIDs
      const { data: dbParcels } = await supabase
        .from("parcels")
        .select("id, parcel_number")
        .eq("county_id", countyId)
        .in("parcel_number", parcelIds);

      if (!dbParcels || dbParcels.length === 0) {
        offset += PAGE_SIZE;
        if (!exceededTransferLimit) break;
        continue;
      }

      totalMatched += dbParcels.length;

      // Build lookup: parcel_number → internal UUID
      const idMap = new Map(dbParcels.map((p) => [p.parcel_number, p.id]));

      // Build update payloads
      const updates: Record<string, unknown>[] = [];
      for (const feat of features) {
        const internalId = idMap.get(feat.attributes.PARCEL_ID);
        if (!internalId) continue;

        const centroid = feat.geometry?.rings ? computeCentroid(feat.geometry.rings) : null;

        const update: Record<string, unknown> = { id: internalId };

        if (centroid) {
          update.latitude_wgs84 = centroid.lat;
          update.longitude_wgs84 = centroid.lng;
          update.coord_source = "ugrc_lir_centroid";
        }
        if (feat.attributes.PARCEL_CITY) update.city = feat.attributes.PARCEL_CITY;
        if (feat.attributes.PROP_CLASS) update.property_class = feat.attributes.PROP_CLASS;
        if (feat.attributes.BLDG_SQFT && feat.attributes.BLDG_SQFT > 0) {
          update.building_area = feat.attributes.BLDG_SQFT;
        }
        if (feat.attributes.BUILT_YR && feat.attributes.BUILT_YR > 1700) {
          update.year_built = feat.attributes.BUILT_YR;
        }
        if (feat.attributes.PARCEL_ACRES && feat.attributes.PARCEL_ACRES > 0) {
          update.lot_size = feat.attributes.PARCEL_ACRES;
        }
        if (feat.attributes.PARCEL_ADD) {
          update.address = feat.attributes.PARCEL_ADD;
        }

        updates.push(update);
      }

      // Batch upsert in chunks of BATCH_SIZE
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const { error: upsertErr } = await supabase
          .from("parcels")
          .upsert(batch as any, { onConflict: "id" });

        if (upsertErr) {
          console.error("Batch upsert error:", upsertErr);
        } else {
          totalUpdated += batch.length;
        }
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
          total_matched: totalMatched,
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

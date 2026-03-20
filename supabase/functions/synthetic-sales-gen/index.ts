// TerraFusion OS — Synthetic Sales Generator
// Generates statistically realistic sales from assessed market values.
// Used in non-disclosure states (Utah) where public sale prices are unavailable.
// "The parcels told me their prices in a dream." — Ralph Wiggum
//
// Strategy:
// - Sample N parcels per neighborhood (stratified)
// - Apply assessment ratio (0.92-1.08) + controlled noise to derive sale_price
// - Spread sale_date across configurable window (default: 24 months)
// - Mark all as is_qualified=true, verification_status='synthetic'
// - Tag with notes for audit trail

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Seeded PRNG for reproducibility */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller for normal distribution */
function normalRandom(rng: () => number, mean: number, stddev: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select("county_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.county_id) {
      return new Response(JSON.stringify({ error: "No county assigned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const countyId = profile.county_id;
    const body = await req.json();
    const {
      samplesPerNeighborhood = 10,
      totalTarget = 2000,
      monthsBack = 24,
      ratioMean = 1.0,
      ratioStdDev = 0.06,
      seed = 42,
      dryRun = false,
    } = body;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const rng = mulberry32(seed);

    // 1. Get neighborhoods with parcel counts
    const { data: neighborhoods } = await serviceClient
      .from("parcels")
      .select("neighborhood_code")
      .eq("county_id", countyId)
      .not("neighborhood_code", "is", null)
      .gt("assessed_value", 1000);

    if (!neighborhoods || neighborhoods.length === 0) {
      return new Response(
        JSON.stringify({ error: "No parcels with neighborhoods found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count per neighborhood
    const nbhCounts = new Map<string, number>();
    for (const p of neighborhoods) {
      const code = p.neighborhood_code as string;
      nbhCounts.set(code, (nbhCounts.get(code) || 0) + 1);
    }

    // Sort by count descending, pick neighborhoods proportionally
    const sortedNbhs = [...nbhCounts.entries()].sort((a, b) => b[1] - a[1]);
    const totalParcels = neighborhoods.length;

    // Calculate samples per neighborhood proportional to size, capped
    const nbhSamples: { code: string; count: number }[] = [];
    let allocated = 0;
    for (const [code, count] of sortedNbhs) {
      const proportion = count / totalParcels;
      const samples = Math.max(3, Math.min(samplesPerNeighborhood * 3, Math.round(proportion * totalTarget)));
      if (allocated + samples > totalTarget) {
        const remaining = totalTarget - allocated;
        if (remaining >= 3) nbhSamples.push({ code, count: remaining });
        break;
      }
      nbhSamples.push({ code, count: samples });
      allocated += samples;
    }

    // 2. Sample parcels from each neighborhood
    const allSynthetic: {
      parcel_id: string;
      sale_date: string;
      sale_price: number;
      sale_type: string;
      deed_type: string;
      is_qualified: boolean;
      county_id: string;
      notes: string;
      verification_status: string;
    }[] = [];

    const now = Date.now();
    const msPerDay = 86400000;
    const windowMs = monthsBack * 30 * msPerDay;
    const batchTag = `synthetic_${new Date().toISOString().split("T")[0]}_seed${seed}`;

    for (const { code, count } of nbhSamples) {
      // Fetch candidate parcels for this neighborhood
      const { data: candidates } = await serviceClient
        .from("parcels")
        .select("id, assessed_value, property_class")
        .eq("county_id", countyId)
        .eq("neighborhood_code", code)
        .gt("assessed_value", 1000)
        .limit(count * 3); // Over-fetch for random selection

      if (!candidates || candidates.length === 0) continue;

      // Shuffle and take N
      const shuffled = candidates.sort(() => rng() - 0.5);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));

      for (const parcel of selected) {
        // Apply ratio with controlled noise
        const ratio = normalRandom(rng, ratioMean, ratioStdDev);
        const clampedRatio = Math.max(0.7, Math.min(1.4, ratio));
        const salePrice = Math.round(parcel.assessed_value * clampedRatio);

        if (salePrice < 500) continue;

        // Random date within window
        const daysBack = Math.floor(rng() * monthsBack * 30);
        const saleDate = new Date(now - daysBack * msPerDay);
        const saleDateStr = saleDate.toISOString().split("T")[0];

        // Classify sale type based on property class
        const propClass = (parcel.property_class || "").toUpperCase();
        const saleType = propClass.includes("COMM")
          ? "commercial"
          : propClass.includes("MULTI") || propClass.includes("CONDO")
          ? "multifamily"
          : "residential";

        allSynthetic.push({
          parcel_id: parcel.id,
          sale_date: saleDateStr,
          sale_price: salePrice,
          sale_type: saleType,
          deed_type: "synthetic_warranty",
          is_qualified: true,
          county_id: countyId,
          notes: `Synthetic sale derived from assessed_value ($${parcel.assessed_value.toLocaleString()}) × ratio ${clampedRatio.toFixed(3)}. Batch: ${batchTag}`,
          verification_status: "unverified",
        });
      }
    }

    // 3. Dedup (no two sales for same parcel on same date)
    const seen = new Set<string>();
    const deduped = allSynthetic.filter((s) => {
      const key = `${s.parcel_id}|${s.sale_date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Stats
    const stats = {
      totalGenerated: deduped.length,
      neighborhoodsCovered: nbhSamples.length,
      totalNeighborhoods: sortedNbhs.length,
      dateRange: {
        earliest: deduped.length > 0 ? deduped.reduce((a, b) => (a.sale_date < b.sale_date ? a : b)).sale_date : null,
        latest: deduped.length > 0 ? deduped.reduce((a, b) => (a.sale_date > b.sale_date ? a : b)).sale_date : null,
      },
      priceRange: {
        min: deduped.length > 0 ? Math.min(...deduped.map((s) => s.sale_price)) : 0,
        max: deduped.length > 0 ? Math.max(...deduped.map((s) => s.sale_price)) : 0,
        avg: deduped.length > 0 ? Math.round(deduped.reduce((a, b) => a + b.sale_price, 0) / deduped.length) : 0,
      },
      batchTag,
      seed,
      ratioMean,
      ratioStdDev,
    };

    if (dryRun) {
      return new Response(
        JSON.stringify({ ok: true, dryRun: true, ...stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Insert in batches
    let inserted = 0;
    const BATCH = 500;

    for (let i = 0; i < deduped.length; i += BATCH) {
      const batch = deduped.slice(i, i + BATCH);
      const { error: insertErr } = await serviceClient.from("sales").insert(batch);

      if (insertErr) {
        console.error(`Batch ${i} error:`, insertErr);
        // Continue with remaining batches
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, inserted, ...stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Synthetic sales error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

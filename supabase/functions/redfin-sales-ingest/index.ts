// TerraFusion OS — Redfin CSV Sales Ingest
// Parses Redfin "recently sold" CSV exports and matches to parcels by address+zip.
// Constitutional: writes ONLY to sales table (TerraForge write-lane).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Normalize address for fuzzy matching: uppercase, strip unit/apt, collapse whitespace */
function normalizeAddress(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\b(APT|UNIT|STE|SUITE|#)\s*\S*/gi, "")
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse Redfin CSV text into row objects */
function parseRedfin(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted CSV fields
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= headers.length - 2) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = (values[idx] || "").replace(/^"|"$/g, "");
      });
      rows.push(row);
    }
  }

  return rows;
}

/** Map Redfin column names (they vary slightly) */
function findCol(row: Record<string, string>, ...candidates: string[]): string {
  for (const c of candidates) {
    const key = Object.keys(row).find((k) => k.toUpperCase().includes(c.toUpperCase()));
    if (key && row[key]) return row[key];
  }
  return "";
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

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
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
    const { csvText, dryRun } = await req.json();

    if (!csvText || typeof csvText !== "string") {
      return new Response(JSON.stringify({ error: "csvText required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Parse Redfin CSV
    const rows = parseRedfin(csvText);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows parsed from CSV" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load all parcels for this county (address + zip index for matching)
    const PAGE_SIZE = 1000;
    let allParcels: { id: string; address: string; zip_code: string }[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: batch } = await serviceClient
        .from("parcels")
        .select("id, address, zip_code")
        .eq("county_id", countyId)
        .not("address", "is", null)
        .range(offset, offset + PAGE_SIZE - 1);

      if (batch && batch.length > 0) {
        allParcels = allParcels.concat(batch);
        offset += PAGE_SIZE;
        hasMore = batch.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    // 3. Build address→parcel lookup
    const addressIndex = new Map<string, string>();
    for (const p of allParcels) {
      if (p.address && p.zip_code) {
        const key = `${normalizeAddress(p.address)}|${p.zip_code}`;
        addressIndex.set(key, p.id);
      }
    }

    // 4. Match Redfin rows to parcels
    const matched: {
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
    const unmatched: { address: string; zip: string; price: string }[] = [];
    const skipped: { reason: string; address: string }[] = [];

    for (const row of rows) {
      const address = findCol(row, "ADDRESS", "LOCATION");
      const zip = findCol(row, "ZIP", "ZIP OR POSTAL");
      const priceStr = findCol(row, "PRICE", "SOLD PRICE", "LAST SALE PRICE");
      const dateStr = findCol(row, "SOLD DATE", "LAST SOLD DATE", "SALE DATE");
      const propType = findCol(row, "PROPERTY TYPE", "HOME TYPE");

      if (!address || !priceStr) {
        skipped.push({ reason: "missing address or price", address: address || "unknown" });
        continue;
      }

      const price = parseFloat(priceStr.replace(/[$,]/g, ""));
      if (isNaN(price) || price <= 0) {
        skipped.push({ reason: "invalid price", address });
        continue;
      }

      // Parse date
      let saleDate = "";
      if (dateStr) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          saleDate = parsed.toISOString().split("T")[0];
        }
      }
      if (!saleDate) {
        skipped.push({ reason: "invalid date", address });
        continue;
      }

      // Match by normalized address + zip
      const normAddr = normalizeAddress(address);
      const cleanZip = (zip || "").replace(/\D/g, "").slice(0, 5);
      const key = `${normAddr}|${cleanZip}`;
      const parcelId = addressIndex.get(key);

      if (!parcelId) {
        unmatched.push({ address, zip: cleanZip, price: priceStr });
        continue;
      }

      matched.push({
        parcel_id: parcelId,
        sale_date: saleDate,
        sale_price: price,
        sale_type: propType || "residential",
        deed_type: "warranty_deed",
        is_qualified: true,
        county_id: countyId,
        notes: `Redfin import ${new Date().toISOString().split("T")[0]}`,
        verification_status: "unverified",
      });
    }

    // 5. If dry run, return stats without inserting
    if (dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          totalRows: rows.length,
          matched: matched.length,
          unmatched: unmatched.length,
          skipped: skipped.length,
          matchRate: rows.length > 0 ? Math.round((matched.length / rows.length) * 100) : 0,
          sampleMatched: matched.slice(0, 5),
          sampleUnmatched: unmatched.slice(0, 10),
          sampleSkipped: skipped.slice(0, 5),
          parcelsIndexed: addressIndex.size,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Insert in batches (dedup by parcel_id + sale_date)
    const seen = new Set<string>();
    const deduped = matched.filter((m) => {
      const key = `${m.parcel_id}|${m.sale_date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let inserted = 0;
    let duplicates = 0;
    const BATCH = 200;

    for (let i = 0; i < deduped.length; i += BATCH) {
      const batch = deduped.slice(i, i + BATCH);

      // Check for existing sales to avoid dups
      const existingChecks = batch.map((s) =>
        `(parcel_id = '${s.parcel_id}' AND sale_date = '${s.sale_date}')`
      );

      const { data: existing } = await serviceClient
        .from("sales")
        .select("parcel_id, sale_date")
        .eq("county_id", countyId)
        .or(existingChecks.join(","));

      const existingKeys = new Set(
        (existing || []).map((e: any) => `${e.parcel_id}|${e.sale_date}`)
      );

      const newSales = batch.filter(
        (s) => !existingKeys.has(`${s.parcel_id}|${s.sale_date}`)
      );

      if (newSales.length > 0) {
        const { error: insertErr } = await serviceClient
          .from("sales")
          .insert(newSales);

        if (insertErr) {
          console.error("Insert error:", insertErr);
        } else {
          inserted += newSales.length;
        }
      }

      duplicates += batch.length - newSales.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        totalRows: rows.length,
        matched: matched.length,
        inserted,
        duplicates,
        unmatched: unmatched.length,
        skipped: skipped.length,
        matchRate: rows.length > 0 ? Math.round((matched.length / rows.length) * 100) : 0,
        parcelsIndexed: addressIndex.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Redfin ingest error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

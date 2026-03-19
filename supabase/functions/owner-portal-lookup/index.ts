// TerraFusion OS — Phase 79: Owner Portal Lookup
// Public-facing edge function for property owners to look up their parcel
// No auth required — uses service client with sanitized output

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { searchType, searchValue } = await req.json();

    if (!searchType || !searchValue || typeof searchValue !== "string") {
      return new Response(
        JSON.stringify({ error: "searchType and searchValue are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const db = createServiceClient();
    const trimmed = searchValue.trim();

    // ── Step 1: Find parcel ──────────────────────────────────────
    let parcelQuery = db
      .from("parcels")
      .select("id, parcel_number, situs_address, city, state, zip, property_class, neighborhood_code, acres, year_built, bedrooms, bathrooms, square_footage, county_id");

    if (searchType === "parcel_number") {
      parcelQuery = parcelQuery.ilike("parcel_number", `%${trimmed}%`);
    } else if (searchType === "address") {
      parcelQuery = parcelQuery.ilike("situs_address", `%${trimmed}%`);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid searchType. Use 'parcel_number' or 'address'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: parcels, error: parcelErr } = await parcelQuery.limit(10);
    if (parcelErr) throw parcelErr;

    if (!parcels || parcels.length === 0) {
      return new Response(
        JSON.stringify({ parcels: [], message: "No parcels found matching your search." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: For each parcel, fetch assessment history, appeals, exemptions
    const results = await Promise.all(
      parcels.map(async (parcel) => {
        const [assessRes, appealRes, exemptionRes] = await Promise.all([
          db
            .from("assessments")
            .select("tax_year, land_value, improvement_value, total_value, assessment_date, certified")
            .eq("parcel_id", parcel.id)
            .order("tax_year", { ascending: false })
            .limit(10),
          db
            .from("appeals")
            .select("tax_year, status, appeal_date, original_value, requested_value, final_value, resolution_type, hearing_date")
            .eq("parcel_id", parcel.id)
            .order("appeal_date", { ascending: false })
            .limit(5),
          db
            .from("exemptions")
            .select("tax_year, exemption_type, status, exemption_amount, exemption_percentage, application_date, approval_date, expiration_date")
            .eq("parcel_id", parcel.id)
            .order("tax_year", { ascending: false })
            .limit(5),
        ]);

        // Calculate YoY change if we have 2+ assessments
        const assessments = assessRes.data ?? [];
        let valueChange = null;
        if (assessments.length >= 2) {
          const current = assessments[0];
          const prior = assessments[1];
          if (current.total_value && prior.total_value) {
            const delta = current.total_value - prior.total_value;
            valueChange = {
              priorYear: prior.tax_year,
              currentYear: current.tax_year,
              priorValue: prior.total_value,
              currentValue: current.total_value,
              change: delta,
              changePct: Math.round((delta / prior.total_value) * 10000) / 100,
            };
          }
        }

        // Sanitize: strip internal IDs, county_id from output
        return {
          parcelNumber: parcel.parcel_number,
          address: parcel.situs_address,
          city: parcel.city,
          state: parcel.state,
          zip: parcel.zip,
          propertyClass: parcel.property_class,
          neighborhoodCode: parcel.neighborhood_code,
          characteristics: {
            acres: parcel.acres,
            yearBuilt: parcel.year_built,
            bedrooms: parcel.bedrooms,
            bathrooms: parcel.bathrooms,
            squareFootage: parcel.square_footage,
          },
          assessments,
          valueChange,
          appeals: (appealRes.data ?? []).map((a) => ({
            ...a,
            // Strip owner_email for privacy
          })),
          exemptions: exemptionRes.data ?? [],
        };
      })
    );

    return new Response(
      JSON.stringify({ parcels: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("owner-portal-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

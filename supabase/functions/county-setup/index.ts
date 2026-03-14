import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only require basic auth (not admin) — new users need this
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.91.1");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      throw new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createServiceClient();
    const { action, ...params } = await req.json();

    // ── CREATE COUNTY + ASSIGN USER ─────────────────────────
    if (action === "create_county") {
      const { name, fipsCode, state } = params;
      if (!name || !fipsCode || !state) {
        return new Response(
          JSON.stringify({ error: "name, fipsCode, and state are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if county with same FIPS already exists
      const { data: existing } = await serviceClient
        .from("counties")
        .select("id")
        .eq("fips_code", fipsCode)
        .maybeSingle();

      let countyId: string;

      if (existing) {
        countyId = existing.id;
      } else {
        const { data: newCounty, error: createErr } = await serviceClient
          .from("counties")
          .insert({ name, fips_code: fipsCode, state })
          .select("id")
          .single();

        if (createErr) throw createErr;
        countyId = newCounty.id;
      }

      // Assign user to county via service client (bypasses RLS WITH CHECK)
      const { error: profileErr } = await serviceClient
        .from("profiles")
        .update({ county_id: countyId })
        .eq("user_id", user.id);

      if (profileErr) throw profileErr;

      // Grant admin role to first user in county
      const { data: existingUsers } = await serviceClient
        .from("profiles")
        .select("user_id")
        .eq("county_id", countyId);

      if (!existingUsers || existingUsers.length <= 1) {
        // First user — grant admin
        await serviceClient
          .from("user_roles")
          .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
      }

      return new Response(
        JSON.stringify({ success: true, countyId, isNewCounty: !existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── JOIN EXISTING COUNTY ────────────────────────────────
    if (action === "join_county") {
      const { countyId } = params;
      if (!countyId) {
        return new Response(
          JSON.stringify({ error: "countyId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify county exists
      const { data: county } = await serviceClient
        .from("counties")
        .select("id, name")
        .eq("id", countyId)
        .single();

      if (!county) {
        return new Response(
          JSON.stringify({ error: "County not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Assign user to county
      const { error: profileErr } = await serviceClient
        .from("profiles")
        .update({ county_id: countyId })
        .eq("user_id", user.id);

      if (profileErr) throw profileErr;

      // Grant viewer role by default
      await serviceClient
        .from("user_roles")
        .upsert({ user_id: user.id, role: "viewer" }, { onConflict: "user_id,role" });

      return new Response(
        JSON.stringify({ success: true, countyId, countyName: county.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LIST AVAILABLE COUNTIES ─────────────────────────────
    if (action === "list_counties") {
      const { data: counties, error } = await serviceClient
        .from("counties")
        .select("id, name, fips_code, state")
        .order("name");

      if (error) throw error;

      return new Response(
        JSON.stringify({ counties: counties ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

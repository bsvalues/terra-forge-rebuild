import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client for auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve county from profile
    const { data: profile } = await userClient
      .from("profiles")
      .select("county_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.county_id) {
      return new Response(
        JSON.stringify({ error: "No county assigned" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const countyId = profile.county_id;
    const { action, jobId } = await req.json();

    // Service client for writes
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "score_quality") {
      // Score quality for a specific ingest job
      const { data: job } = await serviceClient
        .from("ingest_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("county_id", countyId)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Count field completeness from parcels
      const { count: totalParcels } = await serviceClient
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .eq("county_id", countyId);

      const { count: withCoords } = await serviceClient
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .eq("county_id", countyId)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      const { count: withValues } = await serviceClient
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .eq("county_id", countyId)
        .gt("assessed_value", 0);

      const { count: withAddress } = await serviceClient
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .eq("county_id", countyId)
        .not("address", "is", null);

      const total = totalParcels || 1;
      const coordRate = ((withCoords || 0) / total) * 100;
      const valueRate = ((withValues || 0) / total) * 100;
      const addressRate = ((withAddress || 0) / total) * 100;
      const overallScore = Math.round((coordRate + valueRate + addressRate) / 3);

      // Emit quality event
      await serviceClient.from("pipeline_events").insert({
        county_id: countyId,
        stage: "quality_scored",
        status: overallScore >= 80 ? "success" : overallScore >= 60 ? "warning" : "failed",
        ingest_job_id: jobId,
        rows_affected: totalParcels,
        artifact_ref: job.file_name,
        details: {
          overallScore,
          coordRate: Math.round(coordRate),
          valueRate: Math.round(valueRate),
          addressRate: Math.round(addressRate),
          totalParcels,
        },
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          score: overallScore,
          metrics: { coordRate, valueRate, addressRate, totalParcels },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

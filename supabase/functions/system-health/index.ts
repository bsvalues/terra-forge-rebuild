import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  latencyMs: number;
  message?: string;
  checkedAt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const checks: HealthCheck[] = [];

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Database connectivity
  try {
    const dbStart = performance.now();
    const { count, error } = await supabase
      .from("counties")
      .select("*", { count: "exact", head: true });
    const dbLatency = performance.now() - dbStart;

    checks.push({
      service: "database",
      status: error ? "unhealthy" : "healthy",
      latencyMs: Math.round(dbLatency),
      message: error ? error.message : `${count ?? 0} counties configured`,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    checks.push({
      service: "database",
      status: "unhealthy",
      latencyMs: 0,
      message: e instanceof Error ? e.message : "Unknown DB error",
      checkedAt: new Date().toISOString(),
    });
  }

  // 2. Parcels table health
  try {
    const pStart = performance.now();
    const { count, error } = await supabase
      .from("parcels")
      .select("*", { count: "exact", head: true });
    const pLatency = performance.now() - pStart;

    checks.push({
      service: "parcels",
      status: error ? "degraded" : "healthy",
      latencyMs: Math.round(pLatency),
      message: error ? error.message : `${count ?? 0} parcels in system`,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    checks.push({
      service: "parcels",
      status: "unhealthy",
      latencyMs: 0,
      message: e instanceof Error ? e.message : "Unknown error",
      checkedAt: new Date().toISOString(),
    });
  }

  // 3. Trace events (audit spine health)
  try {
    const tStart = performance.now();
    const { count, error } = await supabase
      .from("trace_events")
      .select("*", { count: "exact", head: true });
    const tLatency = performance.now() - tStart;

    checks.push({
      service: "trace_events",
      status: error ? "degraded" : "healthy",
      latencyMs: Math.round(tLatency),
      message: error ? error.message : `${count ?? 0} trace events recorded`,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    checks.push({
      service: "trace_events",
      status: "degraded",
      latencyMs: 0,
      message: e instanceof Error ? e.message : "Unknown error",
      checkedAt: new Date().toISOString(),
    });
  }

  // 4. Sales data freshness
  try {
    const sStart = performance.now();
    const { data, error } = await supabase
      .from("sales")
      .select("sale_date")
      .order("sale_date", { ascending: false })
      .limit(1)
      .single();
    const sLatency = performance.now() - sStart;

    const latestSale = data?.sale_date;
    const daysSince = latestSale
      ? Math.floor((Date.now() - new Date(latestSale).getTime()) / 86400000)
      : null;

    checks.push({
      service: "sales_freshness",
      status: error ? "degraded" : daysSince !== null && daysSince > 365 ? "degraded" : "healthy",
      latencyMs: Math.round(sLatency),
      message: latestSale
        ? `Latest sale: ${latestSale} (${daysSince}d ago)`
        : "No sales data",
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    checks.push({
      service: "sales_freshness",
      status: "degraded",
      latencyMs: 0,
      message: e instanceof Error ? e.message : "Unknown error",
      checkedAt: new Date().toISOString(),
    });
  }

  // 5. Ingest jobs status
  try {
    const iStart = performance.now();
    const { data, error } = await supabase
      .from("ingest_jobs")
      .select("status")
      .order("created_at", { ascending: false })
      .limit(10);
    const iLatency = performance.now() - iStart;

    const failed = data?.filter(j => j.status === "failed").length ?? 0;
    const running = data?.filter(j => j.status === "processing").length ?? 0;

    checks.push({
      service: "ingest_pipeline",
      status: error ? "degraded" : failed > 3 ? "degraded" : "healthy",
      latencyMs: Math.round(iLatency),
      message: `${running} running, ${failed} failed (last 10)`,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    checks.push({
      service: "ingest_pipeline",
      status: "degraded",
      latencyMs: 0,
      message: e instanceof Error ? e.message : "Unknown error",
      checkedAt: new Date().toISOString(),
    });
  }

  // 6. Storage bucket check
  try {
    const bStart = performance.now();
    const { data, error } = await supabase.storage.listBuckets();
    const bLatency = performance.now() - bStart;

    checks.push({
      service: "storage",
      status: error ? "degraded" : "healthy",
      latencyMs: Math.round(bLatency),
      message: error ? error.message : `${data?.length ?? 0} buckets available`,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    checks.push({
      service: "storage",
      status: "degraded",
      latencyMs: 0,
      message: e instanceof Error ? e.message : "Unknown error",
      checkedAt: new Date().toISOString(),
    });
  }

  // Compute overall health
  const hasUnhealthy = checks.some(c => c.status === "unhealthy");
  const hasDegraded = checks.some(c => c.status === "degraded");
  const overall = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";
  const totalLatency = Math.round(performance.now() - startTime);

  const response = {
    overall,
    checks,
    totalLatencyMs: totalLatency,
    version: "9.0.0",
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: overall === "unhealthy" ? 503 : 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

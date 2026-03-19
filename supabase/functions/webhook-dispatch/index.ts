// TerraFusion OS — Phase 65: Webhook Delivery Dispatch Engine
// Receives event payloads, resolves matching endpoints, fires outbound HTTP with HMAC signing,
// records delivery attempts with retry logic.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── HMAC-SHA256 signing ────────────────────────────────────────────
async function signPayload(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Deliver to a single endpoint with retry ────────────────────────
async function deliverToEndpoint(
  supabase: ReturnType<typeof createClient>,
  endpoint: { id: string; url: string; secret: string | null; retry_count: number; timeout_ms: number },
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  const maxAttempts = Math.min(endpoint.retry_count, 5);
  const body = JSON.stringify({ event: eventType, payload, timestamp: new Date().toISOString() });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "TerraFusion-Webhooks/1.0",
      "X-TerraFusion-Event": eventType,
      "X-TerraFusion-Delivery": crypto.randomUUID(),
    };

    // HMAC signing
    if (endpoint.secret) {
      const sig = await signPayload(endpoint.secret, body);
      headers["X-TerraFusion-Signature"] = `sha256=${sig}`;
    }

    let statusCode: number | null = null;
    let errorMsg: string | null = null;
    let success = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), endpoint.timeout_ms);

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      statusCode = response.status;
      success = response.ok;

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        errorMsg = `HTTP ${response.status}: ${text.slice(0, 200)}`;
      } else {
        // Consume body to prevent resource leak
        await response.text().catch(() => "");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errorMsg = message.includes("abort") ? `Timeout after ${endpoint.timeout_ms}ms` : message;
    }

    // Record delivery attempt
    await supabase.from("webhook_deliveries").insert({
      endpoint_id: endpoint.id,
      event_type: eventType,
      payload,
      status: success ? "delivered" : attempt === maxAttempts ? "failed" : "retrying",
      status_code: statusCode,
      response_body: null,
      attempt_number: attempt,
      delivered_at: success ? new Date().toISOString() : null,
      error_message: errorMsg,
    });

    if (success) {
      return { success: true, statusCode, error: null };
    }

    // Exponential backoff between retries
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }

  return { success: false, statusCode: null, error: "Max retries exhausted" };
}

// ── Main handler ───────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { event_type, payload, county_id } = await req.json();

    if (!event_type) {
      return new Response(
        JSON.stringify({ error: "event_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find all active endpoints that subscribe to this event type
    let query = supabase
      .from("webhook_endpoints")
      .select("id, url, secret, retry_count, timeout_ms, event_types")
      .eq("is_active", true);

    if (county_id) {
      query = query.eq("county_id", county_id);
    }

    const { data: endpoints, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    // Filter endpoints that subscribe to this event type
    const matchingEndpoints = (endpoints ?? []).filter((ep: { event_types: string[] }) =>
      ep.event_types.includes(event_type) || ep.event_types.includes("*")
    );

    if (matchingEndpoints.length === 0) {
      return new Response(
        JSON.stringify({ dispatched: 0, message: "No matching endpoints" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dispatch to all matching endpoints concurrently
    const results = await Promise.allSettled(
      matchingEndpoints.map((ep: { id: string; url: string; secret: string | null; retry_count: number; timeout_ms: number }) =>
        deliverToEndpoint(supabase, ep, event_type, payload ?? {})
      )
    );

    const summary = {
      dispatched: matchingEndpoints.length,
      delivered: results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length,
      failed: results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
      ).length,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

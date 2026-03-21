// TerraFusion OS — Phase 66: Production-Grade Rate Limiting
// Persistent token buckets, provider circuit breakers, and queued dispatch for outbound webhooks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_DELIVERY_ATTEMPTS = 5;
const IMMEDIATE_BATCH_LIMIT = 25;
const READY_QUEUE_LIMIT = 50;

type CircuitState = "closed" | "open" | "half_open";

type JsonMap = Record<string, unknown>;

interface WebhookEndpointRecord {
  id: string;
  county_id: string;
  name: string;
  url: string;
  secret: string | null;
  retry_count: number;
  timeout_ms: number;
  event_types: string[];
  metadata: JsonMap | null;
}

interface ProviderConfig {
  providerKey: string;
  tokenCapacity: number;
  refillPerMinute: number;
  queueOnThrottle: boolean;
  circuitFailureThreshold: number;
  circuitResetTimeoutMs: number;
}

interface ProviderHealthRow {
  id: string;
  county_id: string;
  provider_key: string;
  token_capacity: number;
  tokens_available: number | string;
  refill_per_minute: number;
  circuit_state: CircuitState;
  consecutive_failures: number;
  queued_requests: number;
  total_requests: number;
  total_delivered: number;
  total_failed: number;
  last_refill_at: string;
  open_until: string | null;
  last_request_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProviderHealthState {
  id: string;
  countyId: string;
  providerKey: string;
  tokenCapacity: number;
  tokensAvailable: number;
  refillPerMinute: number;
  circuitState: CircuitState;
  consecutiveFailures: number;
  queuedRequests: number;
  totalRequests: number;
  totalDelivered: number;
  totalFailed: number;
  lastRefillAt: string;
  openUntil: string | null;
  lastRequestAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface QueueJobRecord {
  id: string;
  county_id: string;
  endpoint_id: string;
  provider_key: string;
  event_type: string;
  payload: JsonMap;
  status: string;
  attempt_count: number;
  available_at: string;
  queued_reason: string | null;
  last_error: string | null;
}

interface DeliveryResult {
  success: boolean;
  statusCode: number | null;
  error: string | null;
  responseBody: string | null;
}

interface DispatchSummary {
  dispatched: number;
  delivered: number;
  failed: number;
  queued: number;
  drained: number;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asRecord(value: unknown): JsonMap {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonMap
    : {};
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : fallback;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function resolveProviderKey(url: string, explicit?: unknown) {
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim().toLowerCase();
  }

  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "generic";
  }
}

function getProviderConfig(endpoint: WebhookEndpointRecord): ProviderConfig {
  const metadata = asRecord(endpoint.metadata);

  return {
    providerKey: resolveProviderKey(endpoint.url, metadata.providerKey),
    tokenCapacity: clampNumber(metadata.tokenBucketCapacity, 60, 1, 5000),
    refillPerMinute: clampNumber(metadata.refillPerMinute, 60, 1, 10000),
    queueOnThrottle: readBoolean(metadata.queueOnThrottle, true),
    circuitFailureThreshold: clampNumber(metadata.circuitFailureThreshold, 5, 1, 20),
    circuitResetTimeoutMs: clampNumber(metadata.circuitResetTimeoutMs, 30_000, 5_000, 300_000),
  };
}

function normalizeProviderHealth(row: ProviderHealthRow): ProviderHealthState {
  return {
    id: row.id,
    countyId: row.county_id,
    providerKey: row.provider_key,
    tokenCapacity: row.token_capacity,
    tokensAvailable: Number(row.tokens_available ?? 0),
    refillPerMinute: row.refill_per_minute,
    circuitState: row.circuit_state,
    consecutiveFailures: row.consecutive_failures,
    queuedRequests: row.queued_requests,
    totalRequests: row.total_requests,
    totalDelivered: row.total_delivered,
    totalFailed: row.total_failed,
    lastRefillAt: row.last_refill_at,
    openUntil: row.open_until,
    lastRequestAt: row.last_request_at,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function stateCacheKey(countyId: string, providerKey: string) {
  return `${countyId}::${providerKey}`;
}

function refillTokens(state: ProviderHealthState, config: ProviderConfig, now: Date) {
  const lastRefill = new Date(state.lastRefillAt);
  const elapsedMinutes = Math.max(0, (now.getTime() - lastRefill.getTime()) / 60_000);
  const replenished = Math.min(
    config.tokenCapacity,
    state.tokensAvailable + (elapsedMinutes * config.refillPerMinute)
  );

  return {
    tokensAvailable: Number(replenished.toFixed(4)),
    lastRefillAt: now.toISOString(),
  };
}

function computeNextAvailability(tokensAvailable: number, refillPerMinute: number, now: Date) {
  if (tokensAvailable >= 1) {
    return now.toISOString();
  }

  const minutesNeeded = (1 - tokensAvailable) / Math.max(refillPerMinute, 1);
  return new Date(now.getTime() + (minutesNeeded * 60_000)).toISOString();
}

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
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureProviderHealth(
  supabase: ReturnType<typeof createClient>,
  countyId: string,
  config: ProviderConfig,
  cache: Map<string, ProviderHealthState>,
) {
  const cacheKey = stateCacheKey(countyId, config.providerKey);
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { data: existing, error } = await supabase
    .from("webhook_provider_health")
    .select("*")
    .eq("county_id", countyId)
    .eq("provider_key", config.providerKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing) {
    const normalized = normalizeProviderHealth(existing as ProviderHealthRow);
    cache.set(cacheKey, normalized);
    return normalized;
  }

  const { data: created, error: insertError } = await supabase
    .from("webhook_provider_health")
    .insert({
      county_id: countyId,
      provider_key: config.providerKey,
      token_capacity: config.tokenCapacity,
      tokens_available: config.tokenCapacity,
      refill_per_minute: config.refillPerMinute,
      last_refill_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  const normalized = normalizeProviderHealth(created as ProviderHealthRow);
  cache.set(cacheKey, normalized);
  return normalized;
}

async function persistProviderHealth(
  supabase: ReturnType<typeof createClient>,
  state: ProviderHealthState,
  patch: Partial<ProviderHealthState>,
  cache: Map<string, ProviderHealthState>,
) {
  const nextState: ProviderHealthState = {
    ...state,
    ...patch,
  };

  const { error } = await supabase
    .from("webhook_provider_health")
    .update({
      token_capacity: nextState.tokenCapacity,
      tokens_available: nextState.tokensAvailable,
      refill_per_minute: nextState.refillPerMinute,
      circuit_state: nextState.circuitState,
      consecutive_failures: nextState.consecutiveFailures,
      queued_requests: nextState.queuedRequests,
      total_requests: nextState.totalRequests,
      total_delivered: nextState.totalDelivered,
      total_failed: nextState.totalFailed,
      last_refill_at: nextState.lastRefillAt,
      open_until: nextState.openUntil,
      last_request_at: nextState.lastRequestAt,
      last_success_at: nextState.lastSuccessAt,
      last_failure_at: nextState.lastFailureAt,
    })
    .eq("id", state.id);

  if (error) {
    throw error;
  }

  cache.set(stateCacheKey(nextState.countyId, nextState.providerKey), nextState);
  return nextState;
}

async function recordDeliveryAttempt(
  supabase: ReturnType<typeof createClient>,
  input: {
    endpointId: string;
    eventType: string;
    payload: JsonMap;
    status: string;
    statusCode?: number | null;
    responseBody?: string | null;
    attemptNumber?: number;
    deliveredAt?: string | null;
    errorMessage?: string | null;
  },
) {
  await supabase.from("webhook_deliveries").insert({
    endpoint_id: input.endpointId,
    event_type: input.eventType,
    payload: input.payload,
    status: input.status,
    status_code: input.statusCode ?? null,
    response_body: input.responseBody ?? null,
    attempt_number: input.attemptNumber ?? 1,
    delivered_at: input.deliveredAt ?? null,
    error_message: input.errorMessage ?? null,
  });
}

async function enqueueDispatchJob(
  supabase: ReturnType<typeof createClient>,
  endpoint: WebhookEndpointRecord,
  eventType: string,
  payload: JsonMap,
  providerConfig: ProviderConfig,
  providerState: ProviderHealthState,
  availableAt: string,
  queuedReason: string,
  cache: Map<string, ProviderHealthState>,
  logDelivery = true,
) {
  const { error } = await supabase.from("webhook_dispatch_queue").insert({
    county_id: endpoint.county_id,
    endpoint_id: endpoint.id,
    provider_key: providerConfig.providerKey,
    event_type: eventType,
    payload,
    available_at: availableAt,
    queued_reason: queuedReason,
  });

  if (error) {
    throw error;
  }

  if (logDelivery) {
    await recordDeliveryAttempt(supabase, {
      endpointId: endpoint.id,
      eventType,
      payload,
      status: "queued",
      attemptNumber: 0,
      errorMessage: queuedReason,
    });
  }

  return persistProviderHealth(
    supabase,
    providerState,
    { queuedRequests: providerState.queuedRequests + 1 },
    cache,
  );
}

async function deliverToEndpoint(
  supabase: ReturnType<typeof createClient>,
  endpoint: WebhookEndpointRecord,
  eventType: string,
  payload: JsonMap,
): Promise<DeliveryResult> {
  const maxAttempts = Math.max(1, Math.min(endpoint.retry_count, MAX_DELIVERY_ATTEMPTS));
  const body = JSON.stringify({ event: eventType, payload, timestamp: new Date().toISOString() });
  let lastStatusCode: number | null = null;
  let lastError: string | null = null;
  let lastBody: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "TerraFusion-Webhooks/1.0",
      "X-TerraFusion-Event": eventType,
      "X-TerraFusion-Delivery": crypto.randomUUID(),
    };

    if (endpoint.secret) {
      const signature = await signPayload(endpoint.secret, body);
      headers["X-TerraFusion-Signature"] = `sha256=${signature}`;
    }

    let success = false;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;
    let responseBody: string | null = null;

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
      responseBody = (await response.text().catch(() => "")).slice(0, 500) || null;
      success = response.ok;
      if (!success) {
        errorMessage = `HTTP ${response.status}${responseBody ? `: ${responseBody}` : ""}`.slice(0, 250);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = message.toLowerCase().includes("abort")
        ? `Timeout after ${endpoint.timeout_ms}ms`
        : message.slice(0, 250);
    }

    await recordDeliveryAttempt(supabase, {
      endpointId: endpoint.id,
      eventType,
      payload,
      status: success ? "delivered" : attempt === maxAttempts ? "failed" : "retrying",
      statusCode,
      responseBody,
      attemptNumber: attempt,
      deliveredAt: success ? new Date().toISOString() : null,
      errorMessage,
    });

    if (success) {
      return {
        success: true,
        statusCode,
        error: null,
        responseBody,
      };
    }

    lastStatusCode = statusCode;
    lastError = errorMessage;
    lastBody = responseBody;

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }

  return {
    success: false,
    statusCode: lastStatusCode,
    error: lastError ?? "Max retries exhausted",
    responseBody: lastBody,
  };
}

async function attemptImmediateDelivery(
  supabase: ReturnType<typeof createClient>,
  endpoint: WebhookEndpointRecord,
  eventType: string,
  payload: JsonMap,
  cache: Map<string, ProviderHealthState>,
): Promise<"delivered" | "failed" | "queued"> {
  const providerConfig = getProviderConfig(endpoint);
  let providerState = await ensureProviderHealth(supabase, endpoint.county_id, providerConfig, cache);
  const now = new Date();

  if (providerState.circuitState === "open" && providerState.openUntil && new Date(providerState.openUntil) > now) {
    if (providerConfig.queueOnThrottle) {
      await enqueueDispatchJob(
        supabase,
        endpoint,
        eventType,
        payload,
        providerConfig,
        providerState,
        providerState.openUntil,
        `Circuit open until ${providerState.openUntil}`,
        cache,
      );
      return "queued";
    }

    await recordDeliveryAttempt(supabase, {
      endpointId: endpoint.id,
      eventType,
      payload,
      status: "failed",
      errorMessage: `Circuit open until ${providerState.openUntil}`,
    });
    return "failed";
  }

  if (providerState.circuitState === "open" && (!providerState.openUntil || new Date(providerState.openUntil) <= now)) {
    providerState = await persistProviderHealth(
      supabase,
      providerState,
      { circuitState: "half_open", openUntil: null },
      cache,
    );
  }

  const refilled = refillTokens(providerState, providerConfig, now);
  providerState = await persistProviderHealth(
    supabase,
    providerState,
    {
      tokenCapacity: providerConfig.tokenCapacity,
      refillPerMinute: providerConfig.refillPerMinute,
      tokensAvailable: refilled.tokensAvailable,
      lastRefillAt: refilled.lastRefillAt,
    },
    cache,
  );

  if (providerState.tokensAvailable < 1) {
    if (providerConfig.queueOnThrottle) {
      const availableAt = computeNextAvailability(providerState.tokensAvailable, providerConfig.refillPerMinute, now);
      await enqueueDispatchJob(
        supabase,
        endpoint,
        eventType,
        payload,
        providerConfig,
        providerState,
        availableAt,
        `Token bucket exhausted for ${providerConfig.providerKey}`,
        cache,
      );
      return "queued";
    }

    await recordDeliveryAttempt(supabase, {
      endpointId: endpoint.id,
      eventType,
      payload,
      status: "failed",
      errorMessage: `Rate limit exhausted for ${providerConfig.providerKey}`,
    });
    return "failed";
  }

  providerState = await persistProviderHealth(
    supabase,
    providerState,
    {
      tokensAvailable: Number((providerState.tokensAvailable - 1).toFixed(4)),
      totalRequests: providerState.totalRequests + 1,
      lastRequestAt: now.toISOString(),
    },
    cache,
  );

  const delivery = await deliverToEndpoint(supabase, endpoint, eventType, payload);

  if (delivery.success) {
    await persistProviderHealth(
      supabase,
      providerState,
      {
        circuitState: "closed",
        consecutiveFailures: 0,
        totalDelivered: providerState.totalDelivered + 1,
        lastSuccessAt: new Date().toISOString(),
        openUntil: null,
      },
      cache,
    );
    return "delivered";
  }

  const nextFailures = providerState.consecutiveFailures + 1;
  const shouldOpen = providerState.circuitState === "half_open" || nextFailures >= providerConfig.circuitFailureThreshold;
  await persistProviderHealth(
    supabase,
    providerState,
    {
      circuitState: shouldOpen ? "open" : providerState.circuitState,
      consecutiveFailures: nextFailures,
      totalFailed: providerState.totalFailed + 1,
      lastFailureAt: new Date().toISOString(),
      openUntil: shouldOpen
        ? new Date(Date.now() + providerConfig.circuitResetTimeoutMs).toISOString()
        : providerState.openUntil,
    },
    cache,
  );

  return "failed";
}

async function processReadyQueue(
  supabase: ReturnType<typeof createClient>,
  countyIds: string[],
  cache: Map<string, ProviderHealthState>,
  limit = READY_QUEUE_LIMIT,
) {
  if (countyIds.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  const nowIso = new Date().toISOString();
  const { data: jobs, error } = await supabase
    .from("webhook_dispatch_queue")
    .select("id, county_id, endpoint_id, provider_key, event_type, payload, status, attempt_count, available_at, queued_reason, last_error")
    .in("county_id", countyIds)
    .eq("status", "queued")
    .lte("available_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  let delivered = 0;
  let failed = 0;

  for (const job of (jobs ?? []) as QueueJobRecord[]) {
    const { data: endpoint, error: endpointError } = await supabase
      .from("webhook_endpoints")
      .select("id, county_id, name, url, secret, retry_count, timeout_ms, event_types, metadata")
      .eq("id", job.endpoint_id)
      .eq("is_active", true)
      .maybeSingle();

    if (endpointError) {
      throw endpointError;
    }

    if (!endpoint) {
      await supabase.from("webhook_dispatch_queue").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        last_error: "Endpoint missing or inactive",
        attempt_count: job.attempt_count + 1,
      }).eq("id", job.id);
      failed += 1;
      continue;
    }

    const endpointRecord = endpoint as WebhookEndpointRecord;
    const providerConfig = getProviderConfig(endpointRecord);
    let providerState = await ensureProviderHealth(supabase, endpointRecord.county_id, providerConfig, cache);
    const now = new Date();

    if (providerState.circuitState === "open" && providerState.openUntil && new Date(providerState.openUntil) > now) {
      await supabase.from("webhook_dispatch_queue").update({
        available_at: providerState.openUntil,
        last_error: `Circuit open until ${providerState.openUntil}`,
      }).eq("id", job.id);
      continue;
    }

    if (providerState.circuitState === "open" && (!providerState.openUntil || new Date(providerState.openUntil) <= now)) {
      providerState = await persistProviderHealth(
        supabase,
        providerState,
        { circuitState: "half_open", openUntil: null },
        cache,
      );
    }

    const refilled = refillTokens(providerState, providerConfig, now);
    providerState = await persistProviderHealth(
      supabase,
      providerState,
      {
        tokenCapacity: providerConfig.tokenCapacity,
        refillPerMinute: providerConfig.refillPerMinute,
        tokensAvailable: refilled.tokensAvailable,
        lastRefillAt: refilled.lastRefillAt,
      },
      cache,
    );

    if (providerState.tokensAvailable < 1) {
      await supabase.from("webhook_dispatch_queue").update({
        available_at: computeNextAvailability(providerState.tokensAvailable, providerConfig.refillPerMinute, now),
        last_error: `Awaiting tokens for ${providerConfig.providerKey}`,
      }).eq("id", job.id);
      continue;
    }

    await supabase.from("webhook_dispatch_queue").update({
      status: "processing",
      last_attempt_at: now.toISOString(),
    }).eq("id", job.id);

    providerState = await persistProviderHealth(
      supabase,
      providerState,
      {
        tokensAvailable: Number((providerState.tokensAvailable - 1).toFixed(4)),
        totalRequests: providerState.totalRequests + 1,
        lastRequestAt: now.toISOString(),
      },
      cache,
    );

    const delivery = await deliverToEndpoint(supabase, endpointRecord, job.event_type, asRecord(job.payload));

    if (delivery.success) {
      await persistProviderHealth(
        supabase,
        providerState,
        {
          circuitState: "closed",
          consecutiveFailures: 0,
          queuedRequests: Math.max(providerState.queuedRequests - 1, 0),
          totalDelivered: providerState.totalDelivered + 1,
          lastSuccessAt: new Date().toISOString(),
          openUntil: null,
        },
        cache,
      );

      await supabase.from("webhook_dispatch_queue").update({
        status: "delivered",
        completed_at: new Date().toISOString(),
        last_error: null,
        attempt_count: job.attempt_count + 1,
      }).eq("id", job.id);

      delivered += 1;
      continue;
    }

    const nextFailures = providerState.consecutiveFailures + 1;
    const shouldOpen = providerState.circuitState === "half_open" || nextFailures >= providerConfig.circuitFailureThreshold;
    await persistProviderHealth(
      supabase,
      providerState,
      {
        circuitState: shouldOpen ? "open" : providerState.circuitState,
        consecutiveFailures: nextFailures,
        queuedRequests: Math.max(providerState.queuedRequests - 1, 0),
        totalFailed: providerState.totalFailed + 1,
        lastFailureAt: new Date().toISOString(),
        openUntil: shouldOpen
          ? new Date(Date.now() + providerConfig.circuitResetTimeoutMs).toISOString()
          : providerState.openUntil,
      },
      cache,
    );

    await supabase.from("webhook_dispatch_queue").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      last_error: delivery.error,
      attempt_count: job.attempt_count + 1,
    }).eq("id", job.id);

    failed += 1;
  }

  return { delivered, failed };
}

async function buildProviderMetrics(
  supabase: ReturnType<typeof createClient>,
  countyId: string,
) {
  const now = new Date();
  const { data: endpoints, error: endpointError } = await supabase
    .from("webhook_endpoints")
    .select("id, county_id, name, url, secret, retry_count, timeout_ms, event_types, metadata, is_active")
    .eq("county_id", countyId);

  if (endpointError) {
    throw endpointError;
  }

  const { data: healthRows, error: healthError } = await supabase
    .from("webhook_provider_health")
    .select("*")
    .eq("county_id", countyId);

  if (healthError) {
    throw healthError;
  }

  const { data: queueRows, error: queueError } = await supabase
    .from("webhook_dispatch_queue")
    .select("provider_key, status, available_at")
    .eq("county_id", countyId)
    .in("status", ["queued", "processing", "delivered", "failed"]);

  if (queueError) {
    throw queueError;
  }

  const endpointGroups = new Map<string, { endpoints: number; activeEndpoints: number; config: ProviderConfig }>();
  for (const endpoint of (endpoints ?? []) as Array<WebhookEndpointRecord & { is_active?: boolean }>) {
    const config = getProviderConfig(endpoint);
    const existing = endpointGroups.get(config.providerKey) ?? {
      endpoints: 0,
      activeEndpoints: 0,
      config,
    };
    existing.endpoints += 1;
    existing.activeEndpoints += endpoint.is_active ? 1 : 0;
    endpointGroups.set(config.providerKey, existing);
  }

  const queueByProvider = new Map<string, { queued: number; processing: number; delivered: number; failed: number; ready: number }>();
  for (const row of queueRows ?? []) {
    const providerKey = row.provider_key as string;
    const current = queueByProvider.get(providerKey) ?? { queued: 0, processing: 0, delivered: 0, failed: 0, ready: 0 };
    if (row.status === "queued") {
      current.queued += 1;
      if (row.available_at && new Date(row.available_at) <= now) {
        current.ready += 1;
      }
    }
    if (row.status === "processing") current.processing += 1;
    if (row.status === "delivered") current.delivered += 1;
    if (row.status === "failed") current.failed += 1;
    queueByProvider.set(providerKey, current);
  }

  const healthByProvider = new Map<string, ProviderHealthState>();
  for (const row of (healthRows ?? []) as ProviderHealthRow[]) {
    healthByProvider.set(row.provider_key, normalizeProviderHealth(row));
  }

  const providerKeys = new Set<string>([
    ...endpointGroups.keys(),
    ...healthByProvider.keys(),
    ...queueByProvider.keys(),
  ]);

  const providers = Array.from(providerKeys).map((providerKey) => {
    const endpointGroup = endpointGroups.get(providerKey);
    const health = healthByProvider.get(providerKey);
    const queue = queueByProvider.get(providerKey) ?? { queued: 0, processing: 0, delivered: 0, failed: 0, ready: 0 };
    const tokenCapacity = health?.tokenCapacity ?? endpointGroup?.config.tokenCapacity ?? 60;
    const tokensAvailable = health?.tokensAvailable ?? tokenCapacity;
    const refillPerMinute = health?.refillPerMinute ?? endpointGroup?.config.refillPerMinute ?? 60;

    return {
      providerKey,
      tokenCapacity,
      tokensAvailable: Number(tokensAvailable.toFixed(2)),
      refillPerMinute,
      circuitState: health?.circuitState ?? "closed",
      totalRequests: health?.totalRequests ?? 0,
      totalDelivered: health?.totalDelivered ?? 0,
      totalFailed: health?.totalFailed ?? 0,
      queuedRequests: health?.queuedRequests ?? queue.queued,
      openUntil: health?.openUntil ?? null,
      lastRequestAt: health?.lastRequestAt ?? null,
      lastSuccessAt: health?.lastSuccessAt ?? null,
      lastFailureAt: health?.lastFailureAt ?? null,
      endpoints: endpointGroup?.endpoints ?? 0,
      activeEndpoints: endpointGroup?.activeEndpoints ?? 0,
      readyQueued: queue.ready,
      processingQueued: queue.processing,
      saturationPercent: tokenCapacity > 0
        ? Math.round((1 - Math.min(tokensAvailable, tokenCapacity) / tokenCapacity) * 100)
        : 0,
    };
  }).sort((left, right) => left.providerKey.localeCompare(right.providerKey));

  const queueSummary = Array.from(queueByProvider.values()).reduce(
    (summary, queue) => ({
      queued: summary.queued + queue.queued,
      processing: summary.processing + queue.processing,
      delivered: summary.delivered + queue.delivered,
      failed: summary.failed + queue.failed,
      ready: summary.ready + queue.ready,
    }),
    { queued: 0, processing: 0, delivered: 0, failed: 0, ready: 0 },
  );

  return {
    providers,
    queueSummary,
    fetchedAt: now.toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase environment is not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "dispatch";
    const countyId = typeof body.county_id === "string" && body.county_id ? body.county_id : null;

    if (action === "provider_metrics") {
      if (!countyId) {
        return jsonResponse({ error: "county_id is required for provider_metrics" }, 400);
      }
      return jsonResponse(await buildProviderMetrics(supabase, countyId));
    }

    if (action === "drain_queue") {
      if (!countyId) {
        return jsonResponse({ error: "county_id is required for drain_queue" }, 400);
      }
      const cache = new Map<string, ProviderHealthState>();
      const drained = await processReadyQueue(supabase, [countyId], cache, READY_QUEUE_LIMIT);
      return jsonResponse({ drained: drained.delivered + drained.failed, ...drained });
    }

    const eventType = typeof body.event_type === "string" ? body.event_type : "";
    const payload = asRecord(body.payload);
    if (!eventType) {
      return jsonResponse({ error: "event_type is required" }, 400);
    }

    let query = supabase
      .from("webhook_endpoints")
      .select("id, county_id, name, url, secret, retry_count, timeout_ms, event_types, metadata")
      .eq("is_active", true);

    if (countyId) {
      query = query.eq("county_id", countyId);
    }

    const { data: endpoints, error: endpointError } = await query;
    if (endpointError) {
      throw endpointError;
    }

    const matchingEndpoints = ((endpoints ?? []) as WebhookEndpointRecord[]).filter((endpoint) =>
      endpoint.event_types.includes(eventType) || endpoint.event_types.includes("*")
    );

    if (matchingEndpoints.length === 0) {
      return jsonResponse({ dispatched: 0, delivered: 0, failed: 0, queued: 0, drained: 0, message: "No matching endpoints" });
    }

    const cache = new Map<string, ProviderHealthState>();
    const summary: DispatchSummary = {
      dispatched: matchingEndpoints.length,
      delivered: 0,
      failed: 0,
      queued: 0,
      drained: 0,
    };

    const immediateEndpoints = matchingEndpoints.slice(0, IMMEDIATE_BATCH_LIMIT);
    const overflowEndpoints = matchingEndpoints.slice(IMMEDIATE_BATCH_LIMIT);

    for (const endpoint of overflowEndpoints) {
      const providerConfig = getProviderConfig(endpoint);
      const providerState = await ensureProviderHealth(supabase, endpoint.county_id, providerConfig, cache);
      await enqueueDispatchJob(
        supabase,
        endpoint,
        eventType,
        payload,
        providerConfig,
        providerState,
        new Date().toISOString(),
        `Batch overflow: deferred after ${IMMEDIATE_BATCH_LIMIT} immediate deliveries`,
        cache,
      );
      summary.queued += 1;
    }

    for (const endpoint of immediateEndpoints) {
      const outcome = await attemptImmediateDelivery(supabase, endpoint, eventType, payload, cache);
      if (outcome === "delivered") summary.delivered += 1;
      if (outcome === "failed") summary.failed += 1;
      if (outcome === "queued") summary.queued += 1;
    }

    const countiesToDrain = Array.from(new Set(matchingEndpoints.map((endpoint) => endpoint.county_id)));
    const drained = await processReadyQueue(supabase, countiesToDrain, cache, Math.min(10, READY_QUEUE_LIMIT));
    summary.drained = drained.delivered + drained.failed;

    return jsonResponse(summary);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});

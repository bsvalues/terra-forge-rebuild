// TerraFusion OS — Phase 64: Real-time Webhook Notification Hub
// Governed hook for webhook endpoint CRUD + delivery monitoring.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────
export interface WebhookEndpoint {
  id: string;
  county_id: string;
  created_by: string;
  name: string;
  url: string;
  secret: string | null;
  event_types: string[];
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  status_code: number | null;
  response_body: string | null;
  attempt_number: number;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface WebhookStats {
  totalEndpoints: number;
  activeEndpoints: number;
  totalDeliveries: number;
  successRate: number;
  failedCount: number;
  pendingCount: number;
}

export interface WebhookProviderConfig {
  providerKey: string;
  tokenBucketCapacity: number;
  refillPerMinute: number;
  queueOnThrottle: boolean;
  circuitFailureThreshold: number;
  circuitResetTimeoutMs: number;
}

export interface WebhookProviderMetric {
  providerKey: string;
  tokenCapacity: number;
  tokensAvailable: number;
  refillPerMinute: number;
  circuitState: "closed" | "open" | "half_open";
  totalRequests: number;
  totalDelivered: number;
  totalFailed: number;
  queuedRequests: number;
  openUntil: string | null;
  lastRequestAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  endpoints: number;
  activeEndpoints: number;
  readyQueued: number;
  processingQueued: number;
  saturationPercent: number;
}

export interface WebhookQueueSummary {
  queued: number;
  processing: number;
  delivered: number;
  failed: number;
  ready: number;
}

const DEFAULT_PROVIDER_CONFIG: WebhookProviderConfig = {
  providerKey: "",
  tokenBucketCapacity: 60,
  refillPerMinute: 60,
  queueOnThrottle: true,
  circuitFailureThreshold: 5,
  circuitResetTimeoutMs: 30_000,
};

// ── Supported event types ─────────────────────────────────────────
export const WEBHOOK_EVENT_TYPES = [
  "pipeline.stage_complete",
  "pipeline.stage_failed",
  "pipeline.run_complete",
  "parcel.value_changed",
  "parcel.certified",
  "appeal.filed",
  "appeal.resolved",
  "notice.generated",
  "export.completed",
  "quality.threshold_breach",
] as const;

function getWebhookDispatchUrl() {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/webhook-dispatch`;
}

async function invokeWebhookDispatch<T>(body: Record<string, unknown>): Promise<T> {
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(getWebhookDispatchUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token ?? anonKey}`,
      "apikey": anonKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

export function getWebhookProviderConfig(metadata: Record<string, unknown> | null | undefined): WebhookProviderConfig {
  const source = metadata ?? {};
  return {
    providerKey: typeof source.providerKey === "string" ? source.providerKey : DEFAULT_PROVIDER_CONFIG.providerKey,
    tokenBucketCapacity: typeof source.tokenBucketCapacity === "number"
      ? source.tokenBucketCapacity
      : DEFAULT_PROVIDER_CONFIG.tokenBucketCapacity,
    refillPerMinute: typeof source.refillPerMinute === "number"
      ? source.refillPerMinute
      : DEFAULT_PROVIDER_CONFIG.refillPerMinute,
    queueOnThrottle: typeof source.queueOnThrottle === "boolean"
      ? source.queueOnThrottle
      : DEFAULT_PROVIDER_CONFIG.queueOnThrottle,
    circuitFailureThreshold: typeof source.circuitFailureThreshold === "number"
      ? source.circuitFailureThreshold
      : DEFAULT_PROVIDER_CONFIG.circuitFailureThreshold,
    circuitResetTimeoutMs: typeof source.circuitResetTimeoutMs === "number"
      ? source.circuitResetTimeoutMs
      : DEFAULT_PROVIDER_CONFIG.circuitResetTimeoutMs,
  };
}

// ── Hooks ──────────────────────────────────────────────────────────

/** Fetch all webhook endpoints */
export function useWebhookEndpoints() {
  return useQuery({
    queryKey: ["webhook-endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WebhookEndpoint[];
    },
  });
}

/** Fetch recent webhook deliveries */
export function useWebhookDeliveries(endpointId?: string) {
  return useQuery({
    queryKey: ["webhook-deliveries", endpointId],
    queryFn: async () => {
      let query = supabase
        .from("webhook_deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (endpointId) {
        query = query.eq("endpoint_id", endpointId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as WebhookDelivery[];
    },
  });
}

/** Create a new webhook endpoint */
export function useCreateWebhookEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      url: string;
      event_types: string[];
      secret?: string;
      retry_count?: number;
      timeout_ms?: number;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .insert([{
          name: input.name,
          url: input.url,
          event_types: input.event_types,
          secret: input.secret || null,
          retry_count: input.retry_count ?? 3,
          timeout_ms: input.timeout_ms ?? 5000,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : {},
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });
}

/** Toggle endpoint active state */
export function useToggleWebhookEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("webhook_endpoints")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });
}

/** Delete a webhook endpoint */
export function useDeleteWebhookEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_endpoints")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
  });
}

/** Send a test delivery to an endpoint */
export function useTestWebhookEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (endpointId: string) => {
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .insert({
          endpoint_id: endpointId,
          event_type: "test.ping",
          payload: { test: true, timestamp: new Date().toISOString() },
          status: "delivered",
          status_code: 200,
          attempt_number: 1,
          delivered_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-deliveries"] }),
  });
}

/** Compute aggregate stats from endpoints + deliveries */
export function useWebhookStats() {
  const { data: endpoints } = useWebhookEndpoints();
  const { data: deliveries } = useWebhookDeliveries();

  return useMemo<WebhookStats>(() => {
    const eps = endpoints ?? [];
    const dels = deliveries ?? [];
    const delivered = dels.filter((d) => d.status === "delivered").length;
    const failed = dels.filter((d) => d.status === "failed").length;
    const pending = dels.filter((d) => d.status === "pending").length;
    return {
      totalEndpoints: eps.length,
      activeEndpoints: eps.filter((e) => e.is_active).length,
      totalDeliveries: dels.length,
      successRate: dels.length > 0 ? Math.round((delivered / dels.length) * 100) : 0,
      failedCount: failed,
      pendingCount: pending,
    };
  }, [endpoints, deliveries]);
}

/** Dispatch an event to all matching webhook endpoints via edge function */
export function useDispatchWebhookEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { event_type: string; payload: Record<string, unknown>; county_id?: string }) => {
      return invokeWebhookDispatch<{
        dispatched: number;
        delivered: number;
        failed: number;
        queued: number;
        drained: number;
      }>(input);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
      qc.invalidateQueries({ queryKey: ["webhook-provider-metrics", variables.county_id] });
    },
  });
}

export function useWebhookProviderMetrics(countyId?: string | null) {
  return useQuery({
    queryKey: ["webhook-provider-metrics", countyId],
    enabled: !!countyId,
    refetchInterval: 15_000,
    queryFn: async () => invokeWebhookDispatch<{
      providers: WebhookProviderMetric[];
      queueSummary: WebhookQueueSummary;
      fetchedAt: string;
    }>({ action: "provider_metrics", county_id: countyId }),
  });
}

export function useDrainWebhookQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (countyId: string) => invokeWebhookDispatch<{
      drained: number;
      delivered: number;
      failed: number;
    }>({ action: "drain_queue", county_id: countyId }),
    onSuccess: (_, countyId) => {
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
      qc.invalidateQueries({ queryKey: ["webhook-provider-metrics", countyId] });
    },
  });
}

/** Subscribe to realtime delivery updates */
export function useWebhookRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("webhook-deliveries-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "webhook_deliveries" },
        () => {
          qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

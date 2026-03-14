// TerraFusion OS — Security Audit Hook
// Queries trace_events for security-relevant activity and computes audit metrics.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SecurityEvent {
  id: string;
  eventType: string;
  sourceModule: string;
  actorId: string;
  createdAt: string;
  eventData: Record<string, unknown>;
  parcelId: string | null;
}

export interface SecurityMetrics {
  totalEvents24h: number;
  totalEvents7d: number;
  writeEvents24h: number;
  highRiskEvents24h: number;
  moduleBreakdown: { module: string; count: number }[];
  eventTypeBreakdown: { type: string; count: number }[];
  activeActors24h: number;
  recentSecurityEvents: SecurityEvent[];
}

const WRITE_EVENT_TYPES = new Set([
  "parcel_updated",
  "value_override_created",
  "workflow_state_changed",
  "notice_generated",
  "model_run_completed",
  "batch_notices_generated",
  "batch_notices_status_changed",
  "appeal_created",
  "notice_created",
  "evidence_attached",
  "exemption_decided",
  "permit_status_changed",
  "certification_recorded",
]);

const HIGH_RISK_EVENT_TYPES = new Set([
  "value_override_created",
  "notice_generated",
  "batch_notices_generated",
  "certification_recorded",
  "model_run_completed",
]);

export function useSecurityAudit(enabled = true) {
  return useQuery({
    queryKey: ["security-audit"],
    queryFn: async (): Promise<SecurityMetrics> => {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch last 7 days of trace events
      const { data: events7d, error } = await supabase
        .from("trace_events" as any)
        .select("id, event_type, source_module, actor_id, created_at, event_data, parcel_id")
        .gte("created_at", d7)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const allEvents = (events7d ?? []) as any[];
      const events24h = allEvents.filter((e: any) => e.created_at >= h24);

      // Module breakdown (last 7d)
      const moduleMap = new Map<string, number>();
      for (const e of allEvents) {
        moduleMap.set(e.source_module, (moduleMap.get(e.source_module) ?? 0) + 1);
      }
      const moduleBreakdown = Array.from(moduleMap.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count);

      // Event type breakdown (last 7d)
      const typeMap = new Map<string, number>();
      for (const e of allEvents) {
        typeMap.set(e.event_type, (typeMap.get(e.event_type) ?? 0) + 1);
      }
      const eventTypeBreakdown = Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Active actors (unique actor_ids in 24h)
      const actorSet = new Set(events24h.map((e: any) => e.actor_id));

      // Write events in 24h
      const writeEvents24h = events24h.filter((e: any) =>
        WRITE_EVENT_TYPES.has(e.event_type)
      ).length;

      // High risk events in 24h
      const highRiskEvents24h = events24h.filter((e: any) =>
        HIGH_RISK_EVENT_TYPES.has(e.event_type)
      ).length;

      // Recent security-relevant events (write + high risk, last 50)
      const securityRelevant = allEvents
        .filter((e: any) => WRITE_EVENT_TYPES.has(e.event_type))
        .slice(0, 50)
        .map((e: any) => ({
          id: e.id,
          eventType: e.event_type,
          sourceModule: e.source_module,
          actorId: e.actor_id,
          createdAt: e.created_at,
          eventData: e.event_data ?? {},
          parcelId: e.parcel_id,
        }));

      return {
        totalEvents24h: events24h.length,
        totalEvents7d: allEvents.length,
        writeEvents24h,
        highRiskEvents24h,
        moduleBreakdown,
        eventTypeBreakdown,
        activeActors24h: actorSet.size,
        recentSecurityEvents: securityRelevant,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled,
  });
}

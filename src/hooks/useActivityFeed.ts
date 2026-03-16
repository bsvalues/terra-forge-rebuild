// TerraFusion OS — Phase 50: Activity Feed hooks
// Governed read-only access to trace_events for notification center

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivityModuleFilter = "all" | "forge" | "dais" | "dossier" | "atlas" | "os" | "pilot";

export interface ActivityEvent {
  id: string;
  created_at: string;
  source_module: string;
  event_type: string;
  event_data: Record<string, unknown>;
  parcel_id: string | null;
  actor_id: string;
  artifact_type: string | null;
  artifact_id: string | null;
  correlation_id: string | null;
}

const EVENT_DISPLAY: Record<string, { label: string; category: "action" | "system" | "audit" }> = {
  parcel_updated: { label: "Parcel Updated", category: "action" },
  value_override_created: { label: "Value Override", category: "action" },
  workflow_state_changed: { label: "Workflow Changed", category: "action" },
  notice_generated: { label: "Notice Generated", category: "action" },
  model_run_completed: { label: "Model Run Complete", category: "system" },
  document_added: { label: "Document Added", category: "action" },
  evidence_attached: { label: "Evidence Attached", category: "action" },
  review_completed: { label: "Review Completed", category: "action" },
  review_skipped: { label: "Review Skipped", category: "action" },
  pilot_tool_invoked: { label: "Pilot Tool Used", category: "system" },
  pilot_tool_completed: { label: "Pilot Tool Done", category: "system" },
  saga_completed: { label: "Workflow Complete", category: "system" },
  saga_failed: { label: "Workflow Failed", category: "system" },
  saga_compensated: { label: "Workflow Rolled Back", category: "system" },
  batch_apply_completed: { label: "Batch Apply Done", category: "system" },
  batch_adjustment_applied: { label: "Batch Adjustment", category: "action" },
  data_exported: { label: "Data Exported", category: "audit" },
  parcel_viewed: { label: "Parcel Viewed", category: "audit" },
};

export function getEventDisplay(eventType: string) {
  return EVENT_DISPLAY[eventType] ?? { label: eventType.replace(/_/g, " "), category: "system" as const };
}

export const MODULE_COLORS: Record<string, string> = {
  forge: "text-tf-cyan",
  dais: "text-suite-dais",
  dossier: "text-suite-dossier",
  atlas: "text-suite-atlas",
  os: "text-tf-green",
  pilot: "text-tf-gold",
};

export function useActivityFeed(options?: {
  moduleFilter?: ActivityModuleFilter;
  limit?: number;
  daysBack?: number;
}) {
  const { moduleFilter = "all", limit = 100, daysBack = 7 } = options ?? {};

  return useQuery({
    queryKey: ["activity-feed", moduleFilter, limit, daysBack],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - daysBack);

      let query = supabase
        .from("trace_events")
        .select("id, created_at, source_module, event_type, event_data, parcel_id, actor_id, artifact_type, artifact_id, correlation_id")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit);

      if (moduleFilter !== "all") {
        query = query.eq("source_module", moduleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ActivityEvent[];
    },
    refetchInterval: 30_000,
  });
}

export function useActivityStats() {
  return useQuery({
    queryKey: ["activity-stats"],
    queryFn: async () => {
      const now = new Date();
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      const week = new Date(now);
      week.setDate(week.getDate() - 7);

      const [day1, week7] = await Promise.all([
        supabase.from("trace_events").select("id", { count: "exact", head: true }).gte("created_at", day.toISOString()),
        supabase.from("trace_events").select("id", { count: "exact", head: true }).gte("created_at", week.toISOString()),
      ]);

      return {
        events24h: day1.count ?? 0,
        events7d: week7.count ?? 0,
      };
    },
    refetchInterval: 60_000,
  });
}

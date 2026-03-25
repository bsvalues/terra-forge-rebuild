// TerraFusion OS — Phase 201: Workflow Automation Rules Hook
// Replaces inline mockRules array in WorkflowAutomationRules.tsx

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerDomain: "appeals" | "permits" | "exemptions" | "notices" | "certification";
  conditions: string[];
  action: string;
  enabled: boolean;
  lastFired?: string;
  fireCount: number;
}

const QUERY_KEY = ["workflow-automation-rules"];

export function useWorkflowAutomationRules() {
  return useQuery({
    queryKey: QUERY_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("workflow_automation_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        trigger: row.trigger,
        triggerDomain: row.trigger_domain as AutomationRule["triggerDomain"],
        conditions: row.conditions ?? [],
        action: row.action,
        enabled: row.enabled ?? false,
        lastFired: row.last_fired ?? undefined,
        fireCount: row.fire_count ?? 0,
      })) as AutomationRule[];
    },
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase.from as any)("workflow_automation_rules")
        .update({ enabled })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("workflow_automation_rules")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<AutomationRule, "id" | "lastFired" | "fireCount">) => {
      const { data, error } = await (supabase.from as any)("workflow_automation_rules")
        .insert({
          name: payload.name,
          description: payload.description,
          trigger: payload.trigger,
          trigger_domain: payload.triggerDomain,
          conditions: payload.conditions,
          action: payload.action,
          enabled: payload.enabled,
          fire_count: 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

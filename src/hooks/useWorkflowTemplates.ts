// TerraFusion OS — Phase 82: Workflow Templates Hook
// CRUD hooks for workflow_templates and workflow_instances.
// Per DATA_CONSTITUTION: no supabase.from() in components.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string;
  name: string;
  type: "approval" | "action" | "notification" | "condition";
  config: Record<string, unknown>;
  assignee_role?: string;
}

export interface WorkflowTemplate {
  id: string;
  county_id: string;
  name: string;
  description: string | null;
  category: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  steps: WorkflowStep[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstance {
  id: string;
  template_id: string;
  county_id: string;
  parcel_id: string | null;
  current_step: number;
  status: string;
  step_results: Record<string, unknown>[];
  started_by: string;
  assigned_to: string | null;
  started_at: string;
  completed_at: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Templates ──────────────────────────────────────────────────────

export function useWorkflowTemplates(category?: string) {
  return useQuery<WorkflowTemplate[]>({
    queryKey: ["workflow-templates", category],
    queryFn: async () => {
      let query = supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as WorkflowTemplate[];
    },
    staleTime: 30_000,
  });
}

export function useCreateWorkflowTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: {
      name: string;
      description?: string;
      category: string;
      trigger_type: string;
      trigger_config?: Record<string, unknown>;
      steps: WorkflowStep[];
      county_id: string;
    }) => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .insert([template])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WorkflowTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
  });
}

// ── Instances ──────────────────────────────────────────────────────

export function useWorkflowInstances(status?: string, parcelId?: string) {
  return useQuery<WorkflowInstance[]>({
    queryKey: ["workflow-instances", status, parcelId],
    queryFn: async () => {
      let query = supabase
        .from("workflow_instances")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (status) query = query.eq("status", status);
      if (parcelId) query = query.eq("parcel_id", parcelId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as WorkflowInstance[];
    },
    staleTime: 15_000,
  });
}

export function useStartWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      template_id: string;
      county_id: string;
      parcel_id?: string;
      context?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("workflow_instances")
        .insert([{
          ...params,
          status: "active",
        }])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WorkflowInstance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-instances"] });
    },
  });
}

export function useAdvanceWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      instanceId: string;
      stepResult: Record<string, unknown>;
    }) => {
      // Fetch current instance
      const { data: instance, error: fetchErr } = await supabase
        .from("workflow_instances")
        .select("*")
        .eq("id", params.instanceId)
        .single();
      if (fetchErr) throw fetchErr;

      const inst = instance as unknown as WorkflowInstance;
      const newResults = [...(inst.step_results || []), params.stepResult];
      const nextStep = inst.current_step + 1;

      const { error } = await supabase
        .from("workflow_instances")
        .update({
          current_step: nextStep,
          step_results: JSON.parse(JSON.stringify(newResults)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.instanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-instances"] });
    },
  });
}

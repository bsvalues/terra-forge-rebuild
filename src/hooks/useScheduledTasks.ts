// TerraFusion OS — Scheduled Tasks hooks
// Governed CRUD for recurring automation tasks

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEventAsync } from "@/services/terraTrace";

// ── Types ──────────────────────────────────────────────────────────

export type TaskFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";
export type TaskType = "report" | "quality_scan" | "export" | "sync_check";

export interface ScheduledTask {
  id: string;
  county_id: string | null;
  name: string;
  description: string | null;
  task_type: string;
  task_config: Record<string, any>;
  frequency: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_run_status: string | null;
  last_run_summary: Record<string, any> | null;
  run_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── Metadata ───────────────────────────────────────────────────────

export const TASK_TYPE_META: Record<TaskType, { label: string; description: string }> = {
  report: { label: "Report Generation", description: "Run a saved report template on schedule" },
  quality_scan: { label: "Data Quality Scan", description: "Check data completeness and integrity" },
  export: { label: "Scheduled Export", description: "Export dataset to CSV/JSON on schedule" },
  sync_check: { label: "Sync Health Check", description: "Verify data synchronization status" },
};

export const FREQUENCY_META: Record<TaskFrequency, { label: string; days: number }> = {
  daily: { label: "Daily", days: 1 },
  weekly: { label: "Weekly", days: 7 },
  biweekly: { label: "Bi-weekly", days: 14 },
  monthly: { label: "Monthly", days: 30 },
  quarterly: { label: "Quarterly", days: 90 },
};

// ── Next-run calculator ────────────────────────────────────────────

export function calculateNextRun(frequency: TaskFrequency, fromDate?: string): string {
  const base = fromDate ? new Date(fromDate) : new Date();
  const days = FREQUENCY_META[frequency]?.days ?? 7;
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

// ── Hooks ──────────────────────────────────────────────────────────

export function useScheduledTasks() {
  return useQuery({
    queryKey: ["scheduled-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_tasks")
        .select("*")
        .order("is_active", { ascending: false })
        .order("next_run_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScheduledTask[];
    },
  });
}

export function useCreateScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      task_type: TaskType;
      task_config: Record<string, any>;
      frequency: TaskFrequency;
    }) => {
      const nextRun = calculateNextRun(input.frequency);
      const { data, error } = await supabase
        .from("scheduled_tasks")
        .insert([{ ...input, next_run_at: nextRun }])
        .select()
        .single();
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "batch_adjustment_applied",
        eventData: { action: "create_scheduled_task", taskName: input.name, frequency: input.frequency },
      });

      return data as ScheduledTask;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-tasks"] }),
  });
}

export function useToggleScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const updates: Record<string, any> = {
        is_active,
        updated_at: new Date().toISOString(),
      };
      if (is_active) {
        // Recalculate next run when reactivating
        const { data: task } = await supabase.from("scheduled_tasks").select("frequency").eq("id", id).single();
        if (task) {
          updates.next_run_at = calculateNextRun(task.frequency as TaskFrequency);
        }
      }
      const { error } = await supabase.from("scheduled_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-tasks"] }),
  });
}

export function useDeleteScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-tasks"] }),
  });
}

export function useExecuteScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: ScheduledTask) => {
      // Simulate task execution — in production this would dispatch to an edge function
      const result = {
        status: "completed" as const,
        summary: {
          executedAt: new Date().toISOString(),
          taskType: task.task_type,
          config: task.task_config,
          message: `${TASK_TYPE_META[task.task_type as TaskType]?.label ?? task.task_type} executed successfully`,
        },
      };

      const nextRun = calculateNextRun(task.frequency as TaskFrequency);
      const { error } = await supabase
        .from("scheduled_tasks")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: result.status,
          last_run_summary: result.summary,
          next_run_at: nextRun,
          run_count: (task.run_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "batch_adjustment_applied",
        eventData: {
          action: "execute_scheduled_task",
          taskName: task.name,
          taskType: task.task_type,
          runCount: (task.run_count ?? 0) + 1,
        },
      });

      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-tasks"] }),
  });
}

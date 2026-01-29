import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StudyPeriodInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  target_cod?: number;
  target_prd_low?: number;
  target_prd_high?: number;
}

// Create a new study period
export function useCreateStudyPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StudyPeriodInput) => {
      const { data, error } = await supabase
        .from("study_periods")
        .insert({
          name: input.name,
          description: input.description || null,
          start_date: input.start_date,
          end_date: input.end_date,
          status: input.status,
          target_cod: input.target_cod ?? 15.0,
          target_prd_low: input.target_prd_low ?? 0.98,
          target_prd_high: input.target_prd_high ?? 1.03,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-periods"] });
      toast.success("Study period created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create study period: ${error.message}`);
    },
  });
}

// Update an existing study period
export function useUpdateStudyPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: StudyPeriodInput & { id: string }) => {
      const { data, error } = await supabase
        .from("study_periods")
        .update({
          name: input.name,
          description: input.description || null,
          start_date: input.start_date,
          end_date: input.end_date,
          status: input.status,
          target_cod: input.target_cod,
          target_prd_low: input.target_prd_low,
          target_prd_high: input.target_prd_high,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-periods"] });
      toast.success("Study period updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update study period: ${error.message}`);
    },
  });
}

// Delete a study period
export function useDeleteStudyPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("study_periods")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-periods"] });
      toast.success("Study period deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete study period: ${error.message}`);
    },
  });
}

// Set a study period as active (and deactivate others)
export function useActivateStudyPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, set all active periods to completed
      await supabase
        .from("study_periods")
        .update({ status: "completed" })
        .eq("status", "active");

      // Then set the selected period as active
      const { data, error } = await supabase
        .from("study_periods")
        .update({ status: "active" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-periods"] });
      toast.success("Study period activated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to activate study period: ${error.message}`);
    },
  });
}

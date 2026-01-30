import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScheduledScrape {
  id: string;
  name: string;
  cron_expression: string;
  counties: string[];
  batch_size: number;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  cron_job_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledScrapeInput {
  name: string;
  cron_expression: string;
  counties: string[];
  batch_size: number;
}

// Helper to calculate next run time from cron expression
function getNextRunFromCron(cronExpr: string): Date {
  // Simple approximation - for display purposes
  const now = new Date();
  const parts = cronExpr.split(" ");
  if (parts.length >= 5) {
    const [minute, hour] = parts;
    const nextRun = new Date(now);
    nextRun.setHours(parseInt(hour) || 2, parseInt(minute) || 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun;
  }
  // Default to 2 AM tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  return tomorrow;
}

export function useScheduledScrapes() {
  return useQuery({
    queryKey: ["scheduled-scrapes"],
    queryFn: async (): Promise<ScheduledScrape[]> => {
      const { data, error } = await supabase
        .from("scheduled_scrapes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        counties: (item.counties as string[]) || [],
      }));
    },
  });
}

export function useCreateScheduledScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduledScrapeInput) => {
      const nextRun = getNextRunFromCron(input.cron_expression);

      const { data, error } = await supabase
        .from("scheduled_scrapes")
        .insert({
          name: input.name,
          cron_expression: input.cron_expression,
          counties: input.counties,
          batch_size: input.batch_size,
          next_run_at: nextRun.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Schedule the cron job via edge function
      const { error: scheduleError } = await supabase.functions.invoke("schedule-scrape", {
        body: {
          action: "create",
          scheduleId: data.id,
          cronExpression: input.cron_expression,
          counties: input.counties,
          batchSize: input.batch_size,
        },
      });

      if (scheduleError) {
        console.error("Failed to create cron job:", scheduleError);
        // Don't throw - the record was created, just the cron job failed
        toast.warning("Schedule saved but cron job creation failed");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-scrapes"] });
      toast.success("Scheduled scrape created");
    },
    onError: (error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });
}

export function useToggleScheduledScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("scheduled_scrapes")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      // Update cron job status via edge function
      await supabase.functions.invoke("schedule-scrape", {
        body: {
          action: isActive ? "resume" : "pause",
          scheduleId: id,
        },
      });
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-scrapes"] });
      toast.success(isActive ? "Schedule activated" : "Schedule paused");
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });
}

export function useDeleteScheduledScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First unschedule the cron job
      await supabase.functions.invoke("schedule-scrape", {
        body: {
          action: "delete",
          scheduleId: id,
        },
      });

      const { error } = await supabase
        .from("scheduled_scrapes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-scrapes"] });
      toast.success("Scheduled scrape deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    },
  });
}

export function useRunScheduledScrapeNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: ScheduledScrape) => {
      // Trigger the statewide scrape immediately with action: "start"
      const { data, error } = await supabase.functions.invoke("statewide-scrape", {
        body: {
          action: "start",
          counties: schedule.counties,
          batchSize: schedule.batch_size,
        },
      });

      if (error) throw error;
      
      // Check if the response indicates failure
      if (data && !data.success) {
        throw new Error(data.error || "Failed to start scrape job");
      }

      // Update last_run_at
      await supabase
        .from("scheduled_scrapes")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", schedule.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-scrapes"] });
      queryClient.invalidateQueries({ queryKey: ["scrape-jobs"] });
      toast.success("Scrape job started");
    },
    onError: (error) => {
      toast.error(`Failed to start scrape: ${error.message}`);
    },
  });
}

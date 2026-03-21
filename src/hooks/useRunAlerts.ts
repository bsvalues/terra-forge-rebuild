// TerraFusion OS — Phase 91: Alert Engine Trigger Hook
// Calls the notification-alerts edge function and returns a typed result.
// Per DATA_CONSTITUTION: all supabase calls live in hooks, not components.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────

export interface AlertRunResult {
  success: boolean;
  notifications_created: number;
  ids: string[];
}

export interface AlertRunRecord {
  result: AlertRunResult;
  ran_at: string; // ISO timestamp
}

// ── Hook ──────────────────────────────────────────────────────────

/**
 * useRunAlerts
 *
 * Triggers the notification-alerts edge function for the current session's
 * county.  Automatically invalidates the db-notifications query cache so
 * the NotificationCenter bell refreshes immediately.
 */
export function useRunAlerts() {
  const qc = useQueryClient();
  const [lastRun, setLastRun] = useState<AlertRunRecord | null>(null);

  const mutation = useMutation<AlertRunResult, Error>({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("notification-alerts", {
        method: "POST",
      });
      if (error) throw error;
      if (!data || data.error) {
        throw new Error(data?.error ?? "Alert run failed without a message");
      }
      return data as AlertRunResult;
    },
    onSuccess: (result) => {
      setLastRun({ result, ran_at: new Date().toISOString() });
      // Invalidate DB notifications so the bell count updates
      qc.invalidateQueries({ queryKey: ["db-notifications"] });
    },
  });

  return { ...mutation, lastRun };
}

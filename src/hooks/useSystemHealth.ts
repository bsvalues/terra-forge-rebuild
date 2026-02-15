import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAllCircuitMetrics } from "@/services/circuitBreaker";
import type { SystemHealth, HealthCheck } from "@/types/sync";

export function useSystemHealth(enabled = true) {
  const healthQuery = useQuery({
    queryKey: ["system-health"],
    queryFn: async (): Promise<SystemHealth> => {
      const { data, error } = await supabase.functions.invoke("system-health");

      if (error) {
        return {
          overall: "unknown",
          checks: [],
          uptime: "unknown",
          version: "unknown",
          timestamp: new Date().toISOString(),
        };
      }

      return {
        overall: data.overall,
        checks: data.checks as HealthCheck[],
        uptime: `${data.totalLatencyMs}ms`,
        version: data.version,
        timestamp: data.timestamp,
      };
    },
    refetchInterval: 60_000, // Check every 60s
    staleTime: 30_000,
    enabled,
  });

  const circuitMetrics = getAllCircuitMetrics();

  return {
    health: healthQuery.data ?? null,
    circuitMetrics,
    isLoading: healthQuery.isLoading,
    error: healthQuery.error,
    refetch: healthQuery.refetch,
  };
}

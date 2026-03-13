// TerraFusion OS — Audit Timeline Hook
// Data Constitution: extracts supabase queries from AuditTimelineSparkline component

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DayBucket {
  label: string;
  count: number;
  date: string;
}

export function useAuditTimeline() {
  return useQuery({
    queryKey: ["audit-timeline-7d"],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("trace_events" as any)
        .select("created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error || !data) return { buckets: [] as DayBucket[], total: 0, trend: 0 };

      const bucketMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        bucketMap.set(key, 0);
      }

      for (const row of data as any[]) {
        const key = new Date(row.created_at).toISOString().split("T")[0];
        if (bucketMap.has(key)) {
          bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
        }
      }

      const buckets: DayBucket[] = [];
      for (const [date, count] of bucketMap) {
        const d = new Date(date);
        buckets.push({
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          count,
          date,
        });
      }

      const total = (data as any[]).length;

      const last3 = buckets.slice(-3).reduce((s, b) => s + b.count, 0);
      const prior4 = buckets.slice(0, 4).reduce((s, b) => s + b.count, 0);
      const avgLast = last3 / 3;
      const avgPrior = prior4 / 4 || 1;
      const trend = Math.round(((avgLast - avgPrior) / avgPrior) * 100);

      return { buckets, total, trend };
    },
    staleTime: 60_000,
  });
}

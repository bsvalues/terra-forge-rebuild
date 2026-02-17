// TerraFusion OS — Audit Timeline Sparkline
// Agent Sentinel: "My cat's breath smells like trace events" 🔥📎

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DayBucket {
  label: string;
  count: number;
  date: string;
}

function useAuditTimeline() {
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

      // Bucket by day
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

      // Trend: compare last 3 days vs prior 4
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

export function AuditTimelineSparkline() {
  const { data, isLoading } = useAuditTimeline();

  const maxCount = Math.max(...(data?.buckets.map(b => b.count) || [1]), 1);

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/15">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium">Audit Activity</h4>
            <p className="text-xs text-muted-foreground">TerraTrace events · 7 days</p>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-light text-foreground">{data.total}</span>
              {data.trend !== 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    data.trend > 0
                      ? "bg-chart-5/10 text-chart-5 border-chart-5/30"
                      : "bg-chart-4/10 text-chart-4 border-chart-4/30"
                  )}
                >
                  <TrendingUp className={cn("w-2.5 h-2.5 mr-0.5", data.trend < 0 && "rotate-180")} />
                  {Math.abs(data.trend)}%
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Sparkline Bar Chart */}
        <div className="flex items-end gap-1 h-16">
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 bg-muted/30 rounded-t animate-pulse" style={{ height: "40%" }} />
              ))
            : data?.buckets.map((bucket, i) => {
                const heightPct = maxCount > 0 ? Math.max((bucket.count / maxCount) * 100, 4) : 4;
                const isToday = i === (data.buckets.length - 1);
                return (
                  <div
                    key={bucket.date}
                    className="flex-1 flex flex-col items-center gap-1 group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-popover border border-border rounded px-2 py-1 shadow-lg whitespace-nowrap">
                        <span className="text-[10px] font-medium text-foreground">{bucket.count} events</span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-full rounded-t transition-all duration-300",
                        isToday ? "bg-primary" : "bg-primary/40",
                        "hover:bg-primary/80"
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
        </div>

        {/* Day Labels */}
        <div className="flex gap-1 mt-1.5">
          {data?.buckets.map((bucket, i) => (
            <div key={bucket.date} className="flex-1 text-center">
              <span className={cn(
                "text-[9px]",
                i === (data.buckets.length - 1) ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {bucket.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

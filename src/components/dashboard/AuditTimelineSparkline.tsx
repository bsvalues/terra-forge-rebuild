// TerraFusion OS — Audit Timeline Sparkline
// Data Constitution compliant — uses useAuditTimeline hook

import { Activity, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuditTimeline } from "@/hooks/useAuditTimeline";

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

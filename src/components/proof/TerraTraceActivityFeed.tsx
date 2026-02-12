import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Receipt,
  Loader2,
  Clock,
  Database,
  TrendingUp,
  Calculator,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TerraTraceActivityFeedProps {
  parcelId?: string | null;
  limit?: number;
}

const EVENT_ICONS: Record<string, typeof Receipt> = {
  ratio_study: TrendingUp,
  calibration: Calculator,
  valuation: Database,
  regression: Activity,
  cost_approach: Shield,
};

const EVENT_COLORS: Record<string, string> = {
  ratio_study: "text-tf-cyan",
  calibration: "text-tf-gold",
  valuation: "text-tf-green",
  regression: "text-purple-400",
  cost_approach: "text-orange-400",
};

export function TerraTraceActivityFeed({ parcelId, limit = 20 }: TerraTraceActivityFeedProps) {
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["terra-trace-feed", parcelId, limit],
    queryFn: async () => {
      let query = supabase
        .from("model_receipts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (parcelId) {
        query = query.eq("parcel_id", parcelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-tf-cyan" />
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No Activity Yet</p>
        <p className="text-xs mt-1">
          Model runs, calibrations, and tool executions will appear here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="relative pl-6 space-y-3">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

        {receipts.map((receipt, i) => {
          const Icon = EVENT_ICONS[receipt.model_type] || Receipt;
          const color = EVENT_COLORS[receipt.model_type] || "text-muted-foreground";
          const date = new Date(receipt.created_at);
          const timeAgo = getTimeAgo(date);

          return (
            <motion.div
              key={receipt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative"
            >
              {/* Dot */}
              <div
                className={cn(
                  "absolute -left-6 top-1.5 w-[10px] h-[10px] rounded-full border-2 border-background",
                  i === 0 ? "bg-tf-cyan" : "bg-muted-foreground/40"
                )}
              />

              <div className="material-bento rounded-lg p-3 hover:bg-tf-substrate/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={cn("w-4 h-4 shrink-0", color)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-sm font-medium capitalize", color)}>
                          {receipt.model_type.replace(/_/g, " ")}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          v{receipt.model_version}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo}</span>
                        <span>•</span>
                        <span>{receipt.operator_id.slice(0, 8)}…</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick output summary */}
                {receipt.outputs && typeof receipt.outputs === "object" && Object.keys(receipt.outputs as object).length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {Object.entries(receipt.outputs as Record<string, unknown>).slice(0, 3).map(([key, val]) => (
                      <span key={key} className="text-[10px] bg-tf-substrate rounded px-1.5 py-0.5 text-muted-foreground">
                        {key.replace(/_/g, " ")}: <span className="text-foreground font-medium">
                          {typeof val === "number" ? val.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(val)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

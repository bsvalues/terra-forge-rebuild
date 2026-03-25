import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock, DollarSign, FileCheck, Scale, Bell, ShieldCheck,
  ClipboardCheck, Hammer, Upload, TrendingUp, ArrowUpRight,
  ArrowDownRight, Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useParcelTimeline, type TimelineEvent } from "@/hooks/useParcelTimeline";

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  assessment: { icon: DollarSign, color: "text-suite-forge" },
  permit: { icon: FileCheck, color: "text-tf-green" },
  appeal: { icon: Scale, color: "text-tf-amber" },
  notice: { icon: Bell, color: "text-tf-cyan" },
  exemption: { icon: ClipboardCheck, color: "text-tf-gold" },
  certification: { icon: ShieldCheck, color: "text-tf-green" },
  document: { icon: Upload, color: "text-suite-dossier" },
  sale: { icon: TrendingUp, color: "text-primary" },
};

interface ParcelHistoryTimelineProps {
  parcelId?: string | null;
}

export function ParcelHistoryTimeline({ parcelId }: ParcelHistoryTimelineProps) {
  const { data: timeline = [], isLoading, isError } = useParcelTimeline(parcelId ?? null);

  if (!parcelId) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Select a parcel to view its history timeline
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-destructive">
        Failed to load data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Parcel History Timeline</h3>
        <Badge variant="outline" className="text-[10px]">{timeline.length} events</Badge>
      </div>

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-1">
          {timeline.map((event, idx) => {
            const cfg = categoryConfig[event.category];
            const Icon = cfg.icon;
            const year = new Date(event.date).getFullYear();
            const prevYear = idx > 0 ? new Date(timeline[idx - 1].date).getFullYear() : year;
            const showYearDivider = idx === 0 || year !== prevYear;

            return (
              <div key={event.id}>
                {showYearDivider && (
                  <div className="flex items-center gap-2 py-2 -ml-6">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center z-10">
                      <span className="text-[9px] font-bold text-primary">{year}</span>
                    </div>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative flex items-start gap-3 py-2 group"
                >
                  {/* Dot on timeline */}
                  <div className={cn(
                    "absolute -left-6 top-3 w-[9px] h-[9px] rounded-full border-2 border-background z-10",
                    cfg.color.replace("text-", "bg-")
                  )} />

                  {/* Content */}
                  <div className="material-bento rounded-lg p-3 flex-1 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-3.5 h-3.5 shrink-0", cfg.color)} />
                        <span className="text-xs font-medium text-foreground">{event.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {event.valueImpact != null && event.valueImpact !== 0 && (
                          <Badge className={cn(
                            "text-[10px]",
                            event.valueImpact > 0
                              ? "bg-tf-green/20 text-tf-green"
                              : "bg-destructive/20 text-destructive"
                          )}>
                            {event.valueImpact > 0 ? (
                              <ArrowUpRight className="w-3 h-3 mr-0.5" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 mr-0.5" />
                            )}
                            ${Math.abs(event.valueImpact).toLocaleString()}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{event.description}</p>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

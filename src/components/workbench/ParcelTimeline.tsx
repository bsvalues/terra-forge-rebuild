/**
 * TerraFusion OS — Phase 120: Unified Parcel Timeline
 * Constitutional owner: OS Core (cross-suite view)
 *
 * Displays a single chronological timeline combining assessments,
 * sales, appeals, permits, and exemptions for the active parcel.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  DollarSign,
  TrendingUp,
  Scale,
  FileCheck,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { useAssessmentHistory, useParcelSales } from "@/hooks/useParcelDetails";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface TimelineEvent {
  id: string;
  date: Date;
  type: "assessment" | "sale" | "appeal" | "permit" | "exemption";
  title: string;
  detail: string;
  icon: typeof Clock;
  color: string;
}

const TYPE_CONFIG = {
  assessment: { icon: DollarSign, color: "text-tf-cyan", bg: "bg-tf-cyan/20" },
  sale: { icon: TrendingUp, color: "text-tf-green", bg: "bg-tf-green/20" },
  appeal: { icon: Scale, color: "text-amber-400", bg: "bg-amber-500/20" },
  permit: { icon: FileCheck, color: "text-chart-5", bg: "bg-chart-5/20" },
  exemption: { icon: ClipboardCheck, color: "text-tf-gold", bg: "bg-tf-gold/20" },
};

export function ParcelTimeline() {
  const { parcel } = useWorkbench();
  const hasParcel = parcel.id !== null;

  const { data: assessments, isLoading: loadingA } = useAssessmentHistory(parcel.id);
  const { data: sales, isLoading: loadingS } = useParcelSales(parcel.id);

  const { data: appeals, isLoading: loadingAp } = useQuery({
    queryKey: ["parcel-timeline-appeals", parcel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeals")
        .select("id, appeal_date, status, original_value, requested_value, final_value, resolution_type")
        .eq("parcel_id", parcel.id!)
        .order("appeal_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: hasParcel,
  });

  const { data: exemptions, isLoading: loadingE } = useQuery({
    queryKey: ["parcel-timeline-exemptions", parcel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exemptions")
        .select("id, application_date, exemption_type, status, exemption_amount")
        .eq("parcel_id", parcel.id!)
        .order("application_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: hasParcel,
  });

  const isLoading = loadingA || loadingS || loadingAp || loadingE;

  const events = useMemo<TimelineEvent[]>(() => {
    const items: TimelineEvent[] = [];

    (assessments || []).forEach((a) => {
      items.push({
        id: `a-${a.id}`,
        date: new Date(a.assessment_date || `${a.tax_year}-01-01`),
        type: "assessment",
        title: `${a.tax_year} Assessment`,
        detail: `Total: $${(a.total_value ?? 0).toLocaleString()} (Land $${(a.land_value ?? 0).toLocaleString()} + Impr $${(a.improvement_value ?? 0).toLocaleString()})`,
        icon: DollarSign,
        color: "text-tf-cyan",
      });
    });

    (sales || []).forEach((s: any) => {
      items.push({
        id: `s-${s.id}`,
        date: new Date(s.sale_date),
        type: "sale",
        title: `Sale — $${(s.sale_price ?? 0).toLocaleString()}`,
        detail: `${s.sale_type || "Standard"} · ${s.deed_type || "—"} · ${s.is_qualified ? "Qualified" : "Unqualified"}`,
        icon: TrendingUp,
        color: "text-tf-green",
      });
    });

    (appeals || []).forEach((ap) => {
      items.push({
        id: `ap-${ap.id}`,
        date: new Date(ap.appeal_date),
        type: "appeal",
        title: `Appeal — ${ap.status}`,
        detail: `Original $${(ap.original_value ?? 0).toLocaleString()}${ap.final_value ? ` → Final $${ap.final_value.toLocaleString()}` : ""}`,
        icon: Scale,
        color: "text-amber-400",
      });
    });

    (exemptions || []).forEach((e) => {
      items.push({
        id: `e-${e.id}`,
        date: new Date(e.application_date),
        type: "exemption",
        title: `${e.exemption_type} Exemption`,
        detail: `${e.status}${e.exemption_amount ? ` — $${e.exemption_amount.toLocaleString()}` : ""}`,
        icon: ClipboardCheck,
        color: "text-tf-gold",
      });
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [assessments, sales, appeals, exemptions]);

  if (!hasParcel) {
    return (
      <Card className="material-bento border-border/50">
        <CardContent className="py-8 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Select a parcel to view its timeline</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Parcel Timeline
          </div>
          <Badge className="bg-muted text-muted-foreground text-[10px]">
            {events.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No history found for this parcel</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[450px]">
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

              <div className="space-y-3">
                {events.map((ev, idx) => {
                  const cfg = TYPE_CONFIG[ev.type];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="relative flex items-start gap-3"
                    >
                      {/* Dot */}
                      <div
                        className={cn(
                          "absolute -left-6 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center",
                          cfg.bg
                        )}
                      >
                        <Icon className={cn("w-3 h-3", cfg.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{ev.title}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {ev.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{ev.detail}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {format(ev.date, "MMM d, yyyy")}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

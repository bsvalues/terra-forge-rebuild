/**
 * TerraFusion OS — Phase 119: Workflow SLA Deadline Tracker
 * Constitutional owner: TerraDais (workflow states)
 *
 * Tracks SLA deadlines for appeals, permits, and exemptions.
 * Highlights overdue and at-risk items with countdown timers.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Scale,
  FileCheck,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { differenceInDays, addDays, format } from "date-fns";

/** SLA definitions by workflow type (in days) */
const SLA_DAYS: Record<string, number> = {
  appeal: 45,
  permit: 30,
  exemption: 21,
};

type WorkflowTypeFilter = "all" | "appeal" | "permit" | "exemption";

interface SlaItem {
  id: string;
  type: "appeal" | "permit" | "exemption";
  label: string;
  parcelNumber: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  deadlineDate: Date;
  daysRemaining: number;
  urgency: "overdue" | "critical" | "warning" | "ok";
}

export function WorkflowSlaTracker() {
  const [typeFilter, setTypeFilter] = useState<WorkflowTypeFilter>("all");
  // Fetch open appeals
  const { data: appeals, isLoading: loadingAppeals } = useQuery({
    queryKey: ["sla-open-appeals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeals")
        .select("id, status, appeal_date, created_at, parcels!appeals_parcel_id_fkey(parcel_number, address)")
        .in("status", ["pending", "hearing_scheduled", "in_review"])
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch open permits
  const { data: permits, isLoading: loadingPermits } = useQuery({
    queryKey: ["sla-open-permits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permits")
        .select("id, status, created_at, parcels(parcel_number, address)")
        .in("status", ["pending", "in_review"])
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Fetch pending exemptions
  const { data: exemptions, isLoading: loadingExemptions } = useQuery({
    queryKey: ["sla-open-exemptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exemptions")
        .select("id, status, exemption_type, application_date, created_at, parcels!exemptions_parcel_id_fkey(parcel_number, address)")
        .in("status", ["pending"])
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = loadingAppeals || loadingPermits || loadingExemptions;

  const items = useMemo<SlaItem[]>(() => {
    const now = new Date();
    const result: SlaItem[] = [];

    (appeals || []).forEach((a: any) => {
      const start = new Date(a.appeal_date || a.created_at);
      const deadline = addDays(start, SLA_DAYS.appeal);
      const remaining = differenceInDays(deadline, now);
      result.push({
        id: a.id,
        type: "appeal",
        label: `Appeal — ${a.status}`,
        parcelNumber: a.parcels?.parcel_number,
        address: a.parcels?.address,
        status: a.status,
        createdAt: a.created_at,
        deadlineDate: deadline,
        daysRemaining: remaining,
        urgency: remaining < 0 ? "overdue" : remaining <= 5 ? "critical" : remaining <= 14 ? "warning" : "ok",
      });
    });

    (permits || []).forEach((p: any) => {
      const start = new Date(p.created_at);
      const deadline = addDays(start, SLA_DAYS.permit);
      const remaining = differenceInDays(deadline, now);
      result.push({
        id: p.id,
        type: "permit",
        label: `Permit — ${p.status}`,
        parcelNumber: p.parcels?.parcel_number,
        address: p.parcels?.address,
        status: p.status,
        createdAt: p.created_at,
        deadlineDate: deadline,
        daysRemaining: remaining,
        urgency: remaining < 0 ? "overdue" : remaining <= 5 ? "critical" : remaining <= 10 ? "warning" : "ok",
      });
    });

    (exemptions || []).forEach((e: any) => {
      const start = new Date(e.application_date || e.created_at);
      const deadline = addDays(start, SLA_DAYS.exemption);
      const remaining = differenceInDays(deadline, now);
      result.push({
        id: e.id,
        type: "exemption",
        label: `${e.exemption_type} Exemption`,
        parcelNumber: e.parcels?.parcel_number,
        address: e.parcels?.address,
        status: e.status,
        createdAt: e.created_at,
        deadlineDate: deadline,
        daysRemaining: remaining,
        urgency: remaining < 0 ? "overdue" : remaining <= 3 ? "critical" : remaining <= 7 ? "warning" : "ok",
      });
    });

    // Sort: overdue first, then by days remaining
    return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [appeals, permits, exemptions]);

  const overdueCount = items.filter((i) => i.urgency === "overdue").length;
  const criticalCount = items.filter((i) => i.urgency === "critical").length;

  const filteredItems = useMemo(() => {
    if (typeFilter === "all") return items;
    return items.filter(i => i.type === typeFilter);
  }, [items, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts = { appeal: 0, permit: 0, exemption: 0 };
    items.forEach(i => counts[i.type]++);
    return counts;
  }, [items]);

  const onTimePct = items.length > 0
    ? Math.round(((items.length - overdueCount) / items.length) * 100)
    : 100;

  const URGENCY_STYLES = {
    overdue: "bg-destructive/20 text-destructive border-destructive/30",
    critical: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    warning: "bg-tf-gold/20 text-tf-gold border-tf-gold/30",
    ok: "bg-tf-green/20 text-tf-green border-tf-green/30",
  };

  const TYPE_ICONS = {
    appeal: Scale,
    permit: FileCheck,
    exemption: ClipboardCheck,
  };

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-tf-gold" />
            SLA Deadline Tracker
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
                {overdueCount} overdue
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                {criticalCount} critical
              </Badge>
            )}
            <Badge className="bg-muted text-muted-foreground text-[10px]">
              {items.length} open
            </Badge>
          </div>
        </CardTitle>
        {/* SLA summary + type filter tabs */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            {(["all", "appeal", "permit", "exemption"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-medium transition-colors",
                  typeFilter === t
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {t === "all" ? `All (${items.length})`
                  : t === "appeal" ? `Appeals (${typeCounts.appeal})`
                  : t === "permit" ? `Permits (${typeCounts.permit})`
                  : `Exemptions (${typeCounts.exemption})`}
              </button>
            ))}
          </div>
          <Badge variant="outline" className="text-[10px]">
            {onTimePct}% on-time
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">All workflows within SLA ✓</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {filteredItems.map((item, idx) => {
                const TypeIcon = TYPE_ICONS[item.type];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.label}
                          </span>
                          <Badge className={cn("text-[10px]", URGENCY_STYLES[item.urgency])}>
                            {item.urgency === "overdue"
                              ? `${Math.abs(item.daysRemaining)}d overdue`
                              : `${item.daysRemaining}d left`}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.parcelNumber && <span className="font-mono">{item.parcelNumber}</span>}
                          {item.address && <span className="ml-2">{item.address}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-[10px] text-muted-foreground">
                        Due {format(item.deadlineDate, "MMM d")}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

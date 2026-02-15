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
  FileText,
  Gavel,
  Bell,
  Eye,
  Sparkles,
  MapPin,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TerraTraceActivityFeedProps {
  parcelId?: string | null;
  limit?: number;
}

// Icons for trace event types
const TRACE_EVENT_ICONS: Record<string, typeof Receipt> = {
  parcel_updated: Database,
  value_override_created: Calculator,
  workflow_state_changed: Activity,
  document_added: FileText,
  evidence_attached: FileText,
  notice_generated: Bell,
  model_run_completed: TrendingUp,
  review_completed: Shield,
  review_skipped: Eye,
  parcel_viewed: Eye,
  pilot_tool_invoked: Sparkles,
  pilot_tool_completed: Sparkles,
  appeal_filed: Gavel,
  appeal_resolved: Gavel,
  exemption_decided: Shield,
  permit_status_changed: MapPin,
};

const TRACE_EVENT_COLORS: Record<string, string> = {
  parcel_updated: "text-primary",
  value_override_created: "text-chart-1",
  workflow_state_changed: "text-chart-2",
  document_added: "text-chart-3",
  evidence_attached: "text-chart-3",
  notice_generated: "text-chart-4",
  model_run_completed: "text-chart-1",
  review_completed: "text-chart-5",
  review_skipped: "text-muted-foreground",
  pilot_tool_invoked: "text-primary",
  pilot_tool_completed: "text-primary",
  appeal_filed: "text-chart-4",
  appeal_resolved: "text-chart-5",
  exemption_decided: "text-chart-2",
  permit_status_changed: "text-chart-3",
};

// Module badge colors
const MODULE_COLORS: Record<string, string> = {
  forge: "bg-chart-1/20 text-chart-1",
  atlas: "bg-chart-2/20 text-chart-2",
  dais: "bg-chart-3/20 text-chart-3",
  dossier: "bg-chart-4/20 text-chart-4",
  pilot: "bg-primary/20 text-primary",
  os: "bg-muted text-muted-foreground",
};

// Legacy model_receipts icons (backward compat)
const LEGACY_ICONS: Record<string, typeof Receipt> = {
  ratio_study: TrendingUp,
  calibration: Calculator,
  valuation: Database,
  regression: Activity,
  cost_approach: Shield,
};

const LEGACY_COLORS: Record<string, string> = {
  ratio_study: "text-primary",
  calibration: "text-chart-1",
  valuation: "text-chart-5",
  regression: "text-chart-2",
  cost_approach: "text-chart-4",
};

interface UnifiedEvent {
  id: string;
  createdAt: string;
  type: string;
  sourceModule: string | null;
  label: string;
  icon: typeof Receipt;
  color: string;
  moduleColor: string;
  actorId: string | null;
  outputs: Record<string, unknown> | null;
  isLegacy: boolean;
}

export function TerraTraceActivityFeed({ parcelId, limit = 20 }: TerraTraceActivityFeedProps) {
  // Query trace_events
  const { data: traceEvents = [], isLoading: loadingTrace } = useQuery({
    queryKey: ["terra-trace-feed", parcelId, limit],
    queryFn: async () => {
      let query = supabase
        .from("trace_events" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (parcelId) {
        query = query.eq("parcel_id", parcelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Legacy fallback: query model_receipts
  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ["terra-trace-legacy", parcelId, limit],
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
      return data || [];
    },
  });

  const isLoading = loadingTrace || loadingReceipts;

  // Merge and deduplicate into unified timeline
  const events: UnifiedEvent[] = [
    // Trace events
    ...traceEvents.map((e: any) => ({
      id: e.id,
      createdAt: e.created_at,
      type: e.event_type,
      sourceModule: e.source_module,
      label: (e.event_type as string).replace(/_/g, " "),
      icon: TRACE_EVENT_ICONS[e.event_type] || Activity,
      color: TRACE_EVENT_COLORS[e.event_type] || "text-muted-foreground",
      moduleColor: MODULE_COLORS[e.source_module] || MODULE_COLORS.os,
      actorId: e.actor_id,
      outputs: e.event_data && Object.keys(e.event_data).length > 0 ? e.event_data : null,
      isLegacy: false,
    })),
    // Legacy model_receipts (only those not already covered by trace)
    ...receipts.map((r) => {
      const modelType = r.model_type || "unknown";
      return {
        id: r.id,
        createdAt: r.created_at,
        type: modelType,
        sourceModule: "forge",
        label: modelType.replace(/_/g, " "),
        icon: LEGACY_ICONS[modelType] || Receipt,
        color: LEGACY_COLORS[modelType] || "text-muted-foreground",
        moduleColor: MODULE_COLORS.forge,
        actorId: r.operator_id,
        outputs: r.outputs && typeof r.outputs === "object" && Object.keys(r.outputs as object).length > 0
          ? r.outputs as Record<string, unknown>
          : null,
        isLegacy: true,
      };
    }),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No Activity Yet</p>
        <p className="text-xs mt-1">
          Model runs, edits, and workflow actions will appear here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="relative pl-6 space-y-3">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

        {events.map((event, i) => {
          const Icon = event.icon;
          const timeAgo = getTimeAgo(new Date(event.createdAt));

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative"
            >
              {/* Dot */}
              <div
                className={cn(
                  "absolute -left-6 top-1.5 w-[10px] h-[10px] rounded-full border-2 border-background",
                  i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />

              <div className="bg-card/50 border border-border/30 rounded-lg p-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={cn("w-4 h-4 shrink-0", event.color)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("text-sm font-medium capitalize", event.color)}>
                          {event.label}
                        </span>
                        {event.sourceModule && (
                          <Badge className={cn("text-[10px] px-1 py-0 border-0", event.moduleColor)}>
                            {event.sourceModule}
                          </Badge>
                        )}
                        {event.isLegacy && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">legacy</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo}</span>
                        {event.actorId && (
                          <>
                            <span>•</span>
                            <span>{event.actorId.slice(0, 8)}…</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Output summary */}
                {event.outputs && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {renderEventData(event.outputs)}
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

function renderEventData(data: Record<string, unknown>) {
  // Special handling for parcel_updated diffs
  const changes = data.changes as { before?: Record<string, unknown>; after?: Record<string, unknown> } | undefined;
  if (changes?.before && changes?.after) {
    return Object.keys(changes.after).slice(0, 4).map((key) => (
      <span key={key} className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
        {key.replace(/_/g, " ")}:{" "}
        <span className="line-through opacity-60">{formatVal(changes.before?.[key])}</span>
        {" → "}
        <span className="text-foreground font-medium">{formatVal(changes.after?.[key])}</span>
      </span>
    ));
  }

  // Default: show top-level scalar values
  return Object.entries(data).slice(0, 3).map(([key, val]) => (
    <span key={key} className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
      {key.replace(/_/g, " ")}: <span className="text-foreground font-medium">{formatVal(val)}</span>
    </span>
  ));
}

function formatVal(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
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

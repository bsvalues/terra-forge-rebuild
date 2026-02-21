// TerraFusion OS — County Twin Timeline
// "What happened today?" — the county's flight recorder.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  Target,
  Wrench,
  Cpu,
  Activity,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  Radio,
  Upload,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountyTimeline, type TimelineEvent, type TimelineRange, type CausalFilter, type WindowFilter } from "@/hooks/useCountyTimeline";
import { useDebounce } from "@/hooks/useDebounce";
import { useTodaySummary } from "@/hooks/useCountyVitalsToday";
import { getMission } from "@/lib/missionConstitution";
import { useCausalNarrative } from "@/hooks/useCausalNarrative";

const RANGE_OPTIONS: { id: TimelineRange; label: string }[] = [
  { id: "1h", label: "1h" },
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "all", label: "All" },
];

const TYPE_OPTIONS = [
  { value: "ingest", label: "Ingest", icon: Database },
  { value: "mission", label: "Missions", icon: Target },
  { value: "fix", label: "Fixes", icon: Wrench },
  { value: "model", label: "Models", icon: Cpu },
  { value: "workflow", label: "Workflow", icon: Activity },
];

const EVENT_ICONS: Record<string, typeof Database> = {
  ingest: Database,
  mission: Target,
  fix: Wrench,
  model: Cpu,
  workflow: Activity,
};

const EVENT_COLORS: Record<string, string> = {
  ingest: "text-chart-2",
  mission: "text-chart-4",
  fix: "text-chart-1",
  model: "text-chart-5",
  workflow: "text-chart-3",
};

const EVENT_BG: Record<string, string> = {
  ingest: "bg-chart-2/15",
  mission: "bg-chart-4/15",
  fix: "bg-chart-1/15",
  model: "bg-chart-5/15",
  workflow: "bg-chart-3/15",
};

const SEVERITY_ICONS: Record<string, typeof Info> = {
  info: Info,
  warn: AlertTriangle,
  critical: AlertCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-muted-foreground",
  warn: "text-[hsl(var(--tf-sacred-gold))]",
  critical: "text-destructive",
};

const LINK_LABELS: Record<string, string> = {
  mission_id: "Mission",
  receipt_id: "Receipt",
  trace_id: "Audit Event",
  run_id: "Model Run",
  ingest_job_id: "Ingest Job",
  parcel_id: "Parcel",
  artifact_ref: "Artifact",
  neighborhood: "Neighborhood",
};

interface CountyTimelineProps {
  onNavigate?: (target: string) => void;
  onMissionPreview?: (missionId: string) => void;
  maxHeight?: string;
  compact?: boolean;
}

export function CountyTimeline({ onNavigate, onMissionPreview, maxHeight = "500px", compact = false }: CountyTimelineProps) {
  const [range, setRange] = useState<TimelineRange>("7d");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [causalFilter, setCausalFilter] = useState<CausalFilter | null>(null);
  const [windowFilter, setWindowFilter] = useState<WindowFilter | null>(null);

  const { data, isLoading } = useCountyTimeline({
    range,
    types: activeTypes.length > 0 ? activeTypes : null,
    search: debouncedSearch,
    causal: causalFilter,
    window: windowFilter,
  });

  const { data: today } = useTodaySummary();

  const events = data?.rows ?? [];

  const toggleType = (type: string) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleFilterByType = (type: string) => {
    setActiveTypes([type]);
    setRange("24h");
  };

  // Deep navigation from timeline event links — kernel-legal targets only
  const handleEventNavigate = (key: string, value: string | null) => {
    if (!value || !onNavigate) return;
    // Special case: mission_id opens the preview drawer directly
    if (key === "mission_id" && onMissionPreview) {
      onMissionPreview(value);
      return;
    }
    switch (key) {
      case "mission_id":
        onNavigate("home:dashboard");
        break;
      case "parcel_id":
        onNavigate("workbench:property");
        break;
      case "ingest_job_id":
        onNavigate("home:ids");
        break;
      case "run_id":
      case "receipt_id":
      case "trace_id":
        onNavigate("registry:trust");
        break;
      case "neighborhood":
        onNavigate("factory:calibration");
        break;
      default:
        break;
    }
  };

  // Precise causal chain: use RPC-level filtering
  const handleCausalFilter = (key: string, value: string) => {
    if (key === "time") {
      // ±10 min window around the event
      setWindowFilter({ center: value, minutes: 10 });
      setCausalFilter(null);
    } else {
      // Exact link match
      setCausalFilter({ linkKey: key, linkValue: value });
      setWindowFilter(null);
    }
    // Widen range so RPC doesn't clip results
    setRange("30d");
    setActiveTypes([]);
    setSearchInput("");
  };

  // Clear causal/window filters
  const clearCausalFilters = () => {
    setCausalFilter(null);
    setWindowFilter(null);
  };

  const hasCausalActive = !!causalFilter || !!windowFilter;

  // Group events by date
  const grouped = groupByDate(events);

  // Today summary pills
  const SUMMARY_PILLS = [
    { key: "imports", label: "Imports", count: today?.imports ?? 0, icon: Upload, type: "ingest" },
    { key: "missions", label: "Missions", count: today?.missions ?? 0, icon: Target, type: "mission" },
    { key: "fixes", label: "Fixes", count: today?.fixes ?? 0, icon: Wrench, type: "fix" },
    { key: "models", label: "Models", count: today?.models ?? 0, icon: Cpu, type: "model" },
    { key: "workflows", label: "Workflows", count: today?.workflows ?? 0, icon: Activity, type: "workflow" },
  ];

  return (
    <div className="space-y-3">
      {/* "What changed today?" Summary Strip */}
      {!compact && today && today.total > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-medium">Today:</span>
          {SUMMARY_PILLS.filter(p => p.count > 0).map(pill => (
            <button
              key={pill.key}
              onClick={() => handleFilterByType(pill.type)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                "bg-muted/40 hover:bg-primary/10 text-foreground hover:text-primary"
              )}
            >
              <pill.icon className="w-2.5 h-2.5" />
              <span>{pill.count}</span>
              <span className="text-muted-foreground">{pill.label}</span>
            </button>
          ))}
          {today.total > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {today.total} total
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-chart-2 animate-pulse" />
          <span className="text-[10px] text-chart-2 font-medium uppercase tracking-wider">County Timeline</span>
          {data && (
            <span className="text-[10px] text-muted-foreground">
              {data.total} events
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Range pills */}
        <div className="flex items-center gap-0.5 bg-muted/30 rounded-md p-0.5">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-medium transition-all",
                range === r.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Type toggles */}
        <div className="flex items-center gap-1">
          {TYPE_OPTIONS.map((t) => {
            const active = activeTypes.length === 0 || activeTypes.includes(t.value);
            return (
              <button
                key={t.value}
                onClick={() => toggleType(t.value)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all",
                  active
                    ? cn(EVENT_BG[t.value], EVENT_COLORS[t.value], "font-medium")
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
              >
                <t.icon className="w-2.5 h-2.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        {!compact && (
          <div className="relative flex-1 max-w-48 ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              className="w-full h-7 pl-7 pr-2 rounded-md bg-muted/30 border border-border/50 text-[10px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        )}
      </div>

      {/* Causal Filter Indicator */}
      {hasCausalActive && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/20">
          <Filter className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-medium text-primary">
            {windowFilter ? `±${windowFilter.minutes} min window` : `Filtered by ${LINK_LABELS[causalFilter!.linkKey] ?? causalFilter!.linkKey}`}
          </span>
          <button
            onClick={clearCausalFilters}
            className="ml-auto text-[10px] text-primary hover:text-primary/70 underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No Timeline Events</p>
          <p className="text-xs mt-1">
            Ingest data, run models, or fix missions to see activity here.
          </p>
        </div>
      ) : (
        <ScrollArea style={{ maxHeight }}>
          <div className="space-y-4">
            {Object.entries(grouped).map(([dateLabel, dateEvents]) => (
              <div key={dateLabel}>
                <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-1 mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {dateLabel}
                  </span>
                </div>
                <div className="relative pl-5 space-y-1.5">
                  {/* Vertical line */}
                  <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border/50" />

                  {dateEvents.map((evt, i) => {
                    const Icon = EVENT_ICONS[evt.event_type] || Activity;
                    const SevIcon = SEVERITY_ICONS[evt.severity] || Info;

                    return (
                      <motion.button
                        key={evt.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelectedEvent(evt)}
                        className="relative w-full text-left group"
                      >
                        {/* Dot */}
                        <div
                          className={cn(
                            "absolute -left-5 top-3 w-[9px] h-[9px] rounded-full border-2 border-background",
                            i === 0 && dateLabel === Object.keys(grouped)[0]
                              ? "bg-primary"
                              : "bg-muted-foreground/30"
                          )}
                        />

                        <div className="rounded-lg border border-border/30 bg-card/50 px-3 py-2 hover:bg-accent/30 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1 rounded", EVENT_BG[evt.event_type])}>
                              <Icon className={cn("w-3 h-3", EVENT_COLORS[evt.event_type])} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-foreground truncate">
                                  {evt.title}
                                </span>
                                {evt.severity !== "info" && (
                                  <SevIcon className={cn("w-3 h-3 shrink-0", SEVERITY_COLORS[evt.severity])} />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>
                                  {new Date(evt.event_time).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span>•</span>
                                <span className="truncate">{evt.summary}</span>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] px-1 py-0 border-0 shrink-0", EVENT_BG[evt.event_type], EVENT_COLORS[evt.event_type])}
                            >
                              {evt.event_type}
                            </Badge>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Event Detail Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          {selectedEvent && (
            <EventDetail
              event={selectedEvent}
              onNavigate={onNavigate}
              onClose={() => setSelectedEvent(null)}
              onCausalFilter={handleCausalFilter}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Event Detail Panel ──────────────────────────────────────

function EventDetail({
  event,
  onNavigate,
  onClose,
  onCausalFilter,
}: {
  event: TimelineEvent;
  onNavigate?: (target: string) => void;
  onClose: () => void;
  onCausalFilter?: (key: string, value: string) => void;
}) {
  const Icon = EVENT_ICONS[event.event_type] || Activity;

  // Resolve human title from Mission Constitution when available
  const missionId = event.links?.mission_id;
  const missionDef = missionId ? getMission(missionId) : undefined;
  const displayTitle = missionDef?.title ?? event.title;

  // Causal mini-narrative: Before → Event → After
  const { data: causal } = useCausalNarrative(event);

  // Collect causal chain keys (any non-null link values)
  const causalKeys = event.links
    ? Object.entries(event.links).filter(([, v]) => v)
    : [];

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", EVENT_BG[event.event_type])}>
            <Icon className={cn("w-5 h-5", EVENT_COLORS[event.event_type])} />
          </div>
          <div>
            <SheetTitle className="text-base">{displayTitle}</SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{event.summary}</p>
          </div>
        </div>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        {/* Causal Mini-Narrative: Before → Event → After */}
        {causal && (causal.before || causal.after) && (
          <div className="rounded-lg border border-[hsl(var(--tf-transcend-cyan)/0.2)] bg-[hsl(var(--tf-transcend-cyan)/0.04)] p-3 space-y-2">
            <p className="text-[10px] text-tf-cyan uppercase tracking-wider font-semibold">Story</p>
            <div className="space-y-1.5">
              {causal.before && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground/50 font-mono w-12 shrink-0 pt-0.5">Before</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">{causal.before.title}</span>
                    {" — "}
                    {new Date(causal.before.event_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-tf-cyan font-mono w-12 shrink-0 pt-0.5 font-semibold">Event</span>
                <p className="text-[11px] text-foreground leading-relaxed font-medium">
                  {displayTitle}
                  {" — "}
                  {new Date(event.event_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {causal.after && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground/50 font-mono w-12 shrink-0 pt-0.5">After</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">{causal.after.title}</span>
                    {" — "}
                    {new Date(causal.after.event_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          <MetaField label="Time" value={new Date(event.event_time).toLocaleString()} />
          <MetaField label="Type" value={`${event.event_type} / ${event.subtype}`} />
          <MetaField label="Actor" value={event.actor === "System" ? "System" : event.actor.slice(0, 12) + "…"} />
          <MetaField
            label="Severity"
            value={event.severity}
            className={SEVERITY_COLORS[event.severity]}
          />
        </div>

        {/* Causal Chain */}
        {causalKeys.length > 0 && onCausalFilter && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Causal Chain</p>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => {
                  onCausalFilter("time", event.event_time);
                  onClose();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-muted/40 hover:bg-primary/10 text-foreground hover:text-primary transition-all"
              >
                <Clock className="w-2.5 h-2.5" />
                ±10 min window
              </button>
              {causalKeys.map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => {
                    onCausalFilter(key, String(val));
                    onClose();
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-muted/40 hover:bg-primary/10 text-foreground hover:text-primary transition-all"
                >
                  <Filter className="w-2.5 h-2.5" />
                  Related {LINK_LABELS[key] ?? key.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {event.sources.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sources</p>
            <div className="flex gap-1 flex-wrap">
              {event.sources.map((s) => (
                <Badge key={s} variant="outline" className="text-[9px] px-1 py-0 font-mono">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Links — kernel-legal navigation */}
        {causalKeys.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Navigate</p>
            <div className="space-y-1">
              {causalKeys.map(([key, val]) => {
                const navTarget = LINK_NAV_TARGETS[key];
                if (!navTarget || !onNavigate) return null;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onNavigate(navTarget);
                      onClose();
                    }}
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{LINK_LABELS[key] ?? key.replace(/_/g, " ")}: {typeof val === "string" ? val.slice(0, 16) + "…" : String(val)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Metadata</p>
            <pre className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-auto max-h-48 font-mono">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

// Kernel-legal navigation targets for link types
const LINK_NAV_TARGETS: Record<string, string> = {
  mission_id: "home:dashboard",
  parcel_id: "workbench:property",
  ingest_job_id: "home:ids",
  receipt_id: "registry:trust",
  trace_id: "registry:trust",
  run_id: "registry:trust",
  neighborhood: "factory:calibration",
  artifact_ref: "registry:trust",
};

function MetaField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-xs font-medium text-foreground mt-0.5", className)}>{value}</p>
    </div>
  );
}

// ─── Date Grouping ───────────────────────────────────────────

function groupByDate(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const groups: Record<string, TimelineEvent[]> = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  for (const evt of events) {
    const d = new Date(evt.event_time);
    const ds = d.toDateString();
    let label: string;
    if (ds === today) label = "Today";
    else if (ds === yesterday) label = "Yesterday";
    else {
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diff < 7) label = "This Week";
      else label = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(evt);
  }

  return groups;
}

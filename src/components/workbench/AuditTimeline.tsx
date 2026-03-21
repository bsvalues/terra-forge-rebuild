// TerraFusion OS — Phase 81.3: Audit Timeline
// Filterable trace event timeline with chain integrity indicator,
// redaction controls (admin), and swarm provenance badges.

import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Link,
  Loader2,
  MapPin,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useTraceChainVerification,
  useRedactTraceEvent,
} from "@/hooks/useTraceChainVerification";
import { useTraceEventsFiltered } from "@/hooks/useTraceEvents";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import { RoleGate } from "@/components/ui/role-gate";

// ────────────────────────────────────────────────────────────
// Module color map (matches TerraPilot suite colors)
// ────────────────────────────────────────────────────────────
const MODULE_COLORS: Record<string, string> = {
  forge: "text-orange-400 bg-orange-950/40 border-orange-800/50",
  dais: "text-blue-400 bg-blue-950/40 border-blue-800/50",
  dossier: "text-violet-400 bg-violet-950/40 border-violet-800/50",
  atlas: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  os: "text-slate-400 bg-slate-800/40 border-slate-700/50",
  terrapilot: "text-cyan-400 bg-cyan-950/40 border-cyan-800/50",
  system: "text-yellow-400 bg-yellow-950/40 border-yellow-800/50",
};

const MODULE_DOT: Record<string, string> = {
  forge: "bg-orange-400",
  dais: "bg-blue-400",
  dossier: "bg-violet-400",
  atlas: "bg-emerald-400",
  os: "bg-slate-400",
  terrapilot: "bg-cyan-400",
  system: "bg-yellow-400",
};

const SOURCE_MODULES = ["all", "forge", "dais", "dossier", "atlas", "os", "terrapilot", "system"];

function moduleColor(mod: string) {
  return MODULE_COLORS[mod] ?? "text-muted-foreground bg-muted/20 border-border";
}
function moduleDot(mod: string) {
  return MODULE_DOT[mod] ?? "bg-muted-foreground";
}

// ────────────────────────────────────────────────────────────
// Single event row
// ────────────────────────────────────────────────────────────
interface TraceEvent {
  id: string;
  created_at: string;
  source_module: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  parcel_id: string | null;
  actor_id: string | null;
  sequence_number: number | null;
  event_hash: string | null;
  prev_hash: string | null;
  agent_id: string | null;
  redacted: boolean | null;
  correlation_id: string | null;
}

function EventRow({
  event,
  onRedact,
}: {
  event: TraceEvent;
  onRedact: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isRedacted = event.redacted === true;
  const color = moduleColor(event.source_module);
  const dot = moduleDot(event.source_module);
  const formattedTime = format(new Date(event.created_at), "MMM d, HH:mm:ss");
  const hashShort = event.event_hash ? event.event_hash.slice(0, 10) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-b border-border/20 last:border-0",
        isRedacted && "opacity-50"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/20 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}

        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />

        <span className="text-xs font-medium text-foreground flex-1 truncate">
          {isRedacted ? "[REDACTED]" : event.event_type.replace(/_/g, " ")}
        </span>

        {/* Swarm provenance badge */}
        {event.agent_id && (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1.5 shrink-0 flex items-center gap-0.5",
              moduleColor(event.agent_id)
            )}
          >
            <Zap className="w-2 h-2" />
            {event.agent_id}
          </Badge>
        )}

        <Badge
          variant="outline"
          className={cn("text-[9px] px-1.5 shrink-0", color)}
        >
          {event.source_module}
        </Badge>

        {hashShort && (
          <span className="text-[9px] text-muted-foreground/60 font-mono hidden sm:inline">
            {hashShort}
          </span>
        )}

        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formattedTime}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-3 space-y-2">
              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground/70">Seq</span>
                  {event.sequence_number ?? "—"}
                </div>
                {event.parcel_id && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{event.parcel_id}</span>
                  </div>
                )}
                {event.actor_id && (
                  <div className="flex items-center gap-1">
                    <User className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate font-mono">{event.actor_id.slice(0, 16)}…</span>
                  </div>
                )}
                {event.correlation_id && (
                  <div className="flex items-center gap-1">
                    <Link className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate font-mono">{event.correlation_id.slice(0, 16)}…</span>
                  </div>
                )}
                {event.prev_hash && (
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="font-medium text-foreground/70">Prev</span>
                    <span className="font-mono">{event.prev_hash.slice(0, 24)}…</span>
                  </div>
                )}
              </div>

              {/* Event data */}
              {!isRedacted && event.event_data && (
                <pre className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 overflow-x-auto max-h-32">
                  {JSON.stringify(event.event_data, null, 2)}
                </pre>
              )}

              {/* Redaction control (admin only) */}
              <RoleGate minRole="admin">
                {!isRedacted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive text-[10px] h-6 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRedact(event.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Redact event
                  </Button>
                )}
              </RoleGate>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// Chain Integrity Banner
// ────────────────────────────────────────────────────────────
function ChainIntegrityBanner({ countyId }: { countyId: string | null }) {
  const { data, isLoading } = useTraceChainVerification(countyId ?? undefined);

  if (!countyId) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Verifying chain…
      </div>
    );
  }
  if (!data) return null;

  const valid = data.chain_valid;
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-xs border",
        valid
          ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-400"
          : "bg-red-950/30 border-red-800/50 text-red-400"
      )}
    >
      {valid ? (
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
      )}
      {valid ? (
        <span>
          Hash chain intact — {data.total_checked} events verified
        </span>
      ) : (
        <span>
          Chain break detected at sequence #{data.first_broken_sequence}
          {data.first_broken_id && ` (event ${data.first_broken_id.slice(0, 8)}…)`}
        </span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export function AuditTimeline() {
  const countyId = useActiveCountyId();
  const redact = useRedactTraceEvent();

  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [parcelIdFilter, setParcelIdFilter] = useState("");
  const [limit] = useState(100);

  const { data: events = [], isLoading, refetch } = useTraceEventsFiltered({
    countyId: countyId ?? undefined,
    sourceModule: moduleFilter === "all" ? undefined : moduleFilter,
    eventType: eventTypeFilter.trim() || undefined,
    parcelId: parcelIdFilter.trim() || undefined,
    limit,
  });

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            Audit Timeline
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RotateCcw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">
              Module
            </Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-7 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_MODULES.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs capitalize">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">
              Event type
            </Label>
            <Input
              className="h-7 text-xs"
              placeholder="e.g. appeal_created"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">
              Parcel ID
            </Label>
            <Input
              className="h-7 text-xs font-mono"
              placeholder="UUID or partial"
              value={parcelIdFilter}
              onChange={(e) => setParcelIdFilter(e.target.value)}
            />
          </div>
        </div>

        <Separator className="mt-3" />
        <div className="pt-1">
          <ChainIntegrityBanner countyId={countyId} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading trace events…
            </div>
          )}
          {!isLoading && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              <Activity className="w-8 h-8 mb-2 opacity-30" />
              No trace events found
            </div>
          )}
          {!isLoading &&
            events.map((event) => (
              <EventRow
                key={event.id}
                event={event as TraceEvent}
                onRedact={(id) => redact.mutate(id)}
              />
            ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

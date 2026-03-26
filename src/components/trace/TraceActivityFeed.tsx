// TerraFusion OS — Phase 110: TerraTrace Activity Feed Viewer
// Chronological audit trail viewer with module filtering and event detail expansion.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Activity,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Filter,
} from "lucide-react";
import {
  useActivityFeed,
  useActivityStats,
  getEventDisplay,
  MODULE_COLORS,
  type ActivityModuleFilter,
  type ActivityEvent,
} from "@/hooks/useActivityFeed";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const MODULE_FILTERS: { value: ActivityModuleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "forge", label: "Forge" },
  { value: "dais", label: "Dais" },
  { value: "dossier", label: "Dossier" },
  { value: "atlas", label: "Atlas" },
  { value: "pilot", label: "Pilot" },
  { value: "os", label: "OS" },
];

function EventRow({ event }: { event: ActivityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const display = getEventDisplay(event.event_type);
  const moduleColor = MODULE_COLORS[event.source_module] ?? "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/20 last:border-0"
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

        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", moduleColor.replace("text-", "bg-"))} />

        <span className="text-xs font-medium text-foreground flex-1 truncate">
          {display.label}
        </span>

        <Badge variant="outline" className={cn("text-[9px] px-1.5 shrink-0", moduleColor)}>
          {event.source_module}
        </Badge>

        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-8 space-y-1.5">
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(event.created_at).toLocaleString()}
                </span>
                {event.actor_id && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {event.actor_id.slice(0, 8)}…
                  </span>
                )}
                {event.parcel_id && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.parcel_id.slice(0, 8)}…
                  </span>
                )}
              </div>
              {event.artifact_type && (
                <div className="text-[10px] text-muted-foreground">
                  Artifact: <span className="text-foreground">{event.artifact_type}</span>
                  {event.artifact_id && <> · {event.artifact_id.slice(0, 8)}…</>}
                </div>
              )}
              {event.correlation_id && (
                <div className="text-[10px] text-muted-foreground">
                  Correlation: <span className="font-mono text-foreground">{event.correlation_id.slice(0, 12)}…</span>
                </div>
              )}
              {event.event_data && Object.keys(event.event_data).length > 0 && (
                <pre className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 overflow-x-auto font-mono max-h-24">
                  {JSON.stringify(event.event_data, null, 2)}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TraceActivityFeed() {
  const [moduleFilter, setModuleFilter] = useState<ActivityModuleFilter>("all");
  const { data: events = [], isLoading } = useActivityFeed({ moduleFilter, limit: 200, daysBack: 14 });
  const { data: stats } = useActivityStats();

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-tf-green" />
            TerraTrace Activity Feed
            {stats && (
              <Badge variant="outline" className="text-[9px] ml-1">
                {stats.events24h} today · {stats.events7d} this week
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-muted-foreground" />
            {MODULE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setModuleFilter(f.value)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] transition-colors",
                  moduleFilter === f.value
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading trace events…</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No trace events found</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {events.map(event => (
              <EventRow key={event.id} event={event} />
            ))}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

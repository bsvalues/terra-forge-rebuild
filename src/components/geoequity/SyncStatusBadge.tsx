// TerraFusion OS — Background Sync Status Badge
// Passive health indicator for assessors — no action buttons, just status.
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGISDataSources } from "@/hooks/useGISData";
import { cn } from "@/lib/utils";

type SyncHealth = "healthy" | "stale" | "failed" | "unknown";

function deriveSyncHealth(sources: Array<{ sync_status?: string | null; last_sync_at?: string | null }>): {
  health: SyncHealth;
  lastSync: Date | null;
  successCount: number;
  failCount: number;
} {
  if (sources.length === 0) return { health: "unknown", lastSync: null, successCount: 0, failCount: 0 };

  let latestSync: Date | null = null;
  let successCount = 0;
  let failCount = 0;

  for (const s of sources) {
    if (s.sync_status === "success") successCount++;
    if (s.sync_status === "error" || s.sync_status === "failed") failCount++;
    if (s.last_sync_at) {
      const d = new Date(s.last_sync_at);
      if (!latestSync || d > latestSync) latestSync = d;
    }
  }

  if (failCount > 0) return { health: "failed", lastSync: latestSync, successCount, failCount };
  if (!latestSync) return { health: "unknown", lastSync: null, successCount, failCount };

  const hoursAgo = (Date.now() - latestSync.getTime()) / (1000 * 60 * 60);
  if (hoursAgo > 24) return { health: "stale", lastSync: latestSync, successCount, failCount };
  return { health: "healthy", lastSync: latestSync, successCount, failCount };
}

const HEALTH_CONFIG: Record<SyncHealth, { icon: typeof CheckCircle2; dotClass: string; label: string }> = {
  healthy: { icon: CheckCircle2, dotClass: "bg-emerald-500", label: "All systems synced" },
  stale: { icon: Clock, dotClass: "bg-amber-500", label: "Sync stale (>24h)" },
  failed: { icon: XCircle, dotClass: "bg-destructive", label: "Sync errors detected" },
  unknown: { icon: AlertTriangle, dotClass: "bg-muted-foreground", label: "No sync data" },
};

export function SyncStatusBadge() {
  const { data: dataSources = [] } = useGISDataSources();
  const [open, setOpen] = useState(false);
  const { health, lastSync, successCount, failCount } = deriveSyncHealth(dataSources);
  const cfg = HEALTH_CONFIG[health];
  const Icon = cfg.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="gap-1.5 cursor-pointer hover:bg-accent text-xs font-normal"
        >
          <span className={cn("w-2 h-2 rounded-full", cfg.dotClass)} />
          {lastSync
            ? `Synced ${formatDistanceToNow(lastSync, { addSuffix: true })}`
            : "No sync data"}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon className="w-4 h-4" />
            {cfg.label}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Sources healthy</span>
              <span className="font-mono">{successCount}/{dataSources.length}</span>
            </div>
            {failCount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Failed</span>
                <span className="font-mono">{failCount}</span>
              </div>
            )}
            {lastSync && (
              <div className="flex justify-between">
                <span>Last sync</span>
                <span className="font-mono">{lastSync.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useSyncStatus, type SyncSourceStatus } from "@/hooks/useSyncStatus";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import { cn } from "@/lib/utils";
import { Database, Cloud, Globe, FileSpreadsheet, Calculator } from "lucide-react";

export function DataFreshnessPanel() {
  const countyId = useActiveCountyId();
  const { data, isLoading, isError } = useSyncStatus(countyId);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-8 w-full bg-muted rounded" />
          <div className="h-8 w-full bg-muted rounded" />
          <div className="h-8 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load sync status.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-foreground/80">Data Sources</h3>
        <span className="text-[10px] text-muted-foreground/50">
          Checked {formatRelativeTime(data.checkedAt)}
        </span>
      </div>
      <div className="space-y-1.5">
        {data.sources.map((source) => (
          <SourceRow key={source.sourceName} source={source} />
        ))}
      </div>
    </div>
  );
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  "PACS SQL Server": Database,
  "Ascend/Proval": FileSpreadsheet,
  "ArcGIS Parcels": Globe,
  "Assessor Scrape": Cloud,
  "CostForge Schedules": Calculator,
};

const STATUS_COLORS: Record<string, string> = {
  live: "bg-primary",
  staged: "bg-emerald-500",
  partial: "bg-amber-500",
  manual: "bg-muted-foreground/30",
  offline: "bg-destructive",
};

function SourceRow({ source }: { source: SyncSourceStatus }) {
  const Icon = SOURCE_ICONS[source.sourceName] ?? Database;
  const dotColor = STATUS_COLORS[source.status] ?? "bg-muted-foreground/30";

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-muted/30 transition-colors">
      <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
      <span className="text-[12px] font-medium text-foreground/70 min-w-[140px]">
        {source.sourceName}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColor, source.status === "live" && "animate-pulse")} />
        <span className="text-[11px] text-muted-foreground/60">{source.statusLabel}</span>
      </span>
      {source.lastSync && (
        <span className="text-[10px] text-muted-foreground/40 ml-auto">
          {formatRelativeTime(source.lastSync)}
        </span>
      )}
      {source.recordCount != null && source.recordCount > 0 && (
        <span className="text-[10px] text-muted-foreground/40 tabular-nums ml-2">
          {source.recordCount.toLocaleString()}
        </span>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

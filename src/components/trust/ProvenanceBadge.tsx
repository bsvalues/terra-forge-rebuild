// TerraFusion OS — Provenance Badge (Trust UI Primitive)
// Shows data source, cache age, and refresh policy for any metric.
// Rule 5 of the Data Constitution: "Every number on screen has provenance."
// Now CLICKABLE — opens ProvenanceExplainPanel on click.
// Trust Mode: when enabled, badge is always visible (not faded).

import { ProvenanceExplainPanel } from "./ProvenanceExplainPanel";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrustMode } from "@/contexts/TrustModeContext";

interface ProvenanceBadgeProps {
  /** Query key name shown to user (e.g. "county-vitals") */
  source: string;
  /** ISO timestamp of when data was fetched */
  fetchedAt?: string | null;
  /** Human-readable cache policy (e.g. "cached 60s") */
  cachePolicy?: string;
  /** Additional className */
  className?: string;
  /** Compact mode — icon only, details in popover */
  compact?: boolean;
  /** Navigate to Trust Registry callback */
  onNavigateToRegistry?: () => void;
}

export function ProvenanceBadge({
  source,
  fetchedAt,
  cachePolicy = "cached 60s",
  className,
  compact = true,
  onNavigateToRegistry,
}: ProvenanceBadgeProps) {
  const { trustMode } = useTrustMode();

  const timeLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  if (compact) {
    return (
      <ProvenanceExplainPanel
        source={source}
        fetchedAt={fetchedAt}
        cachePolicy={cachePolicy}
        onNavigateToRegistry={onNavigateToRegistry}
        className={className}
      >
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 transition-colors",
            trustMode
              ? "text-primary/70 hover:text-primary"
              : "text-muted-foreground/50 hover:text-primary",
            className
          )}
        >
          <Info className="w-3 h-3" />
          {trustMode && (
            <span className="text-[9px] font-mono">{source}</span>
          )}
        </button>
      </ProvenanceExplainPanel>
    );
  }

  return (
    <ProvenanceExplainPanel
      source={source}
      fetchedAt={fetchedAt}
      cachePolicy={cachePolicy}
      onNavigateToRegistry={onNavigateToRegistry}
    >
      <div className={cn("inline-flex items-center gap-1.5 text-[10px] cursor-pointer hover:text-primary transition-colors", 
        trustMode ? "text-primary/70" : "text-muted-foreground/60",
        className
      )}>
        <Info className="w-2.5 h-2.5" />
        <span>{source}</span>
        <span>•</span>
        <span>{cachePolicy}</span>
        <span>•</span>
        <span>{timeLabel}</span>
      </div>
    </ProvenanceExplainPanel>
  );
}

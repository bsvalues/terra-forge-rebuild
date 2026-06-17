// TerraFusion OS — Provenance Badge (Trust UI Primitive)
// Shows data source, cache age, refresh policy, and runtime trust level.
// Rule 5 of the Data Constitution: "Every number on screen has provenance."
// Amber/red tones surface quarantined or unverified upstream data.

import { ProvenanceExplainPanel } from "./ProvenanceExplainPanel";
import { Info, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrustMode } from "@/contexts/TrustModeContext";
import type { TrustLevel } from "@/lib/provenance";

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
  /** Runtime trust level from provenance envelope */
  trustLevel?: TrustLevel;
  /** Pending quarantine row count attached to this source */
  quarantineCount?: number;
}

export function ProvenanceBadge({
  source,
  fetchedAt,
  cachePolicy = "cached 60s",
  className,
  compact = true,
  onNavigateToRegistry,
  trustLevel = "verified",
  quarantineCount = 0,
}: ProvenanceBadgeProps) {
  const { trustMode } = useTrustMode();

  const timeLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  const isUnverified = trustLevel === "unverified" || quarantineCount > 0;
  const isQuarantined = trustLevel === "quarantined";
  const TrustIcon = isQuarantined ? ShieldAlert : isUnverified ? AlertTriangle : Info;

  const toneClasses = isQuarantined
    ? "text-destructive hover:text-destructive"
    : isUnverified
      ? "text-amber-500 hover:text-amber-600 dark:text-amber-400"
      : trustMode
        ? "text-primary/70 hover:text-primary"
        : "text-muted-foreground/50 hover:text-primary";

  const quarantineSuffix =
    quarantineCount > 0 ? ` • ${quarantineCount} quarantined` : "";

  if (compact) {
    return (
      <ProvenanceExplainPanel
        source={source}
        fetchedAt={fetchedAt}
        cachePolicy={`${cachePolicy}${quarantineSuffix}`}
        onNavigateToRegistry={onNavigateToRegistry}
        className={className}
      >
        <button
          type="button"
          aria-label={`Provenance: ${source}, trust ${trustLevel}${quarantineSuffix}`}
          className={cn(
            "inline-flex items-center gap-1 transition-colors",
            toneClasses,
            className
          )}
        >
          <TrustIcon className="w-3 h-3" />
          {(trustMode || isUnverified || isQuarantined) && (
            <span className="text-[9px] font-mono">
              {source}
              {quarantineCount > 0 ? ` (${quarantineCount})` : ""}
            </span>
          )}
        </button>
      </ProvenanceExplainPanel>
    );
  }

  return (
    <ProvenanceExplainPanel
      source={source}
      fetchedAt={fetchedAt}
      cachePolicy={`${cachePolicy}${quarantineSuffix}`}
      onNavigateToRegistry={onNavigateToRegistry}
    >
      <div className={cn(
        "inline-flex items-center gap-1.5 text-[10px] cursor-pointer transition-colors",
        toneClasses,
        className
      )}>
        <TrustIcon className="w-2.5 h-2.5" />
        <span>{source}</span>
        <span>•</span>
        <span>{cachePolicy}</span>
        <span>•</span>
        <span>{timeLabel}</span>
        {quarantineCount > 0 && (
          <>
            <span>•</span>
            <span className="font-medium">{quarantineCount} quarantined</span>
          </>
        )}
      </div>
    </ProvenanceExplainPanel>
  );
}

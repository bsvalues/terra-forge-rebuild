// TerraFusion OS — Trust Boundary
// Shows data provenance metadata on mission previews:
// sources, freshness, confidence, estimation flags.
// "What data is being used, and how fresh is it?"

import { Shield, Clock, Database, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TrustBoundaryProps {
  sources: string[];
  fetchedAt?: string | null;
  confidence?: "high" | "medium" | "low";
  hasEstimates?: boolean;
  className?: string;
  scopeN?: number;
  minClassN?: number;
}

export function TrustBoundary({ sources, fetchedAt, confidence = "high", hasEstimates = false, className, scopeN, minClassN }: TrustBoundaryProps) {
  const ageLabel = fetchedAt
    ? (() => {
        const sec = Math.round((Date.now() - new Date(fetchedAt).getTime()) / 1000);
        return sec < 60 ? `${sec}s ago` : sec < 3600 ? `${Math.floor(sec / 60)}m ago` : `${Math.floor(sec / 3600)}h ago`;
      })()
    : "unknown";

  const confColor = confidence === "high"
    ? "text-[hsl(var(--tf-optimized-green))]"
    : confidence === "medium"
    ? "text-[hsl(var(--tf-sacred-gold))]"
    : "text-[hsl(var(--tf-warning-red))]";

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground", className)}>
      <div className="flex items-center gap-1">
        <Database className="w-2.5 h-2.5" />
        {sources.map((s) => (
          <Badge key={s} variant="outline" className="text-[9px] px-1 py-0 font-mono">{s}</Badge>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Clock className="w-2.5 h-2.5" />
        <span>{ageLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        <Shield className={cn("w-2.5 h-2.5", confColor)} />
        <span className={confColor}>{confidence}</span>
      </div>
      {hasEstimates && (
        <div className="flex items-center gap-1 text-[hsl(var(--tf-sacred-gold))]">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>includes estimates</span>
        </div>
      )}
      {scopeN != null && (confidence !== "high" || hasEstimates) && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <span>{scopeN.toLocaleString()} parcels</span>
                {minClassN != null && <span>• min class {minClassN}</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-[10px]">
              Outliers are computed within each property class. Small classes make outlier flags less reliable.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

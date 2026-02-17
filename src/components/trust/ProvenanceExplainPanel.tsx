// TerraFusion OS — Provenance Explain Panel
// Clickable provenance → opens a panel showing query key, RPC name, timestamp,
// cache policy, and a link to the Trust Registry Data Catalog.

import { useState } from "react";
import { Info, ExternalLink, Database, Clock, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProvenanceExplainPanelProps {
  /** Human-friendly query key label */
  source: string;
  /** RPC or function name */
  rpcName?: string;
  /** ISO timestamp of last fetch */
  fetchedAt?: string | null;
  /** Cache policy description */
  cachePolicy?: string;
  /** Model version if applicable */
  modelVersion?: string;
  /** Run ID if applicable */
  runId?: string;
  /** Callback to navigate to Trust Registry */
  onNavigateToRegistry?: () => void;
  /** Extra className */
  className?: string;
  children?: React.ReactNode;
}

const SOURCE_TO_RPC: Record<string, string> = {
  "county-vitals": "get_county_vitals()",
  "trust-registry-events": "trace_events SELECT",
  "trust-registry-runs": "calibration_runs SELECT",
  "trust-registry-models": "model_receipts SELECT",
  "p360-identity": "parcels SELECT",
  "p360-valuation": "assessments + sales JOIN",
  "p360-workflows": "appeals + permits + exemptions",
  "calibration-history": "calibration_runs SELECT",
  "factory": "calibration_runs + parcels",
};

export function ProvenanceExplainPanel({
  source,
  rpcName,
  fetchedAt,
  cachePolicy = "cached 60s",
  modelVersion,
  runId,
  onNavigateToRegistry,
  className,
  children,
}: ProvenanceExplainPanelProps) {
  const resolvedRpc = rpcName || SOURCE_TO_RPC[source] || "unknown";
  const timeLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";
  const ageSec = fetchedAt ? Math.round((Date.now() - new Date(fetchedAt).getTime()) / 1000) : null;
  const ageLabel = ageSec !== null
    ? ageSec < 60 ? `${ageSec}s ago` : ageSec < 3600 ? `${Math.floor(ageSec / 60)}m ago` : `${Math.floor(ageSec / 3600)}h ago`
    : "unknown";

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer",
              className
            )}
          >
            <Info className="w-3 h-3" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-72 p-0">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Data Provenance</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Query Key</span>
              <Badge variant="outline" className="text-[9px] py-0 font-mono">{source}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">RPC / Source</span>
              <span className="font-mono text-foreground text-[10px]">{resolvedRpc}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Fetched
              </span>
              <span className="text-foreground">
                {timeLabel} <span className="text-muted-foreground">({ageLabel})</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Cache
              </span>
              <span className="text-foreground">{cachePolicy}</span>
            </div>

            {modelVersion && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model Version</span>
                <span className="font-mono text-foreground">{modelVersion}</span>
              </div>
            )}
            {runId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Run ID</span>
                <span className="font-mono text-foreground text-[10px] truncate max-w-32">{runId}</span>
              </div>
            )}
          </div>

          {onNavigateToRegistry && (
            <button
              onClick={onNavigateToRegistry}
              className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors w-full pt-2 border-t border-border/50"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              View in Trust Registry → Data Catalog
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

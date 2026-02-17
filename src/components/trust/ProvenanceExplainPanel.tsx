// TerraFusion OS — Provenance Explain Panel
// Clickable provenance → opens a panel showing query key, RPC name, timestamp,
// cache policy, definition from Data Catalog, and a link to the Trust Registry.

import { Info, ExternalLink, Database, Clock, RefreshCw, BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProvenanceExplainPanelProps {
  source: string;
  rpcName?: string;
  fetchedAt?: string | null;
  cachePolicy?: string;
  modelVersion?: string;
  runId?: string;
  onNavigateToRegistry?: () => void;
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

// ── Data Catalog definitions (mirrors TrustRegistryPage) ──────
const CATALOG_DEFINITIONS: Record<string, { definition: string; updateTrigger: string }> = {
  "county-vitals": { definition: "Single RPC returning all county-level metrics in one call", updateTrigger: "Any parcel/sale/assessment/workflow mutation via canonical invalidators" },
  "parcels.total": { definition: "count(*) from parcels table", updateTrigger: "Any parcel insert/delete" },
  "parcels.withCoords": { definition: "Parcels where latitude IS NOT NULL", updateTrigger: "Parcel geocoding / import" },
  "parcels.withClass": { definition: "Parcels where property_class IS NOT NULL", updateTrigger: "Parcel classification / import" },
  "parcels.withNeighborhood": { definition: "Parcels where neighborhood_code IS NOT NULL", updateTrigger: "Neighborhood assignment" },
  "sales.total": { definition: "count(*) from sales table", updateTrigger: "Sale record insert" },
  "assessments.total": { definition: "count(*) from assessments (all years)", updateTrigger: "Assessment upsert" },
  "assessments.certified": { definition: "Assessments where certified = true", updateTrigger: "Certification action" },
  "assessments.certRate": { definition: "certified / total × 100 — computed only in useCountyVitals", updateTrigger: "Derived from certified + total" },
  "quality.overall": { definition: "Average of coords%, class%, neighborhood% — computed only in useCountyVitals", updateTrigger: "Derived from quality fields" },
  "calibration.runCount": { definition: "count(*) from calibration_runs", updateTrigger: "Calibration save" },
  "calibration.avgRSquared": { definition: "Mean R² across most-recent run per neighborhood — computed only in useCountyVitals", updateTrigger: "Derived from calibration detail" },
  "trust-registry-events": { definition: "Last 50 trace_events ordered by created_at DESC", updateTrigger: "Any traced mutation" },
  "trust-registry-runs": { definition: "Last 50 calibration_runs ordered by created_at DESC", updateTrigger: "Calibration run save" },
  "trust-registry-models": { definition: "Last 50 model_receipts ordered by created_at DESC", updateTrigger: "Model execution" },
  "p360-identity": { definition: "Single parcel record by ID", updateTrigger: "Parcel update" },
  "p360-valuation": { definition: "Assessments + sales joined for a single parcel", updateTrigger: "Assessment or sale change" },
  "p360-workflows": { definition: "Appeals + permits + exemptions for a single parcel", updateTrigger: "Workflow status change" },
  "factory": { definition: "Calibration runs + parcels for mass appraisal", updateTrigger: "Calibration or parcel change" },
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

  const catalogEntry = CATALOG_DEFINITIONS[source];

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
      <PopoverContent side="bottom" align="start" className="w-80 p-0">
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

          {/* Definition from Data Catalog */}
          {catalogEntry && (
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground">
                <BookOpen className="w-2.5 h-2.5 text-primary" />
                Definition
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {catalogEntry.definition}
              </p>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Updates when</span>
                <span className="text-foreground">{catalogEntry.updateTrigger}</span>
              </div>
            </div>
          )}

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

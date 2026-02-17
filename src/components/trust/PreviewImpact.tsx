// TerraFusion OS — PreviewImpact (Trust UI Primitive)
// Shows impact analysis BEFORE committing batch changes.
// "This is a preview; nothing is published."

import { AlertTriangle, ArrowDown, ArrowUp, Minus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ImpactDistribution {
  min: number;
  median: number;
  max: number;
  mean: number;
}

export interface PreviewImpactData {
  /** What action is being previewed */
  action: string;
  /** Total parcels affected */
  parcelCount: number;
  /** Value delta distribution */
  valueDelta?: ImpactDistribution;
  /** Affected neighborhoods */
  neighborhoods: string[];
  /** Count of increases / decreases / unchanged */
  increases: number;
  decreases: number;
  unchanged: number;
}

interface PreviewImpactProps {
  data: PreviewImpactData;
  className?: string;
}

function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export function PreviewImpact({ data, className }: PreviewImpactProps) {
  return (
    <div className={cn(
      "rounded-lg border-2 border-dashed border-[hsl(var(--tf-sacred-gold)/0.5)] bg-[hsl(var(--tf-sacred-gold)/0.04)] p-4 space-y-3",
      className
    )}>
      {/* Banner */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />
        <span className="text-sm font-medium text-foreground">Impact Preview</span>
        <Badge variant="outline" className="text-[9px] bg-[hsl(var(--tf-sacred-gold)/0.1)] text-[hsl(var(--tf-sacred-gold))] border-[hsl(var(--tf-sacred-gold)/0.3)]">
          UNCOMMITTED
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground pl-6">{data.action}</p>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-6">
        <ImpactStat label="Parcels Affected" value={data.parcelCount.toLocaleString()} />
        <ImpactStat
          label="Increases"
          value={data.increases.toLocaleString()}
          icon={<ArrowUp className="w-3 h-3 text-[hsl(var(--tf-optimized-green))]" />}
        />
        <ImpactStat
          label="Decreases"
          value={data.decreases.toLocaleString()}
          icon={<ArrowDown className="w-3 h-3 text-destructive" />}
        />
        <ImpactStat
          label="Unchanged"
          value={data.unchanged.toLocaleString()}
          icon={<Minus className="w-3 h-3 text-muted-foreground" />}
        />
      </div>

      {/* Value delta distribution */}
      {data.valueDelta && (
        <div className="pl-6 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Value Delta Distribution
          </p>
          <div className="flex items-center gap-4 text-xs">
            <span>Min: <strong>{formatCurrency(data.valueDelta.min)}</strong></span>
            <span>Median: <strong>{formatCurrency(data.valueDelta.median)}</strong></span>
            <span>Mean: <strong>{formatCurrency(data.valueDelta.mean)}</strong></span>
            <span>Max: <strong>{formatCurrency(data.valueDelta.max)}</strong></span>
          </div>
        </div>
      )}

      {/* Neighborhoods */}
      {data.neighborhoods.length > 0 && (
        <div className="pl-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Affected Neighborhoods
          </p>
          <div className="flex flex-wrap gap-1">
            {data.neighborhoods.slice(0, 12).map(n => (
              <Badge key={n} variant="outline" className="text-[10px] py-0">
                {n}
              </Badge>
            ))}
            {data.neighborhoods.length > 12 && (
              <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                +{data.neighborhoods.length - 12} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-center gap-1.5 pl-6 text-[10px] text-muted-foreground">
        <Info className="w-3 h-3" />
        <span>This is a preview. No data has been modified.</span>
      </div>
    </div>
  );
}

function ImpactStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className="text-lg font-medium text-foreground">{value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

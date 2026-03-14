// TerraFusion OS — Equity Rebalancing Panel (Phase 26.4)

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceNumber } from "@/components/trust";
import { Scale, ArrowRight, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { useSegmentDefinitions, useSegmentEquityMetrics } from "@/hooks/useSegmentDefinitions";
import { toast } from "sonner";

interface RebalanceProposal {
  rangeLabel: string;
  segmentName: string;
  currentMedianRatio: number;
  targetRatio: number;
  adjustmentFactor: number;
  direction: "increase" | "decrease" | "none";
  parcelCount: number;
  estimatedImpact: string;
}

export function EquityRebalancingPanel() {
  const { data: segments, isLoading: segLoading } = useSegmentDefinitions();
  const activeSegments = (segments ?? []).filter((s) => s.is_active);
  const { data: equityData, isLoading: eqLoading } = useSegmentEquityMetrics(activeSegments);
  const [targetRatio] = useState(1.0);

  if (segLoading || eqLoading) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (activeSegments.length === 0 || !equityData || equityData.length === 0) {
    return (
      <div className="material-bento rounded-2xl p-12 text-center">
        <Scale className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          No active segments with equity data. Define and enable segments first.
        </p>
      </div>
    );
  }

  // Generate rebalancing proposals
  const proposals: RebalanceProposal[] = [];
  for (const seg of equityData) {
    for (const r of seg.ranges) {
      if (r.medianRatio === null || r.salesCount < 3) continue;
      const deviation = Math.abs(r.medianRatio - targetRatio);
      if (deviation < 0.03) continue; // Within tolerance

      const adjustmentFactor = targetRatio / r.medianRatio;
      const direction = r.medianRatio > targetRatio ? "decrease" : "increase";
      const pctChange = ((adjustmentFactor - 1) * 100).toFixed(1);

      proposals.push({
        rangeLabel: r.rangeLabel,
        segmentName: seg.segmentName,
        currentMedianRatio: r.medianRatio,
        targetRatio,
        adjustmentFactor,
        direction,
        parcelCount: r.parcelCount,
        estimatedImpact: `${direction === "increase" ? "+" : ""}${pctChange}%`,
      });
    }
  }

  proposals.sort((a, b) => Math.abs(b.adjustmentFactor - 1) - Math.abs(a.adjustmentFactor - 1));

  const totalAffected = proposals.reduce((a, p) => a + p.parcelCount, 0);
  const needsAction = proposals.length;
  const inBalance = (equityData ?? []).flatMap((s) => s.ranges).filter((r) =>
    r.medianRatio !== null && Math.abs(r.medianRatio - 1.0) < 0.03
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Segments Analyzed" value={equityData.length.toString()} />
        <SummaryCard label="Ranges in Balance" value={inBalance.toString()} good />
        <SummaryCard label="Rebalance Needed" value={needsAction.toString()} warn={needsAction > 0} />
        <SummaryCard label="Parcels Affected" value={totalAffected.toLocaleString()} />
      </div>

      {/* Proposals */}
      {proposals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="material-bento rounded-2xl p-12 text-center"
        >
          <CheckCircle2 className="w-12 h-12 mx-auto text-[hsl(var(--tf-optimized-green))] mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">All Segments in Balance</h3>
          <p className="text-sm text-muted-foreground">
            All segment median ratios are within ±3% of target ({targetRatio.toFixed(2)}).
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />
            Rebalancing Proposals
            <Badge variant="outline" className="text-[10px]">{proposals.length} adjustments</Badge>
          </h3>

          {proposals.map((p, i) => {
            const DirectionIcon = p.direction === "increase" ? TrendingUp : TrendingDown;
            const severity = Math.abs(p.adjustmentFactor - 1) > 0.1 ? "critical" : "moderate";

            return (
              <motion.div
                key={`${p.segmentName}-${p.rangeLabel}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`material-bento rounded-xl p-4 border-l-2 ${
                  severity === "critical"
                    ? "border-l-[hsl(var(--tf-warning-red))]"
                    : "border-l-[hsl(var(--tf-sacred-gold))]"
                }`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <DirectionIcon className={`w-4 h-4 shrink-0 ${
                    p.direction === "increase"
                      ? "text-[hsl(var(--tf-optimized-green))]"
                      : "text-[hsl(var(--tf-warning-red))]"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{p.segmentName}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-mono">{p.rangeLabel}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {p.parcelCount} parcels • {p.direction} assessed values by{" "}
                      <span className="font-mono font-medium">{p.estimatedImpact}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ProvenanceNumber source="equity-rebalance" cachePolicy="cached 120s">
                      <span className="font-mono text-muted-foreground">
                        {p.currentMedianRatio.toFixed(3)}
                      </span>
                    </ProvenanceNumber>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-[hsl(var(--tf-optimized-green))]">
                      {p.targetRatio.toFixed(3)}
                    </span>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${
                    severity === "critical"
                      ? "bg-[hsl(var(--destructive)/0.15)] text-destructive"
                      : "bg-[hsl(var(--tf-sacred-gold)/0.15)] text-[hsl(var(--tf-sacred-gold))]"
                  }`}>
                    ×{p.adjustmentFactor.toFixed(3)}
                  </Badge>
                </div>
              </motion.div>
            );
          })}

          {/* Apply all button */}
          <div className="flex justify-end mt-4">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                toast.success(`${proposals.length} rebalancing proposals queued`, {
                  description: "Navigate to Factory → Calibration to apply per-segment adjustments",
                });
              }}
            >
              <Scale className="w-3.5 h-3.5" />
              Queue All Proposals ({proposals.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, good, warn }: { label: string; value: string; good?: boolean; warn?: boolean }) {
  return (
    <div className="material-bento rounded-xl p-4 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <ProvenanceNumber source="equity-rebalance" cachePolicy="cached 120s">
        <span className={`text-lg font-light ${
          good ? "text-[hsl(var(--tf-optimized-green))]" : warn ? "text-[hsl(var(--tf-sacred-gold))]" : "text-foreground"
        }`}>
          {value}
        </span>
      </ProvenanceNumber>
    </div>
  );
}

// TerraFusion OS — Phase 27: Cost vs. Sale Ratio Analysis Panel

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import type { BatchCostResult } from "@/hooks/useCostBatchApply";

interface CostRatioAnalysisProps {
  results: BatchCostResult[];
}

export function CostRatioAnalysis({ results }: CostRatioAnalysisProps) {
  const analysis = useMemo(() => {
    const withSales = results.filter((r) => r.ratio !== null);
    if (withSales.length === 0) return null;

    const ratios = withSales.map((r) => r.ratio!);
    const sorted = [...ratios].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    // COD
    const avgAbsDev = ratios.reduce((sum, r) => sum + Math.abs(r - median), 0) / ratios.length;
    const cod = (avgAbsDev / median) * 100;

    // PRD
    const wmean = withSales.reduce((sum, r) => sum + r.costValue, 0) / withSales.reduce((sum, r) => sum + r.salePrice!, 0);
    const prd = mean / wmean;

    // Distribution buckets
    const buckets = [
      { range: "< 0.80", min: 0, max: 0.80, count: 0 },
      { range: "0.80–0.90", min: 0.80, max: 0.90, count: 0 },
      { range: "0.90–0.95", min: 0.90, max: 0.95, count: 0 },
      { range: "0.95–1.05", min: 0.95, max: 1.05, count: 0 },
      { range: "1.05–1.10", min: 1.05, max: 1.10, count: 0 },
      { range: "1.10–1.20", min: 1.10, max: 1.20, count: 0 },
      { range: "> 1.20", min: 1.20, max: Infinity, count: 0 },
    ];
    for (const r of ratios) {
      const bucket = buckets.find((b) => r >= b.min && r < b.max);
      if (bucket) bucket.count++;
    }

    return { median, mean, cod, prd, buckets, salesCount: withSales.length };
  }, [results]);

  if (!analysis) {
    return (
      <div className="material-bento p-8 text-center">
        <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No parcels with sales data for ratio analysis</p>
      </div>
    );
  }

  const codVerdict = analysis.cod <= 15 ? "pass" : analysis.cod <= 20 ? "warn" : "fail";
  const prdVerdict = analysis.prd >= 0.98 && analysis.prd <= 1.03 ? "pass" : "warn";

  return (
    <div className="material-bento overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[hsl(var(--tf-transcend-cyan))]" />
          <h3 className="text-sm font-medium text-foreground">Cost Ratio Analysis</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">{analysis.salesCount} sales</Badge>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-px bg-border">
        <MetricCard
          label="Median Ratio"
          value={analysis.median.toFixed(3)}
          verdict={analysis.median >= 0.95 && analysis.median <= 1.05 ? "pass" : "warn"}
          target="0.95–1.05"
        />
        <MetricCard
          label="Mean Ratio"
          value={analysis.mean.toFixed(3)}
          verdict={analysis.mean >= 0.95 && analysis.mean <= 1.05 ? "pass" : "warn"}
        />
        <MetricCard
          label="COD"
          value={`${analysis.cod.toFixed(1)}%`}
          verdict={codVerdict}
          target="≤ 15%"
        />
        <MetricCard
          label="PRD"
          value={analysis.prd.toFixed(3)}
          verdict={prdVerdict}
          target="0.98–1.03"
        />
      </div>

      {/* Distribution Chart */}
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-3">Ratio Distribution</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analysis.buckets} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 25% 15%)" />
            <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(210 15% 55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(210 15% 55%)" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(222 47% 6%)",
                border: "1px solid hsl(220 25% 15%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <ReferenceLine x="0.95–1.05" stroke="hsl(160 100% 45%)" strokeDasharray="4 4" strokeWidth={2} />
            <Bar
              dataKey="count"
              fill="hsl(180 100% 45%)"
              fillOpacity={0.7}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricCard({ label, value, verdict, target }: { label: string; value: string; verdict: string; target?: string }) {
  return (
    <div className="bg-background p-3 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        {verdict === "pass" && <CheckCircle className="w-3 h-3 text-emerald-400" />}
        {verdict === "warn" && <AlertTriangle className="w-3 h-3 text-amber-400" />}
        {verdict === "fail" && <AlertTriangle className="w-3 h-3 text-destructive" />}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-mono font-medium text-foreground">{value}</p>
      {target && <p className="text-[9px] text-muted-foreground mt-0.5">Target: {target}</p>}
    </div>
  );
}

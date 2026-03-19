/**
 * TerraFusion OS — Phase 128: Valuation Confidence Interval Visualizer
 * Constitutional owner: TerraForge (valuation)
 *
 * Displays confidence intervals for the active parcel's assessed value
 * based on comparable sales variance and model diagnostics.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { useComparableSales } from "@/hooks/useParcelDetails";
import { cn } from "@/lib/utils";

interface ConfidenceBand {
  label: string;
  low: number;
  high: number;
  color: string;
  pct: number;
}

export function ValuationConfidenceVisualizer() {
  const { parcel } = useWorkbench();
  const { data: comps, isLoading } = useComparableSales(
    parcel.id,
    parcel.neighborhoodCode,
    parcel.assessedValue
  );

  const analysis = useMemo(() => {
    const assessed = parcel.assessedValue ?? 0;
    if (!assessed || !comps?.length) return null;

    // Calculate stats from comparable sale prices
    const prices = comps
      .map((c: any) => c.sale_price)
      .filter((p: number) => p > 0)
      .sort((a: number, b: number) => a - b);

    if (prices.length < 3) return null;

    const mean = prices.reduce((s: number, v: number) => s + v, 0) / prices.length;
    const variance = prices.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const median = prices[Math.floor(prices.length / 2)];
    const cod = (prices.reduce((s: number, v: number) => s + Math.abs(v - median), 0) / prices.length / median) * 100;

    const bands: ConfidenceBand[] = [
      { label: "90% CI", low: Math.round(mean - 1.645 * stdDev), high: Math.round(mean + 1.645 * stdDev), color: "bg-tf-cyan/20 border-tf-cyan/40", pct: 90 },
      { label: "80% CI", low: Math.round(mean - 1.282 * stdDev), high: Math.round(mean + 1.282 * stdDev), color: "bg-tf-green/20 border-tf-green/40", pct: 80 },
      { label: "50% CI", low: Math.round(mean - 0.675 * stdDev), high: Math.round(mean + 0.675 * stdDev), color: "bg-tf-gold/20 border-tf-gold/40", pct: 50 },
    ];

    // Where does assessed value fall?
    const zScore = stdDev > 0 ? (assessed - mean) / stdDev : 0;
    const withinBand = bands.find((b) => assessed >= b.low && assessed <= b.high);
    const confidence = withinBand ? withinBand.pct : zScore > 2 || zScore < -2 ? 5 : 30;

    return {
      mean: Math.round(mean),
      median,
      stdDev: Math.round(stdDev),
      cod: cod.toFixed(1),
      bands,
      assessed,
      zScore: zScore.toFixed(2),
      confidence,
      sampleSize: prices.length,
      range: { min: prices[0], max: prices[prices.length - 1] },
    };
  }, [parcel.assessedValue, comps]);

  if (!parcel.id) {
    return (
      <div className="p-6 text-center">
        <Target className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a parcel to view confidence intervals</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Insufficient comparable data (need ≥3 sales)</p>
      </div>
    );
  }

  // Compute visual range for the bar chart
  const visualMin = Math.min(analysis.bands[0].low, analysis.assessed) * 0.95;
  const visualMax = Math.max(analysis.bands[0].high, analysis.assessed) * 1.05;
  const visualRange = visualMax - visualMin;
  const toPercent = (val: number) => ((val - visualMin) / visualRange) * 100;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Assessed", value: `$${analysis.assessed.toLocaleString()}`, icon: Target, color: "text-foreground" },
          { label: "Market Mean", value: `$${analysis.mean.toLocaleString()}`, icon: BarChart3, color: "text-tf-cyan" },
          { label: "COD", value: `${analysis.cod}%`, icon: TrendingUp, color: parseFloat(analysis.cod) > 15 ? "text-tf-amber" : "text-tf-green" },
          { label: "Z-Score", value: analysis.zScore, icon: Target, color: Math.abs(parseFloat(analysis.zScore)) > 1.5 ? "text-destructive" : "text-tf-green" },
        ].map((s) => (
          <Card key={s.label} className="material-bento border-border/50">
            <CardContent className="p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <div className={`text-lg font-medium ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confidence Bands Visualization */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-suite-forge" />
            Confidence Intervals
            <Badge
              className={cn(
                "text-[10px]",
                analysis.confidence >= 80
                  ? "bg-tf-green/20 text-tf-green border-tf-green/30"
                  : analysis.confidence >= 50
                  ? "bg-tf-gold/20 text-tf-gold border-tf-gold/30"
                  : "bg-destructive/20 text-destructive border-destructive/30"
              )}
            >
              {analysis.confidence}% confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual Band Chart */}
          <div className="relative h-32 rounded-lg bg-muted/20 border border-border/30 overflow-hidden">
            {/* Bands (widest first) */}
            {analysis.bands.map((band) => (
              <div
                key={band.label}
                className={cn("absolute top-2 bottom-2 rounded border", band.color)}
                style={{
                  left: `${toPercent(band.low)}%`,
                  width: `${toPercent(band.high) - toPercent(band.low)}%`,
                }}
              >
                <span className="absolute -top-0.5 left-1 text-[8px] text-muted-foreground">{band.label}</span>
              </div>
            ))}

            {/* Mean line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-tf-cyan"
              style={{ left: `${toPercent(analysis.mean)}%` }}
            >
              <span className="absolute -bottom-4 -translate-x-1/2 text-[8px] text-tf-cyan">Mean</span>
            </div>

            {/* Assessed value marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-foreground"
              style={{ left: `${toPercent(analysis.assessed)}%` }}
            >
              <div className="absolute -top-5 -translate-x-1/2 px-1.5 py-0.5 rounded bg-foreground text-background text-[9px] font-medium whitespace-nowrap">
                Assessed: ${analysis.assessed.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Band Details */}
          <div className="space-y-2">
            {analysis.bands.map((band) => (
              <div key={band.label} className="flex items-center gap-3 text-xs">
                <Badge variant="outline" className={cn("text-[9px] w-14 justify-center", band.color)}>
                  {band.label}
                </Badge>
                <span className="text-muted-foreground">
                  ${band.low.toLocaleString()} — ${band.high.toLocaleString()}
                </span>
                <span className="text-muted-foreground/60 ml-auto">
                  ±${Math.round((band.high - band.low) / 2).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/20">
            Based on {analysis.sampleSize} comparable sales · Range: ${analysis.range.min.toLocaleString()} – ${analysis.range.max.toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

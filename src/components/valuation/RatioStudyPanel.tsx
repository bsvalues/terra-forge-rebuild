// TerraFusion OS — Phase 89: IAAO Ratio Study Report Panel
// Renders IAAO-compliant ratio study statistics with visual indicators.

import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRatioStudy } from "@/hooks/useRatioStudy";
import { cn } from "@/lib/utils";

/** IAAO standard thresholds for residential property. */
const IAAO_STANDARDS = {
  medianRatio: { target: 1.0, tolerance: 0.10 },
  cod: { max: 15, label: "≤15%" },
  prd: { min: 0.98, max: 1.03, label: "0.98–1.03" },
};

function PassFailBadge({ pass }: { pass: boolean }) {
  return pass ? (
    <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/30 text-[10px]">
      <CheckCircle2 className="w-3 h-3 mr-1" /> PASS
    </Badge>
  ) : (
    <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
      <AlertTriangle className="w-3 h-3 mr-1" /> FAIL
    </Badge>
  );
}

function StatRow({ label, value, standard, pass }: {
  label: string; value: string; standard: string; pass: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground ml-2">IAAO: {standard}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-foreground">{value}</span>
        <PassFailBadge pass={pass} />
      </div>
    </div>
  );
}

interface RatioStudyPanelProps {
  studyPeriodId?: string;
}

export function RatioStudyPanel({ studyPeriodId }: RatioStudyPanelProps) {
  const { data: stats, isLoading } = useRatioStudy(studyPeriodId);

  if (isLoading) {
    return (
      <Card className="bg-card/80 border-border/40">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-card/80 border-border/40">
        <CardContent className="text-center py-12 text-sm text-muted-foreground">
          No ratio data available. Run a ratio study to see IAAO compliance results.
        </CardContent>
      </Card>
    );
  }

  const medianPass = Math.abs(stats.medianRatio - IAAO_STANDARDS.medianRatio.target) <= IAAO_STANDARDS.medianRatio.tolerance;
  const codPass = stats.cod <= IAAO_STANDARDS.cod.max;
  const prdPass = stats.prd >= IAAO_STANDARDS.prd.min && stats.prd <= IAAO_STANDARDS.prd.max;
  const overallPass = medianPass && codPass && prdPass;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={cn(
        "border-border/40",
        overallPass ? "bg-chart-2/5 border-chart-2/20" : "bg-destructive/5 border-destructive/20"
      )}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            overallPass ? "bg-chart-2/20" : "bg-destructive/20"
          )}>
            {overallPass
              ? <CheckCircle2 className="w-6 h-6 text-chart-2" />
              : <AlertTriangle className="w-6 h-6 text-destructive" />
            }
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {overallPass ? "IAAO Compliant" : "Non-Compliant"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {stats.totalRatios} ratios analyzed · {stats.outlierCount} outliers excluded
            </p>
          </div>
        </CardContent>
      </Card>

      {/* IAAO Metrics */}
      <Card className="bg-card/80 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            IAAO Standard Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow
            label="Median Ratio"
            value={stats.medianRatio.toFixed(4)}
            standard="0.90–1.10"
            pass={medianPass}
          />
          <StatRow
            label="COD"
            value={`${stats.cod.toFixed(2)}%`}
            standard={IAAO_STANDARDS.cod.label}
            pass={codPass}
          />
          <StatRow
            label="PRD"
            value={stats.prd.toFixed(4)}
            standard={IAAO_STANDARDS.prd.label}
            pass={prdPass}
          />
          <div className="flex items-center justify-between py-2 mt-1">
            <span className="text-xs text-muted-foreground">Mean Ratio</span>
            <span className="text-sm font-mono text-foreground">{stats.meanRatio.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-muted-foreground">Range</span>
            <span className="text-sm font-mono text-foreground">
              {stats.minRatio.toFixed(4)} – {stats.maxRatio.toFixed(4)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tier Breakdown */}
      {Object.keys(stats.ratiosByTier).length > 0 && (
        <Card className="bg-card/80 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-chart-5" />
              By Value Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/20 text-muted-foreground">
                  <th className="px-4 py-2 text-left">Tier</th>
                  <th className="px-4 py-2 text-right">Count</th>
                  <th className="px-4 py-2 text-right">Median</th>
                  <th className="px-4 py-2 text-right">COD</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.ratiosByTier).map(([tier, data]) => (
                  <tr key={tier} className="border-b border-border/10 hover:bg-muted/20">
                    <td className="px-4 py-2 text-foreground capitalize">{tier}</td>
                    <td className="px-4 py-2 text-right text-foreground">{data.count}</td>
                    <td className="px-4 py-2 text-right font-mono text-foreground">{data.median.toFixed(4)}</td>
                    <td className="px-4 py-2 text-right font-mono text-foreground">{data.cod.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

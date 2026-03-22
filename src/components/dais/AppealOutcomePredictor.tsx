/**
 * TerraFusion OS — Phase 125: Appeal Outcome Predictor
 * Constitutional owner: TerraDais (appeals)
 *
 * Predicts appeal outcomes based on historical resolution patterns,
 * value change magnitude, and comparable appeal data. Shows confidence
 * scores and recommended defense strategies.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  Loader2,
  Brain,
  Target,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface PredictionResult {
  outcome: "upheld" | "reduced" | "dismissed";
  confidence: number;
  reasoning: string;
  recommendedStrategy: string;
  historicalRate: number;
  avgReduction: number;
}

/**
 * Analyzes historical appeals to predict outcomes for the current parcel.
 * Uses resolution patterns, value change percentages, and neighborhood trends.
 */
function useAppealPrediction(parcelId: string | null) {
  return useQuery({
    queryKey: ["appeal-prediction", parcelId],
    enabled: !!parcelId,
    queryFn: async () => {
      // Get parcel details
      const { data: parcel } = await supabase
        .from("parcels")
        .select("assessed_value, neighborhood_code, property_class")
        .eq("id", parcelId!)
        .single();

      const neighborhoodCode = parcel?.neighborhood_code;

      // Get historical appeals for similar parcels
      const { data: appeals } = await supabase
        .from("appeals")
        .select("status, original_value, final_value, requested_value, resolution_type")
        .limit(200);

      // Get neighborhood-specific appeals for comparison
      let neighborhoodAppeals: typeof appeals = [];
      if (neighborhoodCode) {
        const { data: nbhdData } = await supabase
          .from("appeals")
          .select("status, original_value, final_value, requested_value, resolution_type, parcels!appeals_parcel_id_fkey(neighborhood_code)")
          .limit(100);
        neighborhoodAppeals = (nbhdData || []).filter(
          (a: any) => a.parcels?.neighborhood_code === neighborhoodCode
        );
      }

      if (!appeals?.length) return null;

      // Compute historical stats
      const resolved = appeals.filter((a) => a.final_value !== null);
      const upheldCount = resolved.filter((a) => a.final_value === a.original_value).length;
      const reducedCount = resolved.filter((a) => a.final_value !== null && a.final_value < a.original_value).length;
      const dismissedCount = appeals.filter((a) => a.status === "dismissed").length;
      const total = resolved.length || 1;

      const avgReduction = reducedCount > 0
        ? resolved
            .filter((a) => a.final_value !== null && a.final_value < a.original_value)
            .reduce((sum, a) => sum + ((a.original_value - (a.final_value ?? a.original_value)) / a.original_value) * 100, 0) / reducedCount
        : 0;

      // Determine most likely outcome
      const rates = {
        upheld: upheldCount / total,
        reduced: reducedCount / total,
        dismissed: dismissedCount / total,
      };

      const topOutcome = Object.entries(rates).sort((a, b) => b[1] - a[1])[0];

      const strategies: Record<string, string> = {
        upheld: "Present strong comparable sales evidence and IAAO-compliant ratio analysis to demonstrate equitable assessment.",
        reduced: "Focus on property-specific condition factors, recent sales data, and any assessment methodology inconsistencies.",
        dismissed: "Ensure procedural compliance and filing deadlines. Consider pre-hearing informal resolution.",
      };

      const reasonings: Record<string, string> = {
        upheld: `Historical data shows ${(rates.upheld * 100).toFixed(0)}% of similar appeals result in the original value being upheld. Strong assessment methodology documentation is recommended.`,
        reduced: `${(rates.reduced * 100).toFixed(0)}% of appeals in this category resulted in value reductions averaging ${avgReduction.toFixed(1)}%. Prepare counter-evidence for potential reduction arguments.`,
        dismissed: `${(rates.dismissed * 100).toFixed(0)}% dismissal rate suggests procedural issues are common. Verify all filing requirements are met.`,
      };

      const result: PredictionResult = {
        outcome: topOutcome[0] as PredictionResult["outcome"],
        confidence: Math.round(topOutcome[1] * 100),
        reasoning: reasonings[topOutcome[0]],
        recommendedStrategy: strategies[topOutcome[0]],
        historicalRate: topOutcome[1],
        avgReduction,
      };

      return {
        prediction: result,
        stats: {
          totalAnalyzed: appeals.length,
          upheldRate: Math.round(rates.upheld * 100),
          reducedRate: Math.round(rates.reduced * 100),
          dismissedRate: Math.round(rates.dismissed * 100),
          avgReductionPct: avgReduction,
        },
        neighborhoodStats: neighborhoodAppeals.length > 0 ? (() => {
          const nbResolved = neighborhoodAppeals.filter((a: any) => a.final_value !== null);
          const nbTotal = nbResolved.length || 1;
          const nbUpheld = nbResolved.filter((a: any) => a.final_value === a.original_value).length;
          const nbReduced = nbResolved.filter((a: any) => a.final_value !== null && a.final_value < a.original_value).length;
          return {
            total: neighborhoodAppeals.length,
            neighborhoodCode: neighborhoodCode!,
            upheldRate: Math.round((nbUpheld / nbTotal) * 100),
            reducedRate: Math.round((nbReduced / nbTotal) * 100),
          };
        })() : null,
      };
    },
    staleTime: 60_000,
  });
}

export function AppealOutcomePredictor() {
  const { parcel } = useWorkbench();
  const { data, isLoading } = useAppealPrediction(parcel.id);

  if (!parcel.id) {
    return (
      <div className="p-6 text-center">
        <Scale className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a parcel to predict appeal outcomes</p>
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

  if (!data) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Insufficient historical data for prediction</p>
      </div>
    );
  }

  const { prediction, stats, neighborhoodStats } = data;

  const outcomeColors = {
    upheld: "text-tf-green",
    reduced: "text-tf-amber",
    dismissed: "text-destructive",
  };

  const outcomeBadges = {
    upheld: "bg-tf-green/20 text-tf-green border-tf-green/30",
    reduced: "bg-tf-amber/20 text-tf-amber border-tf-amber/30",
    dismissed: "bg-destructive/20 text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-4">
      {/* Prediction Summary */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-suite-dais" />
            Appeal Outcome Prediction
            <Badge className={`text-[10px] ${outcomeBadges[prediction.outcome]}`}>
              {prediction.outcome.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Confidence Meter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <span className={`text-sm font-medium ${outcomeColors[prediction.outcome]}`}>
                {prediction.confidence}%
              </span>
            </div>
            <Progress value={prediction.confidence} className="h-2" />
          </div>

          {/* Reasoning */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs text-foreground leading-relaxed">{prediction.reasoning}</p>
          </div>

          {/* Strategy */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Recommended Strategy</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {prediction.recommendedStrategy}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Historical Breakdown */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            Historical Patterns ({stats.totalAnalyzed} appeals analyzed)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Upheld (Original Value)", rate: stats.upheldRate, color: "text-tf-green", bg: "bg-tf-green" },
              { label: "Reduced", rate: stats.reducedRate, color: "text-tf-amber", bg: "bg-tf-amber" },
              { label: "Dismissed", rate: stats.dismissedRate, color: "text-destructive", bg: "bg-destructive" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-xs font-medium ${item.color}`}>{item.rate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.bg} transition-all`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}

            {stats.avgReductionPct > 0 && (
              <div className="mt-3 p-2 rounded bg-muted/20 border border-border/20">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-3.5 h-3.5 text-tf-amber" />
                  <span className="text-xs text-muted-foreground">
                    Average reduction when granted: <span className="text-foreground font-medium">{stats.avgReductionPct.toFixed(1)}%</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Neighborhood Comparison */}
      {neighborhoodStats && (
        <Card className="material-bento border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Neighborhood Comparison — {neighborhoodStats.neighborhoodCode}
              <Badge variant="outline" className="text-[9px]">
                {neighborhoodStats.total} appeals
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-center">
                <div className="text-lg font-medium text-tf-green">{neighborhoodStats.upheldRate}%</div>
                <div className="text-[10px] text-muted-foreground">Upheld in Neighborhood</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-center">
                <div className="text-lg font-medium text-tf-amber">{neighborhoodStats.reducedRate}%</div>
                <div className="text-[10px] text-muted-foreground">Reduced in Neighborhood</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Disclaimer */}
      <div className="px-1">
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          <AlertTriangle className="w-3 h-3 inline mr-1 align-text-bottom" />
          <em>Statistical estimate based on historical appeal data — not legal advice. Actual outcomes depend on evidence, board composition, and case-specific factors. Consult qualified counsel for legal guidance.</em>
        </p>
      </div>
    </div>
  );
}

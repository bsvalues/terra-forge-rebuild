// TerraFusion OS — Batch Apply Panel
// Applies calibration coefficients to neighborhood parcels

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { batchApplyAdjustments } from "@/services/suites/forgeService";
import { generateCalibrationNarrative } from "@/services/suites/dossierService";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, AlertTriangle, CheckCircle2, Loader2, Undo2 } from "lucide-react";
import type { CalibrationResult, CoefficientResult } from "@/hooks/useCalibration";

interface BatchApplyPanelProps {
  result: CalibrationResult;
  neighborhoodCode: string;
  calibrationRunId: string | null;
}

function predictValue(parcel: Record<string, any>, coefficients: CoefficientResult[]): number {
  let predicted = 0;
  for (const coef of coefficients) {
    if (coef.variable === "intercept") {
      predicted += coef.coefficient;
    } else {
      const val = parcel[coef.variable] ?? 0;
      predicted += coef.coefficient * Number(val);
    }
  }
  return Math.max(0, Math.round(predicted));
}

export function BatchApplyPanel({ result, neighborhoodCode, calibrationRunId }: BatchApplyPanelProps) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<Array<{
    parcelId: string;
    address: string;
    currentValue: number;
    predictedValue: number;
    delta: number;
  }> | null>(null);

  // Step 1: Preview — compute predicted values
  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, address, assessed_value, building_area, land_area, year_built, bedrooms, bathrooms")
        .eq("neighborhood_code", neighborhoodCode)
        .limit(500);

      if (error) throw error;
      if (!parcels || parcels.length === 0) throw new Error("No parcels in this neighborhood");

      return parcels.map((p) => {
        const predicted = predictValue(p, result.coefficients);
        return {
          parcelId: p.id,
          address: p.address,
          currentValue: p.assessed_value,
          predictedValue: predicted,
          delta: predicted - p.assessed_value,
        };
      });
    },
    onSuccess: (data) => {
      setPreview(data);
      toast.info(`Preview: ${data.length} parcels, avg Δ = ${formatCurrency(data.reduce((s, d) => s + d.delta, 0) / data.length)}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Step 2: Apply — write to value_adjustments + update parcels
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!preview || !calibrationRunId) throw new Error("Preview first and save the calibration run");

      const adjustments = preview.map((p) => ({
        parcelId: p.parcelId,
        previousValue: p.currentValue,
        newValue: p.predictedValue,
      }));

      return batchApplyAdjustments(
        calibrationRunId,
        adjustments,
        "regression",
        `OLS calibration for ${neighborhoodCode} — R²=${(result.r_squared * 100).toFixed(1)}%`
      );
    },
    onSuccess: async (res) => {
      toast.success(`Applied ${res.applied} adjustments`, {
        description: res.errors.length > 0 ? `${res.errors.length} errors` : undefined,
      });

      // Auto-generate calibration narrative (fire-and-forget)
      if (res.applied > 0 && preview) {
        const avgDelta = preview.reduce((s, p) => s + p.delta, 0) / preview.length;
        generateCalibrationNarrative({
          neighborhoodCode,
          adjustmentType: "regression",
          parcelsAffected: res.applied,
          rSquared: result.r_squared,
          avgDelta,
          reason: `OLS calibration for ${neighborhoodCode} — R²=${(result.r_squared * 100).toFixed(1)}%`,
          calibrationRunId: calibrationRunId!,
        }).catch(() => {/* narrative generation is non-critical */});
      }

      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["parcel-search"] });
      queryClient.invalidateQueries({ queryKey: ["recent-batch-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["calibration-adjustments"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="material-bento p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-[hsl(var(--suite-forge))]" />
            Batch Apply
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apply regression values to {neighborhoodCode}
          </p>
        </div>
        {!calibrationRunId && (
          <Badge variant="outline" className="text-[10px] text-[hsl(var(--tf-sacred-gold))]">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Save run first
          </Badge>
        )}
      </div>

      {/* Preview Summary */}
      {preview && (
        <div className="bg-[hsl(var(--tf-elevated)/0.5)] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Parcels affected</span>
            <span className="font-medium text-foreground">{preview.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Avg change</span>
            <span className={`font-medium ${avgDelta(preview) >= 0 ? "text-chart-5" : "text-destructive"}`}>
              {avgDelta(preview) >= 0 ? "+" : ""}{fmt(avgDelta(preview))}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Max increase</span>
            <span className="font-medium text-foreground">
              {fmt(Math.max(...preview.map((p) => p.delta)))}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Max decrease</span>
            <span className="font-medium text-foreground">
              {fmt(Math.min(...preview.map((p) => p.delta)))}
            </span>
          </div>

          {/* Top 5 changes */}
          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1.5">Largest adjustments</p>
            {preview
              .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
              .slice(0, 5)
              .map((p) => (
                <div key={p.parcelId} className="flex items-center justify-between text-[11px] py-0.5">
                  <span className="text-muted-foreground truncate max-w-[160px]">{p.address}</span>
                  <span className={p.delta >= 0 ? "text-chart-5" : "text-destructive"}>
                    {p.delta >= 0 ? "+" : ""}{fmt(p.delta)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {!preview ? (
          <CommitmentButton
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending}
          >
            {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {previewMutation.isPending ? "Computing…" : "Preview Impact"}
          </CommitmentButton>
        ) : (
          <>
            <CommitmentButton
              variant="gold"
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending || !calibrationRunId}
            >
              {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {applyMutation.isPending ? "Applying…" : `Apply to ${preview.length} Parcels`}
            </CommitmentButton>
            <button
              onClick={() => setPreview(null)}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function avgDelta(preview: Array<{ delta: number }>): number {
  if (preview.length === 0) return 0;
  return preview.reduce((s, p) => s + p.delta, 0) / preview.length;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

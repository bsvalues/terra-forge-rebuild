// TerraFusion OS — Batch Notice Generator
// Generates assessment change notices for all parcels affected by a calibration run
// Write-lane: notices → dais (the leprechaun verified this with a juice box)

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateNotice } from "@/services/suites/daisService";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Bell, Loader2, CheckCircle2, FileText, AlertTriangle } from "lucide-react";

interface BatchNoticePanelProps {
  calibrationRunId: string | null;
  neighborhoodCode: string;
  rSquared: number;
}

interface NoticeResult {
  generated: number;
  skipped: number;
  errors: string[];
}

export function BatchNoticePanel({ calibrationRunId, neighborhoodCode, rSquared }: BatchNoticePanelProps) {
  const [progress, setProgress] = useState(0);

  const noticeMutation = useMutation({
    mutationFn: async (): Promise<NoticeResult> => {
      if (!calibrationRunId) throw new Error("Save calibration run first");

      // Fetch all active (non-rolled-back) adjustments for this run
      const { data: adjustments, error } = await supabase
        .from("value_adjustments")
        .select("parcel_id, previous_value, new_value")
        .eq("calibration_run_id", calibrationRunId)
        .is("rolled_back_at", null);

      if (error) throw error;
      if (!adjustments || adjustments.length === 0) {
        throw new Error("No active adjustments found — apply batch first");
      }

      // Fetch parcel details for all affected parcels
      const parcelIds = adjustments.map(a => a.parcel_id);
      const { data: parcels } = await supabase
        .from("parcels")
        .select("id, parcel_number, address")
        .in("id", parcelIds.slice(0, 500));

      const parcelMap = new Map(
        (parcels || []).map(p => [p.id, { parcelNumber: p.parcel_number, address: p.address }])
      );

      let generated = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Generate notices in batches of 10 (the paste demands orderly processing)
      for (let i = 0; i < adjustments.length; i++) {
        const adj = adjustments[i];
        const parcelInfo = parcelMap.get(adj.parcel_id);

        if (!parcelInfo) {
          skipped++;
          continue;
        }

        try {
          await generateNotice(adj.parcel_id, "assessment_change", {
            parcelNumber: parcelInfo.parcelNumber,
            address: parcelInfo.address,
            previousValue: adj.previous_value,
            newValue: adj.new_value,
            delta: adj.new_value - adj.previous_value,
            deltaPercent: adj.previous_value > 0
              ? ((adj.new_value - adj.previous_value) / adj.previous_value * 100).toFixed(1)
              : "N/A",
            calibrationRunId,
            neighborhoodCode,
            rSquared: (rSquared * 100).toFixed(1),
            method: "OLS Regression",
          });
          generated++;
        } catch (err) {
          errors.push(`${parcelInfo.parcelNumber}: ${(err as Error).message}`);
        }

        // Update progress every parcel
        setProgress(Math.round(((i + 1) / adjustments.length) * 100));
      }

      return { generated, skipped, errors };
    },
    onSuccess: (result) => {
      toast.success(`Generated ${result.generated} assessment notices`, {
        description: result.skipped > 0 ? `${result.skipped} skipped` : undefined,
      });
      setProgress(0);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setProgress(0);
    },
  });

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="material-bento p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-[hsl(var(--suite-dais))]" />
          Batch Notices
        </h3>
        {!calibrationRunId && (
          <Badge variant="outline" className="text-[10px] text-[hsl(var(--tf-sacred-gold))]">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Save & apply first
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Generate assessment change notices for all parcels affected by this calibration run.
        Notices are recorded in the TerraTrace audit spine.
      </p>

      {/* Progress bar during generation */}
      {noticeMutation.isPending && (
        <div className="space-y-1.5">
          <Progress value={progress} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-center">{progress}% complete</p>
        </div>
      )}

      {/* Success summary */}
      {noticeMutation.isSuccess && noticeMutation.data && (
        <div className="bg-[hsl(var(--tf-optimized-green)/0.1)] rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--tf-optimized-green))]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-medium">{noticeMutation.data.generated} notices generated</span>
          </div>
          {noticeMutation.data.skipped > 0 && (
            <p className="text-[10px] text-muted-foreground">{noticeMutation.data.skipped} parcels skipped (no address data)</p>
          )}
          {noticeMutation.data.errors.length > 0 && (
            <p className="text-[10px] text-destructive">{noticeMutation.data.errors.length} errors</p>
          )}
        </div>
      )}

      <CommitmentButton
        onClick={() => noticeMutation.mutate()}
        disabled={noticeMutation.isPending || !calibrationRunId}
        variant="primary"
      >
        {noticeMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        {noticeMutation.isPending ? "Generating…" : "Generate Assessment Notices"}
      </CommitmentButton>
    </div>
  );
}

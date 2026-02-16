// TerraFusion OS — Batch Notice Generator (AI-Powered)
// Generates assessment change notices using TerraPilot Muse draft_notice tool
// Write-lane: notices → dais (the leprechaun verified this with a juice box)

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateNotice } from "@/services/suites/daisService";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Bell, Loader2, CheckCircle2, FileText, AlertTriangle, Sparkles, Download, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BatchNoticePanelProps {
  calibrationRunId: string | null;
  neighborhoodCode: string;
  rSquared: number;
}

interface NoticeResult {
  generated: number;
  skipped: number;
  errors: string[];
  notices: GeneratedNotice[];
}

interface GeneratedNotice {
  parcelNumber: string;
  address: string;
  content: string;
  previousValue: number;
  newValue: number;
}

export function BatchNoticePanel({ calibrationRunId, neighborhoodCode, rSquared }: BatchNoticePanelProps) {
  const [progress, setProgress] = useState(0);
  const [useAI, setUseAI] = useState(true);
  const [previewNotice, setPreviewNotice] = useState<GeneratedNotice | null>(null);

  const noticeMutation = useMutation({
    mutationFn: async (): Promise<NoticeResult> => {
      if (!calibrationRunId) throw new Error("Save calibration run first");

      // Fetch all active adjustments for this run
      const { data: adjustments, error } = await supabase
        .from("value_adjustments")
        .select("parcel_id, previous_value, new_value")
        .eq("calibration_run_id", calibrationRunId)
        .is("rolled_back_at", null);

      if (error) throw error;
      if (!adjustments || adjustments.length === 0) {
        throw new Error("No active adjustments found — apply batch first");
      }

      // Fetch parcel details
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
      const notices: GeneratedNotice[] = [];

      // Process parcels — AI drafting for first 5, template for rest (cost optimization)
      const aiLimit = useAI ? Math.min(adjustments.length, 5) : 0;

      for (let i = 0; i < adjustments.length; i++) {
        const adj = adjustments[i];
        const parcelInfo = parcelMap.get(adj.parcel_id);

        if (!parcelInfo) { skipped++; continue; }

        try {
          let noticeContent: string;

          if (i < aiLimit) {
            // AI-drafted notice via Muse draft_notice tool
            const { data: aiData, error: aiError } = await supabase.functions.invoke("draft-notice", {
              body: {
                parcelNumber: parcelInfo.parcelNumber,
                address: parcelInfo.address,
                previousValue: adj.previous_value,
                newValue: adj.new_value,
                neighborhoodCode,
                rSquared: (rSquared * 100).toFixed(1),
                method: "OLS Regression",
                noticeType: "assessment_change",
              },
            });

            if (aiError) throw aiError;
            noticeContent = aiData?.notice || generateTemplateNotice(parcelInfo, adj, neighborhoodCode, rSquared);
          } else {
            // Template-based notice for remaining parcels
            noticeContent = generateTemplateNotice(parcelInfo, adj, neighborhoodCode, rSquared);
          }

          // Record in TerraTrace via daisService
          await generateNotice(adj.parcel_id, "assessment_change", {
            parcelNumber: parcelInfo.parcelNumber,
            address: parcelInfo.address,
            previousValue: adj.previous_value,
            newValue: adj.new_value,
            delta: adj.new_value - adj.previous_value,
            aiDrafted: i < aiLimit,
            calibrationRunId,
            neighborhoodCode,
          });

          notices.push({
            parcelNumber: parcelInfo.parcelNumber,
            address: parcelInfo.address,
            content: noticeContent,
            previousValue: adj.previous_value,
            newValue: adj.new_value,
          });

          generated++;
        } catch (err) {
          errors.push(`${parcelInfo.parcelNumber}: ${(err as Error).message}`);
        }

        setProgress(Math.round(((i + 1) / adjustments.length) * 100));
      }

      return { generated, skipped, errors, notices };
    },
    onSuccess: (result) => {
      toast.success(`Generated ${result.generated} assessment notices`, {
        description: result.errors.length > 0 ? `${result.errors.length} errors` : undefined,
      });
      setProgress(0);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setProgress(0);
    },
  });

  const handleDownloadAll = () => {
    if (!noticeMutation.data?.notices) return;
    const allText = noticeMutation.data.notices
      .map(n => `${"=".repeat(60)}\nParcel: ${n.parcelNumber} — ${n.address}\n${"=".repeat(60)}\n\n${n.content}\n\n`)
      .join("\n");
    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notices-${neighborhoodCode}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("All notices downloaded");
  };

  return (
    <>
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

        {/* AI Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-notices" className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
            <Sparkles className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))]" />
            AI-drafted notices
          </Label>
          <Switch
            id="ai-notices"
            checked={useAI}
            onCheckedChange={setUseAI}
            className="scale-75"
          />
        </div>
        {useAI && (
          <p className="text-[10px] text-muted-foreground/70">
            First 5 notices use TerraPilot Muse AI drafting; remainder use templates
          </p>
        )}

        {/* Progress */}
        {noticeMutation.isPending && (
          <div className="space-y-1.5">
            <Progress value={progress} className="h-2" />
            <p className="text-[10px] text-muted-foreground text-center">{progress}%</p>
          </div>
        )}

        {/* Success summary */}
        {noticeMutation.isSuccess && noticeMutation.data && (
          <div className="bg-[hsl(var(--tf-optimized-green)/0.1)] rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--tf-optimized-green))]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-medium">{noticeMutation.data.generated} notices generated</span>
            </div>
            {noticeMutation.data.skipped > 0 && (
              <p className="text-[10px] text-muted-foreground">{noticeMutation.data.skipped} skipped</p>
            )}

            {/* Preview & Download */}
            <div className="flex gap-2">
              {noticeMutation.data.notices.length > 0 && (
                <button
                  onClick={() => setPreviewNotice(noticeMutation.data!.notices[0])}
                  className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--tf-transcend-cyan))] hover:underline"
                >
                  <Eye className="w-3 h-3" /> Preview
                </button>
              )}
              <button
                onClick={handleDownloadAll}
                className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--tf-transcend-cyan))] hover:underline"
              >
                <Download className="w-3 h-3" /> Download All
              </button>
            </div>
          </div>
        )}

        <CommitmentButton
          onClick={() => noticeMutation.mutate()}
          disabled={noticeMutation.isPending || !calibrationRunId}
          variant="primary"
        >
          {noticeMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : useAI ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {noticeMutation.isPending ? "Generating…" : useAI ? "AI-Draft Notices" : "Generate Notices"}
        </CommitmentButton>
      </div>

      {/* Notice Preview Dialog */}
      <Dialog open={!!previewNotice} onOpenChange={(open) => !open && setPreviewNotice(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              {previewNotice?.parcelNumber} — {previewNotice?.address}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs whitespace-pre-wrap font-sans text-foreground p-4 bg-muted/30 rounded-lg">
              {previewNotice?.content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Template-based notice fallback (when AI is off or for parcels beyond AI limit) */
function generateTemplateNotice(
  parcel: { parcelNumber: string; address: string },
  adjustment: { previous_value: number; new_value: number },
  neighborhoodCode: string,
  rSquared: number
): string {
  const delta = adjustment.new_value - adjustment.previous_value;
  const direction = delta >= 0 ? "increased" : "decreased";
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return `NOTICE OF ASSESSMENT CHANGE
County Assessor's Office
${date}

Property Owner
${parcel.address}

RE: Change in Assessed Value — Parcel ${parcel.parcelNumber}

Dear Property Owner,

This notice is to inform you that the assessed value of your property located at ${parcel.address} (Parcel Number: ${parcel.parcelNumber}) has been ${direction} for the current tax year.

PREVIOUS ASSESSED VALUE: $${adjustment.previous_value.toLocaleString()}
NEW ASSESSED VALUE: $${adjustment.new_value.toLocaleString()}
CHANGE: $${Math.abs(delta).toLocaleString()} ${direction}

This adjustment was determined through OLS Regression calibration of Neighborhood ${neighborhoodCode} with a model fit of R² = ${(rSquared * 100).toFixed(1)}%.

RIGHT TO APPEAL:
You have the right to appeal this assessment within 30 days of the date of this notice. To file an appeal, please contact the County Assessor's Office or visit our website.

If you have questions regarding this assessment change, please contact our office at the address above.

Sincerely,
County Assessor's Office`;
}

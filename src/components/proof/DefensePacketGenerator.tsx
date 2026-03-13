import { useState } from "react";
import { motion } from "framer-motion";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Shield,
  FileText,
  TrendingUp,
  Receipt,
  Brain,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { useAssessmentHistory, useParcelSales, useComparableSales } from "@/hooks/useParcelDetails";
import { useModelReceipts, useDefenseTraceEvents, useDefenseAppeals } from "@/hooks/useDaisQueries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

type PacketStatus = "idle" | "generating" | "ready" | "error";

export function DefensePacketGenerator() {
  const { parcel, studyPeriod } = useWorkbench();
  const [status, setStatus] = useState<PacketStatus>("idle");
  const [narrative, setNarrative] = useState<string>("");

  const hasParcel = parcel.id !== null;
  const { data: assessments } = useAssessmentHistory(parcel.id);
  const { data: sales } = useParcelSales(parcel.id);
  const { data: comps } = useComparableSales(parcel.id, parcel.neighborhoodCode, parcel.assessedValue);

  // Fetch model receipts for this parcel
  const { data: receipts } = useQuery({
    queryKey: ["model-receipts", parcel.id],
    queryFn: async () => {
      if (!parcel.id) return [];
      const { data, error } = await supabase
        .from("model_receipts")
        .select("*")
        .eq("parcel_id", parcel.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!parcel.id,
  });

  // Fetch trace events for audit trail appendix
  const { data: traceEvents } = useQuery({
    queryKey: ["defense-trace-events", parcel.id],
    queryFn: async () => {
      if (!parcel.id) return [];
      const { data, error } = await supabase
        .from("trace_events")
        .select("*")
        .eq("parcel_id", parcel.id)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
    enabled: !!parcel.id,
  });

  // Fetch appeals for this parcel
  const { data: appeals } = useQuery({
    queryKey: ["defense-appeals", parcel.id],
    queryFn: async () => {
      if (!parcel.id) return [];
      const { data, error } = await supabase
        .from("appeals")
        .select("id, parcel_id, county_id, appeal_date, hearing_date, resolution_date, original_value, requested_value, final_value, tax_year, status, resolution_type, notes, created_at, updated_at")
        .eq("parcel_id", parcel.id)
        .order("appeal_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!parcel.id,
  });

  const handleGenerate = async () => {
    if (!hasParcel) return;
    setStatus("generating");

    try {
      const { data, error } = await supabase.functions.invoke("defense-narrative", {
        body: {
          parcelNumber: parcel.parcelNumber,
          address: parcel.address,
          assessedValue: parcel.assessedValue,
          assessmentHistory: assessments?.slice(0, 5),
          comps: comps?.slice(0, 10)?.map((c: any) => ({
            parcel_number: c.parcels?.parcel_number,
            address: c.parcels?.address,
            sale_price: c.sale_price,
            sale_date: c.sale_date,
            ratio: c.parcels?.assessed_value && c.sale_price
              ? (c.parcels.assessed_value / c.sale_price).toFixed(3)
              : null,
          })),
          ratioStats: {
            studyPeriod: studyPeriod.name,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setNarrative(data.narrative);
      setStatus("ready");
      toast.success("Defense packet narrative generated");
    } catch (err: any) {
      console.error("Defense packet error:", err);
      setStatus("error");
      toast.error(err.message || "Failed to generate defense packet");
    }
  };

  const handleDownload = () => {
    // Build comprehensive appendices
    const appendixA = assessments?.map(a =>
      `| ${a.tax_year} | $${a.land_value?.toLocaleString()} | $${a.improvement_value?.toLocaleString()} | $${a.total_value?.toLocaleString()} | ${a.certified ? "✅" : "⏳"} |`
    ).join("\n") || "No records";

    const appendixB = comps?.slice(0, 10)?.map((c: any) => {
      const ratio = c.parcels?.assessed_value && c.sale_price ? (c.parcels.assessed_value / c.sale_price).toFixed(3) : "N/A";
      return `| ${c.parcels?.parcel_number || "—"} | ${c.parcels?.address || "—"} | $${c.sale_price?.toLocaleString()} | ${new Date(c.sale_date).toLocaleDateString()} | ${ratio} |`;
    }).join("\n") || "No comps";

    const appendixC = receipts?.map(r =>
      `| ${r.model_type} | v${r.model_version} | ${new Date(r.created_at).toLocaleDateString()} | ${r.operator_id?.slice(0, 8)}… |`
    ).join("\n") || "No receipts";

    const appendixD = (traceEvents || []).map(e =>
      `| ${new Date(e.created_at).toLocaleString()} | ${e.source_module} | ${e.event_type} | ${e.artifact_type || "—"} |`
    ).join("\n") || "No trace events";

    const appendixE = (appeals || []).map(a =>
      `| ${new Date(a.appeal_date).toLocaleDateString()} | ${a.status} | $${a.original_value?.toLocaleString()} | $${a.requested_value?.toLocaleString() || "—"} | $${a.final_value?.toLocaleString() || "—"} | ${a.resolution_type || "—"} |`
    ).join("\n") || "No appeals";

    const content = `# Board of Equalization Defense Packet
## Parcel ${parcel.parcelNumber}
### ${parcel.address}
### Generated: ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}
### Study Period: ${studyPeriod.name || "N/A"}

---

${narrative}

---

## Appendix A: Assessment History

| Tax Year | Land Value | Improvement Value | Total Value | Certified |
|----------|-----------|-------------------|-------------|-----------|
${appendixA}

## Appendix B: Comparable Sales Analysis

| Parcel # | Address | Sale Price | Sale Date | ASR Ratio |
|----------|---------|-----------|-----------|-----------|
${appendixB}

## Appendix C: Valuation Model Receipts

| Model Type | Version | Date | Operator |
|-----------|---------|------|----------|
${appendixC}

## Appendix D: TerraTrace Audit Trail

| Timestamp | Module | Event | Artifact |
|-----------|--------|-------|----------|
${appendixD}

## Appendix E: Appeal History

| Appeal Date | Status | Original Value | Requested | Final | Resolution |
|------------|--------|----------------|-----------|-------|------------|
${appendixE}

---

*This defense packet was assembled by TerraFusion OS. All data is sourced from the county's official records and valuation models. The TerraTrace audit trail provides a tamper-evident record of all actions taken on this parcel.*

*Exported: ${new Date().toISOString()}*
`;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boe-defense-${parcel.parcelNumber || "unknown"}-${format(new Date(), "yyyy-MM-dd")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("BOE defense packet downloaded with 5 appendices");
  };

  if (!hasParcel) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground">Select a parcel to generate a defense packet</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-suite-dossier/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-suite-dossier" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">Defense Packet Generator</h3>
            <p className="text-sm text-muted-foreground">
              {parcel.parcelNumber} — {parcel.address}
            </p>
          </div>
        </div>
        {status === "ready" && (
          <Button onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        )}
      </div>

      {/* Components Checklist */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Assessments", count: assessments?.length ?? 0, icon: FileText },
          { label: "Sales History", count: sales?.length ?? 0, icon: TrendingUp },
          { label: "Comparables", count: comps?.length ?? 0, icon: TrendingUp },
          { label: "Model Receipts", count: receipts?.length ?? 0, icon: Receipt },
          { label: "Trace Events", count: traceEvents?.length ?? 0, icon: Shield },
          { label: "Appeals", count: appeals?.length ?? 0, icon: FileText },
        ].map((item) => (
          <Card key={item.label} className="material-bento border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-foreground">{item.count}</span>
                {item.count > 0 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-tf-green" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate Button */}
      {status !== "ready" && (
        <div className="flex justify-center">
          <CommitmentButton
            onClick={handleGenerate}
            disabled={status === "generating"}
            className="gap-2 min-w-[240px]"
          >
            {status === "generating" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Narrative…
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Generate Defense Packet
              </>
            )}
          </CommitmentButton>
        </div>
      )}

      {/* Generated Narrative */}
      {status === "ready" && narrative && (
        <Card className="material-bento border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-suite-dossier" />
              AI-Generated Defense Narrative
              <Badge className="bg-tf-green/20 text-tf-green border-tf-green/30 text-[10px]">Ready</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{narrative}</ReactMarkdown>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {status === "error" && (
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">Failed to generate narrative. Please try again.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setStatus("idle")}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

// TerraFusion OS — Phase 75: Revaluation Notice Generator
// "I generated 4,000 notices and they all said thank you. I'm popular now." — Ralph Wiggum

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail, FileText, TrendingUp, TrendingDown, Minus,
  BarChart3, MapPin, Send, Sparkles,
  AlertTriangle, CheckCircle2, Loader2, Filter,
  ArrowUpRight, ArrowDownRight, Target, Zap,
} from "lucide-react";
import { useRevaluationCycles } from "@/hooks/useRevaluationCycles";
import { useRevalNoticeCandidates, type NoticeCandidate } from "@/hooks/useRevalNoticeCandidates";
import { useCreateBatchNoticeJob } from "@/hooks/useBatchNotices";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────
const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtNum = (v: number) => v.toLocaleString();

function ChangeIndicator({ pct }: { pct: number }) {
  if (pct > 0) return <span className="text-emerald-400 text-[10px] font-mono flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />+{pct.toFixed(1)}%</span>;
  if (pct < 0) return <span className="text-destructive text-[10px] font-mono flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3" />{pct.toFixed(1)}%</span>;
  return <span className="text-muted-foreground text-[10px] font-mono flex items-center gap-0.5"><Minus className="h-3 w-3" />0.0%</span>;
}

// ── Candidate Row ──────────────────────────────────────────────────
function CandidateRow({ c }: { c: NoticeCandidate }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-border/20 bg-card/60 hover:bg-card/80 transition-colors text-xs">
      <div className="col-span-2 font-mono font-semibold">{c.parcel_number}</div>
      <div className="col-span-3 text-muted-foreground truncate">{c.address || "—"}</div>
      <div className="col-span-1 text-center">
        <Badge variant="outline" className="text-[8px]">{c.property_class || "—"}</Badge>
      </div>
      <div className="col-span-2 text-right font-mono">{fmtCurrency(c.prior_value)}</div>
      <div className="col-span-2 text-right font-mono font-semibold">{fmtCurrency(c.current_value)}</div>
      <div className="col-span-2 text-right"><ChangeIndicator pct={c.change_pct} /></div>
    </div>
  );
}

// ── Distribution Summary ───────────────────────────────────────────
function DistributionSummary({ increases, decreases, unchanged, total }: {
  increases: number; decreases: number; unchanged: number; total: number;
}) {
  const pcts = {
    inc: total > 0 ? (increases / total) * 100 : 0,
    dec: total > 0 ? (decreases / total) * 100 : 0,
    unc: total > 0 ? (unchanged / total) * 100 : 0,
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="border-border/40 bg-emerald-500/5">
        <CardContent className="p-3 text-center">
          <TrendingUp className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-lg font-bold font-mono">{fmtNum(increases)}</div>
          <div className="text-[10px] text-muted-foreground">Increases ({pcts.inc.toFixed(1)}%)</div>
        </CardContent>
      </Card>
      <Card className="border-border/40 bg-destructive/5">
        <CardContent className="p-3 text-center">
          <TrendingDown className="h-4 w-4 text-destructive mx-auto mb-1" />
          <div className="text-lg font-bold font-mono">{fmtNum(decreases)}</div>
          <div className="text-[10px] text-muted-foreground">Decreases ({pcts.dec.toFixed(1)}%)</div>
        </CardContent>
      </Card>
      <Card className="border-border/40 bg-muted/10">
        <CardContent className="p-3 text-center">
          <Minus className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-lg font-bold font-mono">{fmtNum(unchanged)}</div>
          <div className="text-[10px] text-muted-foreground">Unchanged ({pcts.unc.toFixed(1)}%)</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
interface RevaluationNoticeGeneratorProps {
  onNavigate?: (target: string) => void;
}

export function RevaluationNoticeGenerator({ onNavigate }: RevaluationNoticeGeneratorProps) {
  const { data: cycles, isLoading: cyclesLoading } = useRevaluationCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [minChangePct, setMinChangePct] = useState(0);
  const [useAI, setUseAI] = useState(true);
  const [aiLimit, setAiLimit] = useState(50);
  const [showConfirm, setShowConfirm] = useState(false);

  const activeCycleId = selectedCycleId
    || cycles?.find(c => c.status === "completed")?.id
    || cycles?.[0]?.id
    || null;

  const { data: summary, isLoading: candidatesLoading } = useRevalNoticeCandidates(activeCycleId, minChangePct);
  const batchMutation = useCreateBatchNoticeJob();

  const isLoading = cyclesLoading || candidatesLoading;
  const candidateCount = summary?.candidates?.length ?? 0;

  const neighborhoods = useMemo(() => {
    if (!summary?.candidates) return [];
    const map = new Map<string, number>();
    for (const c of summary.candidates) {
      map.set(c.neighborhood, (map.get(c.neighborhood) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [summary]);

  const handleGenerate = () => {
    if (!summary?.candidates?.length) return;
    setShowConfirm(true);
  };

  const confirmGenerate = async () => {
    setShowConfirm(false);
    try {
      // Use the first neighborhood or generate for all
      const result = await batchMutation.mutateAsync({
        useAI,
        aiLimit: useAI ? aiLimit : 0,
      });
      toast.success("Notices generated", {
        description: `${result.generated} notices created (${result.aiDrafted} AI-drafted)`,
      });
    } catch (err: any) {
      toast.error("Notice generation failed", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycles || cycles.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-8 text-center">
            <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-1">No Revaluation Cycles</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Complete a revaluation cycle before generating notices.
            </p>
            <Button onClick={() => onNavigate?.("launch-reval")} className="gap-2">
              <Target className="h-4 w-4" /> Launch Revaluation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/15 border border-primary/20">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notice Generator</h1>
            <p className="text-sm text-muted-foreground">
              {summary?.cycle_name || "—"} • TY {summary?.tax_year || "—"} •{" "}
              {candidateCount} candidates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cycles.length > 1 && (
            <div className="flex gap-1">
              {cycles.slice(0, 4).map((c) => (
                <Button
                  key={c.id}
                  variant={c.id === activeCycleId ? "default" : "outline"}
                  size="sm"
                  className="text-[10px] h-7"
                  onClick={() => setSelectedCycleId(c.id)}
                >
                  TY {c.tax_year}
                  {c.status === "completed" && (
                    <CheckCircle2 className="h-3 w-3 ml-1 text-emerald-400" />
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Value Change Distribution */}
      {summary && (
        <DistributionSummary
          increases={summary.increases}
          decreases={summary.decreases}
          unchanged={summary.unchanged}
          total={summary.total_parcels}
        />
      )}

      {/* Average Change */}
      {summary && (
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 text-xs">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-semibold">Average Value Change</span>
              <ChangeIndicator pct={summary.avg_change_pct} />
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">
                {fmtNum(summary.total_parcels)} total certified parcels
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {candidateCount} match current filter
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Panel */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Notice Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Min Change Filter */}
            <div className="space-y-2">
              <Label className="text-xs">Minimum Value Change: {minChangePct}%</Label>
              <Slider
                value={[minChangePct]}
                onValueChange={([v]) => setMinChangePct(v)}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
              <p className="text-[9px] text-muted-foreground">
                Only notify owners with ≥{minChangePct}% change
              </p>
            </div>

            {/* AI Drafting */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={useAI} onCheckedChange={setUseAI} />
                <Label className="text-xs">AI-Drafted Notices</Label>
                <Sparkles className="h-3 w-3 text-amber-400" />
              </div>
              {useAI && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    AI limit: {aiLimit} notices
                  </Label>
                  <Slider
                    value={[aiLimit]}
                    onValueChange={([v]) => setAiLimit(v)}
                    min={10}
                    max={Math.min(candidateCount || 500, 500)}
                    step={10}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Generate Action */}
            <div className="flex flex-col justify-end">
              <Button
                className="gap-2"
                size="lg"
                disabled={candidateCount === 0 || batchMutation.isPending}
                onClick={handleGenerate}
              >
                {batchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Generate {candidateCount} Notices
                  </>
                )}
              </Button>
              <p className="text-[9px] text-muted-foreground mt-1 text-center">
                {useAI ? `${Math.min(aiLimit, candidateCount)} AI-drafted` : "Template-based"} • Draft status
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Neighborhood Breakdown */}
      {neighborhoods.length > 0 && (
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Notices by Neighborhood
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {neighborhoods.map(([nbhd, count]) => (
                <Badge
                  key={nbhd}
                  variant="outline"
                  className="text-[10px] gap-1 py-1"
                >
                  {nbhd}
                  <span className="font-mono font-bold text-primary">{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="opacity-30" />

      {/* Candidate List */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Notice Candidates
          <span className="text-[10px] text-muted-foreground font-normal ml-2">
            Sorted by largest absolute change
          </span>
        </h2>

        {/* Header Row */}
        <div className="grid grid-cols-12 gap-2 px-2.5 py-1.5 text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
          <div className="col-span-2">Parcel</div>
          <div className="col-span-3">Address</div>
          <div className="col-span-1 text-center">Class</div>
          <div className="col-span-2 text-right">Prior Value</div>
          <div className="col-span-2 text-right">New Value</div>
          <div className="col-span-2 text-right">Change</div>
        </div>

        <div className="space-y-1 max-h-96 overflow-y-auto">
          {summary?.candidates?.slice(0, 100).map((c, i) => (
            <motion.div
              key={c.parcel_id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.01 }}
            >
              <CandidateRow c={c} />
            </motion.div>
          ))}
          {(summary?.candidates?.length ?? 0) > 100 && (
            <div className="text-center py-3 text-[10px] text-muted-foreground">
              Showing 100 of {candidateCount} candidates
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Navigate:</span>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("notices")}>
              <Mail className="h-3 w-3" /> Batch Notices
            </Button>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("reval-report")}>
              <BarChart3 className="h-3 w-3" /> Reval Report
            </Button>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("reval-progress")}>
              <Zap className="h-3 w-3" /> Progress Tracker
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Generate Assessment Notices?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will create <strong>{candidateCount}</strong> assessment change notices
                for TY {summary?.tax_year} in <strong>Draft</strong> status.
              </p>
              {useAI && (
                <p className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <strong>{Math.min(aiLimit, candidateCount)}</strong> will be AI-drafted
                  with personalized language.
                </p>
              )}
              <p className="text-amber-400 flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Notices must be reviewed and approved before sending.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate} className="gap-1">
              <Send className="h-4 w-4" />
              Generate Notices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

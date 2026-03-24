/**
 * TerraFusion OS — Phase 116: Data Quality Remediation Progress Tracker
 * Constitutional owner: TerraDais (operational monitoring)
 *
 * Displays remediation batch history with quality score deltas,
 * fix counts, and rollback status for the DQ pipeline.
 */

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Wrench,
  TrendingUp,
  Undo2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  BarChart3,
  Download,
  Tag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export function DQRemediationProgressTracker() {
  // Fetch remediation batches
  const { data: batches, isLoading } = useQuery({
    queryKey: ["dq-remediation-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dq_remediation_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest verification snapshot for quality trend
  const { data: snapshots } = useQuery({
    queryKey: ["dq-verification-snapshots-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dq_verification_snapshots")
        .select("quality_score, passed_all_gates, created_at, snapshot_type")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch issue category breakdown
  const { data: issueCategories } = useQuery({
    queryKey: ["dq-issue-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dq_issue_registry")
        .select("issue_type, status, is_hard_blocker")
        .limit(5000);
      if (error) throw error;
      const cats = new Map<string, { total: number; open: number; resolved: number; blockers: number }>();
      for (const row of data || []) {
        const cat = row.issue_type || "uncategorized";
        if (!cats.has(cat)) cats.set(cat, { total: 0, open: 0, resolved: 0, blockers: 0 });
        const c = cats.get(cat)!;
        c.total++;
        if (row.status === "open") c.open++;
        else c.resolved++;
        if (row.is_hard_blocker) c.blockers++;
      }
      return Array.from(cats.entries()).map(([name, counts]) => ({ name, ...counts })).sort((a, b) => b.open - a.open);
    },
    staleTime: 60_000,
  });

  const totalFixed = batches?.reduce((s, b) => s + (b.applied_count || 0), 0) ?? 0;
  const totalRejected = batches?.reduce((s, b) => s + (b.rejected_count || 0), 0) ?? 0;
  const totalRolledBack = batches?.reduce((s, b) => s + (b.rolled_back_count || 0), 0) ?? 0;
  const latestScore = snapshots?.[0]?.quality_score ?? null;

  const STATUS_STYLES: Record<string, string> = {
    applied: "bg-tf-green/20 text-tf-green border-tf-green/30",
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    rolled_back: "bg-destructive/20 text-destructive border-destructive/30",
    reviewing: "bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30",
  };

  const handleExportReport = () => {
    const lines = [
      "DQ Remediation Report",
      `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
      "",
      "Summary",
      `Fixes Applied,${totalFixed}`,
      `Rejected,${totalRejected}`,
      `Rolled Back,${totalRolledBack}`,
      `Quality Score,${latestScore ?? "N/A"}%`,
      "",
      "Issue Categories",
      "Category,Total,Open,Resolved,Blockers",
      ...(issueCategories || []).map(c => `${c.name},${c.total},${c.open},${c.resolved},${c.blockers}`),
      "",
      "Batches",
      "Name,Status,Tier,Applied,Rejected,Rolled Back,Date",
      ...(batches || []).map(b => `${b.batch_name},${b.status},${b.fix_tier},${b.applied_count},${b.rejected_count},${b.rolled_back_count},${format(new Date(b.created_at), "yyyy-MM-dd")}`),
    ];
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dq-remediation-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Remediation report exported");
  };

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Fixes Applied", value: totalFixed, icon: CheckCircle, color: "text-tf-green" },
          { label: "Rejected", value: totalRejected, icon: XCircle, color: "text-destructive" },
          { label: "Rolled Back", value: totalRolledBack, icon: Undo2, color: "text-amber-400" },
          { label: "Quality Score", value: latestScore !== null ? `${latestScore}%` : "—", icon: BarChart3, color: "text-tf-cyan" },
        ].map((m) => (
          <Card key={m.label} className="material-bento border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className={cn("w-3.5 h-3.5", m.color)} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <span className={cn("text-lg font-medium", m.color)}>{m.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quality trend sparkline (simple) */}
      {snapshots && snapshots.length > 1 && (
        <Card className="material-bento border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-tf-cyan" />
              <span className="text-xs font-medium text-foreground">Quality Score Trend</span>
            </div>
            <div className="flex items-end gap-1 h-12">
              {[...snapshots].reverse().map((s, i) => {
                const score = s.quality_score ?? 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full rounded-sm transition-all",
                        score >= 80 ? "bg-tf-green" : score >= 60 ? "bg-amber-400" : "bg-destructive"
                      )}
                      style={{ height: `${Math.max(score * 0.48, 4)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{score}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch list */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-tf-cyan" />
              Remediation Batches
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleExportReport}>
              <Download className="w-3 h-3" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !batches?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No remediation batches yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-2">
                {batches.map((b, idx) => {
                  const total = b.total_fixes || 1;
                  const appliedPct = Math.round((b.applied_count / total) * 100);
                  const scoreDelta =
                    b.quality_score_after != null && b.quality_score_before != null
                      ? b.quality_score_after - b.quality_score_before
                      : null;

                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="border border-border/30 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                            {b.batch_name}
                          </span>
                          <Badge className={cn("text-[10px]", STATUS_STYLES[b.status] || STATUS_STYLES.pending)}>
                            {b.status}
                          </Badge>
                          <Badge className="text-[10px] bg-muted text-muted-foreground border-muted">
                            {b.fix_tier}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(b.created_at), "MMM d, yyyy")}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{b.applied_count}/{b.total_fixes} applied</span>
                        {b.rejected_count > 0 && <span className="text-destructive">{b.rejected_count} rejected</span>}
                        {b.rolled_back_count > 0 && (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Undo2 className="w-3 h-3" /> {b.rolled_back_count} rolled back
                          </span>
                        )}
                        {scoreDelta !== null && (
                          <span className={scoreDelta >= 0 ? "text-tf-green" : "text-destructive"}>
                            {scoreDelta >= 0 ? "+" : ""}{scoreDelta.toFixed(1)}% quality
                          </span>
                        )}
                      </div>

                      <Progress value={appliedPct} className="h-1.5" />
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Issue Category Breakdown */}
      {issueCategories && issueCategories.length > 0 && (
        <Card className="material-bento border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              Issue Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {issueCategories.map((cat) => {
                const resolvedPct = cat.total > 0 ? Math.round((cat.resolved / cat.total) * 100) : 0;
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground capitalize">{cat.name.replace(/_/g, " ")}</span>
                        {cat.blockers > 0 && (
                          <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                            {cat.blockers} blockers
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground">{cat.resolved}/{cat.total} resolved</span>
                    </div>
                    <Progress value={resolvedPct} className="h-1" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

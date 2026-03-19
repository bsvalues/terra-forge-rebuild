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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-tf-cyan" />
            Remediation Batches
          </CardTitle>
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
    </div>
  );
}

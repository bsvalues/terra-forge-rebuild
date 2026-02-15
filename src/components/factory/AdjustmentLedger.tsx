// TerraFusion OS — Adjustment Ledger Panel
// Shows batch adjustment history with rollback support

import { motion } from "framer-motion";
import { useRecentBatchAdjustments, useRollbackBatch } from "@/hooks/useValueAdjustments";
import { Badge } from "@/components/ui/badge";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { BookOpen, Undo2, Loader2, CheckCircle2 } from "lucide-react";

export function AdjustmentLedger() {
  const { data: batches, isLoading } = useRecentBatchAdjustments();
  const rollback = useRollbackBatch();

  const fmt = (v: string) =>
    new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="material-bento p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-[hsl(var(--suite-forge))]" />
        <h3 className="text-sm font-medium text-foreground">Adjustment Ledger</h3>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {batches?.length ?? 0} batches
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !batches || batches.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No batch adjustments yet. Run a calibration and apply to parcels.
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {batches.map((batch) => (
            <motion.div
              key={batch.calibration_run_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--tf-elevated)/0.5)] border border-border/20 group"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-[hsl(var(--suite-forge)/0.2)] text-[hsl(var(--suite-forge))] border-[hsl(var(--suite-forge)/0.3)]">
                    {batch.adjustment_type}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">{batch.count} parcels</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {batch.adjustment_reason || "Batch calibration"}
                </p>
                <p className="text-[10px] text-muted-foreground/60">{fmt(batch.applied_at)}</p>
              </div>

              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-7 px-2.5 text-[10px] rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex items-center gap-1"
                onClick={() => rollback.mutate(batch.calibration_run_id)}
                disabled={rollback.isPending}
              >
                {rollback.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Undo2 className="w-3 h-3" />
                )}
                Rollback
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

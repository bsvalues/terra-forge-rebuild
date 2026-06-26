// TerraFusion OS — Recent Batches Panel
// Shows batch adjustment history with one-click rollback (the paste is strong with this one)

import { useState } from "react";
import { useRecentBatchAdjustments, useRollbackBatch } from "@/hooks/useValueAdjustments";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { BookOpen, Undo2, Loader2 } from "lucide-react";

export function RecentBatchesPanel() {
  const { data: batches, isLoading } = useRecentBatchAdjustments();
  const rollbackMutation = useRollbackBatch();
  const [confirmRollback, setConfirmRollback] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="material-bento p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!batches || batches.length === 0) return null;

  const fmt = (v: string) =>
    new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="material-bento p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[hsl(var(--suite-forge))]" />
          Recent Batches
        </h3>

        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {batches.slice(0, 8).map((batch) => (
            <div
              key={batch.calibration_run_id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[hsl(var(--tf-elevated)/0.5)] border border-border/20"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {batch.adjustment_type}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {batch.count} parcels
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {fmt(batch.applied_at)}
                  {batch.adjustment_reason && ` · ${batch.adjustment_reason.slice(0, 40)}`}
                </p>
              </div>

              {/* Rollback button — hold-to-commit because this is irreversible (like eating paste) */}
              <button
                onClick={() => setConfirmRollback(batch.calibration_run_id)}
                disabled={rollbackMutation.isPending}
                className="h-7 px-2 rounded-md text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Undo2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rollback Confirmation Dialog — because Agent Traffic Cop said we need human-in-the-loop */}
      <AlertDialog open={!!confirmRollback} onOpenChange={(open) => !open && setConfirmRollback(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Batch Adjustments?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all affected parcels to their <strong>previous assessed values</strong> and mark the adjustments as rolled back in the ledger. This action is recorded in TerraTrace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRollback) {
                  rollbackMutation.mutate(confirmRollback);
                  setConfirmRollback(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rollbackMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Undo2 className="w-4 h-4 mr-2" />
              )}
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

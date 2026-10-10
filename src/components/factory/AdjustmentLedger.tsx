// TerraForge adjustment history: read states stay distinct and actions never depend on hover.
import { useRecentBatchAdjustments, useRollbackBatch } from "@/hooks/useValueAdjustments";
import { Button } from "@/components/ui/button";
import { Undo2, Loader2 } from "lucide-react";

export function AdjustmentLedger() {
  const { data: batches, isLoading, isError, refetch } = useRecentBatchAdjustments();
  const rollback = useRollbackBatch();
  const fmt = (value: string) => new Date(value).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <section className="module-section space-y-3" aria-labelledby="factory-ledger-title">
      <div className="module-toolbar">
        <h3 id="factory-ledger-title" className="text-sm font-medium">Adjustment Ledger</h3>
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Loading batches…" : isError ? "Unavailable" : `${batches?.length ?? 0} loaded batches`}
        </span>
      </div>
      {isLoading ? (
        <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading adjustment history…
        </p>
      ) : isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 py-6">
          <p className="text-sm text-muted-foreground">Adjustment history could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : !batches?.length ? (
        <p className="py-6 text-sm text-muted-foreground">No active batches in the loaded adjustment history.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Recent history sample; parcel counts reflect loaded adjustment records.</p>
          <div className="module-records max-h-[400px]" role="region" aria-label="Recent adjustment batches" tabIndex={0}>
            {batches.map((batch) => (
              <div key={batch.calibration_run_id} className="module-ledger-row">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium">{batch.adjustment_type}</span>
                    <span className="text-muted-foreground">{batch.count} loaded adjustments</span>
                  </div>
                  <p className="break-words text-xs text-muted-foreground">{batch.adjustment_reason || "Batch calibration"}</p>
                  <time className="text-xs text-muted-foreground" dateTime={batch.applied_at}>{fmt(batch.applied_at)}</time>
                </div>
                <Button variant="outline" size="sm"
                  aria-label={`Rollback ${batch.adjustment_type} batch from ${fmt(batch.applied_at)}`}
                  onClick={() => rollback.mutate(batch.calibration_run_id)} disabled={rollback.isPending}>
                  {rollback.isPending && rollback.variables === batch.calibration_run_id
                    ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  Rollback
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

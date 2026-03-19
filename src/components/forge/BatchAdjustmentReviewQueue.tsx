// TerraFusion OS — Phase 113: Batch Value Adjustment Review Queue
// Displays recent calibration batch adjustments with rollback capability.

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Undo2,
  BarChart3,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { useRecentBatchAdjustments, useRollbackBatch } from "@/hooks/useValueAdjustments";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function BatchAdjustmentReviewQueue() {
  const { data: batches = [], isLoading } = useRecentBatchAdjustments();
  const rollbackMutation = useRollbackBatch();

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-suite-forge" />
            Batch Adjustment Queue
            <Badge variant="outline" className="text-[9px] ml-1">
              {batches.length} active
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading adjustments…</span>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No active batch adjustments</p>
          </div>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="space-y-2">
              {batches.map((batch, i) => (
                <motion.div
                  key={batch.calibration_run_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-lg border border-border/30 p-3 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-3.5 h-3.5 text-suite-forge shrink-0" />
                        <span className="text-xs font-medium text-foreground">
                          {batch.adjustment_type.replace(/_/g, " ")}
                        </span>
                        <Badge variant="outline" className="text-[9px] bg-suite-forge/10 text-suite-forge border-suite-forge/20">
                          {batch.count} parcels
                        </Badge>
                      </div>

                      {batch.adjustment_reason && (
                        <p className="text-[10px] text-muted-foreground truncate pl-5 mb-1">
                          {batch.adjustment_reason}
                        </p>
                      )}

                      <div className="flex items-center gap-3 pl-5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(batch.applied_at), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {batch.applied_by.slice(0, 8)}…
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => rollbackMutation.mutate(batch.calibration_run_id)}
                      disabled={rollbackMutation.isPending}
                    >
                      {rollbackMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Undo2 className="w-3 h-3" />
                      )}
                      Rollback
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Warning footer */}
        {batches.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 text-[10px] text-chart-4">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Rollback restores previous assessed values and marks adjustments as reversed.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// TerraFusion OS — Phase 113: Batch Value Adjustment Review Queue
// Displays recent calibration batch adjustments with rollback capability.

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Undo2,
  BarChart3,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronDown,
  Check,
} from "lucide-react";
import { useRecentBatchAdjustments, useRollbackBatch, useCalibrationAdjustments } from "@/hooks/useValueAdjustments";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function BatchDetail({ calibrationRunId }: { calibrationRunId: string }) {
  const { data: adjustments = [], isLoading } = useCalibrationAdjustments(calibrationRunId);
  if (isLoading) return <div className="flex justify-center py-2"><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /></div>;
  if (adjustments.length === 0) return <div className="text-[10px] text-muted-foreground py-1">No detail records</div>;
  return (
    <div className="space-y-1 max-h-[120px] overflow-y-auto">
      {adjustments.slice(0, 20).map((a) => (
        <div key={a.id} className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span className="font-mono">{a.parcel_id.slice(0, 8)}…</span>
          <span>${a.previous_value.toLocaleString()} → ${a.new_value.toLocaleString()}</span>
          <span className={a.new_value > a.previous_value ? "text-tf-green" : "text-destructive"}>
            {a.new_value > a.previous_value ? "+" : ""}{((a.new_value - a.previous_value) / a.previous_value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
      {adjustments.length > 20 && <div className="text-[10px] text-muted-foreground text-center">…and {adjustments.length - 20} more</div>}
    </div>
  );
}

export function BatchAdjustmentReviewQueue() {
  const { data: batches = [], isLoading } = useRecentBatchAdjustments();
  const rollbackMutation = useRollbackBatch();
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const adjustmentTypes = useMemo(() => {
    const types = new Set(batches.map(b => b.adjustment_type));
    return Array.from(types).sort();
  }, [batches]);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return batches;
    return batches.filter(b => b.adjustment_type === typeFilter);
  }, [batches, typeFilter]);

  const handleApprove = (batchId: string) => {
    toast.success(`Batch ${batchId.slice(0, 8)}… marked as reviewed`);
  };

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-suite-forge" />
            Batch Adjustment Queue
            <Badge variant="outline" className="text-[9px] ml-1">
              {filtered.length} active
            </Badge>
          </CardTitle>
          {adjustmentTypes.length > 1 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-7 w-[140px] text-[10px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {adjustmentTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
              {filtered.map((batch, i) => (
                <motion.div
                  key={batch.calibration_run_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-lg border border-border/30 p-3 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedBatch(expandedBatch === batch.calibration_run_id ? null : batch.calibration_run_id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-3.5 h-3.5 text-suite-forge shrink-0" />
                        <span className="text-xs font-medium text-foreground">
                          {batch.adjustment_type.replace(/_/g, " ")}
                        </span>
                        <Badge variant="outline" className="text-[9px] bg-suite-forge/10 text-suite-forge border-suite-forge/20">
                          {batch.count} parcels
                        </Badge>
                        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", expandedBatch === batch.calibration_run_id && "rotate-180")} />
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

                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1 text-tf-green border-tf-green/30 hover:bg-tf-green/10"
                        onClick={() => handleApprove(batch.calibration_run_id)}
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </Button>
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
                  </div>

                  <AnimatePresence>
                    {expandedBatch === batch.calibration_run_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-border/20">
                          <BatchDetail calibrationRunId={batch.calibration_run_id} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

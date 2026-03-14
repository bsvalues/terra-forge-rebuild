// TerraFusion OS — Phase 27: Batch Cost Apply Panel

import { useState, useMemo } from "react";
import { useCostSchedules, useDepreciationRows } from "@/hooks/useCostSchedule";
import { useBatchCostApply, useSaveCostRun, useCostApproachRuns, type BatchCostResult } from "@/hooks/useCostBatchApply";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Save, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { ProvenanceNumber } from "@/components/trust";

interface BatchCostApplyPanelProps {
  neighborhoodCode: string | null;
}

export function BatchCostApplyPanel({ neighborhoodCode }: BatchCostApplyPanelProps) {
  const { data: schedules = [] } = useCostSchedules();
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const { data: depRows = [] } = useDepreciationRows(selectedScheduleId);
  const batchApply = useBatchCostApply();
  const saveCostRun = useSaveCostRun();
  const { data: recentRuns = [] } = useCostApproachRuns(neighborhoodCode);

  const [results, setResults] = useState<BatchCostResult[] | null>(null);
  const [stats, setStats] = useState<{ median: number | null; cod: number | null; mean: number | null; matched: number; processed: number } | null>(null);

  const handleRun = () => {
    if (!neighborhoodCode || !selectedScheduleId) return;
    batchApply.mutate(
      { neighborhoodCode, schedules, depreciationRows: depRows },
      {
        onSuccess: (data) => {
          setResults(data.results);
          setStats(data.stats);
        },
      }
    );
  };

  const handleSave = () => {
    if (!neighborhoodCode || !selectedScheduleId || !stats) return;
    saveCostRun.mutate({ neighborhoodCode, scheduleId: selectedScheduleId, stats });
  };

  const ratioVerdict = (ratio: number | null) => {
    if (!ratio) return null;
    if (ratio >= 0.95 && ratio <= 1.05) return "pass";
    if (ratio >= 0.90 && ratio <= 1.10) return "warn";
    return "fail";
  };

  if (!neighborhoodCode) {
    return (
      <div className="material-bento p-6 text-center">
        <p className="text-sm text-muted-foreground">Select a neighborhood to run batch cost approach</p>
      </div>
    );
  }

  return (
    <div className="material-bento overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Batch Cost Apply</h3>
            <p className="text-xs text-muted-foreground">
              Apply cost approach to all parcels in <span className="text-foreground font-medium">{neighborhoodCode}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <Button size="sm" variant="outline" onClick={handleSave} className="h-7 text-xs gap-1">
                <Save className="w-3 h-3" /> Save Run
              </Button>
            )}
            <CommitmentButton
              onClick={handleRun}
              disabled={!selectedScheduleId || batchApply.isPending}
              className="h-7 text-xs gap-1"
            >
              <Play className="w-3 h-3" />
              {batchApply.isPending ? "Running…" : "Run Batch"}
            </CommitmentButton>
          </div>
        </div>

        <Select value={selectedScheduleId ?? ""} onValueChange={(v) => setSelectedScheduleId(v || null)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select cost schedule…" />
          </SelectTrigger>
          <SelectContent>
            {schedules.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.property_class} — {s.quality_grade} (${s.base_cost_per_sqft}/sqft)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-px bg-border">
          <StatCell label="Parcels" value={stats.processed.toString()} />
          <StatCell label="With Sales" value={stats.matched.toString()} />
        <StatCell
            label="Median Ratio"
            value={stats.median ? (
              <ProvenanceNumber source="cost-approach">{stats.median.toFixed(3)}</ProvenanceNumber>
            ) : "—"}
          />
          <StatCell
            label="COD"
            value={stats.cod ? (
              <ProvenanceNumber source="cost-approach">{stats.cod.toFixed(1)}%</ProvenanceNumber>
            ) : "—"}
          />
        </div>
      )}

      {/* Result Table */}
      {results && results.length > 0 && (
        <div className="max-h-[360px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs sticky top-0 bg-background">Parcel</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">RCN</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">Cost Value</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">Sale Price</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">Ratio</TableHead>
                <TableHead className="text-xs sticky top-0 bg-background w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.slice(0, 100).map((r) => {
                const v = ratioVerdict(r.ratio);
                return (
                  <TableRow key={r.parcelId}>
                    <TableCell className="font-mono text-xs">{r.parcelNumber}</TableCell>
                    <TableCell className="text-right font-mono text-xs">${r.rcnew.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-mono text-xs">${r.costValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {r.salePrice ? `$${r.salePrice.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {r.ratio ? r.ratio.toFixed(3) : "—"}
                    </TableCell>
                    <TableCell>
                      {v === "pass" && <CheckCircle className="w-3 h-3 text-primary" />}
                      {v === "warn" && <AlertTriangle className="w-3 h-3 text-accent-foreground" />}
                      {v === "fail" && <AlertTriangle className="w-3 h-3 text-destructive" />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div className="p-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Runs</h4>
          <div className="space-y-1.5">
            {recentRuns.slice(0, 5).map((run) => (
              <div key={run.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[hsl(var(--tf-elevated)/0.5)]">
                <span className="text-muted-foreground">{new Date(run.created_at).toLocaleDateString()}</span>
                <span className="font-mono">{run.parcels_processed} parcels</span>
                <span className="font-mono">{run.median_ratio ? `${run.median_ratio.toFixed(3)}` : "—"}</span>
                <Badge variant="outline" className="text-[10px]">{run.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-background p-3 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <div className="text-sm font-mono text-foreground mt-0.5">{value}</div>
    </div>
  );
}

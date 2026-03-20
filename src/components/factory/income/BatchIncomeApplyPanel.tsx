// TerraFusion OS — Phase 28: Batch Income Apply Panel

import { useState } from "react";
import { useBatchIncomeApply, useSaveIncomeRun, useIncomeApproachRuns, type BatchIncomeResult } from "@/hooks/useIncomeApproach";
import { Button } from "@/components/ui/button";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProvenanceNumber } from "@/components/trust";
import { Play, Save, CheckCircle, AlertTriangle } from "lucide-react";

interface BatchIncomeApplyPanelProps {
  neighborhoodCode: string | null;
}

export function BatchIncomeApplyPanel({ neighborhoodCode }: BatchIncomeApplyPanelProps) {
  const batchApply = useBatchIncomeApply();
  const saveRun = useSaveIncomeRun();
  const { data: recentRuns = [] } = useIncomeApproachRuns(neighborhoodCode);

  const [defaults, setDefaults] = useState({ capRate: 0.08, grm: 10 });
  const [results, setResults] = useState<BatchIncomeResult[] | null>(null);
  const [stats, setStats] = useState<{
    processed: number;
    withIncome: number;
    medianCapRate: number | null;
    medianGrm: number | null;
    medianRatio: number | null;
    cod: number | null;
  } | null>(null);

  const handleRun = () => {
    if (!neighborhoodCode) return;
    batchApply.mutate(
      { neighborhoodCode, defaultCapRate: defaults.capRate, defaultGrm: defaults.grm },
      {
        onSuccess: (data) => {
          setResults(data.results);
          setStats(data.stats);
        },
      }
    );
  };

  const handleSave = () => {
    if (!neighborhoodCode || !stats) return;
    saveRun.mutate({ neighborhoodCode, stats });
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
        <p className="text-sm text-muted-foreground">Select a neighborhood to run batch income approach</p>
      </div>
    );
  }

  return (
    <div className="material-bento overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Batch Income Apply</h3>
            <p className="text-xs text-muted-foreground">
              Apply income approach to parcels in <span className="text-foreground font-medium">{neighborhoodCode}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <Button size="sm" variant="outline" onClick={handleSave} className="h-7 text-xs gap-1">
                <Save className="w-3 h-3" /> Save Run
              </Button>
            )}
            <CommitmentButton onClick={handleRun} disabled={batchApply.isPending} className="h-7 text-xs gap-1">
              <Play className="w-3 h-3" />
              {batchApply.isPending ? "Running…" : "Run Batch"}
            </CommitmentButton>
          </div>
        </div>

        {/* Default parameters */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Default Cap Rate</Label>
            <Input type="number" step="0.005" value={defaults.capRate} onChange={(e) => setDefaults((p) => ({ ...p, capRate: +e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Default GRM</Label>
            <Input type="number" step="0.5" value={defaults.grm} onChange={(e) => setDefaults((p) => ({ ...p, grm: +e.target.value }))} className="h-8 text-sm" />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-5 gap-px bg-border">
          <StatCell label="Parcels" value={stats.processed.toString()} />
          <StatCell label="Med. Cap Rate" value={stats.medianCapRate ? <ProvenanceNumber source="income-approach">{(stats.medianCapRate * 100).toFixed(1)}%</ProvenanceNumber> : "—"} />
          <StatCell label="Med. GRM" value={stats.medianGrm ? <ProvenanceNumber source="income-approach">{stats.medianGrm.toFixed(1)}</ProvenanceNumber> : "—"} />
          <StatCell label="Med. Ratio" value={stats.medianRatio ? <ProvenanceNumber source="income-approach">{stats.medianRatio.toFixed(3)}</ProvenanceNumber> : "—"} />
          <StatCell label="COD" value={stats.cod ? <ProvenanceNumber source="income-approach">{stats.cod.toFixed(1)}%</ProvenanceNumber> : "—"} />
        </div>
      )}

      {/* Results Table */}
      {results && results.length > 0 && (
        <div className="max-h-[320px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs sticky top-0 bg-background">Parcel</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">NOI</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">Cap Value</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">GRM Value</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">Reconciled</TableHead>
                <TableHead className="text-xs text-right sticky top-0 bg-background">Ratio</TableHead>
                <TableHead className="text-xs sticky top-0 bg-background w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.slice(0, 80).map((r) => {
                const v = ratioVerdict(r.ratio);
                return (
                  <TableRow key={r.parcelId}>
                    <TableCell className="font-mono text-xs">{r.parcelNumber}</TableCell>
                    <TableCell className="text-right font-mono text-xs">${r.noi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.capRateValue ? `$${r.capRateValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.grmValue ? `$${r.grmValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{r.reconciledValue ? `$${r.reconciledValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.ratio ? r.ratio.toFixed(3) : "—"}</TableCell>
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

      {results && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">No parcels with income data in this neighborhood</p>
      )}

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div className="p-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Runs</h4>
          <div className="space-y-1.5">
            {recentRuns.slice(0, 5).map((run) => (
              <div key={run.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[hsl(var(--tf-elevated)/0.5)]">
                <span className="text-muted-foreground">{new Date(run.created_at).toLocaleDateString()}</span>
                <span className="font-mono">{run.parcels_with_income} parcels</span>
                <span className="font-mono">{run.median_cap_rate ? `${(run.median_cap_rate * 100).toFixed(1)}%` : "—"}</span>
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

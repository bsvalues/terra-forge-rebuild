import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModuleHeader } from "@/components/layout/ModuleHeader";
// TerraFusion OS — Phase 56: Model Registry Panel
// Unified view of all valuation model runs across approaches

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useModelRegistry, computeModelStats } from "@/hooks/useModelRegistry";
import { Search, ExternalLink } from "lucide-react";

const APPROACH_COLORS: Record<string, string> = {
  Regression: "bg-suite-forge/10 text-suite-forge border-suite-forge/20",
  AVM: "bg-primary/10 text-primary border-primary/20",
  Cost: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  Income: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const STATUS_VARIANT: Record<string, string> = {
  completed: "bg-chart-5/10 text-chart-5",
  draft: "bg-muted text-muted-foreground",
  running: "bg-chart-4/10 text-chart-4",
  failed: "bg-destructive/10 text-destructive",
};

function formatMetric(v: number | null, decimals = 3): string {
  if (v === null) return "—";
  return v.toFixed(decimals);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export function ModelRegistryPanel() {
  const navigate = useNavigate();
  const { data: runs, isLoading, error } = useModelRegistry();
  const [search, setSearch] = useState("");
  const [approachFilter, setApproachFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!runs) return [];
    let result = runs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.neighborhood.toLowerCase().includes(q) ||
          r.modelType.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    if (approachFilter) {
      result = result.filter((r) => r.approachLabel === approachFilter);
    }
    return result;
  }, [runs, search, approachFilter]);

  const stats = useMemo(() => computeModelStats(runs ?? []), [runs]);
  const approaches = ["Regression", "AVM", "Cost", "Income"];

  return (
    <div className="module-page space-y-5">
      <ModuleHeader title="Valuation run records" icon={ExternalLink} actions={<Button variant="outline" onClick={() => navigate("/factory/calibration")}>Open valuation tools</Button>} />
      {error && <p className="text-sm text-destructive">Valuation run records unavailable</p>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search neighborhood, model type…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm"
            variant={approachFilter === null ? "secondary" : "ghost"}
            className="cursor-pointer text-xs"
            onClick={() => setApproachFilter(null)}
          >
            All ({stats.totalRuns})
          </Button>
          {approaches.map((a) => (
            <Button size="sm"
              key={a}
              variant={approachFilter === a ? "secondary" : "ghost"}
              className={`cursor-pointer text-xs ${approachFilter !== a ? APPROACH_COLORS[a] : ""}`}
              onClick={() => setApproachFilter(approachFilter === a ? null : a)}
            >
              {a} ({stats.byApproach[a] ?? 0})
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Approach</TableHead>
                  <TableHead className="text-xs">Model Type</TableHead>
                  <TableHead className="text-xs">Neighborhood</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Sample</TableHead>
                  <TableHead className="text-xs text-right">R²</TableHead>
                  <TableHead className="text-xs text-right">RMSE</TableHead>
                  <TableHead className="text-xs text-right">COD</TableHead>
                  <TableHead className="text-xs text-right">Median Ratio</TableHead>
                  <TableHead className="text-xs text-right">Date</TableHead><TableHead className="text-xs">Work</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                      No model runs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, 100).map((r) => (
                    <TableRow key={`${r.approach}-${r.id}`}>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${APPROACH_COLORS[r.approachLabel]}`}>
                          {r.approachLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[160px] truncate">
                        {r.modelType}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.neighborhood}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_VARIANT[r.status] ?? STATUS_VARIANT.draft}`}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {r.sampleSize?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatMetric(r.rSquared)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatMetric(r.rmse, 0)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatMetric(r.cod, 1)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatMetric(r.medianRatio)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </TableCell>
                      <TableCell><Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(`/factory/${r.approachLabel === "AVM" ? "avm" : "calibration"}?mode=${({Cost:"cost",Income:"income"} as Record<string,string>)[r.approachLabel] ?? "regression"}${r.neighborhood && r.neighborhood !== "—" ? `&neighborhood=${encodeURIComponent(r.neighborhood)}` : ""}`)}>Open tools<ExternalLink className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 100 && (
            <div className="p-2 text-center text-xs text-muted-foreground border-t border-border/50">
              Showing 100 of {filtered.length} runs
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

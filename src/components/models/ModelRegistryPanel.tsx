// TerraFusion OS — Phase 56: Model Registry Panel
// Unified view of all valuation model runs across approaches

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useModelRegistry, computeModelStats } from "@/hooks/useModelRegistry";
import { Search, Activity, TrendingUp, BarChart3, Layers } from "lucide-react";

const APPROACH_COLORS: Record<string, string> = {
  Regression: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  AVM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Cost: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Income: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const STATUS_VARIANT: Record<string, string> = {
  completed: "bg-green-500/10 text-green-600",
  draft: "bg-muted text-muted-foreground",
  running: "bg-amber-500/10 text-amber-600",
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
  const { data: runs, isLoading } = useModelRegistry();
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
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-[hsl(var(--tf-transcend-cyan))] tracking-tight">
          Model Registry
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unified inventory of all valuation model runs — regression, AVM, cost, and income approaches
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-semibold text-foreground">{stats.totalRuns}</p>
            <p className="text-[11px] text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <Layers className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-semibold text-foreground">
              {Object.keys(stats.byApproach).length}
            </p>
            <p className="text-[11px] text-muted-foreground">Approaches</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-semibold text-foreground">
              {formatMetric(stats.avgRSquared)}
            </p>
            <p className="text-[11px] text-muted-foreground">Avg R²</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <BarChart3 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-semibold text-foreground">
              {formatMetric(stats.avgCod, 1)}
            </p>
            <p className="text-[11px] text-muted-foreground">Avg COD</p>
          </CardContent>
        </Card>
      </div>

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
        <div className="flex gap-1.5">
          <Badge
            variant={approachFilter === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setApproachFilter(null)}
          >
            All ({stats.totalRuns})
          </Badge>
          {approaches.map((a) => (
            <Badge
              key={a}
              variant={approachFilter === a ? "default" : "outline"}
              className={`cursor-pointer text-xs ${approachFilter !== a ? APPROACH_COLORS[a] : ""}`}
              onClick={() => setApproachFilter(approachFilter === a ? null : a)}
            >
              {a} ({stats.byApproach[a] ?? 0})
            </Badge>
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
                  <TableHead className="text-xs text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
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

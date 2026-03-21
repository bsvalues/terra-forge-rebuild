// TerraFusion OS — Phase 87.2: Cost Approach Runner
// Execute cost approach for a neighborhood: matched parcels, mean/median ratio, COD.
// Compare cost vs. sales comparison results side-by-side.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Play, BarChart3, ArrowUpDown, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface NeighborhoodOption {
  code: string;
  count: number;
}

interface CostRunResult {
  neighborhood_code: string;
  parcel_count: number;
  cost_median_ratio: number | null;
  cost_mean_ratio: number | null;
  cost_cod: number | null;
  sales_median_ratio: number | null;
  sales_mean_ratio: number | null;
  sales_cod: number | null;
  run_at: string;
}

function formatNum(n: number | null, decimals = 3) {
  return n !== null ? n.toFixed(decimals) : "—";
}

function IAAOBadge({ value, low, high }: { value: number | null; low: number; high: number }) {
  if (value === null) return <span className="text-muted-foreground text-xs">—</span>;
  const pass = value >= low && value <= high;
  const marginal =
    !pass && value >= low * 0.9 && value <= high * 1.1;
  if (pass) return <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">Pass</Badge>;
  if (marginal) return <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">Marginal</Badge>;
  return <Badge className="bg-red-500/10 text-red-400 border-0 text-xs">Fail</Badge>;
}

export function CostApproachRunner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("all");
  const [lastResult, setLastResult] = useState<CostRunResult | null>(null);

  // Load neighborhoods
  const { data: neighborhoods = [] } = useQuery<NeighborhoodOption[]>({
    queryKey: ["neighborhood-options"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(500);

      const counts: Record<string, number> = {};
      for (const p of data ?? []) {
        counts[p.neighborhood_code] = (counts[p.neighborhood_code] ?? 0) + 1;
      }
      return Object.entries(counts)
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => a.code.localeCompare(b.code));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Load cost schedules + depreciation
  const { data: schedules = [] } = useQuery({
    queryKey: ["cost-schedules"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("cost_schedules").select("*");
      return data ?? [];
    },
  });

  const { data: deprTable = [] } = useQuery({
    queryKey: ["cost-depreciation"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("cost_depreciation").select("*").order("age_from");
      return data ?? [];
    },
  });

  // Run cost approach locally
  const runMutation = useMutation({
    mutationFn: async () => {
      const query = (supabase as any)
        .from("parcels")
        .select("id, building_area, year_built, property_class, quality_grade, assessed_value, neighborhood_code, sales(sale_price, is_qualified)")
        .not("building_area", "is", null)
        .not("assessed_value", "is", null)
        .limit(300);

      if (selectedNeighborhood !== "all") {
        query.eq("neighborhood_code", selectedNeighborhood);
      }

      const { data: parcels, error } = await query;
      if (error) throw error;

      const currentYear = new Date().getFullYear();
      const scheduleMap = new Map<string, number>();
      for (const s of schedules) {
        scheduleMap.set(`${s.property_class}|${s.quality_grade ?? "C"}`, s.base_cost_per_sqft);
      }

      function getDeprPct(age: number) {
        const row = deprTable.find((d: any) => age >= d.age_from && age <= d.age_to);
        return row ? (row.depreciation_pct + (row.condition_modifier ?? 0)) / 100 : 0;
      }

      const results: { costRCN: number; assessedValue: number; salePrice: number | null; qualSale: boolean }[] = [];

      for (const p of parcels ?? []) {
        const age = p.year_built ? currentYear - p.year_built : 0;
        const costKey = `${p.property_class ?? "R1"}|${p.quality_grade ?? "C"}`;
        const costPerSqft = scheduleMap.get(costKey) ?? scheduleMap.get(`R1|C`) ?? 0;
        if (!costPerSqft || !p.building_area) continue;

        const rcn = costPerSqft * p.building_area * (1 - getDeprPct(age));
        const qualSales = (p.sales ?? []).filter((s: any) => s.is_qualified && s.sale_price);
        const salePrice = qualSales.length > 0 ? qualSales[qualSales.length - 1].sale_price : null;

        results.push({
          costRCN: rcn,
          assessedValue: p.assessed_value,
          salePrice,
          qualSale: salePrice !== null,
        });
      }

      if (results.length === 0) {
        throw new Error("No parcels matched. Ensure cost schedules are defined and parcels have property_class.");
      }

      // Cost ratios (RCN / assessedValue)
      const costRatios = results.map((r) => r.costRCN / r.assessedValue);
      const costSorted = [...costRatios].sort((a, b) => a - b);
      const costMedian = costSorted[Math.floor(costSorted.length / 2)] ?? null;
      const costMean = costRatios.reduce((a, b) => a + b, 0) / costRatios.length;
      const costCOD = costMedian
        ? (costRatios.reduce((a, r) => a + Math.abs(r - costMedian), 0) / costRatios.length / costMedian) * 100
        : null;

      // Sales comparison ratios (assessedValue / salePrice)
      const saleResults = results.filter((r) => r.qualSale && r.salePrice! > 0);
      const salesRatios = saleResults.map((r) => r.assessedValue / r.salePrice!);
      const salesSorted = [...salesRatios].sort((a, b) => a - b);
      const salesMedian = salesSorted.length > 0 ? salesSorted[Math.floor(salesSorted.length / 2)] : null;
      const salesMean = salesRatios.length > 0 ? salesRatios.reduce((a, b) => a + b, 0) / salesRatios.length : null;
      const salesCOD =
        salesMedian && salesRatios.length > 0
          ? (salesRatios.reduce((a, r) => a + Math.abs(r - salesMedian), 0) / salesRatios.length / salesMedian) * 100
          : null;

      return {
        neighborhood_code: selectedNeighborhood,
        parcel_count: results.length,
        cost_median_ratio: costMedian,
        cost_mean_ratio: costMean,
        cost_cod: costCOD,
        sales_median_ratio: salesMedian,
        sales_mean_ratio: salesMean,
        sales_cod: salesCOD,
        run_at: new Date().toISOString(),
      } as CostRunResult;
    },
    onSuccess: (result) => {
      setLastResult(result);
      toast({ title: "Cost approach complete", description: `${result.parcel_count} parcels analyzed` });
    },
    onError: (err: Error) => {
      toast({ title: "Run failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cost Approach Runner</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compute RCN-based ratios and compare against sales comparison statistics
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Neighborhood</label>
            <Select value={selectedNeighborhood} onValueChange={setSelectedNeighborhood}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Neighborhoods</SelectItem>
                {neighborhoods.map((n) => (
                  <SelectItem key={n.code} value={n.code}>
                    {n.code} ({n.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || schedules.length === 0}
            className="gap-2 h-9"
          >
            <Play className="w-4 h-4" />
            {runMutation.isPending ? "Running…" : "Run Cost Approach"}
          </Button>

          {schedules.length === 0 && (
            <p className="text-xs text-amber-400">
              ⚠ Define cost schedules first (Cost Schedules tab)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results comparison */}
      {lastResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Approach Stats */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Cost Approach (RCN / Assessed)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastResult.parcel_count} parcels · {lastResult.neighborhood_code}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatsRow
                label="Median Ratio"
                value={lastResult.cost_median_ratio}
                low={0.95}
                high={1.05}
                threshold="IAAO: 0.95–1.05"
              />
              <StatsRow
                label="Mean Ratio"
                value={lastResult.cost_mean_ratio}
                low={0.90}
                high={1.10}
                threshold="Target: 0.90–1.10"
              />
              <StatsRow
                label="COD"
                value={lastResult.cost_cod}
                low={0}
                high={15}
                threshold="IAAO: < 15%"
                isPercent
              />
            </CardContent>
          </Card>

          {/* Sales Comparison Stats */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                Sales Comparison (Assessed / Sale)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastResult.sales_median_ratio !== null ? "Qualified sales found" : "No qualified sales"}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatsRow
                label="Median Ratio"
                value={lastResult.sales_median_ratio}
                low={0.95}
                high={1.05}
                threshold="IAAO: 0.95–1.05"
              />
              <StatsRow
                label="Mean Ratio"
                value={lastResult.sales_mean_ratio}
                low={0.90}
                high={1.10}
                threshold="Target: 0.90–1.10"
              />
              <StatsRow
                label="COD"
                value={lastResult.sales_cod}
                low={0}
                high={15}
                threshold="IAAO: < 15%"
                isPercent
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatsRow({
  label,
  value,
  low,
  high,
  threshold,
  isPercent = false,
}: {
  label: string;
  value: number | null;
  low: number;
  high: number;
  threshold: string;
  isPercent?: boolean;
}) {
  const pass = value !== null && value >= low && value <= high;
  const marginal =
    value !== null && !pass && value >= low * 0.9 && value <= high * 1.1;

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium tabular-nums">
          {value !== null ? (isPercent ? `${value.toFixed(1)}%` : value.toFixed(3)) : "—"}
        </p>
        <p className="text-[10px] text-muted-foreground">{threshold}</p>
      </div>
      {value !== null && (
        pass ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : marginal ? (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
        )
      )}
    </div>
  );
}

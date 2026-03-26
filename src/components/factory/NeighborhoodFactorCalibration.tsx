// TerraFusion OS — Neighborhood Factor Calibration (Phase 178)
// PRD / COD / Median Ratio engine with comparable sales drill-down.
// Writes calibration runs via the forge write lane.

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Target, BarChart3, AlertTriangle, CheckCircle2, Loader2, Calculator,
} from "lucide-react";
import { NeighborhoodSelector } from "./NeighborhoodSelector";
import { ComparableSalesGrid } from "@/components/forge/ComparableSalesGrid";
import { supabase } from "@/integrations/supabase/client";
import { assertWriteLane } from "@/services/writeLane";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import { useNeighborhoodStats } from "@/hooks/useNeighborhoodStats";

// sales_history is not in the generated Supabase types — isolate the cast here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any;

interface SalesHistoryComp {
  id: string;
  sale_date: string;
  sale_price: number;
  sale_type: string | null;
  deed_type: string | null;
  parcel_id: string;
  parcels: {
    id: string;
    parcel_number: string;
    address: string | null;
    city: string | null;
    assessed_value: number | null;
    building_area: number | null;
    neighborhood_code: string | null;
  } | null;
}
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

// ── Math ──────────────────────────────────────────────────────────────────────

export interface CalibrationStats {
  n: number;
  medianRatio: number;
  meanRatio: number;
  cod: number;   // Coefficient of Dispersion (%)
  prd: number;   // Price-Related Differential
  prb: number;   // Price-Related Bias (proxy)
}

export function calcCalibrationStats(
  sales: Array<{ salePrice: number; assessedValue: number }>,
): CalibrationStats | null {
  const valid = sales.filter((s) => s.salePrice > 0 && s.assessedValue > 0);
  if (valid.length < 3) return null;

  const ratios = valid.map((s) => s.assessedValue / s.salePrice);
  const sorted = [...ratios].sort((a, b) => a - b);
  const n = sorted.length;

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const meanRatio = ratios.reduce((s, r) => s + r, 0) / n;

  // COD = (Σ|ratioᵢ - median| / n / median) × 100
  const cod = (ratios.reduce((s, r) => s + Math.abs(r - median), 0) / n / median) * 100;

  // PRD = mean / (Σ(ratioᵢ × weightᵢ)) where weight = 1/n uniform
  // Simplified: PRD = mean / weighted mean (= 1.0 when uniform weights)
  // Standard formula uses value-weighted mean:
  const totalSP = valid.reduce((s, v) => s + v.salePrice, 0);
  const valueWeightedRatio = valid.reduce((s, v) => s + v.assessedValue, 0) / totalSP;
  const prd = meanRatio / valueWeightedRatio;

  // PRB proxy: slope of ratios vs. log(sale_price) — simplified sign only
  const meanSP = valid.reduce((s, v) => s + v.salePrice, 0) / n;
  const prb = valid
    .map((v) => (v.assessedValue / v.salePrice - meanRatio) * (v.salePrice - meanSP))
    .reduce((s, x) => s + x, 0);

  return { n, medianRatio: median, meanRatio, cod, prd, prb };
}

// ── IAAO thresholds ───────────────────────────────────────────────────────────

function codStatus(cod: number): "healthy" | "warning" | "critical" {
  if (cod <= 10) return "healthy";
  if (cod <= 15) return "warning";
  return "critical";
}

function prdStatus(prd: number): "healthy" | "warning" | "critical" {
  if (prd >= 0.98 && prd <= 1.03) return "healthy";
  if (prd >= 0.95 && prd <= 1.05) return "warning";
  return "critical";
}

function medianStatus(median: number): "healthy" | "warning" | "critical" {
  if (median >= 0.9 && median <= 1.1) return "healthy";
  if (median >= 0.85 && median <= 1.15) return "warning";
  return "critical";
}

function StatusDot({ status }: { status: "healthy" | "warning" | "critical" }) {
  const cls = status === "healthy"
    ? "bg-[hsl(var(--tf-optimized-green))]"
    : status === "warning"
    ? "bg-[hsl(var(--tf-sacred-gold))]"
    : "bg-[hsl(var(--tf-warning-red))]";
  return <span className={cn("inline-block w-2 h-2 rounded-full shrink-0", cls)} />;
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label, value, status, description,
}: { label: string; value: string; status: "healthy" | "warning" | "critical"; description: string }) {
  return (
    <div className="material-bento rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-1.5">
        <StatusDot status={status} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-light text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{description}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NeighborhoodFactorCalibration() {
  const [neighborhoodCode, setNeighborhoodCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const countyId = useActiveCountyId();
  const { toast } = useToast();

  // RPC-backed neighborhood stats (supplemental to local ratio study)
  const {
    data: nbhdStats,
    isLoading: nbhdStatsLoading,
    isError: nbhdStatsError,
  } = useNeighborhoodStats(neighborhoodCode, countyId);

  const { data: comps, isLoading: compsLoading } = useQuery({
    queryKey: ["nbhd-calibration-comps", neighborhoodCode],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("sales_history")
        .select(`id, sale_date, sale_price, sale_type, deed_type,
          parcel_id, parcels!inner(id, parcel_number, address, city, assessed_value, building_area, neighborhood_code)`)
        .eq("parcels.neighborhood_code", neighborhoodCode!)
        .eq("is_qualified", true)
        .order("sale_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SalesHistoryComp[];
    },
    enabled: !!neighborhoodCode,
    staleTime: 60_000,
  });

  // Derive calibration stats from comps
  const stats = useMemo<CalibrationStats | null>(() => {
    if (!comps?.length) return null;
    const sales = comps.map((c) => ({
      salePrice: c.sale_price ?? 0,
      assessedValue: c.parcels?.assessed_value ?? 0,
    }));
    return calcCalibrationStats(sales);
  }, [comps]);

  const canApply = stats !== null && neighborhoodCode !== null && !isSaving;

  const handleApply = async () => {
    if (!canApply || !stats || !neighborhoodCode) return;
    setIsSaving(true);
    try {
      const payload = {
        county_id: countyId,
        neighborhood_code: neighborhoodCode,
        r_squared: null, // No regression run here; PRD/COD are ratio study metrics
        status: "applied" as const,
        notes: `Ratio study — Median=${stats.medianRatio.toFixed(3)}, COD=${stats.cod.toFixed(1)}%, PRD=${stats.prd.toFixed(3)}, n=${stats.n}`,
      };
      assertWriteLane("calibration_runs", "forge");
      const { error } = await supabase.from("calibration_runs").insert(payload);
      if (error) throw error;
      toast({
        title: "Calibration saved",
        description: `Neighborhood ${neighborhoodCode}: Median ratio ${stats.medianRatio.toFixed(3)}, COD ${stats.cod.toFixed(1)}%`,
      });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground flex items-center gap-2">
            <Calculator className="w-4 h-4 text-suite-forge" />
            Neighborhood Factor Calibration
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            IAAO ratio study — COD, PRD, median ratio by neighborhood
          </p>
        </div>
        <NeighborhoodSelector value={neighborhoodCode} onChange={setNeighborhoodCode} />
      </div>

      {/* No selection */}
      {!neighborhoodCode && (
        <Card className="material-bento border-border/50">
          <CardContent className="p-8 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Select a neighborhood to run the ratio study
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {neighborhoodCode && compsLoading && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      )}

      {/* Insufficient data */}
      {neighborhoodCode && !compsLoading && !stats && (
        <Card className="material-bento border-border/50">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[hsl(var(--tf-sacred-gold))] shrink-0" />
            <p className="text-sm text-muted-foreground">
              Need ≥3 qualified sales in <strong>{neighborhoodCode}</strong> to calculate ratio statistics.
              {comps?.length !== undefined && (
                <> Found {comps.length} sale{comps.length !== 1 ? "s" : ""}.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile
              label="Median Ratio"
              value={stats.medianRatio.toFixed(3)}
              status={medianStatus(stats.medianRatio)}
              description="AV ÷ Sale Price · target 0.90–1.10"
            />
            <StatTile
              label="COD"
              value={`${stats.cod.toFixed(1)}%`}
              status={codStatus(stats.cod)}
              description="Coefficient of dispersion · IAAO ≤10%"
            />
            <StatTile
              label="PRD"
              value={stats.prd.toFixed(3)}
              status={prdStatus(stats.prd)}
              description="Price-related differential · target 0.98–1.03"
            />
            <div className="material-bento rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sample</span>
              </div>
              <div className="text-2xl font-light text-foreground tabular-nums">{stats.n}</div>
              <div className="text-[10px] text-muted-foreground">Qualified sales</div>
            </div>
          </div>

          {/* IAAO legend */}
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><StatusDot status="healthy" /> Meets IAAO standard</span>
            <span className="flex items-center gap-1"><StatusDot status="warning" /> Monitor — borderline</span>
            <span className="flex items-center gap-1"><StatusDot status="critical" /> Outside standard — review</span>
          </div>

          {/* Neighborhood Stats RPC Panel */}
          {neighborhoodCode && countyId && (
            <Card className="material-bento border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-suite-forge" />
                  <span className="text-xs font-medium text-foreground">
                    Neighborhood Stats — {neighborhoodCode}
                  </span>
                  <span className="text-[10px] text-muted-foreground">(via RPC)</span>
                </div>
                {nbhdStatsLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading stats…
                  </div>
                )}
                {nbhdStatsError && (
                  <div className="flex items-center gap-2 text-xs text-[hsl(var(--tf-warning-red))]">
                    <AlertTriangle className="w-3 h-3" /> RPC error loading neighborhood stats.
                  </div>
                )}
                {!nbhdStatsLoading && !nbhdStatsError && nbhdStats != null && (
                  <pre className="text-[10px] text-muted-foreground overflow-auto max-h-40 whitespace-pre-wrap">
                    {JSON.stringify(nbhdStats, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}

          {/* Apply button */}
          <div className="flex justify-end">
            <Button
              onClick={handleApply}
              disabled={!canApply}
              className="gap-2"
            >
              {isSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-4 h-4" /> Save Calibration Run</>}
            </Button>
          </div>
        </>
      )}

      {/* Comparable sales detail */}
      {neighborhoodCode && comps && comps.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Sales Detail — {neighborhoodCode}
          </h3>
          {/* Use first parcel's id to anchor the grid; grid shows whole neighborhood */}
          <ComparableSalesGrid
            parcelId={comps[0]?.parcels?.id ?? null}
            neighborhoodCode={neighborhoodCode}
            assessedValue={null}
            limit={15}
          />
        </div>
      )}
    </motion.div>
  );
}

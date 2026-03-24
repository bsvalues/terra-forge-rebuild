// TerraFusion OS — Cross-County Ratio Benchmarks (Phase 192)
// Grouped bar chart comparing COD / PRD / Median Ratio across seeded WA counties.
// Live data loads from Supabase study_periods + sales_history when available.
// Unseeded counties show N/A stubs.

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CountyBenchmark {
  county: string;
  slug: string;
  medianRatio: number | null;
  cod: number | null;
  prd: number | null;
  parcelCount: number;
  isLive: boolean;
}

// ── Static roster (Phase 192: updated when seeds produce real data) ────────────
const BENCHMARK_SLUGS = ["benton", "franklin", "yakima", "thurston", "clark", "king"] as const;
const COUNTY_NAMES: Record<string, string> = {
  benton:   "Benton",
  franklin: "Franklin",
  yakima:   "Yakima",
  thurston: "Thurston",
  clark:    "Clark",
  king:     "King",
};

// ── Hook: pull ratio stats per county ─────────────────────────────────────────
function useCrossCountyBenchmarks() {
  return useQuery<CountyBenchmark[]>({
    queryKey: ["cross-county-benchmarks"],
    queryFn: async () => {
      // Fetch all counties from Supabase
      const { data: counties } = await supabase
        .from("counties")
        .select("id, name, fips_code");

      const countyMap = new Map(
        (counties ?? []).map((c) => [c.name.toLowerCase().split(" ")[0], c] as const)
      );

      const results: CountyBenchmark[] = await Promise.all(
        BENCHMARK_SLUGS.map(async (slug) => {
          const county = countyMap.get(slug);
          if (!county) {
            // Not in Supabase yet — stub
            return {
              county: COUNTY_NAMES[slug],
              slug,
              medianRatio: null,
              cod: null,
              prd: null,
              parcelCount: 0,
              isLive: false,
            };
          }

          // Parcel count
          const { count: parcelCount } = await supabase
            .from("parcels")
            .select("id", { count: "exact", head: true })
            .eq("county_id", county.id);

          if (!parcelCount) {
            return {
              county: COUNTY_NAMES[slug],
              slug,
              medianRatio: null,
              cod: null,
              prd: null,
              parcelCount: 0,
              isLive: false,
            };
          }

          // Pull ratio summary if sales data exists
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: ratios } = await (supabase as any)
            .from("vw_sales_reconciliation_summary")
            .select("median_ratio, cod, prd")
            .eq("county_id", county.id)
            .order("period_end", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            county: COUNTY_NAMES[slug],
            slug,
            medianRatio: (ratios as { median_ratio?: number } | null)?.median_ratio ?? null,
            cod: (ratios as { cod?: number } | null)?.cod ?? null,
            prd: (ratios as { prd?: number } | null)?.prd ?? null,
            parcelCount: parcelCount ?? 0,
            isLive: true,
          };
        })
      );

      return results;
    },
    staleTime: 5 * 60_000,
  });
}

// ── IAAO target lines ──────────────────────────────────────────────────────────
const IAAO_TARGETS = {
  medianRatio: { min: 0.9, max: 1.1,  label: "Median Ratio (0.90–1.10)" },
  cod:         { min: 0,   max: 15,   label: "COD (≤15)" },
  prd:         { min: 0.98, max: 1.03, label: "PRD (0.98–1.03)" },
};

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-xl shadow-xl p-3 text-xs space-y-1">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ color: p.fill }} className="font-mono">{p.name}:</span>
          <span className="text-foreground">{p.value !== null ? p.value.toFixed(3) : "N/A"}</span>
        </div>
      ))}
    </div>
  );
}

// ── Chart section ─────────────────────────────────────────────────────────────
function BenchmarkChart({
  data,
  metric,
  color,
  label,
  target,
}: {
  data: CountyBenchmark[];
  metric: "medianRatio" | "cod" | "prd";
  color: string;
  label: string;
  target: { min: number; max: number };
}) {
  const chartData = data.map((d) => ({
    county: d.county,
    value: d[metric],
    isLive: d.isLive,
  }));

  const hasAnyLive = chartData.some((d) => d.value !== null);

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            IAAO: {target.min}–{target.max}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnyLive ? (
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground/60">
            No live data yet — seed counties to populate
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
              <XAxis dataKey="county" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name={label} fill={color} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Summary table ─────────────────────────────────────────────────────────────
function BenchmarkTable({ data }: { data: CountyBenchmark[] }) {
  const fmtRatio = (v: number | null) => v != null ? v.toFixed(3) : "—";
  const inRange = (v: number | null, min: number, max: number) =>
    v != null && v >= min && v <= max;

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Summary Table</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                {["County", "Parcels", "Median Ratio", "COD", "PRD", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.slug} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium text-foreground">{row.county}</td>
                  <td className="px-4 py-2 text-muted-foreground tabular-nums">
                    {row.parcelCount > 0 ? row.parcelCount.toLocaleString() : "—"}
                  </td>
                  <td className={`px-4 py-2 tabular-nums font-mono ${inRange(row.medianRatio, 0.9, 1.1) ? "text-emerald-400" : row.medianRatio != null ? "text-amber-400" : "text-muted-foreground/40"}`}>
                    {fmtRatio(row.medianRatio)}
                  </td>
                  <td className={`px-4 py-2 tabular-nums font-mono ${inRange(row.cod, 0, 15) ? "text-emerald-400" : row.cod != null ? "text-rose-400" : "text-muted-foreground/40"}`}>
                    {fmtRatio(row.cod)}
                  </td>
                  <td className={`px-4 py-2 tabular-nums font-mono ${inRange(row.prd, 0.98, 1.03) ? "text-emerald-400" : row.prd != null ? "text-amber-400" : "text-muted-foreground/40"}`}>
                    {fmtRatio(row.prd)}
                  </td>
                  <td className="px-4 py-2">
                    {row.isLive
                      ? <Badge className="text-[9px] px-1.5 bg-sky-500/10 text-sky-400 border-sky-500/20">Live</Badge>
                      : <Badge className="text-[9px] px-1.5 bg-muted/30 text-muted-foreground border-border/30">Stub</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CrossCountyBenchmarks() {
  const { data, isLoading } = useCrossCountyBenchmarks();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground">Cross-County Ratio Benchmarks</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            COD · PRD · Median Ratio compared against IAAO standard ranges
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-lg border border-border/40">
          <Info className="w-3 h-3" />
          Counties without seeded parcels show stub status
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <BenchmarkChart
              data={data}
              metric="medianRatio"
              color="hsl(var(--tf-cyan))"
              label="Median Ratio"
              target={IAAO_TARGETS.medianRatio}
            />
            <BenchmarkChart
              data={data}
              metric="cod"
              color="hsl(var(--tf-sacred-gold))"
              label="COD"
              target={IAAO_TARGETS.cod}
            />
            <BenchmarkChart
              data={data}
              metric="prd"
              color="hsl(var(--tf-optimized-green))"
              label="PRD"
              target={IAAO_TARGETS.prd}
            />
          </div>
          <BenchmarkTable data={data} />
        </>
      ) : null}
    </motion.div>
  );
}

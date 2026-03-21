// TerraFusion OS — Vertical Equity Analysis Panel (Phase 88.2)
// PRD by neighborhood + ratio by value quintile (vertical equity test)
// IAAO standard: PRD 0.98–1.03 indicates no vertical inequity

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIAAOCompliance, IAAO_THRESHOLDS } from "@/hooks/useIAAOCompliance";
import type { NeighborhoodCompliance } from "@/hooks/useIAAOCompliance";

// ─── helpers ────────────────────────────────────────────────────────────────

function prdColor(prd: number | null): string {
  if (prd === null) return "#6b7280";
  if (prd >= IAAO_THRESHOLDS.prd.low && prd <= IAAO_THRESHOLDS.prd.high) return "#22c55e";
  if (prd >= 0.95 && prd <= 1.05) return "#f59e0b";
  return "#ef4444";
}

function prdLabel(prd: number | null): { icon: React.ReactNode; text: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (prd === null) return { icon: <Minus className="w-3 h-3" />, text: "No data", variant: "secondary" };
  if (prd > IAAO_THRESHOLDS.prd.high) return { icon: <TrendingUp className="w-3 h-3" />, text: "Progressive", variant: "destructive" };
  if (prd < IAAO_THRESHOLDS.prd.low) return { icon: <TrendingDown className="w-3 h-3" />, text: "Regressive", variant: "destructive" };
  return { icon: <CheckCircle2 className="w-3 h-3" />, text: "Equitable", variant: "default" };
}

// Build ratio-by-quintile synthetic data from neighborhood compliance stats
// We approximate quintiles by sorting neighborhoods by median_ratio and splitting evenly
function buildQuintileData(neighborhoods: NeighborhoodCompliance[]) {
  const sorted = [...neighborhoods]
    .filter((n) => n.median_ratio !== null && n.sample_size >= 5)
    .sort((a, b) => (a.median_ratio ?? 0) - (b.median_ratio ?? 0));

  if (sorted.length < 5) return null;

  const size = Math.ceil(sorted.length / 5);
  const labels = ["Q1\n(Lowest)", "Q2", "Q3\n(Mid)", "Q4", "Q5\n(Highest)"];

  return labels.map((label, i) => {
    const slice = sorted.slice(i * size, (i + 1) * size);
    const ratios = slice.map((n) => n.median_ratio as number);
    const median = ratios[Math.floor(ratios.length / 2)] ?? null;
    return {
      quintile: label,
      medianRatio: median !== null ? +median.toFixed(4) : null,
      count: slice.length,
    };
  });
}

// ─── custom tooltip ──────────────────────────────────────────────────────────

const PRDTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const prd = payload[0]?.value as number | null;
  const lbl = prdLabel(prd);
  return (
    <div className="bg-tf-surface border border-white/10 rounded-lg p-3 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">PRD: <span className="text-foreground font-mono">{prd?.toFixed(3) ?? "N/A"}</span></p>
      <Badge variant={lbl.variant} className="mt-1 gap-1 text-[10px]">{lbl.icon}{lbl.text}</Badge>
    </div>
  );
};

const RatioTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const ratio = payload[0]?.value as number | null;
  return (
    <div className="bg-tf-surface border border-white/10 rounded-lg p-3 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Median Ratio: <span className="text-foreground font-mono">{ratio?.toFixed(3) ?? "N/A"}</span></p>
      {ratio !== null && (
        <p className="text-muted-foreground mt-1">
          {ratio > 1.03 ? "Over-assessed tier" : ratio < 0.97 ? "Under-assessed tier" : "Equitably assessed"}
        </p>
      )}
    </div>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

interface VerticalEquityPanelProps {
  taxYear?: number;
}

export function VerticalEquityPanel({ taxYear }: VerticalEquityPanelProps) {
  const { data: compliance, isLoading, error } = useIAAOCompliance(taxYear);

  const prdChartData = useMemo(() => {
    if (!compliance) return [];
    return compliance.neighborhoods
      .filter((n) => n.prd !== null && n.sample_size >= 5)
      .sort((a, b) => (b.prd ?? 0) - (a.prd ?? 0))
      .slice(0, 20)
      .map((n) => ({
        neighborhood: n.neighborhood_code,
        prd: n.prd,
        grade: n.prd_grade,
      }));
  }, [compliance]);

  const quintileData = useMemo(() => {
    if (!compliance) return null;
    return buildQuintileData(compliance.neighborhoods);
  }, [compliance]);

  const countyPRD = compliance?.countyPRD ?? null;
  const countyPrdInfo = prdLabel(countyPRD);

  // ── export as CSV ────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!compliance) return;
    const rows = [
      ["Neighborhood", "Sample Size", "Median Ratio", "COD", "PRD", "PRB", "PRD Grade"],
      ...compliance.neighborhoods.map((n) => [
        n.neighborhood_code,
        n.sample_size,
        n.median_ratio?.toFixed(4) ?? "",
        n.cod?.toFixed(2) ?? "",
        n.prd?.toFixed(4) ?? "",
        n.prb?.toFixed(4) ?? "",
        n.prd_grade,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vertical_equity_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
        Loading equity data…
      </div>
    );
  }

  if (error || !compliance) {
    return (
      <div className="flex items-center justify-center h-60 text-muted-foreground gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        Unable to load compliance data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* County-level PRD summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="material-bento p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Info className="w-3 h-3" />County PRD
          </div>
          <div className="text-3xl font-light font-mono text-foreground">
            {countyPRD?.toFixed(3) ?? "—"}
          </div>
          <Badge variant={countyPrdInfo.variant} className="mt-2 gap-1 text-xs">
            {countyPrdInfo.icon}{countyPrdInfo.text}
          </Badge>
          <p className="text-[10px] text-muted-foreground mt-2">IAAO standard: 0.98 – 1.03</p>
        </div>

        <div className="material-bento p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">County COD</div>
          <div className="text-3xl font-light font-mono text-foreground">
            {compliance.countyCOD?.toFixed(2) ?? "—"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Acceptable ≤ 15 | Excellent ≤ 10</p>
        </div>

        <div className="material-bento p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Neighborhoods with PRD data</div>
          <div className="text-3xl font-light font-mono text-foreground">{prdChartData.length}</div>
          <div className="flex gap-2 mt-2">
            <Badge variant="default" className="text-[10px]">
              {prdChartData.filter((d) => d.grade === "pass").length} pass
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {prdChartData.filter((d) => d.grade === "marginal").length} marginal
            </Badge>
            <Badge variant="destructive" className="text-[10px]">
              {prdChartData.filter((d) => d.grade === "fail").length} fail
            </Badge>
          </div>
        </div>
      </div>

      {/* PRD by neighborhood chart */}
      <div className="material-bento p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">PRD by Neighborhood</h3>
            <p className="text-xs text-muted-foreground">Price-Related Differential — vertical equity indicator (top 20 shown)</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleExport}>
            Export CSV
          </Button>
        </div>

        {prdChartData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No neighborhoods with sufficient sample size (n ≥ 5)
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={prdChartData} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
              <XAxis
                dataKey="neighborhood"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                domain={[0.85, 1.15]}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip content={<PRDTooltip />} />
              <ReferenceLine y={IAAO_THRESHOLDS.prd.low} stroke="#22c55e" strokeDasharray="4 2" label={{ value: "0.98", position: "right", fontSize: 9, fill: "#22c55e" }} />
              <ReferenceLine y={IAAO_THRESHOLDS.prd.high} stroke="#22c55e" strokeDasharray="4 2" label={{ value: "1.03", position: "right", fontSize: 9, fill: "#22c55e" }} />
              <Bar dataKey="prd" radius={[3, 3, 0, 0]}>
                {prdChartData.map((entry, i) => (
                  <Cell key={i} fill={prdColor(entry.prd)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Ratio by value quintile */}
      <div className="material-bento p-4 rounded-lg">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-foreground">Median Ratio by Value Quintile</h3>
          <p className="text-xs text-muted-foreground">
            Neighborhoods sorted by median ratio, grouped into quintiles. Uniform ratios across quintiles indicate vertical equity.
          </p>
        </div>

        {!quintileData ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Insufficient neighborhood data for quintile analysis (need ≥ 5 neighborhoods with sales data)
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={quintileData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <XAxis dataKey="quintile" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis
                domain={[0.7, 1.3]}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip content={<RatioTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: "#9ca3af" }} />
              <ReferenceLine y={1.0} stroke="#6b7280" strokeDasharray="3 3" label={{ value: "1.00", position: "right", fontSize: 9, fill: "#6b7280" }} />
              <ReferenceLine y={0.97} stroke="#f59e0b" strokeDasharray="3 2" />
              <ReferenceLine y={1.03} stroke="#f59e0b" strokeDasharray="3 2" />
              <Bar dataKey="medianRatio" name="Median Ratio" radius={[3, 3, 0, 0]}>
                {quintileData.map((entry, i) => {
                  const r = entry.medianRatio;
                  const color = r === null ? "#6b7280" : r >= 0.97 && r <= 1.03 ? "#22c55e" : r >= 0.90 && r <= 1.10 ? "#f59e0b" : "#ef4444";
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {quintileData && (
          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Green = equitable (0.97–1.03) • Amber = marginal (0.90–1.10) • Red = outside IAAO bounds
          </p>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useAssessmentYoYSummary,
  useAssessmentTopMovers,
} from "@/hooks/useValueChangeTracker";

// ── Formatters ────────────────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtDollar(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : n > 0 ? "+" : "";
  return sign + "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + n.toFixed(2) + "%";
}
function deltaClass(n: number | null | undefined): string {
  if (n == null) return "";
  if (n > 0) return "text-green-600 font-medium";
  if (n < 0) return "text-red-600 font-medium";
  return "text-muted-foreground";
}

// ── Year Selector ─────────────────────────────────────────────────
interface YearSelectorProps {
  years: number[];
  selected: number | null;
  onChange: (y: number) => void;
}
function YearSelector({ years, selected, onChange }: YearSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {years.map((y) => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className={`px-3 py-1 text-xs rounded-md border ${selected === y ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

// ── YoY Summary Table ─────────────────────────────────────────────
function SummaryTab() {
  const { data, isLoading } = useAssessmentYoYSummary();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading summary…</p>;

  return (
    <div className="space-y-4">
      {/* Overview cards — most recent year */}
      {data && data.length > 0 && data[0].prev_tax_year != null && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Avg Change ({data[0].tax_year})</CardTitle></CardHeader>
            <CardContent><span className={`text-xl font-bold ${deltaClass(data[0].avg_pct_change)}`}>{fmtPct(data[0].avg_pct_change)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Increased</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold text-green-600">{fmt(data[0].increased_count)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Decreased</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold text-red-600">{fmt(data[0].decreased_count)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Unchanged</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold text-muted-foreground">{fmt(data[0].unchanged_count)}</span></CardContent>
          </Card>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Tax Year</th>
              <th className="px-3 py-2 text-left">vs. Year</th>
              <th className="px-3 py-2 text-right">Parcels</th>
              <th className="px-3 py-2 text-right">YoY Parcels</th>
              <th className="px-3 py-2 text-right">Total Roll Value</th>
              <th className="px-3 py-2 text-right">Sum Δ</th>
              <th className="px-3 py-2 text-right">Avg Δ</th>
              <th className="px-3 py-2 text-right">Avg % Chg</th>
              <th className="px-3 py-2 text-right">↑ Inc</th>
              <th className="px-3 py-2 text-right">↓ Dec</th>
              <th className="px-3 py-2 text-right">= Same</th>
              <th className="px-3 py-2 text-right">Max ↑%</th>
              <th className="px-3 py-2 text-right">Max ↓%</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((r) => (
              <tr key={`${r.tax_year}-${r.prev_tax_year}`} className="hover:bg-muted/50">
                <td className="px-3 py-1.5 font-semibold">{r.tax_year}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{r.prev_tax_year ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{fmt(r.parcel_count)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(r.yoy_parcel_count)}</td>
                <td className="px-3 py-1.5 text-right">${((r.total_roll_value ?? 0) / 1e9).toFixed(2)}B</td>
                <td className={`px-3 py-1.5 text-right ${deltaClass(r.sum_total_delta)}`}>{fmtDollar(r.sum_total_delta)}</td>
                <td className={`px-3 py-1.5 text-right ${deltaClass(r.avg_total_delta)}`}>{fmtDollar(r.avg_total_delta)}</td>
                <td className={`px-3 py-1.5 text-right ${deltaClass(r.avg_pct_change)}`}>{fmtPct(r.avg_pct_change)}</td>
                <td className="px-3 py-1.5 text-right text-green-600">{fmt(r.increased_count)}</td>
                <td className="px-3 py-1.5 text-right text-red-600">{fmt(r.decreased_count)}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{fmt(r.unchanged_count)}</td>
                <td className="px-3 py-1.5 text-right text-green-600">{fmtPct(r.max_pct_increase)}</td>
                <td className="px-3 py-1.5 text-right text-red-600">{fmtPct(r.max_pct_decrease)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Top Movers Tab ────────────────────────────────────────────────
function TopMoversTab({ years }: { years: number[] }) {
  const [selectedYear, setSelectedYear] = useState<number | null>(years[0] ?? null);
  const [direction, setDirection] = useState<"gainers" | "losers" | "all">("all");
  const { data, isLoading } = useAssessmentTopMovers(selectedYear, direction, 100);

  return (
    <div>
      <YearSelector years={years} selected={selectedYear} onChange={setSelectedYear} />

      <div className="flex gap-2 mb-4">
        {(["all", "gainers", "losers"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className={`px-3 py-1 text-xs rounded-md border capitalize ${direction === d ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {d === "gainers" ? "↑ Gainers" : d === "losers" ? "↓ Losers" : "All Movers"}
          </button>
        ))}
      </div>

      {!selectedYear && <p className="text-sm text-muted-foreground">Select a year above.</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Parcel #</th>
                <th className="px-3 py-2 text-left">Address</th>
                <th className="px-3 py-2 text-left">Nbhd</th>
                <th className="px-3 py-2 text-right">Prev Value</th>
                <th className="px-3 py-2 text-right">{selectedYear} Value</th>
                <th className="px-3 py-2 text-right">Δ $</th>
                <th className="px-3 py-2 text-right">Δ %</th>
                <th className="px-3 py-2 text-right">Land Δ</th>
                <th className="px-3 py-2 text-right">Impr Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((r) => (
                <tr key={r.parcel_id + r.tax_year} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5 font-mono">{r.parcel_number ?? "—"}</td>
                  <td className="px-3 py-1.5 max-w-[180px] truncate">{r.address ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    {r.neighborhood_code ? (
                      <Badge variant="outline" className="text-xs">{r.neighborhood_code}</Badge>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">${fmt(r.prev_total_value)}</td>
                  <td className="px-3 py-1.5 text-right">${fmt(r.total_value)}</td>
                  <td className={`px-3 py-1.5 text-right ${deltaClass(r.total_delta)}`}>{fmtDollar(r.total_delta)}</td>
                  <td className={`px-3 py-1.5 text-right ${deltaClass(r.total_pct_change)}`}>{fmtPct(r.total_pct_change)}</td>
                  <td className={`px-3 py-1.5 text-right ${deltaClass(r.land_delta)}`}>{fmtDollar(r.land_delta)}</td>
                  <td className={`px-3 py-1.5 text-right ${deltaClass(r.improvement_delta)}`}>{fmtDollar(r.improvement_delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.length === 0 && selectedYear && (
        <p className="text-sm text-muted-foreground">No data for {selectedYear}.</p>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────
export function ValueChangeDashboard() {
  const { data: summary } = useAssessmentYoYSummary();
  const years = [...new Set((summary ?? []).map((r) => r.tax_year))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Value Change Tracker</h2>
        <p className="text-sm text-muted-foreground">
          Year-over-year assessment changes across all {fmt((summary ?? []).reduce((s, r) => Math.max(s, r.parcel_count), 0))} parcels.
          Identify top gainers, losers, and county-wide roll trends.
        </p>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">YoY Summary</TabsTrigger>
          <TabsTrigger value="movers">Top Movers</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-4">
          <SummaryTab />
        </TabsContent>
        <TabsContent value="movers" className="mt-4">
          <TopMoversTab years={years} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

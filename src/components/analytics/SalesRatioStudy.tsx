import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useRatioCountySummary,
  useRatioByNeighborhood,
  useRatioDetail,
} from "@/hooks/useSalesRatioStudy";

// ── Formatters ────────────────────────────────────────────────────
function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
function fmtRatio(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(3);
}
function fmtDollar(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + n.toFixed(2) + "%";
}
function ratioClass(r: number | null | undefined): string {
  if (r == null) return "";
  if (r >= 0.9 && r <= 1.1) return "text-green-600";
  if (r >= 0.8 && r <= 1.2) return "text-yellow-600";
  return "text-red-600";
}

// ── IAAO Grade Badge ──────────────────────────────────────────────
function IAAOBadge({ grade, label }: { grade: string | null; label: string }) {
  if (!grade) return <span className="text-muted-foreground">—</span>;
  const variant = grade === "pass" ? "default" : grade === "marginal" ? "secondary" : "destructive";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant={variant} className="text-xs capitalize">{grade}</Badge>
    </div>
  );
}

// ── Year Selector ─────────────────────────────────────────────────
function YearSelector({ years, selected, onChange }: { years: number[]; selected: number | null; onChange: (y: number) => void }) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {years.map((y) => (
        <button key={y} onClick={() => onChange(y)}
          className={`px-3 py-1 text-xs rounded-md border ${selected === y ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
          {y}
        </button>
      ))}
    </div>
  );
}

// ── County Summary Tab ────────────────────────────────────────────
function CountySummaryTab({ onYearSelect }: { onYearSelect: (y: number) => void }) {
  const { data, isLoading } = useRatioCountySummary();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  // Most recent year KPI cards
  const latest = data?.[0];

  return (
    <div className="space-y-4">
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Median Ratio ({latest.sale_year})</CardTitle></CardHeader>
            <CardContent><span className={`text-xl font-bold ${ratioClass(latest.median_ratio)}`}>{fmtRatio(latest.median_ratio)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Mean Ratio</CardTitle></CardHeader>
            <CardContent><span className={`text-xl font-bold ${ratioClass(latest.mean_ratio)}`}>{fmtRatio(latest.mean_ratio)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">COD</CardTitle></CardHeader>
            <CardContent>
              <span className={`text-xl font-bold ${latest.cod != null && latest.cod <= 15 ? "text-green-600" : latest.cod != null && latest.cod <= 20 ? "text-yellow-600" : "text-red-600"}`}>
                {fmt(latest.cod, 2)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">PRD</CardTitle></CardHeader>
            <CardContent>
              <span className={`text-xl font-bold ${latest.prd != null && latest.prd >= 0.98 && latest.prd <= 1.03 ? "text-green-600" : "text-yellow-600"}`}>
                {fmtRatio(latest.prd)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Sales</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold">{fmt(latest.total_sales)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Qualified</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold text-green-600">{fmt(latest.qualified_sales)}</span></CardContent>
          </Card>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Year</th>
              <th className="px-3 py-2 text-right">Sales</th>
              <th className="px-3 py-2 text-right">Qualified</th>
              <th className="px-3 py-2 text-right">Median Ratio</th>
              <th className="px-3 py-2 text-right">Mean Ratio</th>
              <th className="px-3 py-2 text-right">COD</th>
              <th className="px-3 py-2 text-right">PRD</th>
              <th className="px-3 py-2 text-right">Std Dev</th>
              <th className="px-3 py-2 text-right">Min Ratio</th>
              <th className="px-3 py-2 text-right">Max Ratio</th>
              <th className="px-3 py-2 text-right">Sale Volume</th>
              <th className="px-3 py-2 text-right">Total Assessed</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((r) => (
              <tr key={r.sale_year} className="hover:bg-muted/50 cursor-pointer" onClick={() => onYearSelect(r.sale_year)}>
                <td className="px-3 py-1.5 font-semibold text-primary hover:underline">{r.sale_year}</td>
                <td className="px-3 py-1.5 text-right">{fmt(r.total_sales)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(r.qualified_sales)}</td>
                <td className={`px-3 py-1.5 text-right font-medium ${ratioClass(r.median_ratio)}`}>{fmtRatio(r.median_ratio)}</td>
                <td className={`px-3 py-1.5 text-right ${ratioClass(r.mean_ratio)}`}>{fmtRatio(r.mean_ratio)}</td>
                <td className={`px-3 py-1.5 text-right ${r.cod != null && r.cod <= 15 ? "text-green-600" : r.cod != null && r.cod <= 20 ? "text-yellow-600" : "text-red-600"}`}>{fmt(r.cod, 2)}</td>
                <td className={`px-3 py-1.5 text-right ${r.prd != null && r.prd >= 0.98 && r.prd <= 1.03 ? "text-green-600" : "text-yellow-600"}`}>{fmtRatio(r.prd)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(r.stddev_ratio, 4)}</td>
                <td className="px-3 py-1.5 text-right">{fmtRatio(r.min_ratio)}</td>
                <td className="px-3 py-1.5 text-right">{fmtRatio(r.max_ratio)}</td>
                <td className="px-3 py-1.5 text-right">${((r.total_sale_volume ?? 0) / 1e9).toFixed(2)}B</td>
                <td className="px-3 py-1.5 text-right">${((r.total_assessed ?? 0) / 1e9).toFixed(2)}B</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        IAAO targets: COD ≤15 (residential), PRD 0.98–1.03, Median ratio 0.90–1.10. Click a year to drill into neighborhoods.
      </p>
    </div>
  );
}

// ── Neighborhood Tab ──────────────────────────────────────────────
function NeighborhoodTab({ years, initialYear }: { years: number[]; initialYear: number | null }) {
  const [year, setYear] = useState<number | null>(initialYear);
  const { data, isLoading } = useRatioByNeighborhood(year);

  return (
    <div>
      <YearSelector years={years} selected={year} onChange={setYear} />
      {!year && <p className="text-sm text-muted-foreground">Select a year.</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Neighborhood</th>
                <th className="px-3 py-2 text-right">Sales</th>
                <th className="px-3 py-2 text-right">Qualified</th>
                <th className="px-3 py-2 text-right">Median Ratio</th>
                <th className="px-3 py-2 text-right">Mean Ratio</th>
                <th className="px-3 py-2 text-right">COD</th>
                <th className="px-3 py-2 text-right">PRD</th>
                <th className="px-3 py-2 text-right">Within 10%</th>
                <th className="px-3 py-2 text-center">IAAO Grades</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((r) => (
                <tr key={r.neighborhood_code ?? "null"} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5">
                    <Badge variant="outline">{r.neighborhood_code ?? "—"}</Badge>
                  </td>
                  <td className="px-3 py-1.5 text-right">{fmt(r.sale_count)}</td>
                  <td className="px-3 py-1.5 text-right">{fmt(r.qualified_count)}</td>
                  <td className={`px-3 py-1.5 text-right font-medium ${ratioClass(r.median_ratio)}`}>{fmtRatio(r.median_ratio)}</td>
                  <td className={`px-3 py-1.5 text-right ${ratioClass(r.mean_ratio)}`}>{fmtRatio(r.mean_ratio)}</td>
                  <td className={`px-3 py-1.5 text-right ${r.cod != null && r.cod <= 15 ? "text-green-600" : r.cod != null && r.cod <= 20 ? "text-yellow-600" : "text-red-600"}`}>{fmt(r.cod, 2)}</td>
                  <td className={`px-3 py-1.5 text-right ${r.prd != null && r.prd >= 0.98 && r.prd <= 1.03 ? "text-green-600" : "text-yellow-600"}`}>{fmtRatio(r.prd)}</td>
                  <td className="px-3 py-1.5 text-right">{fmt(r.within_10pct_pct, 1)}%</td>
                  <td className="px-3 py-1.5">
                    <div className="flex justify-center gap-3">
                      <IAAOBadge grade={r.cod_iaao_grade} label="COD" />
                      <IAAOBadge grade={r.prd_iaao_grade} label="PRD" />
                      <IAAOBadge grade={r.median_iaao_grade} label="Med" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Sale Detail Tab ───────────────────────────────────────────────
function DetailTab({ years }: { years: number[] }) {
  const [year, setYear] = useState<number | null>(years[0] ?? null);
  const [qualifiedOnly, setQualifiedOnly] = useState(false);
  const { data, isLoading } = useRatioDetail(year, null, qualifiedOnly, 200);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <YearSelector years={years} selected={year} onChange={setYear} />
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={qualifiedOnly} onChange={(e) => setQualifiedOnly(e.target.checked)} />
          Qualified sales only
        </label>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Parcel #</th>
                <th className="px-3 py-2 text-left">Address</th>
                <th className="px-3 py-2 text-left">Nbhd</th>
                <th className="px-3 py-2 text-right">Sale Date</th>
                <th className="px-3 py-2 text-right">Sale Price</th>
                <th className="px-3 py-2 text-right">Assessed ({`≈Tax Yr`})</th>
                <th className="px-3 py-2 text-right">Ratio</th>
                <th className="px-3 py-2 text-right">Δ $</th>
                <th className="px-3 py-2 text-right">Δ %</th>
                <th className="px-3 py-2 text-center">Qual</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((r) => (
                <tr key={r.sale_id} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5 font-mono">{r.parcel_number ?? "—"}</td>
                  <td className="px-3 py-1.5 max-w-[160px] truncate">{r.address ?? "—"}</td>
                  <td className="px-3 py-1.5"><Badge variant="outline" className="text-xs">{r.neighborhood_code ?? "—"}</Badge></td>
                  <td className="px-3 py-1.5 text-right">{r.sale_date?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.sale_price)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.assessed_value)} <span className="text-muted-foreground">({r.tax_year})</span></td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${ratioClass(r.ratio)}`}>{fmtRatio(r.ratio)}</td>
                  <td className={`px-3 py-1.5 text-right ${(r.value_delta ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtDollar(r.value_delta)}</td>
                  <td className={`px-3 py-1.5 text-right ${(r.pct_over_under ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtPct(r.pct_over_under)}</td>
                  <td className="px-3 py-1.5 text-center">{r.is_qualified ? <Badge className="text-xs">✓</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────
export function SalesRatioStudy() {
  const { data: summary } = useRatioCountySummary();
  const years = (summary ?? []).map((r) => r.sale_year);
  const latestYear = years[0] ?? null;
  const [drillYear, setDrillYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("county");

  const handleYearDrill = (y: number) => {
    setDrillYear(y);
    setActiveTab("neighborhood");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Sales Ratio Study</h2>
        <p className="text-sm text-muted-foreground">
          IAAO-standard ratio analysis — median ratio, COD, PRD by year, neighborhood, and individual sale.
          Assessment / Sale Price ratios; targets: COD ≤ 15, PRD 0.98–1.03, Median 0.90–1.10.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="county">County Summary</TabsTrigger>
          <TabsTrigger value="neighborhood">By Neighborhood</TabsTrigger>
          <TabsTrigger value="detail">Sale Detail</TabsTrigger>
        </TabsList>
        <TabsContent value="county" className="mt-4">
          <CountySummaryTab onYearSelect={handleYearDrill} />
        </TabsContent>
        <TabsContent value="neighborhood" className="mt-4">
          <NeighborhoodTab years={years} initialYear={drillYear ?? latestYear} />
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          <DetailTab years={years} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useExemptionCountySummary,
  useExemptionByType,
  useExemptionDetail,
} from "@/hooks/useExemptionAnalysis";

// ── Formatters ────────────────────────────────────────────────────
function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
function fmtDollar(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtM(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  return fmtDollar(n);
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(2) + "%";
}

// ── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const variant =
    status === "approved" ? "default" :
    status === "pending"  ? "secondary" : "destructive";
  return <Badge variant={variant} className="text-xs capitalize">{status}</Badge>;
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

// ── County Overview Tab ───────────────────────────────────────────
function CountyOverviewTab({ onDrill }: { onDrill: (year: number) => void }) {
  const { data, isLoading } = useExemptionCountySummary();
  const latest = data?.[0];

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Exemptions ({latest.tax_year})</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold">{fmt(latest.total_count)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Approved</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold text-green-600">{fmt(latest.approved_count)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Pending</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold text-yellow-600">{fmt(latest.pending_count)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Exempt Value</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold">{fmtM(latest.total_exemption_value)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">% of Assessed Roll</CardTitle></CardHeader>
            <CardContent>
              <span className={`text-xl font-bold ${(latest.pct_of_assessed_roll ?? 0) > 20 ? "text-red-600" : (latest.pct_of_assessed_roll ?? 0) > 10 ? "text-yellow-600" : "text-green-600"}`}>
                {fmtPct(latest.pct_of_assessed_roll)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Distinct Types</CardTitle></CardHeader>
            <CardContent><span className="text-xl font-bold">{fmt(latest.distinct_types)}</span></CardContent>
          </Card>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Year</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Approved</th>
              <th className="px-3 py-2 text-right">Pending</th>
              <th className="px-3 py-2 text-right">Denied</th>
              <th className="px-3 py-2 text-right">Parcels</th>
              <th className="px-3 py-2 text-right">Total Exempt $</th>
              <th className="px-3 py-2 text-right">Avg Exempt $</th>
              <th className="px-3 py-2 text-right">Avg Pct</th>
              <th className="px-3 py-2 text-right">% of Roll</th>
              <th className="px-3 py-2 text-right">Types</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((r) => (
              <tr key={r.tax_year} className="hover:bg-muted/50 cursor-pointer" onClick={() => onDrill(r.tax_year)}>
                <td className="px-3 py-1.5 font-semibold text-primary hover:underline">{r.tax_year}</td>
                <td className="px-3 py-1.5 text-right">{fmt(r.total_count)}</td>
                <td className="px-3 py-1.5 text-right text-green-600">{fmt(r.approved_count)}</td>
                <td className="px-3 py-1.5 text-right text-yellow-600">{fmt(r.pending_count)}</td>
                <td className="px-3 py-1.5 text-right text-red-600">{fmt(r.denied_count)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(r.parcel_count)}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmtM(r.total_exemption_value)}</td>
                <td className="px-3 py-1.5 text-right">{fmtDollar(r.avg_exemption_amount)}</td>
                <td className="px-3 py-1.5 text-right">{fmtPct(r.avg_exemption_pct)}</td>
                <td className={`px-3 py-1.5 text-right font-medium ${(r.pct_of_assessed_roll ?? 0) > 20 ? "text-red-600" : (r.pct_of_assessed_roll ?? 0) > 10 ? "text-yellow-600" : "text-green-600"}`}>
                  {fmtPct(r.pct_of_assessed_roll)}
                </td>
                <td className="px-3 py-1.5 text-right">{fmt(r.distinct_types)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Click a year to drill into exemption types. % of roll &gt;10% warrants attention.</p>
    </div>
  );
}

// ── By Type Tab ───────────────────────────────────────────────────
function ByTypeTab({ years, initialYear }: { years: number[]; initialYear: number | null }) {
  const [year, setYear] = useState<number | null>(initialYear);
  const { data, isLoading } = useExemptionByType(year);

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
                <th className="px-3 py-2 text-left">Exemption Type</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Approved</th>
                <th className="px-3 py-2 text-right">Pending</th>
                <th className="px-3 py-2 text-right">Denied</th>
                <th className="px-3 py-2 text-right">Parcels</th>
                <th className="px-3 py-2 text-right">Total Value</th>
                <th className="px-3 py-2 text-right">Avg Amount</th>
                <th className="px-3 py-2 text-right">Min</th>
                <th className="px-3 py-2 text-right">Max</th>
                <th className="px-3 py-2 text-right">Avg Pct</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((r) => (
                <tr key={r.exemption_type ?? "null"} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5">
                    <Badge variant="outline" className="capitalize">{r.exemption_type ?? "—"}</Badge>
                  </td>
                  <td className="px-3 py-1.5 text-right">{fmt(r.total_count)}</td>
                  <td className="px-3 py-1.5 text-right text-green-600">{fmt(r.approved_count)}</td>
                  <td className="px-3 py-1.5 text-right text-yellow-600">{fmt(r.pending_count)}</td>
                  <td className="px-3 py-1.5 text-right text-red-600">{fmt(r.denied_count)}</td>
                  <td className="px-3 py-1.5 text-right">{fmt(r.parcel_count)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{fmtM(r.total_exemption_value)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.avg_exemption_amount)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.min_exemption_amount)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.max_exemption_amount)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtPct(r.avg_exemption_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Parcel Detail Tab ─────────────────────────────────────────────
function ParcelDetailTab({ years }: { years: number[] }) {
  const [year, setYear] = useState<number | null>(years[0] ?? null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { data, isLoading } = useExemptionDetail(year, null, statusFilter, 200);

  const statuses = ["approved", "pending", "denied"];

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <YearSelector years={years} selected={year} onChange={setYear} />
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-1 text-xs rounded-md border ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
            All
          </button>
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded-md border capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
              {s}
            </button>
          ))}
        </div>
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
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Assessed</th>
                <th className="px-3 py-2 text-right">Exempt $</th>
                <th className="px-3 py-2 text-right">% of Assessed</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Applied</th>
                <th className="px-3 py-2 text-right">Approved</th>
                <th className="px-3 py-2 text-right">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((r) => (
                <tr key={r.exemption_id} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5 font-mono">{r.parcel_number ?? "—"}</td>
                  <td className="px-3 py-1.5 max-w-[150px] truncate">{r.address ?? "—"}</td>
                  <td className="px-3 py-1.5"><Badge variant="outline" className="text-xs">{r.neighborhood_code ?? "—"}</Badge></td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.property_class ?? "—"}</td>
                  <td className="px-3 py-1.5 capitalize">{r.exemption_type ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.assessed_value)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{fmtDollar(r.exemption_amount)}</td>
                  <td className={`px-3 py-1.5 text-right ${(r.computed_pct_of_assessed ?? 0) > 50 ? "text-red-600" : (r.computed_pct_of_assessed ?? 0) > 25 ? "text-yellow-600" : ""}`}>
                    {fmtPct(r.computed_pct_of_assessed)}
                  </td>
                  <td className="px-3 py-1.5 text-center"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-1.5 text-right">{r.application_date?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{r.approval_date?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{r.expiration_date?.slice(0, 10) ?? "—"}</td>
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
export function ExemptionAnalysis() {
  const { data: summary } = useExemptionCountySummary();
  const years = (summary ?? []).map((r) => r.tax_year);
  const latestYear = years[0] ?? null;
  const [drillYear, setDrillYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const handleYearDrill = (y: number) => {
    setDrillYear(y);
    setActiveTab("by-type");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Exemption Analysis</h2>
        <p className="text-sm text-muted-foreground">
          County exemption coverage by type, year, and parcel — approved, pending, and denied.
          Tracks total exempt value and percentage of assessed roll removed from taxation.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">County Overview</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
          <TabsTrigger value="detail">Parcel Detail</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <CountyOverviewTab onDrill={handleYearDrill} />
        </TabsContent>
        <TabsContent value="by-type" className="mt-4">
          <ByTypeTab years={years} initialYear={drillYear ?? latestYear} />
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          <ParcelDetailTab years={years} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

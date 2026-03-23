import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useSalesReconciliationSummary,
  useSalesReconciliationDetails,
  useAssessmentReconciliationSummary,
  useAssessmentReconciliationDetails,
  type ReconciliationSummary,
  type AssessmentReconciliationSummary,
} from "@/hooks/useReconciliation";

// ── Helpers ───────────────────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtDollar(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function matchRate(rows: ReconciliationSummary[] | AssessmentReconciliationSummary[]): string {
  const total = rows.reduce((s, r) => s + r.record_count, 0);
  const matched = rows.find((r) => r.match_status === "matched")?.record_count ?? 0;
  if (total === 0) return "0%";
  return ((matched / total) * 100).toFixed(1) + "%";
}

function statusColor(status: string) {
  if (status === "matched") return "default";
  if (status === "tf_only") return "secondary";
  return "destructive";
}

// ── Summary Card Grid ─────────────────────────────────────────────
function SummaryCards({ rows }: { rows: ReconciliationSummary[] | AssessmentReconciliationSummary[] }) {
  const total = rows.reduce((s, r) => s + r.record_count, 0);
  const matched = rows.find((r) => r.match_status === "matched")?.record_count ?? 0;
  const tfOnly = rows.find((r) => r.match_status === "tf_only")?.record_count ?? 0;
  const pacsOnly = rows.find((r) => r.match_status === "pacs_only")?.record_count ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Match Rate</CardTitle></CardHeader>
        <CardContent><span className="text-2xl font-bold">{matchRate(rows)}</span></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Matched</CardTitle></CardHeader>
        <CardContent><span className="text-2xl font-bold text-green-600">{fmt(matched)}</span></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">TF Only</CardTitle></CardHeader>
        <CardContent><span className="text-2xl font-bold text-yellow-600">{fmt(tfOnly)}</span></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Legacy Only</CardTitle></CardHeader>
        <CardContent><span className="text-2xl font-bold text-red-600">{fmt(pacsOnly)}</span></CardContent>
      </Card>
    </div>
  );
}

// ── Sales Tab ─────────────────────────────────────────────────────
function SalesTab() {
  const { data: summary, isLoading: summaryLoading } = useSalesReconciliationSummary();
  const [filter, setFilter] = useState<"matched" | "tf_only" | "pacs_only">("matched");
  const { data: details, isLoading: detailsLoading } = useSalesReconciliationDetails(filter, 50);

  if (summaryLoading) return <p className="text-sm text-muted-foreground">Loading sales reconciliation…</p>;

  return (
    <div>
      <SummaryCards rows={summary ?? []} />

      {/* stat breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(summary ?? []).map((row) => (
          <Card key={row.match_status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant={statusColor(row.match_status)}>{row.match_status}</Badge>
                <span className="text-muted-foreground">({fmt(row.record_count)})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>Avg price Δ: {fmtDollar(row.avg_price_delta)}</p>
              <p>Max price Δ: {fmtDollar(row.max_price_delta)}</p>
              <p>Exact matches: {fmt(row.exact_price_matches)}</p>
              <p>Near (±$1k): {fmt(row.near_price_matches)}</p>
              <p>Discrepancies: {fmt(row.price_discrepancies)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* detail table */}
      <div className="flex gap-2 mb-3">
        {(["matched", "tf_only", "pacs_only"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-xs rounded-md border ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {detailsLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Parcel #</th>
                <th className="px-3 py-2 text-left">TF Date</th>
                <th className="px-3 py-2 text-right">TF Price</th>
                <th className="px-3 py-2 text-left">Legacy Date</th>
                <th className="px-3 py-2 text-right">Legacy Price</th>
                <th className="px-3 py-2 text-right">Δ Price</th>
                <th className="px-3 py-2 text-right">Δ Days</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(details ?? []).map((r, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5">{r.parcel_number ?? "—"}</td>
                  <td className="px-3 py-1.5">{r.tf_sale_date ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.tf_sale_price)}</td>
                  <td className="px-3 py-1.5">{r.pacs_sale_date ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.pacs_sale_price)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{fmtDollar(r.price_delta)}</td>
                  <td className="px-3 py-1.5 text-right">{r.date_delta_days ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Assessments Tab ───────────────────────────────────────────────
function AssessmentsTab() {
  const { data: summary, isLoading: summaryLoading } = useAssessmentReconciliationSummary();
  const [filter, setFilter] = useState<"matched" | "tf_only" | "pacs_only">("matched");
  const { data: details, isLoading: detailsLoading } = useAssessmentReconciliationDetails(filter, 50);

  if (summaryLoading) return <p className="text-sm text-muted-foreground">Loading assessment reconciliation…</p>;

  return (
    <div>
      <SummaryCards rows={summary ?? []} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(summary ?? []).map((row) => (
          <Card key={row.match_status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant={statusColor(row.match_status)}>{row.match_status}</Badge>
                <span className="text-muted-foreground">({fmt(row.record_count)})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>Avg total Δ: {fmtDollar(row.avg_total_delta)}</p>
              <p>Max total Δ: {fmtDollar(row.max_total_delta)}</p>
              <p>Avg land Δ: {fmtDollar(row.avg_land_delta)}</p>
              <p>Avg impr Δ: {fmtDollar(row.avg_improvement_delta)}</p>
              <p>Exact: {fmt(row.exact_value_matches)} | Near: {fmt(row.near_value_matches)} | Disc: {fmt(row.value_discrepancies)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        {(["matched", "tf_only", "pacs_only"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-xs rounded-md border ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {detailsLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Parcel #</th>
                <th className="px-3 py-2 text-right">Year</th>
                <th className="px-3 py-2 text-right">TF Total</th>
                <th className="px-3 py-2 text-right">Legacy Appraised</th>
                <th className="px-3 py-2 text-right">Δ Total</th>
                <th className="px-3 py-2 text-right">Δ Land</th>
                <th className="px-3 py-2 text-right">Δ Impr</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(details ?? []).map((r, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5">{r.parcel_number ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{r.tf_tax_year ?? r.pacs_roll_year ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.tf_total_value)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.pacs_total_appraised)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{fmtDollar(r.total_value_delta)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.land_value_delta)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtDollar(r.improvement_value_delta)}</td>
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
export function ReconciliationDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Data Reconciliation</h2>
        <p className="text-sm text-muted-foreground">
          Cross-reference TerraFusion canonical tables with legacy system data.
          Identify matches, gaps, and value discrepancies.
        </p>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Reconciliation</TabsTrigger>
          <TabsTrigger value="assessments">Assessment Reconciliation</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="mt-4">
          <SalesTab />
        </TabsContent>
        <TabsContent value="assessments" className="mt-4">
          <AssessmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

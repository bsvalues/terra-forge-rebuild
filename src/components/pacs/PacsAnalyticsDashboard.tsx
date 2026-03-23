import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  usePacsTableStats,
  usePacsValueByNeighborhood,
  usePacsSalesByYear,
  usePacsBridgeCoverage,
} from "@/hooks/usePacsAnalytics";
import { usePacsOwnerSearch } from "@/hooks/usePacsOwnerLookup";

// ── Formatters ────────────────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtDollar(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(1) + "%";
}

// ── Coverage Badge ────────────────────────────────────────────────
function CoverageBadge({ pct }: { pct: number }) {
  const variant = pct >= 80 ? "default" : pct >= 50 ? "secondary" : "destructive";
  return <Badge variant={variant}>{fmtPct(pct)}</Badge>;
}

// ── Bridge Coverage Card ──────────────────────────────────────────
function BridgeCoverageCard() {
  const { data, isLoading } = usePacsBridgeCoverage();

  if (isLoading) return <Card><CardContent className="p-4 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Legacy ↔ TerraFusion Bridge
          <CoverageBadge pct={data.link_coverage_pct} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Total Parcels</span>
            <p className="font-semibold">{fmt(data.total_parcels)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Linked (prop_id)</span>
            <p className="font-semibold text-green-600">{fmt(data.linked_parcels)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Legacy Owners</span>
            <p className="font-semibold">{fmt(data.pacs_owner_props)} props</p>
          </div>
          <div>
            <span className="text-muted-foreground">Legacy Assessed</span>
            <p className="font-semibold">{fmt(data.pacs_assessed_props)} props</p>
          </div>
          <div>
            <span className="text-muted-foreground">Legacy Sales</span>
            <p className="font-semibold">{fmt(data.pacs_sales_props)} props</p>
          </div>
          <div>
            <span className="text-muted-foreground">Legacy Profiles</span>
            <p className="font-semibold">{fmt(data.pacs_profile_props)} props</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Table Stats ───────────────────────────────────────────────────
function TableStatsGrid() {
  const { data, isLoading } = usePacsTableStats();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading table stats…</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {(data ?? []).map((t) => (
        <Card key={t.table_name}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-mono text-muted-foreground">
              {t.table_name.replace("pacs_", "")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rows</span>
              <span className="font-semibold">{fmt(t.row_count)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Properties</span>
              <span className="font-semibold">{fmt(t.unique_props)}</span>
            </div>
            {t.total_value != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-semibold">{fmtDollar(t.total_value)}</span>
              </div>
            )}
            {t.avg_value != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Value</span>
                <span className="font-semibold">{fmtDollar(t.avg_value)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Neighborhood Breakdown ────────────────────────────────────────
function NeighborhoodTable() {
  const { data, isLoading } = usePacsValueByNeighborhood();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading neighborhoods…</p>;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-xs">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left">Neighborhood</th>
            <th className="px-3 py-2 text-right">Properties</th>
            <th className="px-3 py-2 text-right">Total Appraised</th>
            <th className="px-3 py-2 text-right">Avg Appraised</th>
            <th className="px-3 py-2 text-right">Min</th>
            <th className="px-3 py-2 text-right">Max</th>
            <th className="px-3 py-2 text-right">Total Taxable</th>
            <th className="px-3 py-2 text-right">Use Codes</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data ?? []).map((n) => (
            <tr key={n.neighborhood} className="hover:bg-muted/50">
              <td className="px-3 py-1.5 font-mono">{n.neighborhood}</td>
              <td className="px-3 py-1.5 text-right">{fmt(n.property_count)}</td>
              <td className="px-3 py-1.5 text-right">{fmtDollar(n.total_appraised)}</td>
              <td className="px-3 py-1.5 text-right">{fmtDollar(n.avg_appraised)}</td>
              <td className="px-3 py-1.5 text-right">{fmtDollar(n.min_appraised)}</td>
              <td className="px-3 py-1.5 text-right">{fmtDollar(n.max_appraised)}</td>
              <td className="px-3 py-1.5 text-right">{fmtDollar(n.total_taxable)}</td>
              <td className="px-3 py-1.5 text-right">{n.use_code_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sales by Year ─────────────────────────────────────────────────
function SalesByYearTable() {
  const { data, isLoading } = usePacsSalesByYear();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading sales…</p>;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-xs">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left">Year</th>
            <th className="px-3 py-2 text-right">Sales</th>
            <th className="px-3 py-2 text-right">Total Volume</th>
            <th className="px-3 py-2 text-right">Avg Price</th>
            <th className="px-3 py-2 text-right">Max Price</th>
            <th className="px-3 py-2 text-right">Valid Prices</th>
            <th className="px-3 py-2 text-right">Avg Ratio</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data ?? []).map((y) => (
            <tr key={y.sale_year} className="hover:bg-muted/50">
              <td className="px-3 py-1.5 font-semibold">{y.sale_year}</td>
              <td className="px-3 py-1.5 text-right">{fmt(y.sale_count)}</td>
              <td className="px-3 py-1.5 text-right">{fmtDollar(y.total_volume)}</td>
              <td className="px-3 py-1.5 text-right">{fmtDollar(y.avg_price)}</td>
              <td className="px-3 py-1.5 text-right">{fmtDollar(y.max_price)}</td>
              <td className="px-3 py-1.5 text-right">{fmt(y.valid_price_count)}</td>
              <td className="px-3 py-1.5 text-right">{y.avg_ratio?.toFixed(4) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Owner Search ──────────────────────────────────────────────────
function OwnerSearch() {
  const [term, setTerm] = useState("");
  const searchTerm = term.length >= 3 ? term : null;
  const { data, isLoading } = usePacsOwnerSearch(searchTerm);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search owners by name (min 3 chars)…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="max-w-md"
      />
      {isLoading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Owner Name</th>
                <th className="px-3 py-2 text-right">Prop ID</th>
                <th className="px-3 py-2 text-right">Owner ID</th>
                <th className="px-3 py-2 text-right">Ownership %</th>
                <th className="px-3 py-2 text-right">Tax Year</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((o) => (
                <tr key={o.id} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5 font-medium">{o.owner_name ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{o.prop_id}</td>
                  <td className="px-3 py-1.5 text-right">{o.owner_id}</td>
                  <td className="px-3 py-1.5 text-right">{o.pct_ownership != null ? o.pct_ownership + "%" : "—"}</td>
                  <td className="px-3 py-1.5 text-right">{o.owner_tax_yr ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.length === 0 && searchTerm && (
        <p className="text-sm text-muted-foreground">No owners found for &quot;{term}&quot;</p>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────
export function PacsAnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Legacy Analytics</h2>
        <p className="text-sm text-muted-foreground">
          County-wide legacy system data overview — table health, bridge coverage, value
          distributions, sales activity, and owner search.
        </p>
      </div>

      <BridgeCoverageCard />

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Table Stats</TabsTrigger>
          <TabsTrigger value="neighborhoods">Neighborhoods</TabsTrigger>
          <TabsTrigger value="sales">Sales by Year</TabsTrigger>
          <TabsTrigger value="owners">Owner Search</TabsTrigger>
        </TabsList>
        <TabsContent value="tables" className="mt-4">
          <TableStatsGrid />
        </TabsContent>
        <TabsContent value="neighborhoods" className="mt-4">
          <NeighborhoodTable />
        </TabsContent>
        <TabsContent value="sales" className="mt-4">
          <SalesByYearTable />
        </TabsContent>
        <TabsContent value="owners" className="mt-4">
          <OwnerSearch />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import {
  useNeighborhoodSalesSummary,
  useNeighborhoodLandSummary,
  useNeighborhoodImprovementSummary,
} from "@/hooks/useNeighborhoodRollup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Map, Building, TrendingUp } from "lucide-react";

function fmt(v: number | null, decimals = 0): string {
  if (v == null) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function fmtCurrency(v: number | null): string {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function ratioBadge(ratio: number | null) {
  if (ratio == null) return <Badge variant="outline">—</Badge>;
  const variant =
    ratio >= 0.9 && ratio <= 1.1 ? "default" :
    ratio >= 0.8 && ratio <= 1.2 ? "secondary" : "destructive";
  return <Badge variant={variant}>{ratio.toFixed(4)}</Badge>;
}

export function NeighborhoodRollupDashboard() {
  const salesQ = useNeighborhoodSalesSummary();
  const landQ = useNeighborhoodLandSummary();
  const imprvQ = useNeighborhoodImprovementSummary();

  const isLoading = salesQ.isLoading || landQ.isLoading || imprvQ.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const totalParcels = landQ.data?.reduce((s, r) => s + r.parcel_count, 0) ?? 0;
  const totalSales = salesQ.data?.reduce((s, r) => s + r.sale_count, 0) ?? 0;
  const hoodCount = salesQ.data?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Map className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Neighborhood Rollup</h2>
        <span className="text-sm text-muted-foreground">
          {hoodCount} neighborhoods · {fmt(totalParcels)} parcels · {fmt(totalSales)} sales
        </span>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales" className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Sales & Ratios
          </TabsTrigger>
          <TabsTrigger value="land" className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Land
          </TabsTrigger>
          <TabsTrigger value="improvements" className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" />
            Improvements
          </TabsTrigger>
        </TabsList>

        {/* ── Sales & Ratios ─────────────────────────────────────── */}
        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sales Summary by Neighborhood</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hood</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead className="text-right">Median Price</TableHead>
                    <TableHead>Median Ratio</TableHead>
                    <TableHead className="text-right">IAAO Band %</TableHead>
                    <TableHead>Date Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesQ.data?.map((r) => (
                    <TableRow key={r.hood_cd}>
                      <TableCell className="font-medium">{r.hood_cd}</TableCell>
                      <TableCell className="text-right">{fmt(r.sale_count)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.avg_sale_price)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.median_sale_price)}</TableCell>
                      <TableCell>{ratioBadge(r.median_ratio)}</TableCell>
                      <TableCell className="text-right">{r.iaao_band_pct ?? "—"}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.earliest_sale?.slice(0, 10)} – {r.latest_sale?.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Land ───────────────────────────────────────────────── */}
        <TabsContent value="land" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Land Summary by Neighborhood</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hood</TableHead>
                    <TableHead className="text-right">Parcels</TableHead>
                    <TableHead className="text-right">Total Acres</TableHead>
                    <TableHead className="text-right">Total Land Val</TableHead>
                    <TableHead className="text-right">Avg Land Val</TableHead>
                    <TableHead className="text-right">Ag Value</TableHead>
                    <TableHead className="text-right">Types</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {landQ.data?.map((r) => (
                    <TableRow key={r.hood_cd}>
                      <TableCell className="font-medium">{r.hood_cd}</TableCell>
                      <TableCell className="text-right">{fmt(r.parcel_count)}</TableCell>
                      <TableCell className="text-right">{fmt(r.total_acres, 1)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.total_land_val)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.avg_land_val)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.total_ag_val)}</TableCell>
                      <TableCell className="text-right">{r.land_type_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Improvements ───────────────────────────────────────── */}
        <TabsContent value="improvements" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Improvement Summary by Neighborhood</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hood</TableHead>
                    <TableHead className="text-right">Improved</TableHead>
                    <TableHead className="text-right">Total Imprv</TableHead>
                    <TableHead className="text-right">Total Imprv Val</TableHead>
                    <TableHead className="text-right">Avg Imprv Val</TableHead>
                    <TableHead className="text-right">Avg Living Area</TableHead>
                    <TableHead className="text-right">Avg Year Built</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imprvQ.data?.map((r) => (
                    <TableRow key={r.hood_cd}>
                      <TableCell className="font-medium">{r.hood_cd}</TableCell>
                      <TableCell className="text-right">{fmt(r.improved_parcel_count)}</TableCell>
                      <TableCell className="text-right">{fmt(r.total_improvements)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.total_imprv_val)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.avg_imprv_val)}</TableCell>
                      <TableCell className="text-right">{fmt(r.avg_living_area, 0)} sf</TableCell>
                      <TableCell className="text-right">{fmt(r.avg_year_built, 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

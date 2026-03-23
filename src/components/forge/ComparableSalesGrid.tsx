// TerraFusion OS — Comparable Sales Grid (Phase 177)
// Sortable data table of qualified comparable sales for a given parcel.
// Consumes useComparableSales() — no new data fetching layer needed.

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ArrowUp, ArrowDown, Grid3X3 } from "lucide-react";
import { useComparableSales } from "@/hooks/useParcelDetails";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompSortKey = "sale_date" | "sale_price" | "ratio" | "price_per_sqft";

export interface ComparableSalesGridProps {
  parcelId: string | null;
  neighborhoodCode: string | null;
  assessedValue: number | null;
  /** Max rows to display. Default: 10 */
  limit?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(v: number | null | undefined) {
  if (v == null) return "—";
  return `$${v.toLocaleString()}`;
}

function fmtRatio(ratio: number | null) {
  if (ratio == null) return "—";
  return ratio.toFixed(3);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return d.slice(0, 10);
}

function sortIcon(active: boolean, asc: boolean) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return asc
    ? <ArrowUp className="w-3 h-3 text-primary" />
    : <ArrowDown className="w-3 h-3 text-primary" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ComparableSalesGrid({
  parcelId,
  neighborhoodCode,
  assessedValue,
  limit = 10,
}: ComparableSalesGridProps) {
  const [sortKey, setSortKey] = useState<CompSortKey>("sale_date");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: comps, isLoading } = useComparableSales(
    parcelId,
    neighborhoodCode,
    assessedValue,
  );

  // ── Derived rows ────────────────────────────────────────────────────────────
  const rows = (comps ?? []).map((c: any) => {
    const price: number = c.sale_price ?? 0;
    const area: number = c.parcels?.building_area ?? 0;
    const av: number = c.parcels?.assessed_value ?? 0;
    return {
      id: c.id as string,
      address: c.parcels?.address ?? "—",
      city: c.parcels?.city ?? "",
      saleDate: c.sale_date as string | null,
      salePrice: price > 0 ? price : null,
      pricePerSqft: area > 0 && price > 0 ? Math.round(price / area) : null,
      ratio: av > 0 && price > 0 ? av / price : null,
      deedType: c.deed_type as string | null,
    };
  });

  const sorted = [...rows].sort((a, b) => {
    let va: number | string | null = null;
    let vb: number | string | null = null;
    if (sortKey === "sale_date") { va = a.saleDate ?? ""; vb = b.saleDate ?? ""; }
    else if (sortKey === "sale_price") { va = a.salePrice ?? -1; vb = b.salePrice ?? -1; }
    else if (sortKey === "ratio") { va = a.ratio ?? -1; vb = b.ratio ?? -1; }
    else if (sortKey === "price_per_sqft") { va = a.pricePerSqft ?? -1; vb = b.pricePerSqft ?? -1; }

    if (typeof va === "string" && typeof vb === "string") {
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    const na = va as number;
    const nb = vb as number;
    return sortAsc ? na - nb : nb - na;
  });

  const visible = sorted.slice(0, limit);

  const toggleSort = (key: CompSortKey) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!parcelId) {
    return (
      <Card className="material-bento border-border/50">
        <CardContent className="p-6 text-center">
          <Grid3X3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Select a parcel to view comparable sales</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="material-bento border-border/50">
        <CardContent className="p-4 space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (visible.length === 0) {
    return (
      <Card className="material-bento border-border/50">
        <CardContent className="p-6 text-center">
          <Grid3X3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No qualified comparable sales found</p>
        </CardContent>
      </Card>
    );
  }

  function ColHeader({ label, sortable, sk }: { label: string; sortable?: CompSortKey; sk?: CompSortKey }) {
    if (!sortable) return <th className="px-3 py-2 text-left text-muted-foreground font-medium">{label}</th>;
    return (
      <th
        className="px-3 py-2 text-left text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors"
        onClick={() => toggleSort(sortable)}
      >
        <span className="flex items-center gap-1">
          {label}
          {sortIcon(sortKey === sortable, sortAsc)}
        </span>
      </th>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-suite-forge" />
            Comparable Sales
            <Badge variant="outline" className="text-[10px]">{rows.length} comps</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs min-w-[540px]">
            <thead>
              <tr className="border-b border-border/40">
                <ColHeader label="Address" />
                <ColHeader label="Sale Date" sortable="sale_date" />
                <ColHeader label="Sale Price" sortable="sale_price" />
                <ColHeader label="$/sqft" sortable="price_per_sqft" />
                <ColHeader label="AV/SP Ratio" sortable="ratio" />
                <ColHeader label="Deed" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border/20 hover:bg-muted/20 transition-colors",
                    i % 2 === 0 ? "bg-muted/5" : "",
                  )}
                >
                  <td className="px-3 py-2 text-foreground">
                    {row.address}{row.city ? `, ${row.city}` : ""}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmtDate(row.saleDate)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">{fmt$(row.salePrice)}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmt$(row.pricePerSqft)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.ratio != null ? (
                      <span className={cn(
                        row.ratio >= 0.9 && row.ratio <= 1.1
                          ? "text-[hsl(var(--tf-optimized-green))]"
                          : row.ratio >= 0.8 && row.ratio <= 1.2
                          ? "text-[hsl(var(--tf-sacred-gold))]"
                          : "text-[hsl(var(--tf-warning-red))]",
                      )}>
                        {fmtRatio(row.ratio)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.deedType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > limit && (
            <p className="text-[10px] text-muted-foreground text-right px-3 py-2">
              Showing {limit} of {rows.length} comps
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

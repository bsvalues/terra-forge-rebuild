import { useComparableSales } from "@/hooks/useComparableSales";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useParcel360 } from "@/hooks/useParcel360";
import { useWorkbench } from "./WorkbenchContext";
import { useAuthContext } from "@/contexts/AuthContext";

export function ComparableSalesPanel() {
  const { parcel } = useWorkbench();
  const { profile } = useAuthContext();
  const snapshot = useParcel360(parcel.id);

  const { data: comps, isLoading, error } = useComparableSales({
    neighborhoodCode: snapshot?.identity?.neighborhoodCode ?? null,
    propertyClass: snapshot?.identity?.propertyClass ?? null,
    countyId: profile?.county_id ?? null,
    excludeParcelId: parcel.id,
    limit: 15,
  });

  const fmt = (v: number | null) =>
    v != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
      : "\u2014";

  if (!parcel.id) {
    return <p className="text-center py-8 text-muted-foreground text-sm">Select a parcel to see comparable sales</p>;
  }

  if (isLoading) {
    return <div className="space-y-3 p-6">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (error) {
    return <p className="text-sm text-destructive p-6">Failed to load comparable sales</p>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6">
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Comparable Sales
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Qualified sales in {snapshot?.identity?.neighborhoodCode ?? "neighborhood"} {"\u2022"} {snapshot?.identity?.propertyClass ?? "all classes"}
        </p>

        {!comps || comps.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground text-sm">No comparable sales found in this neighborhood</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-4">Address</th>
                  <th className="text-left py-2 pr-4">Sale Date</th>
                  <th className="text-right py-2 pr-4">Price</th>
                  <th className="text-right py-2 pr-4">$/SqFt</th>
                  <th className="text-right py-2 pr-4">SqFt</th>
                  <th className="text-right py-2 pr-4">Year</th>
                  <th className="text-left py-2">Class</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 pr-4 font-medium max-w-[200px] truncate">{c.address ?? c.parcelNumber ?? "\u2014"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {c.saleDate ? new Date(c.saleDate).toLocaleDateString() : "\u2014"}
                    </td>
                    <td className="text-right py-2.5 pr-4 font-medium text-chart-5">{fmt(c.salePrice)}</td>
                    <td className="text-right py-2.5 pr-4 text-muted-foreground">{c.pricePerSqft ? `$${c.pricePerSqft}` : "\u2014"}</td>
                    <td className="text-right py-2.5 pr-4 text-muted-foreground">{c.sqft?.toLocaleString() ?? "\u2014"}</td>
                    <td className="text-right py-2.5 pr-4 text-muted-foreground">{c.yearBuilt ?? "\u2014"}</td>
                    <td className="py-2.5 text-muted-foreground">{c.propertyClass ?? "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

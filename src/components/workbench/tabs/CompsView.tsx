import { motion } from "framer-motion";
import { TrendingUp, MapPin, DollarSign, Home, Calendar, Ruler, ArrowUpDown } from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";
import { useComparableSales } from "@/hooks/useParcelDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function CompsView() {
  const { parcel } = useWorkbench();
  const hasParcel = parcel.id !== null;
  const { data: comps, isLoading } = useComparableSales(
    parcel.id,
    parcel.neighborhoodCode,
    parcel.assessedValue
  );

  const fmt = (v: number | null) =>
    v ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v) : "—";

  if (!hasParcel) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6">
        <div className="material-bento rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px]">
          <MapPin className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Parcel</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Search for a parcel in the context ribbon to find comparable sales in the same neighborhood.
          </p>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Subject Property Reference */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="material-bento rounded-xl p-4 border-l-4 border-tf-cyan">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Home className="w-3.5 h-3.5" />
          Subject Property
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-foreground">{parcel.parcelNumber}</span>
            <span className="text-muted-foreground ml-2 text-sm">{parcel.address}</span>
          </div>
          <span className="text-tf-green font-medium">{fmt(parcel.assessedValue)}</span>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowUpDown className="w-4 h-4" />
        <span>{comps?.length ?? 0} comparable sales found</span>
        {parcel.neighborhoodCode && (
          <Badge variant="outline" className="text-[10px]">Neighborhood: {parcel.neighborhoodCode}</Badge>
        )}
      </div>

      {/* Comps List */}
      {comps && comps.length > 0 ? (
        <div className="space-y-3">
          {comps.map((comp: any, idx: number) => {
            const p = comp.parcels;
            const ratio = p?.assessed_value && comp.sale_price
              ? (p.assessed_value / comp.sale_price)
              : null;
            return (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="material-bento rounded-xl p-4 hover:border-suite-forge/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{p?.parcel_number}</span>
                      <Badge className="bg-tf-green/20 text-tf-green border-tf-green/30 text-[10px]">Qualified</Badge>
                    </div>
                    <div className="font-medium text-foreground text-sm">{p?.address}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      {p?.city && <span>{p.city}</span>}
                      {p?.property_class && (
                        <span className="flex items-center gap-1"><Home className="w-3 h-3" />{p.property_class}</span>
                      )}
                      {p?.year_built && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Built {p.year_built}</span>
                      )}
                      {p?.building_area && (
                        <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{p.building_area.toLocaleString()} sf</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xs text-muted-foreground mb-0.5">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(comp.sale_date).toLocaleDateString()}
                    </div>
                    <div className="text-lg font-light text-tf-green">{fmt(comp.sale_price)}</div>
                    {ratio && (
                      <div className={`text-xs mt-0.5 ${ratio > 1.1 || ratio < 0.9 ? "text-tf-amber" : "text-muted-foreground"}`}>
                        Ratio: {ratio.toFixed(3)}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="material-bento rounded-2xl p-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Comparable Sales</h3>
          <p className="text-sm text-muted-foreground">No qualified sales found in this neighborhood.</p>
        </div>
      )}
    </div>
  );
}

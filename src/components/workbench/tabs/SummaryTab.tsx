import { motion } from "framer-motion";
import { 
  TrendingUp, 
  FileText, 
  Calendar,
  DollarSign,
  Home,
  MapPin,
  BarChart3,
  Gavel,
  ShieldCheck,
  ShieldX,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";
import { useAssessmentHistory, useParcelSales, useParcelAppeals } from "@/hooks/useParcelDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TerraTraceActivityFeed } from "@/components/proof/TerraTraceActivityFeed";

export function SummaryTab() {
  const { parcel, studyPeriod } = useWorkbench();
  const hasParcel = parcel.id !== null;

  if (!hasParcel) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-20 h-20 rounded-full bg-tf-cyan/10 flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-tf-cyan" />
          </div>
          <h2 className="text-2xl font-light text-foreground mb-2">No Parcel Selected</h2>
          <p className="text-muted-foreground mb-6">
            Search for a parcel using the search bar above, or select one from the map view.
          </p>
          <p className="text-xs text-muted-foreground">"One parcel, one screen, every role"</p>
        </motion.div>
      </div>
    );
  }

  return <ParcelSummaryContent />;
}

function ParcelSummaryContent() {
  const { parcel, studyPeriod } = useWorkbench();
  const { data: assessments, isLoading: loadingAssessments } = useAssessmentHistory(parcel.id);
  const { data: sales, isLoading: loadingSales } = useParcelSales(parcel.id);
  const { data: appeals, isLoading: loadingAppeals } = useParcelAppeals(parcel.id);

  const fmt = (v: number | null) =>
    v ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v) : "—";

  return (
    <div className="p-6 space-y-6">
      {/* Parcel Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="material-bento rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-tf-cyan text-sm font-medium mb-1">
              <MapPin className="w-4 h-4" />
              {parcel.parcelNumber}
            </div>
            <h1 className="text-2xl font-light text-foreground mb-1">{parcel.address || "Address Not Available"}</h1>
            <p className="text-muted-foreground">{parcel.city || "—"} • {parcel.neighborhoodCode || "—"}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">Assessed Value</div>
            <div className="text-3xl font-light text-tf-green">{fmt(parcel.assessedValue)}</div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Property Class", value: parcel.propertyClass || "—", icon: Home, color: "text-tf-cyan" },
          { label: "Neighborhood", value: parcel.neighborhoodCode || "—", icon: MapPin, color: "text-tf-gold" },
          { label: "Study Period", value: studyPeriod.name || "—", icon: Calendar, color: "text-tf-purple" },
          { label: "Sales Count", value: sales?.length?.toString() ?? "…", icon: DollarSign, color: "text-tf-green" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="material-bento rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <stat.icon className="w-3.5 h-3.5" />
              {stat.label}
            </div>
            <div className={`text-lg font-medium ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Assessment History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="material-bento rounded-2xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-tf-cyan" />
          Assessment History
        </h3>
        {loadingAssessments ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : assessments && assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-4">Tax Year</th>
                  <th className="text-right py-2 pr-4">Land</th>
                  <th className="text-right py-2 pr-4">Improvement</th>
                  <th className="text-right py-2 pr-4">Total</th>
                  <th className="text-center py-2 pr-4">Change</th>
                  <th className="text-center py-2">Certified</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, idx) => {
                  const prev = assessments[idx + 1];
                  const change = prev?.total_value && a.total_value
                    ? ((a.total_value - prev.total_value) / prev.total_value) * 100
                    : null;
                  return (
                    <tr key={a.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-4 font-medium">{a.tax_year}</td>
                      <td className="text-right py-2.5 pr-4 text-muted-foreground">{fmt(a.land_value)}</td>
                      <td className="text-right py-2.5 pr-4 text-muted-foreground">{fmt(a.improvement_value)}</td>
                      <td className="text-right py-2.5 pr-4 font-medium">{fmt(a.total_value)}</td>
                      <td className="text-center py-2.5 pr-4">
                        {change !== null ? (
                          <span className={`flex items-center justify-center gap-0.5 text-xs ${change >= 0 ? "text-tf-green" : "text-destructive"}`}>
                            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(change).toFixed(1)}%
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="text-center py-2.5">
                        {a.certified ? <ShieldCheck className="w-4 h-4 text-tf-green mx-auto" /> : <ShieldX className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-6 text-muted-foreground text-sm">No assessment records found</p>
        )}
      </motion.div>

      {/* Sales History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="material-bento rounded-2xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-tf-green" />
          Sales History
        </h3>
        {loadingSales ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : sales && sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-right py-2 pr-4">Price</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Grantor → Grantee</th>
                  <th className="text-center py-2">Qualified</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 pr-4 font-medium">{new Date(s.sale_date).toLocaleDateString()}</td>
                    <td className="text-right py-2.5 pr-4 text-tf-green font-medium">{fmt(s.sale_price)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{s.sale_type || s.deed_type || "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground text-xs truncate max-w-[200px]">
                      {s.grantor || "—"} → {s.grantee || "—"}
                    </td>
                    <td className="text-center py-2.5">
                      {s.is_qualified ? (
                        <Badge className="bg-tf-green/20 text-tf-green border-tf-green/30 text-[10px]">Qualified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Unqualified</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-6 text-muted-foreground text-sm">No sales records found</p>
        )}
      </motion.div>

      {/* Appeals */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="material-bento rounded-2xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Gavel className="w-5 h-5 text-tf-amber" />
          Appeals History
        </h3>
        {loadingAppeals ? (
          <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : appeals && appeals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* ... keep existing code (appeals table header and body) */}
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-4">Filed</th>
                  <th className="text-right py-2 pr-4">Original</th>
                  <th className="text-right py-2 pr-4">Requested</th>
                  <th className="text-right py-2 pr-4">Final</th>
                  <th className="text-left py-2 pr-4">Resolution</th>
                  <th className="text-center py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {appeals.map((a) => (
                  <tr key={a.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 pr-4">{new Date(a.appeal_date).toLocaleDateString()}</td>
                    <td className="text-right py-2.5 pr-4">{fmt(a.original_value)}</td>
                    <td className="text-right py-2.5 pr-4 text-muted-foreground">{fmt(a.requested_value)}</td>
                    <td className="text-right py-2.5 pr-4 font-medium">{fmt(a.final_value)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{a.resolution_type || "—"}</td>
                    <td className="text-center py-2.5">
                      <Badge variant={a.status === "resolved" ? "default" : "outline"} className="text-[10px]">
                        {a.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-6 text-muted-foreground text-sm">No appeals on record</p>
        )}
      </motion.div>

      {/* TerraTrace Activity Feed */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="material-bento rounded-2xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-tf-cyan" />
          TerraTrace Activity Feed
        </h3>
        <TerraTraceActivityFeed parcelId={parcel.id} />
      </motion.div>
    </div>
  );
}

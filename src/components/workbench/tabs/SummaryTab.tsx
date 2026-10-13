import { motion } from "framer-motion";
import { MapPin, ArrowRight, BarChart3, ArrowUpRight, ArrowDownRight, ShieldCheck, ShieldX, BookOpen, DollarSign } from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";
import { useParcel360 } from "@/hooks/useParcel360";
import { useParcelAdjustments } from "@/hooks/useValueAdjustments";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { WorkToolBar } from "@/components/navigation/WorkToolBar";
import { useWorkspaceTool } from "@/hooks/useWorkspaceTool";
import { ParcelDetailEditor } from "../ParcelDetailEditor";
import { SalesHistoryPanel } from "../SalesHistoryPanel";
import { ParcelHistoryTimeline } from "../ParcelHistoryTimeline";
import { DataLineageViewer } from "../DataLineageViewer";
import { TerraTraceActivityFeed } from "@/components/proof/TerraTraceActivityFeed";
import { useRecentParcels } from "@/hooks/useRecentParcels";
import { cn } from "@/lib/utils";

export function SummaryTab() {
  const { parcel, setParcel, setActiveTab } = useWorkbench();
  const { recents } = useRecentParcels();
  if (!parcel.id) return <div className="module-page space-y-6">
    <header className="border-b border-border pb-4"><h1 className="text-2xl font-semibold">Find a property</h1></header>
    <section aria-labelledby="recent-properties"><h2 id="recent-properties" className="text-base font-semibold mb-3">Recently opened</h2>
      {recents.length === 0 ? <p className="text-sm text-muted-foreground">No recently opened properties</p> : <div className="divide-y divide-border">{recents.slice(0, 8).map(recent => <Button key={recent.id} variant="ghost" className="flex w-full h-auto justify-start py-4 gap-3 whitespace-normal text-left" onClick={() => { setParcel({ id: recent.id, parcelNumber: recent.parcelNumber, address: recent.address, assessedValue: recent.assessedValue, city: null, propertyClass: null, neighborhoodCode: null, latitude: null, longitude: null }); setActiveTab("summary"); }}><MapPin className="h-4 w-4 shrink-0 text-primary" /><span><span className="block font-medium">{recent.address || recent.parcelNumber}</span><span className="block text-xs text-muted-foreground">{recent.parcelNumber}</span></span><ArrowRight className="h-4 w-4 ml-auto shrink-0" /></Button>)}</div>}
    </section>
  </div>;
  return <ParcelSummaryContent />;
}
function ParcelSummaryContent() {
  const { parcel, setActiveTab } = useWorkbench();
  const snapshot = useParcel360(parcel.id);
  const [view, setView] = useWorkspaceTool("propertyTool", ["details", "history", "sales", "adjustments", "timeline", "activity", "lineage"], "details");
  const fmt = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  if (!snapshot) return <div className="module-page"><Skeleton className="h-32 w-full" /></div>;
  return <div className="module-page space-y-5">
    <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-border pb-4">
      <div><p className="text-xs text-muted-foreground">Assessed value</p><p className="text-2xl font-semibold">{fmt(snapshot.valuation.assessedValue)}</p></div>
      <div><p className="text-xs text-muted-foreground">Land</p><p className="font-medium">{fmt(snapshot.valuation.landValue)}</p></div>
      <div><p className="text-xs text-muted-foreground">Improvements</p><p className="font-medium">{fmt(snapshot.valuation.improvementValue)}</p></div>
      <Button className="ml-auto gap-2" onClick={() => setActiveTab("forge")}>Review assessment<ArrowRight className="h-4 w-4" /></Button>
    </div>
    {snapshot.missingDomains.length > 0 && <p className="text-sm text-destructive">Unavailable records: {snapshot.missingDomains.join(", ")}</p>}
    <WorkToolBar active={view} onSelect={setView} primary={["details", "history", "sales"]} tools={[
      { id:"details", label:"Property details", icon:MapPin }, { id:"history", label:"Assessment history", icon:BarChart3 }, { id:"sales", label:"Sales", icon:DollarSign },
      { id:"adjustments", label:"Value adjustments", group:"Assessment records" }, { id:"timeline", label:"Property timeline", group:"Evidence" }, { id:"activity", label:"Audit activity", group:"Evidence" }, { id:"lineage", label:"Data sources", group:"Evidence" }
    ]} />
    <Tabs value={view}>
      <TabsContent value="details"><ParcelDetailEditor /></TabsContent>
        {/* Assessment History */}
        <TabsContent value="history">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border py-4">
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Assessment History
            </h3>
            {snapshot.domainStates.valuation.loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : snapshot.valuation.history.length > 0 ? (
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
                    {snapshot.valuation.history.map((a, idx) => {
                      const prev = snapshot.valuation.history[idx + 1];
                      const change =
                        prev?.totalValue && a.totalValue
                          ? ((a.totalValue - prev.totalValue) / prev.totalValue) * 100
                          : null;
                      return (
                        <tr key={a.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 pr-4 font-medium">{a.taxYear}</td>
                          <td className="text-right py-2.5 pr-4 text-muted-foreground">{fmt(a.landValue)}</td>
                          <td className="text-right py-2.5 pr-4 text-muted-foreground">{fmt(a.improvementValue)}</td>
                          <td className="text-right py-2.5 pr-4 font-medium">{fmt(a.totalValue)}</td>
                          <td className="text-center py-2.5 pr-4">
                            {change !== null ? (
                              <span className={`flex items-center justify-center gap-0.5 text-xs ${change >= 0 ? "text-chart-5" : "text-destructive"}`}>
                                {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(change).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="text-center py-2.5">
                            {a.certified ? <ShieldCheck className="w-4 h-4 text-chart-5 mx-auto" /> : <ShieldX className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
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
        </TabsContent>


      <TabsContent value="sales"><SalesHistoryPanel parcelId={parcel.id} parcelNumber={snapshot.identity.parcelNumber} /></TabsContent>
      <TabsContent value="adjustments"><AdjustmentsSection parcelId={parcel.id} /></TabsContent>
      <TabsContent value="timeline"><ParcelHistoryTimeline parcelId={parcel.id} /></TabsContent>
      <TabsContent value="activity"><TerraTraceActivityFeed parcelId={parcel.id} /></TabsContent>
      <TabsContent value="lineage"><DataLineageViewer /></TabsContent>
    </Tabs>
  </div>;
}
// ---- Adjustments Section ----
function AdjustmentsSection({ parcelId }: { parcelId: string | null }) {
  const { data: adjustments, isLoading } = useParcelAdjustments(parcelId);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border py-4">
      <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        Value Adjustment Ledger
      </h3>
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : adjustments && adjustments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-right py-2 pr-4">Previous</th>
                <th className="text-right py-2 pr-4">New</th>
                <th className="text-center py-2 pr-4">Change</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adj) => {
                const delta = adj.new_value - adj.previous_value;
                const pct = adj.previous_value > 0 ? (delta / adj.previous_value) * 100 : 0;
                const isRolledBack = !!adj.rolled_back_at;
                return (
                  <tr key={adj.id} className={cn(
                    "border-b border-border/20 hover:bg-muted/20 transition-colors",
                    isRolledBack && "opacity-50"
                  )}>
                    <td className="py-2.5 pr-4 font-medium text-xs">
                      {new Date(adj.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant="outline" className="text-[10px]">{adj.adjustment_type}</Badge>
                    </td>
                    <td className="text-right py-2.5 pr-4 text-muted-foreground">{fmt(adj.previous_value)}</td>
                    <td className="text-right py-2.5 pr-4 font-medium">{fmt(adj.new_value)}</td>
                    <td className="text-center py-2.5 pr-4">
                      <span className={cn(
                        "flex items-center justify-center gap-0.5 text-xs",
                        delta >= 0 ? "text-chart-5" : "text-destructive"
                      )}>
                        {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(pct).toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center py-2.5">
                      {isRolledBack ? (
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Rolled Back</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-chart-5/20 text-chart-5 border-chart-5/30">Active</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center py-6 text-muted-foreground text-sm">No value adjustments recorded for this parcel</p>
      )}
    </motion.div>
  );
}


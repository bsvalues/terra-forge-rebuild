import { useState } from "react";
import { ExecutiveKpiCards } from "../ExecutiveKpiCards";
import { AssessmentSparkline } from "../AssessmentSparkline";
import { ValueChangeExplainer } from "../ValueChangeExplainer";
import { TraceActivityFeed } from "@/components/trace/TraceActivityFeed";
import { WatchlistPanel } from "@/components/workbench/WatchlistPanel";
import { ParcelTimeline } from "@/components/workbench/ParcelTimeline";
import { DataLineageViewer } from "@/components/workbench/DataLineageViewer";
import { ParcelHistoryTimeline } from "@/components/workbench/ParcelHistoryTimeline";
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
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  BookOpen,
  Shield,
} from "lucide-react";
import { Star } from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";
import { useParcel360 } from "@/hooks/useParcel360";
import { useParcelAdjustments } from "@/hooks/useValueAdjustments";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TerraTraceActivityFeed } from "@/components/proof/TerraTraceActivityFeed";
import { TraceChainIntegrityPanel } from "@/components/proof/TraceChainIntegrityPanel";
import { useAuthContext } from "@/contexts/AuthContext";
import { ParcelDetailEditor } from "../ParcelDetailEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DomainLoadState } from "@/types/parcel360";
import { useIsWatched, useToggleWatchlist } from "@/hooks/useParcelWatchlist";

export function SummaryTab() {
  const { parcel } = useWorkbench();
  const hasParcel = parcel.id !== null;

  if (!hasParcel) {
    return (
      <div className="space-y-8 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto pt-4 pb-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-light text-foreground mb-2">No Parcel Selected</h2>
          <p className="text-muted-foreground mb-6">
            Search for a parcel using the search bar above, or select one from the map view.
          </p>
          <p className="text-xs text-muted-foreground">"One parcel, one screen, every role"</p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WatchlistPanel />
          <TraceActivityFeed />
        </div>
        <ExecutiveKpiCards />
      </div>
    );
  }

  return <ParcelSummaryContent />;
}

// ---- Freshness chip ----
function FreshnessIndicator({ label, asOf, state }: { label: string; asOf: string | null; state: DomainLoadState }) {
  if (state.loading) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        {label}
      </span>
    );
  }
  if (state.error) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-destructive/10 rounded-full px-2 py-0.5 text-destructive">
        <XCircle className="w-3 h-3" />
        {label}
      </span>
    );
  }
  const timeLabel = asOf ? formatFreshness(asOf) : "no data";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 rounded-full px-2 py-0.5 text-primary">
      <CheckCircle2 className="w-3 h-3" />
      {label}
      <span className="text-muted-foreground ml-0.5">{timeLabel}</span>
    </span>
  );
}

function formatFreshness(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---- Operational Blockers ----
function OperationalBlockers({ snapshot }: { snapshot: NonNullable<ReturnType<typeof useParcel360>> }) {
  const blockers: { icon: typeof AlertTriangle; label: string; severity: "error" | "warn" | "info" }[] = [];

  // Pending appeals block certification
  if (snapshot.workflows.pendingAppeals.length > 0) {
    blockers.push({
      icon: Gavel,
      label: `${snapshot.workflows.pendingAppeals.length} pending appeal${snapshot.workflows.pendingAppeals.length > 1 ? "s" : ""}`,
      severity: "error",
    });
  }

  // Uncertified assessment
  if (snapshot.workflows.certificationStatus === "uncertified") {
    blockers.push({
      icon: ShieldX,
      label: "Current assessment uncertified",
      severity: "warn",
    });
  }

  // No assessment at all
  if (snapshot.workflows.certificationStatus === "unknown") {
    blockers.push({
      icon: AlertTriangle,
      label: "No assessment record found",
      severity: "warn",
    });
  }

  // Open permits may affect value
  if (snapshot.workflows.openPermits.length > 0) {
    blockers.push({
      icon: FileText,
      label: `${snapshot.workflows.openPermits.length} open permit${snapshot.workflows.openPermits.length > 1 ? "s" : ""} may affect value`,
      severity: "info",
    });
  }

  // Missing domain data
  if (snapshot.missingDomains.length > 0) {
    blockers.push({
      icon: XCircle,
      label: `Data unavailable: ${snapshot.missingDomains.join(", ")}`,
      severity: "warn",
    });
  }

  if (blockers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-chart-5 bg-chart-5/10 rounded-lg px-4 py-3">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>No blockers — parcel is certification-ready</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blockers.map((b, i) => {
        const Icon = b.icon;
        const colors = {
          error: "bg-destructive/10 text-destructive border-destructive/20",
          warn: "bg-chart-4/10 text-chart-4 border-chart-4/20",
          info: "bg-primary/10 text-primary border-primary/20",
        };
        return (
          <div key={i} className={cn("flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 border", colors[b.severity])}>
            <Icon className="w-4 h-4 shrink-0" />
            <span>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Main Content ----
function ParcelSummaryContent() {
  const { parcel } = useWorkbench();
  const snapshot = useParcel360(parcel.id);
  const { isWatched, watchItem } = useIsWatched(parcel.id);
  const { toggle: toggleWatch, isPending: watchPending } = useToggleWatchlist();
  const { profile } = useAuthContext();

  const fmt = (v: number | null | undefined) =>
    v != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
      : "—";

  // While identity is loading
  if (!snapshot) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Parcel Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
              <MapPin className="w-4 h-4" />
              {snapshot.identity.parcelNumber}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-1"
                disabled={watchPending}
                onClick={() => parcel.id && toggleWatch(parcel.id, watchItem)}
                title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Star className={cn("w-4 h-4", isWatched ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
              </Button>
            </div>
            <h1 className="text-2xl font-light text-foreground mb-1">{snapshot.identity.address || "Address Not Available"}</h1>
            <p className="text-muted-foreground">
              {snapshot.identity.city || "—"} • {snapshot.identity.neighborhoodCode || "—"}
              {snapshot.identity.propertyClass && (
                <Badge variant="outline" className="ml-2 text-[10px]">{snapshot.identity.propertyClass}</Badge>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">Assessed Value</div>
            <div className="text-3xl font-light text-chart-5">{fmt(snapshot.valuation.assessedValue)}</div>
            {snapshot.valuation.landValue != null && snapshot.valuation.improvementValue != null && (
              <div className="text-xs text-muted-foreground mt-1">
                Land {fmt(snapshot.valuation.landValue)} • Impr {fmt(snapshot.valuation.improvementValue)}
              </div>
            )}
          </div>
        </div>

        {/* Domain Freshness Ribbon */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/30">
          <FreshnessIndicator label="Identity" asOf={snapshot.freshness.identityAsOf} state={snapshot.domainStates.identity} />
          <FreshnessIndicator label="Valuation" asOf={snapshot.freshness.valuationAsOf} state={snapshot.domainStates.valuation} />
          <FreshnessIndicator label="Sales" asOf={snapshot.sales.recentSales[0]?.saleDate || null} state={snapshot.domainStates.sales} />
          <FreshnessIndicator label="Workflows" asOf={snapshot.freshness.workflowsAsOf} state={snapshot.domainStates.workflows} />
          <FreshnessIndicator label="Evidence" asOf={snapshot.freshness.evidenceAsOf} state={snapshot.domainStates.evidence} />
        </div>
      </motion.div>

      {/* Operational Blockers */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-chart-4" />
          Certification Blockers
        </h3>
        <OperationalBlockers snapshot={snapshot} />
      </motion.div>

      {/* Assessment Sparkline */}
      {snapshot.valuation.history.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Value Trend ({snapshot.valuation.history.length} years)</span>
              <TrendingUp className="w-3.5 h-3.5 text-chart-5" />
            </div>
            <AssessmentSparkline history={snapshot.valuation.history} />
          </div>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickStat icon={BarChart3} label="Assessments" value={snapshot.valuation.history.length} />
        <QuickStat icon={DollarSign} label="Qualified Sales" value={snapshot.sales.qualifiedCount} />
        <QuickStat icon={Gavel} label="Pending Appeals" value={snapshot.workflows.pendingAppeals.length} alert={snapshot.workflows.pendingAppeals.length > 0} />
        <QuickStat icon={FileText} label="Open Permits" value={snapshot.workflows.openPermits.length} />
      </motion.div>

      {/* AI Value Change Explainer */}
      {snapshot.valuation.history.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <ValueChangeExplainer
            parcelNumber={snapshot.identity.parcelNumber}
            address={snapshot.identity.address}
            propertyClass={snapshot.identity.propertyClass}
            currentValue={snapshot.valuation.assessedValue ?? 0}
            priorValue={
              snapshot.valuation.history.length >= 2
                ? (snapshot.valuation.history[1].totalValue ?? snapshot.valuation.history[1].landValue + snapshot.valuation.history[1].improvementValue)
                : null
            }
            landValue={snapshot.valuation.landValue}
            improvementValue={snapshot.valuation.improvementValue}
            neighborhoodCode={snapshot.identity.neighborhoodCode}
          />
        </motion.div>
      )}

      {/* Trust OS: Chain Integrity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-chart-5" />
          Trust Layer
        </h3>
        <TraceChainIntegrityPanel countyId={profile?.county_id} />
      </motion.div>

      {/* Main Content: Tabbed */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="bg-muted/50 mb-4">
          <TabsTrigger value="details" className="text-xs gap-1.5">
            <Home className="w-3.5 h-3.5" />
            Details
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="sales" className="text-xs gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="appeals" className="text-xs gap-1.5">
            <Gavel className="w-3.5 h-3.5" />
            Appeals
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="text-xs gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Adjustments
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Parcel Detail Editor */}
        <TabsContent value="details">
          <ParcelDetailEditor />
        </TabsContent>

        {/* Assessment History */}
        <TabsContent value="history">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl p-6">
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

        {/* Sales History */}
        <TabsContent value="sales">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl p-6">
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-chart-5" />
              Sales History
            </h3>
            {snapshot.domainStates.sales.loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : snapshot.sales.recentSales.length > 0 ? (
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
                    {snapshot.sales.recentSales.map((s) => (
                      <tr key={s.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pr-4 font-medium">{new Date(s.saleDate).toLocaleDateString()}</td>
                        <td className="text-right py-2.5 pr-4 text-chart-5 font-medium">{fmt(s.salePrice)}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{s.saleType || s.deedType || "—"}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground text-xs truncate max-w-[200px]">
                          {s.grantor || "—"} → {s.grantee || "—"}
                        </td>
                        <td className="text-center py-2.5">
                          {s.isQualified ? (
                            <Badge className="bg-chart-5/20 text-chart-5 border-chart-5/30 text-[10px]">Qualified</Badge>
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
        </TabsContent>

        {/* Appeals */}
        <TabsContent value="appeals">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl p-6">
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-chart-4" />
              Appeals History
            </h3>
            {snapshot.domainStates.workflows.loading ? (
              <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : snapshot.workflows.pendingAppeals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4">Filed</th>
                      <th className="text-right py-2 pr-4">Original</th>
                      <th className="text-right py-2 pr-4">Requested</th>
                      <th className="text-right py-2 pr-4">Final</th>
                      <th className="text-center py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.workflows.pendingAppeals.map((a) => (
                      <tr key={a.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pr-4">{new Date(a.appealDate).toLocaleDateString()}</td>
                        <td className="text-right py-2.5 pr-4">{fmt(a.originalValue)}</td>
                        <td className="text-right py-2.5 pr-4 text-muted-foreground">{fmt(a.requestedValue)}</td>
                        <td className="text-right py-2.5 pr-4 font-medium">{fmt(a.finalValue)}</td>
                        <td className="text-center py-2.5">
                          <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground text-sm">No pending appeals</p>
            )}
          </motion.div>
        </TabsContent>

        {/* Adjustments */}
        <TabsContent value="adjustments">
          <AdjustmentsSection parcelId={parcel.id} />
        </TabsContent>

        {/* Activity Feed */}
        <TabsContent value="activity">
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl p-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                TerraTrace Activity Feed
              </h3>
              <TerraTraceActivityFeed parcelId={parcel.id} />
            </motion.div>
            <ParcelTimeline />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Adjustments Section ----
function AdjustmentsSection({ parcelId }: { parcelId: string | null }) {
  const { data: adjustments, isLoading } = useParcelAdjustments(parcelId);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-[hsl(var(--suite-forge))]" />
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

// ---- Quick Stat Card ----
function QuickStat({ icon: Icon, label, value, alert }: { icon: typeof BarChart3; label: string; value: number; alert?: boolean }) {
  return (
    <div className={cn(
      "bg-card border rounded-xl p-4 flex items-center gap-3",
      alert ? "border-destructive/30 bg-destructive/5" : "border-border/50"
    )}>
      <Icon className={cn("w-5 h-5 shrink-0", alert ? "text-destructive" : "text-muted-foreground")} />
      <div>
        <div className={cn("text-xl font-medium", alert ? "text-destructive" : "text-foreground")}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

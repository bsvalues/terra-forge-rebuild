// TerraFusion OS — Neighborhood Deep-Dive Dialog
// Agent Traffic Cop: "The data is telling me to burn things" 🚦📎

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  Building2,
  DollarSign,
  FileText,
  Gavel,
  Home,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NeighborhoodDeepDiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  neighborhoodCode: string | null;
}

function useNeighborhoodStats(code: string | null) {
  return useQuery({
    queryKey: ["nbhd-deep-dive", code],
    queryFn: async () => {
      if (!code) return null;
      const currentYear = new Date().getFullYear();

      // Parallel queries for all stats
      const [parcelsRes, assessmentsRes, salesRes, appealsRes, permitsRes, exemptionsRes, calibRes] = await Promise.all([
        supabase.from("parcels").select("id, assessed_value, property_class, year_built, building_area, latitude").eq("neighborhood_code", code).limit(2000),
        supabase.from("assessments").select("parcel_id, land_value, improvement_value, total_value, certified, tax_year").eq("tax_year", currentYear).limit(5000),
        supabase.from("sales").select("parcel_id, sale_price, sale_date, is_qualified").limit(5000),
        supabase.from("appeals").select("parcel_id, status").in("status", ["filed", "pending", "scheduled"]),
        supabase.from("permits").select("parcel_id, status, permit_type").in("status", ["applied", "pending", "issued"]),
        supabase.from("exemptions").select("parcel_id, status, exemption_type").eq("status", "pending"),
        supabase.from("calibration_runs").select("r_squared, rmse, sample_size, created_at, variables").eq("neighborhood_code", code).order("created_at", { ascending: false }).limit(1),
      ]);

      const parcels = parcelsRes.data || [];
      const parcelIds = new Set(parcels.map(p => p.id));

      // Filter related data to this neighborhood's parcels
      const nbhdAssessments = (assessmentsRes.data || []).filter(a => parcelIds.has(a.parcel_id));
      const nbhdSales = (salesRes.data || []).filter(s => parcelIds.has(s.parcel_id));
      const nbhdAppeals = (appealsRes.data || []).filter(a => parcelIds.has(a.parcel_id));
      const nbhdPermits = (permitsRes.data || []).filter(p => parcelIds.has(p.parcel_id));
      const nbhdExemptions = (exemptionsRes.data || []).filter(e => parcelIds.has(e.parcel_id));

      // Parcel stats
      const values = parcels.map(p => p.assessed_value).filter(Boolean).sort((a, b) => a - b);
      const medianValue = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;
      const avgValue = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
      const withCoords = parcels.filter(p => p.latitude != null).length;
      const coordsPct = parcels.length > 0 ? Math.round((withCoords / parcels.length) * 100) : 0;

      // Property class distribution
      const classCounts = new Map<string, number>();
      for (const p of parcels) {
        const cls = p.property_class || "Unknown";
        classCounts.set(cls, (classCounts.get(cls) || 0) + 1);
      }
      const classDistribution = Array.from(classCounts.entries())
        .map(([cls, count]) => ({ cls, count, pct: Math.round((count / parcels.length) * 100) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Certification
      const certifiedCount = nbhdAssessments.filter(a => a.certified).length;
      const certPct = nbhdAssessments.length > 0 ? Math.round((certifiedCount / nbhdAssessments.length) * 100) : 0;

      // Sales
      const qualifiedSales = nbhdSales.filter(s => s.is_qualified);
      const recentSales = nbhdSales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).slice(0, 5);

      // Calibration
      const calibration = calibRes.data?.[0] || null;

      return {
        parcelCount: parcels.length,
        medianValue,
        avgValue,
        coordsPct,
        classDistribution,
        certifiedCount,
        certPct,
        assessmentCount: nbhdAssessments.length,
        qualifiedSalesCount: qualifiedSales.length,
        totalSalesCount: nbhdSales.length,
        recentSales,
        pendingAppeals: nbhdAppeals.length,
        openPermits: nbhdPermits.length,
        pendingExemptions: nbhdExemptions.length,
        calibration: calibration ? {
          rSquared: calibration.r_squared,
          rmse: calibration.rmse,
          sampleSize: calibration.sample_size,
          date: calibration.created_at,
          variables: calibration.variables,
        } : null,
      };
    },
    enabled: !!code,
    staleTime: 60_000,
  });
}

const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export function NeighborhoodDeepDiveDialog({ open, onOpenChange, neighborhoodCode }: NeighborhoodDeepDiveDialogProps) {
  const { data: stats, isLoading } = useNeighborhoodStats(open ? neighborhoodCode : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Neighborhood {neighborhoodCode}
            <Badge variant="outline" className="ml-2 text-xs">{stats?.parcelCount ?? 0} parcels</Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading || !stats ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-5 py-2">

            {/* Value Overview */}
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Valuation Overview</h3>
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={DollarSign} label="Median Value" value={fmt(stats.medianValue)} color="text-chart-5" />
                <StatCard icon={TrendingUp} label="Average Value" value={fmt(stats.avgValue)} color="text-primary" />
                <StatCard icon={Home} label="Parcels" value={stats.parcelCount.toLocaleString()} color="text-foreground" />
              </div>
            </section>

            <Separator />

            {/* Certification + Data Quality */}
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Certification & Quality</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {stats.certPct >= 90 ? (
                      <ShieldCheck className="w-4 h-4 text-chart-5" />
                    ) : (
                      <ShieldX className="w-4 h-4 text-chart-4" />
                    )}
                    <span className="text-sm font-medium">Certification</span>
                    <Badge variant="outline" className={cn(
                      "ml-auto text-[10px]",
                      stats.certPct >= 90 ? "bg-chart-5/10 text-chart-5 border-chart-5/30" :
                      stats.certPct >= 50 ? "bg-chart-4/10 text-chart-4 border-chart-4/30" :
                      "bg-destructive/10 text-destructive border-destructive/30"
                    )}>
                      {stats.certPct}%
                    </Badge>
                  </div>
                  <Progress value={stats.certPct} className="h-2 mb-1" />
                  <p className="text-[10px] text-muted-foreground">{stats.certifiedCount} of {stats.assessmentCount} assessments certified</p>
                </div>

                <div className="rounded-xl border border-border/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Geo Coverage</span>
                    <Badge variant="outline" className={cn(
                      "ml-auto text-[10px]",
                      stats.coordsPct >= 80 ? "bg-chart-5/10 text-chart-5 border-chart-5/30" :
                      "bg-chart-4/10 text-chart-4 border-chart-4/30"
                    )}>
                      {stats.coordsPct}%
                    </Badge>
                  </div>
                  <Progress value={stats.coordsPct} className="h-2 mb-1" />
                  <p className="text-[10px] text-muted-foreground">Parcels with coordinates</p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Calibration Model */}
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Calibration Model</h3>
              {stats.calibration ? (
                <div className="rounded-xl border border-chart-5/20 bg-chart-5/5 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-4 h-4 text-chart-5" />
                    <span className="text-sm font-medium">Active Model</span>
                    <Badge className="ml-auto bg-chart-5/20 text-chart-5 border-chart-5/30 text-[10px]">
                      R² {((stats.calibration.rSquared ?? 0) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">RMSE</span>
                      <p className="font-medium">{stats.calibration.rmse ? `$${Math.round(stats.calibration.rmse).toLocaleString()}` : "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sample Size</span>
                      <p className="font-medium">{stats.calibration.sampleSize ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Run</span>
                      <p className="font-medium">{stats.calibration.date ? new Date(stats.calibration.date).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                  {stats.calibration.variables && (stats.calibration.variables as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(stats.calibration.variables as string[]).map(v => (
                        <Badge key={v} variant="outline" className="text-[9px] px-1.5 py-0">{v}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 p-4 text-center">
                  <BarChart3 className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No calibration model run yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Navigate to Factory → Regression to calibrate</p>
                </div>
              )}
            </section>

            <Separator />

            {/* Workflows */}
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Active Workflows</h3>
              <div className="grid grid-cols-3 gap-3">
                <WorkflowCard icon={Gavel} label="Pending Appeals" count={stats.pendingAppeals} color="text-destructive" />
                <WorkflowCard icon={FileText} label="Open Permits" count={stats.openPermits} color="text-chart-4" />
                <WorkflowCard icon={Building2} label="Pending Exemptions" count={stats.pendingExemptions} color="text-primary" />
              </div>
            </section>

            <Separator />

            {/* Property Class Distribution */}
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Property Classes</h3>
              <div className="space-y-2">
                {stats.classDistribution.map(item => (
                  <div key={item.cls} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-foreground w-24 truncate">{item.cls}</span>
                    <div className="flex-1">
                      <Progress value={item.pct} className="h-1.5" />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-12 text-right">{item.count} ({item.pct}%)</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Sales Summary */}
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Sales Activity</h3>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Sales: </span>
                  <span className="font-medium">{stats.totalSalesCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Qualified: </span>
                  <span className="font-medium text-chart-5">{stats.qualifiedSalesCount}</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof DollarSign; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/50 p-3 text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
      <p className="text-lg font-light text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function WorkflowCard({ icon: Icon, label, count, color }: { icon: typeof Gavel; label: string; count: number; color: string }) {
  return (
    <div className="rounded-xl border border-border/50 p-3 text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", count > 0 ? color : "text-muted-foreground/40")} />
      <p className={cn("text-xl font-light", count > 0 ? color : "text-muted-foreground")}>{count}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

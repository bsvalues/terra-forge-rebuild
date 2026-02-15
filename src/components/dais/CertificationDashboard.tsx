import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldX, BarChart3, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface CertificationStats {
  totalParcels: number;
  certifiedParcels: number;
  uncertifiedParcels: number;
  certificationRate: number;
  neighborhoodBreakdown: {
    code: string;
    total: number;
    certified: number;
    rate: number;
  }[];
  blockers: {
    pendingAppeals: number;
    openPermits: number;
    pendingExemptions: number;
    missingAssessments: number;
  };
}

function useCertificationStats() {
  return useQuery<CertificationStats>({
    queryKey: ["certification-stats"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      // Get total parcels
      const { count: totalParcels } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true });

      // Get assessments for current year
      const { data: assessments } = await supabase
        .from("assessments")
        .select("parcel_id, certified, tax_year")
        .eq("tax_year", currentYear);

      const certified = assessments?.filter(a => a.certified) || [];
      const total = totalParcels || 0;
      const certCount = certified.length;
      const uncertCount = total - certCount;

      // Neighborhood breakdown
      const { data: parcelsWithNbhd } = await supabase
        .from("parcels")
        .select("id, neighborhood_code")
        .not("neighborhood_code", "is", null);

      const nbhdMap = new Map<string, { total: number; certified: number }>();
      const certifiedIds = new Set(certified.map(a => a.parcel_id));

      for (const p of parcelsWithNbhd || []) {
        const code = p.neighborhood_code || "Unknown";
        if (!nbhdMap.has(code)) nbhdMap.set(code, { total: 0, certified: 0 });
        const entry = nbhdMap.get(code)!;
        entry.total++;
        if (certifiedIds.has(p.id)) entry.certified++;
      }

      const neighborhoodBreakdown = Array.from(nbhdMap.entries())
        .map(([code, stats]) => ({
          code,
          total: stats.total,
          certified: stats.certified,
          rate: stats.total > 0 ? Math.round((stats.certified / stats.total) * 100) : 0,
        }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 15);

      // Blockers
      const [appeals, permits, exemptions] = await Promise.all([
        supabase.from("appeals").select("*", { count: "exact", head: true }).in("status", ["filed", "pending", "scheduled"]),
        supabase.from("permits").select("*", { count: "exact", head: true }).in("status", ["applied", "pending"]),
        supabase.from("exemptions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      const missingAssessments = total - (assessments?.length || 0);

      return {
        totalParcels: total,
        certifiedParcels: certCount,
        uncertifiedParcels: uncertCount,
        certificationRate: total > 0 ? Math.round((certCount / total) * 100) : 0,
        neighborhoodBreakdown,
        blockers: {
          pendingAppeals: appeals.count || 0,
          openPermits: permits.count || 0,
          pendingExemptions: exemptions.count || 0,
          missingAssessments: Math.max(0, missingAssessments),
        },
      };
    },
    staleTime: 60_000,
  });
}

export function CertificationDashboard() {
  const { data: stats, isLoading } = useCertificationStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const totalBlockers = stats.blockers.pendingAppeals + stats.blockers.openPermits + stats.blockers.pendingExemptions;

  return (
    <div className="space-y-6">
      {/* Certification Progress Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="material-bento rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--tf-optimized-green)/0.15)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-tf-green" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Certification Status</h3>
              <p className="text-xs text-muted-foreground">TY {new Date().getFullYear()} Roll Readiness</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-light text-foreground">{stats.certificationRate}%</div>
            <div className="text-xs text-muted-foreground">certified</div>
          </div>
        </div>

        <Progress value={stats.certificationRate} className="h-3 mb-4" />

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-[hsl(var(--tf-elevated)/0.5)] p-3">
            <div className="text-lg font-medium text-foreground">{stats.totalParcels.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
          </div>
          <div className="rounded-lg bg-[hsl(var(--tf-optimized-green)/0.1)] p-3">
            <div className="text-lg font-medium text-tf-green">{stats.certifiedParcels.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Certified</div>
          </div>
          <div className="rounded-lg bg-[hsl(var(--tf-amber)/0.1)] p-3">
            <div className="text-lg font-medium text-tf-amber">{stats.uncertifiedParcels.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</div>
          </div>
        </div>
      </motion.div>

      {/* Blockers */}
      {totalBlockers > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="material-bento rounded-2xl p-5"
        >
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-tf-amber" />
            Roll Certification Blockers
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BlockerCard label="Pending Appeals" count={stats.blockers.pendingAppeals} severity={stats.blockers.pendingAppeals > 0 ? "high" : "none"} />
            <BlockerCard label="Open Permits" count={stats.blockers.openPermits} severity={stats.blockers.openPermits > 5 ? "medium" : "low"} />
            <BlockerCard label="Pending Exemptions" count={stats.blockers.pendingExemptions} severity={stats.blockers.pendingExemptions > 0 ? "medium" : "none"} />
            <BlockerCard label="Missing Assessments" count={stats.blockers.missingAssessments} severity={stats.blockers.missingAssessments > 100 ? "high" : stats.blockers.missingAssessments > 0 ? "medium" : "none"} />
          </div>
        </motion.div>
      )}

      {/* Neighborhood Breakdown */}
      {stats.neighborhoodBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="material-bento rounded-2xl p-5"
        >
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-tf-cyan" />
            Certification by Neighborhood
          </h4>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {stats.neighborhoodBreakdown.map((nbhd) => (
              <div key={nbhd.code} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-16 shrink-0 truncate">{nbhd.code}</span>
                <Progress value={nbhd.rate} className="h-2 flex-1" />
                <span className="text-xs font-mono w-10 text-right text-muted-foreground">{nbhd.rate}%</span>
                <span className="text-[10px] text-muted-foreground w-16 text-right">
                  {nbhd.certified}/{nbhd.total}
                </span>
                {nbhd.rate === 100 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-tf-green shrink-0" />
                ) : (
                  <ShieldX className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function BlockerCard({ label, count, severity }: { label: string; count: number; severity: "high" | "medium" | "low" | "none" }) {
  const colors = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-[hsl(var(--tf-amber)/0.1)] text-tf-amber border-[hsl(var(--tf-amber)/0.2)]",
    low: "bg-muted text-muted-foreground border-border/50",
    none: "bg-[hsl(var(--tf-optimized-green)/0.1)] text-tf-green border-[hsl(var(--tf-optimized-green)/0.2)]",
  };

  return (
    <div className={`rounded-lg border p-3 text-center ${colors[severity]}`}>
      <div className="text-xl font-medium">{count}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

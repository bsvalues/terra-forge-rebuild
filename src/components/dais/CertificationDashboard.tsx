import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldX, BarChart3, CheckCircle2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { ProvenanceBadge } from "@/components/trust";

// Neighborhood breakdown is certification-specific — not in vitals
function useNeighborhoodCertification() {
  return useQuery({
    queryKey: ["certification-neighborhood-breakdown"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      const [{ data: parcelsWithNbhd }, { data: assessments }] = await Promise.all([
        supabase.from("parcels").select("id, neighborhood_code").not("neighborhood_code", "is", null),
        supabase.from("assessments").select("parcel_id, certified").eq("tax_year", currentYear).eq("certified", true),
      ]);

      const certifiedIds = new Set((assessments || []).map(a => a.parcel_id));
      const nbhdMap = new Map<string, { total: number; certified: number }>();

      for (const p of parcelsWithNbhd || []) {
        const code = p.neighborhood_code || "Unknown";
        if (!nbhdMap.has(code)) nbhdMap.set(code, { total: 0, certified: 0 });
        const entry = nbhdMap.get(code)!;
        entry.total++;
        if (certifiedIds.has(p.id)) entry.certified++;
      }

      return Array.from(nbhdMap.entries())
        .map(([code, stats]) => ({
          code,
          total: stats.total,
          certified: stats.certified,
          rate: stats.total > 0 ? Math.round((stats.certified / stats.total) * 100) : 0,
        }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 15);
    },
    staleTime: 60_000,
  });
}

export function CertificationDashboard() {
  const { data: vitals, isLoading: vitalsLoading } = useCountyVitals();
  const { data: neighborhoods, isLoading: nbhdLoading } = useNeighborhoodCertification();

  if (vitalsLoading || !vitals) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const totalParcels = vitals.parcels.total;
  const certifiedParcels = vitals.assessments.certified;
  const uncertifiedParcels = totalParcels - certifiedParcels;
  const certRate = vitals.assessments.certRate;

  const pendingAppeals = vitals.workflows.pendingAppeals;
  const openPermits = vitals.workflows.openPermits;
  const pendingExemptions = vitals.workflows.pendingExemptions;
  const missingAssessments = Math.max(0, totalParcels - vitals.assessments.total);
  const totalBlockers = pendingAppeals + openPermits + pendingExemptions;

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
          <div className="flex items-center gap-3">
            <ProvenanceBadge source="county-vitals" fetchedAt={vitals.fetchedAt} />
            <div className="text-right">
              <div className="text-3xl font-light text-foreground">{certRate}%</div>
              <div className="text-xs text-muted-foreground">certified</div>
            </div>
          </div>
        </div>

        <Progress value={certRate} className="h-3 mb-4" />

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-[hsl(var(--tf-elevated)/0.5)] p-3">
            <div className="text-lg font-medium text-foreground">{totalParcels.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
          </div>
          <div className="rounded-lg bg-[hsl(var(--tf-optimized-green)/0.1)] p-3">
            <div className="text-lg font-medium text-tf-green">{certifiedParcels.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Certified</div>
          </div>
          <div className="rounded-lg bg-[hsl(var(--tf-amber)/0.1)] p-3">
            <div className="text-lg font-medium text-tf-amber">{uncertifiedParcels.toLocaleString()}</div>
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
            <BlockerCard label="Pending Appeals" count={pendingAppeals} severity={pendingAppeals > 0 ? "high" : "none"} />
            <BlockerCard label="Open Permits" count={openPermits} severity={openPermits > 5 ? "medium" : "low"} />
            <BlockerCard label="Pending Exemptions" count={pendingExemptions} severity={pendingExemptions > 0 ? "medium" : "none"} />
            <BlockerCard label="Missing Assessments" count={missingAssessments} severity={missingAssessments > 100 ? "high" : missingAssessments > 0 ? "medium" : "none"} />
          </div>
        </motion.div>
      )}

      {/* Neighborhood Breakdown */}
      {!nbhdLoading && neighborhoods && neighborhoods.length > 0 && (
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
            {neighborhoods.map((nbhd) => (
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

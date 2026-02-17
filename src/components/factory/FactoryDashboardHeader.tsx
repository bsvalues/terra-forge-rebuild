// TerraFusion OS — Factory Dashboard Header
// Aggregate stats across all neighborhoods for the Mass Appraisal Factory
// Agent Factory built this while Agent Sentinel counted the ceiling tiles (there are 47)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Factory, BarChart3, ShieldCheck, Layers, TrendingUp, AlertTriangle } from "lucide-react";

interface FactoryStats {
  totalParcels: number;
  neighborhoods: number;
  calibratedNeighborhoods: number;
  calibrationRuns: number;
  avgRSquared: number | null;
  certificationRate: number;
  recentAdjustments: number;
  pendingBlockers: number;
}

function useFactoryStats() {
  return useQuery<FactoryStats>({
    queryKey: ["factory-stats"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      const [
        parcelsRes,
        nbhdRes,
        calibRes,
        calibDetailRes,
        assessmentsRes,
        adjustmentsRes,
        appealsRes,
        permitsRes,
        exemptionsRes,
      ] = await Promise.all([
        supabase.from("parcels").select("*", { count: "exact", head: true }),
        supabase.from("parcels").select("neighborhood_code").not("neighborhood_code", "is", null).limit(1000),
        supabase.from("calibration_runs").select("*", { count: "exact", head: true }),
        supabase.from("calibration_runs").select("neighborhood_code, r_squared, created_at").order("created_at", { ascending: false }),
        supabase.from("assessments").select("parcel_id, certified").eq("tax_year", currentYear),
        supabase.from("value_adjustments").select("*", { count: "exact", head: true }).is("rolled_back_at", null),
        supabase.from("appeals").select("*", { count: "exact", head: true }).in("status", ["filed", "pending", "scheduled"]),
        supabase.from("permits").select("*", { count: "exact", head: true }).in("status", ["applied", "pending"]),
        supabase.from("exemptions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      const uniqueNbhds = new Set((nbhdRes.data || []).map(p => p.neighborhood_code));
      
      // Compute calibrated neighborhoods and avg R²
      const latestCalib = new Map<string, number>();
      for (const run of calibDetailRes.data || []) {
        if (!latestCalib.has(run.neighborhood_code)) {
          latestCalib.set(run.neighborhood_code, run.r_squared ?? 0);
        }
      }
      const calibratedNeighborhoods = latestCalib.size;
      const rSquaredValues = Array.from(latestCalib.values()).filter(v => v > 0);
      const avgRSquared = rSquaredValues.length > 0 ? rSquaredValues.reduce((a, b) => a + b, 0) / rSquaredValues.length : null;

      const certifiedCount = (assessmentsRes.data || []).filter(a => a.certified).length;
      const totalParcels = parcelsRes.count || 0;

      return {
        totalParcels,
        neighborhoods: uniqueNbhds.size,
        calibratedNeighborhoods,
        calibrationRuns: calibRes.count || 0,
        avgRSquared,
        certificationRate: totalParcels > 0 ? Math.round((certifiedCount / totalParcels) * 100) : 0,
        recentAdjustments: adjustmentsRes.count || 0,
        pendingBlockers: (appealsRes.count || 0) + (permitsRes.count || 0) + (exemptionsRes.count || 0),
      };
    },
    staleTime: 120_000,
  });
}

export function FactoryDashboardHeader() {
  const { data: stats, isLoading } = useFactoryStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const metrics = [
    {
      label: "Total Parcels",
      value: stats.totalParcels.toLocaleString(),
      icon: Factory,
      color: "text-[hsl(var(--suite-forge))]",
      bgColor: "bg-[hsl(var(--suite-forge)/0.1)]",
    },
    {
      label: "Neighborhoods",
      value: stats.neighborhoods.toString(),
      icon: Layers,
      color: "text-[hsl(var(--tf-bright-cyan))]",
      bgColor: "bg-[hsl(var(--tf-bright-cyan)/0.1)]",
    },
    {
      label: "Calibrated",
      value: `${stats.calibratedNeighborhoods}/${stats.neighborhoods}`,
      icon: BarChart3,
      color: stats.calibratedNeighborhoods === stats.neighborhoods
        ? "text-[hsl(var(--tf-optimized-green))]"
        : "text-[hsl(var(--tf-transcend-cyan))]",
      bgColor: "bg-[hsl(var(--tf-transcend-cyan)/0.1)]",
    },
    {
      label: "Avg R²",
      value: stats.avgRSquared ? `${(stats.avgRSquared * 100).toFixed(1)}%` : "—",
      icon: TrendingUp,
      color: stats.avgRSquared && stats.avgRSquared > 0.7
        ? "text-[hsl(var(--tf-optimized-green))]"
        : "text-[hsl(var(--tf-amber))]",
      bgColor: stats.avgRSquared && stats.avgRSquared > 0.7
        ? "bg-[hsl(var(--tf-optimized-green)/0.1)]"
        : "bg-[hsl(var(--tf-amber)/0.1)]",
    },
    {
      label: "Certified",
      value: `${stats.certificationRate}%`,
      icon: ShieldCheck,
      color: stats.certificationRate === 100
        ? "text-[hsl(var(--tf-optimized-green))]"
        : "text-[hsl(var(--tf-amber))]",
      bgColor: stats.certificationRate === 100
        ? "bg-[hsl(var(--tf-optimized-green)/0.1)]"
        : "bg-[hsl(var(--tf-amber)/0.1)]",
    },
    {
      label: "Active Adjustments",
      value: stats.recentAdjustments.toLocaleString(),
      icon: TrendingUp,
      color: "text-[hsl(var(--tf-sacred-gold))]",
      bgColor: "bg-[hsl(var(--tf-sacred-gold)/0.1)]",
    },
    {
      label: "Open Blockers",
      value: stats.pendingBlockers.toString(),
      icon: AlertTriangle,
      color: stats.pendingBlockers > 0
        ? "text-destructive"
        : "text-[hsl(var(--tf-optimized-green))]",
      bgColor: stats.pendingBlockers > 0
        ? "bg-destructive/10"
        : "bg-[hsl(var(--tf-optimized-green)/0.1)]",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"
    >
      {metrics.map((m, i) => {
        const Icon = m.icon;
        return (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="material-bento rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5"
          >
            <div className={`w-8 h-8 rounded-lg ${m.bgColor} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <span className="text-lg font-medium text-foreground leading-tight">{m.value}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{m.label}</span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// TerraFusion OS — Factory Dashboard Header
// Uses useCountyVitals for baseline counts; only runs factory-specific queries locally.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Factory, BarChart3, ShieldCheck, Layers, TrendingUp, AlertTriangle } from "lucide-react";
import { useCountyVitals } from "@/hooks/useCountyVitals";

export function FactoryDashboardHeader() {
  const { data: vitals, isLoading: vitalsLoading } = useCountyVitals();

  // Factory-specific: active adjustments count (not in vitals)
  const { data: adjustmentsCount } = useQuery({
    queryKey: ["factory", "active-adjustments"],
    queryFn: async () => {
      const { count } = await supabase
        .from("value_adjustments")
        .select("*", { count: "exact", head: true })
        .is("rolled_back_at", null);
      return count || 0;
    },
    staleTime: 120_000,
  });

  // Factory-specific: neighborhood count from parcels
  const { data: neighborhoodCount } = useQuery({
    queryKey: ["factory", "neighborhoods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(1000);
      return new Set((data || []).map(p => p.neighborhood_code)).size;
    },
    staleTime: 120_000,
  });

  if (vitalsLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!vitals) return null;

  const nbhds = neighborhoodCount ?? 0;

  const metrics = [
    {
      label: "Total Parcels",
      value: vitals.parcels.total.toLocaleString(),
      icon: Factory,
      color: "text-[hsl(var(--suite-forge))]",
      bgColor: "bg-[hsl(var(--suite-forge)/0.1)]",
    },
    {
      label: "Neighborhoods",
      value: nbhds.toString(),
      icon: Layers,
      color: "text-[hsl(var(--tf-bright-cyan))]",
      bgColor: "bg-[hsl(var(--tf-bright-cyan)/0.1)]",
    },
    {
      label: "Calibrated",
      value: `${vitals.calibration.calibratedNeighborhoods}/${nbhds}`,
      icon: BarChart3,
      color: vitals.calibration.calibratedNeighborhoods === nbhds
        ? "text-[hsl(var(--tf-optimized-green))]"
        : "text-[hsl(var(--tf-transcend-cyan))]",
      bgColor: "bg-[hsl(var(--tf-transcend-cyan)/0.1)]",
    },
    {
      label: "Avg R²",
      value: vitals.calibration.avgRSquared ? `${(vitals.calibration.avgRSquared * 100).toFixed(1)}%` : "—",
      icon: TrendingUp,
      color: vitals.calibration.avgRSquared && vitals.calibration.avgRSquared > 0.7
        ? "text-[hsl(var(--tf-optimized-green))]"
        : "text-[hsl(var(--tf-amber))]",
      bgColor: vitals.calibration.avgRSquared && vitals.calibration.avgRSquared > 0.7
        ? "bg-[hsl(var(--tf-optimized-green)/0.1)]"
        : "bg-[hsl(var(--tf-amber)/0.1)]",
    },
    {
      label: "Certified",
      value: `${vitals.assessments.certRate}%`,
      icon: ShieldCheck,
      color: vitals.assessments.certRate === 100
        ? "text-[hsl(var(--tf-optimized-green))]"
        : "text-[hsl(var(--tf-amber))]",
      bgColor: vitals.assessments.certRate === 100
        ? "bg-[hsl(var(--tf-optimized-green)/0.1)]"
        : "bg-[hsl(var(--tf-amber)/0.1)]",
    },
    {
      label: "Active Adjustments",
      value: (adjustmentsCount ?? 0).toLocaleString(),
      icon: TrendingUp,
      color: "text-[hsl(var(--tf-sacred-gold))]",
      bgColor: "bg-[hsl(var(--tf-sacred-gold)/0.1)]",
    },
    {
      label: "Open Blockers",
      value: vitals.workflows.total.toString(),
      icon: AlertTriangle,
      color: vitals.workflows.total > 0
        ? "text-destructive"
        : "text-[hsl(var(--tf-optimized-green))]",
      bgColor: vitals.workflows.total > 0
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

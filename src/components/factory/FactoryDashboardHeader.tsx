// TerraFusion OS — Factory Dashboard Header
// Uses useCountyVitals for baseline counts; only runs factory-specific queries locally.

import { Skeleton } from "@/components/ui/skeleton";
import { Factory, BarChart3, ShieldCheck, Layers, TrendingUp, AlertTriangle } from "lucide-react";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { useActiveAdjustmentsCount, useNeighborhoodCount } from "@/hooks/useFactoryMetrics";
import { ProvenanceNumber } from "@/components/trust";

export function FactoryDashboardHeader() {
  const { data: vitals, isLoading: vitalsLoading } = useCountyVitals();
  const { data: adjustmentsCount } = useActiveAdjustmentsCount();
  const { data: neighborhoodCount } = useNeighborhoodCount();

  if (vitalsLoading) {
    return (
      <div className="module-data-band">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
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
      value: vitals.metricAvailability?.certified === false ? "—" : `${vitals.assessments.certRate}%`,
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
      value: vitals.metricAvailability?.workflows === false ? "—" : vitals.workflows.total.toString(),
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
    <dl className="module-data-band">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt className="text-xs text-muted-foreground">{metric.label}</dt>
          <dd className="mt-1">
            <ProvenanceNumber
              source={metric.label === "Active Adjustments" ? "factory/active-adjustments" : metric.label === "Neighborhoods" ? "factory/neighborhoods" : "county-vitals"}
              fetchedAt={vitals.fetchedAt}
              cachePolicy={metric.label === "Active Adjustments" || metric.label === "Neighborhoods" ? "cached 120s" : "cached 60s"}
            >
              <span className="text-lg font-medium text-foreground tabular-nums">{metric.value}</span>
            </ProvenanceNumber>
          </dd>
        </div>
      ))}
    </dl>
  );
}

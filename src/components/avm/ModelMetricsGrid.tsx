import {
  Activity, BarChart3, Percent, Target, TrendingDown, Sigma,
} from "lucide-react";
import type { AVMRun } from "@/hooks/useAVMRuns";

interface ModelMetricsGridProps {
  champion: AVMRun | null;
  challenger: AVMRun | null;
}

export function ModelMetricsGrid({ champion, challenger }: ModelMetricsGridProps) {
  const metrics = [
    { id: "r2", label: "R² Score", rfVal: champion?.r_squared, nnVal: challenger?.r_squared, fmt: (v: number) => v.toFixed(4), higherBetter: true, icon: Target },
    { id: "rmse", label: "RMSE", rfVal: champion?.rmse, nnVal: challenger?.rmse, fmt: (v: number) => `$${(v / 1000).toFixed(1)}k`, higherBetter: false, icon: TrendingDown },
    { id: "mae", label: "MAE", rfVal: champion?.mae, nnVal: challenger?.mae, fmt: (v: number) => `$${(v / 1000).toFixed(1)}k`, higherBetter: false, icon: BarChart3 },
    { id: "mape", label: "MAPE", rfVal: champion?.mape, nnVal: challenger?.mape, fmt: (v: number) => `${v}%`, higherBetter: false, icon: Percent },
    { id: "cod", label: "COD", rfVal: champion?.cod, nnVal: challenger?.cod, fmt: (v: number) => v.toFixed(1), higherBetter: false, icon: Sigma },
    { id: "prd", label: "PRD", rfVal: champion?.prd, nnVal: challenger?.prd, fmt: (v: number) => v.toFixed(3), higherBetter: false, icon: Activity },
  ];

  return (
    <section className="module-section" aria-labelledby="model-metrics">
      <h3 id="model-metrics" className="text-base font-semibold">Model metrics</h3>
      <div className="mt-3 overflow-x-auto" role="region" aria-label="Model metrics comparison" tabIndex={0}>
        <table className="w-full min-w-[480px] text-sm">
          <thead><tr className="border-b border-border text-left">
            <th scope="col" className="py-3 pr-4 font-medium text-muted-foreground">Metric</th>
            <th scope="col" className="py-3 px-4 font-medium">{champion?.model_name ?? "Champion not selected"}</th>
            <th scope="col" className="py-3 pl-4 font-medium">{challenger?.model_name ?? "Challenger not selected"}</th>
          </tr></thead>
          <tbody>{metrics.map((metric) => (
            <tr key={metric.id} className="border-b border-border">
              <th scope="row" className="py-3 pr-4 text-left font-medium text-muted-foreground">{metric.label}</th>
              <td className="py-3 px-4 tabular-nums">{metric.rfVal == null ? "—" : metric.fmt(metric.rfVal)}</td>
              <td className="py-3 pl-4 tabular-nums">{metric.nnVal == null ? "—" : metric.fmt(metric.nnVal)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

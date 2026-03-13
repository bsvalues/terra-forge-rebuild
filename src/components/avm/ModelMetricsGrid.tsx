import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((m, index) => {
        const Icon = m.icon;
        const rfV = m.rfVal ?? 0;
        const nnV = m.nnVal ?? 0;
        const rfWins = m.higherBetter ? rfV >= nnV : rfV <= nnV;

        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="material-bento rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
            <div className="space-y-2">
              <div className={cn("flex items-center justify-between p-2 rounded", rfWins ? "bg-[hsl(var(--tf-optimized-green)/0.1)] border border-[hsl(var(--tf-optimized-green)/0.3)]" : "bg-muted/30")}>
                <span className="text-xs text-muted-foreground">RF</span>
                <span className={cn("text-sm font-medium", rfWins ? "text-[hsl(var(--tf-optimized-green))]" : "text-foreground")}>{m.fmt(rfV)}</span>
              </div>
              <div className={cn("flex items-center justify-between p-2 rounded", !rfWins ? "bg-[hsl(var(--tf-transcend-cyan)/0.1)] border border-[hsl(var(--tf-transcend-cyan)/0.3)]" : "bg-muted/30")}>
                <span className="text-xs text-muted-foreground">NN</span>
                <span className={cn("text-sm font-medium", !rfWins ? "text-[hsl(var(--tf-transcend-cyan))]" : "text-foreground")}>{m.fmt(nnV)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 truncate">{m.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

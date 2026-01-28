import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Percent,
  Target,
  TrendingDown,
  Sigma,
} from "lucide-react";

interface MetricCard {
  id: string;
  label: string;
  rfValue: string;
  nnValue: string;
  winner: "rf" | "nn" | "tie";
  description: string;
  icon: typeof Activity;
}

export function ModelMetricsGrid() {
  const metrics: MetricCard[] = [
    {
      id: "r2",
      label: "R² Score",
      rfValue: "0.9247",
      nnValue: "0.9189",
      winner: "rf",
      description: "Coefficient of determination",
      icon: Target,
    },
    {
      id: "rmse",
      label: "RMSE",
      rfValue: "$12,847",
      nnValue: "$13,421",
      winner: "rf",
      description: "Root mean square error",
      icon: TrendingDown,
    },
    {
      id: "mae",
      label: "MAE",
      rfValue: "$9,234",
      nnValue: "$9,876",
      winner: "rf",
      description: "Mean absolute error",
      icon: BarChart3,
    },
    {
      id: "mape",
      label: "MAPE",
      rfValue: "4.2%",
      nnValue: "4.6%",
      winner: "rf",
      description: "Mean absolute percentage error",
      icon: Percent,
    },
    {
      id: "cod",
      label: "COD",
      rfValue: "8.4",
      nnValue: "9.1",
      winner: "rf",
      description: "Coefficient of dispersion",
      icon: Sigma,
    },
    {
      id: "prd",
      label: "PRD",
      rfValue: "1.02",
      nnValue: "1.04",
      winner: "rf",
      description: "Price-related differential",
      icon: Activity,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;

        return (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card rounded-lg p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{metric.label}</span>
            </div>

            {/* Values Comparison */}
            <div className="space-y-2">
              {/* Random Forest */}
              <div
                className={cn(
                  "flex items-center justify-between p-2 rounded",
                  metric.winner === "rf"
                    ? "bg-tf-optimized-green/10 border border-tf-optimized-green/30"
                    : "bg-muted/30"
                )}
              >
                <span className="text-xs text-muted-foreground">RF</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    metric.winner === "rf" ? "text-tf-optimized-green" : "text-foreground"
                  )}
                >
                  {metric.rfValue}
                </span>
              </div>

              {/* Neural Network */}
              <div
                className={cn(
                  "flex items-center justify-between p-2 rounded",
                  metric.winner === "nn"
                    ? "bg-tf-cyan/10 border border-tf-cyan/30"
                    : "bg-muted/30"
                )}
              >
                <span className="text-xs text-muted-foreground">NN</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    metric.winner === "nn" ? "text-tf-cyan" : "text-foreground"
                  )}
                >
                  {metric.nnValue}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {metric.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeatureImportance {
  feature: string;
  rfImportance: number;
  nnImportance: number;
}

export function FeatureImportanceChart() {
  const features: FeatureImportance[] = [
    { feature: "Living Area", rfImportance: 0.28, nnImportance: 0.31 },
    { feature: "Location Score", rfImportance: 0.22, nnImportance: 0.19 },
    { feature: "Year Built", rfImportance: 0.15, nnImportance: 0.17 },
    { feature: "Lot Size", rfImportance: 0.12, nnImportance: 0.10 },
    { feature: "Bedrooms", rfImportance: 0.08, nnImportance: 0.09 },
    { feature: "Bathrooms", rfImportance: 0.07, nnImportance: 0.06 },
    { feature: "Garage", rfImportance: 0.05, nnImportance: 0.05 },
    { feature: "Pool", rfImportance: 0.03, nnImportance: 0.03 },
  ];

  const maxValue = Math.max(
    ...features.flatMap((f) => [f.rfImportance, f.nnImportance])
  );

  return (
    <div className="h-64 overflow-y-auto pr-2">
      <div className="space-y-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.feature}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground truncate max-w-[100px]">
                {feature.feature}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-tf-optimized-green">
                  {(feature.rfImportance * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-tf-cyan">
                  {(feature.nnImportance * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* RF Bar */}
            <div className="h-1.5 bg-tf-elevated rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(feature.rfImportance / maxValue) * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="h-full bg-tf-optimized-green rounded-full"
              />
            </div>

            {/* NN Bar */}
            <div className="h-1.5 bg-tf-elevated rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(feature.nnImportance / maxValue) * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 + 0.1 }}
                className="h-full bg-tf-cyan rounded-full"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-full bg-tf-optimized-green" />
          <span className="text-xs text-muted-foreground">RF SHAP</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-full bg-tf-cyan" />
          <span className="text-xs text-muted-foreground">NN SHAP</span>
        </div>
      </div>
    </div>
  );
}

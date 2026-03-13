import { motion } from "framer-motion";

interface FeatureItem {
  feature: string;
  importance: number;
}

interface FeatureImportanceChartProps {
  rfFeatures: FeatureItem[];
  nnFeatures: FeatureItem[];
}

export function FeatureImportanceChart({ rfFeatures, nnFeatures }: FeatureImportanceChartProps) {
  // Merge by feature name
  const featureMap = new Map<string, { rf: number; nn: number }>();
  for (const f of rfFeatures) featureMap.set(f.feature, { rf: f.importance, nn: 0 });
  for (const f of nnFeatures) {
    const existing = featureMap.get(f.feature) ?? { rf: 0, nn: 0 };
    existing.nn = f.importance;
    featureMap.set(f.feature, existing);
  }

  const features = Array.from(featureMap.entries())
    .map(([feature, vals]) => ({ feature, ...vals }))
    .sort((a, b) => b.rf - a.rf);

  const maxValue = Math.max(...features.flatMap((f) => [f.rf, f.nn]), 0.01);

  if (features.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No feature data</div>;
  }

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
              <span className="text-xs text-foreground truncate max-w-[100px]">{feature.feature}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[hsl(var(--tf-optimized-green))]">{(feature.rf * 100).toFixed(0)}%</span>
                <span className="text-xs text-[hsl(var(--tf-transcend-cyan))]">{(feature.nn * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-[hsl(var(--tf-elevated))] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(feature.rf / maxValue) * 100}%` }} transition={{ duration: 0.5, delay: index * 0.05 }} className="h-full bg-[hsl(var(--tf-optimized-green))] rounded-full" />
            </div>
            <div className="h-1.5 bg-[hsl(var(--tf-elevated))] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(feature.nn / maxValue) * 100}%` }} transition={{ duration: 0.5, delay: index * 0.05 + 0.1 }} className="h-full bg-[hsl(var(--tf-transcend-cyan))] rounded-full" />
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-full bg-[hsl(var(--tf-optimized-green))]" />
          <span className="text-xs text-muted-foreground">RF</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-full bg-[hsl(var(--tf-transcend-cyan))]" />
          <span className="text-xs text-muted-foreground">NN</span>
        </div>
      </div>
    </div>
  );
}

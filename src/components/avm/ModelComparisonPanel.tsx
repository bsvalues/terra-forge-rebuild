import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TreeDeciduous, Brain, Trophy, TrendingUp, Zap } from "lucide-react";
import type { AVMRun } from "@/hooks/useAVMRuns";

interface ModelComparisonPanelProps {
  runs: AVMRun[];
}

export function ModelComparisonPanel({ runs }: ModelComparisonPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {runs.slice(0, 2).map((model, index) => {
        const isChampion = model.status === "champion";
        const Icon = model.model_type === "rf" ? TreeDeciduous : Brain;

        return (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative overflow-hidden rounded-lg border p-6",
              "bg-card/50 backdrop-blur-sm",
              isChampion
                ? "border-[hsl(var(--tf-optimized-green)/0.5)] shadow-[0_0_30px_hsl(var(--tf-optimized-green)/0.2)]"
                : "border-[hsl(var(--tf-transcend-cyan)/0.3)]"
            )}
          >
            {isChampion && (
              <div className="absolute top-4 right-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--tf-optimized-green)/0.2)] text-[hsl(var(--tf-optimized-green))] text-xs font-medium"
                >
                  <Trophy className="w-3 h-3" />
                  Champion
                </motion.div>
              </div>
            )}

            <div className="flex items-start gap-4 mb-6">
              <div className={cn("p-3 rounded-lg", isChampion ? "bg-[hsl(var(--tf-optimized-green)/0.2)]" : "bg-[hsl(var(--tf-transcend-cyan)/0.2)]")}>
                <Icon className={cn("w-6 h-6", isChampion ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-transcend-cyan))]")} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">{model.model_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {model.model_type === "rf" ? "Ensemble Learning" : "Deep Learning"} • n={model.sample_size ?? 0}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className={cn("text-4xl font-light", isChampion ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-transcend-cyan))]")}>
                  {((model.r_squared ?? 0) * 100).toFixed(2)}%
                </span>
                <span className="text-sm text-muted-foreground">R² Score</span>
              </div>
              <div className="mt-2 h-2 bg-[hsl(var(--tf-elevated))] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(model.r_squared ?? 0) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={cn("h-full rounded-full", isChampion ? "bg-[hsl(var(--tf-optimized-green))]" : "bg-[hsl(var(--tf-transcend-cyan))]")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-[hsl(var(--tf-elevated)/0.5)]">
                <p className="text-lg font-light text-foreground">${((model.rmse ?? 0) / 1000).toFixed(1)}k</p>
                <p className="text-xs text-muted-foreground">RMSE</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-[hsl(var(--tf-elevated)/0.5)]">
                <p className="text-lg font-light text-foreground">${((model.mae ?? 0) / 1000).toFixed(1)}k</p>
                <p className="text-xs text-muted-foreground">MAE</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-[hsl(var(--tf-elevated)/0.5)]">
                <p className="text-lg font-light text-foreground">{model.mape ?? 0}%</p>
                <p className="text-xs text-muted-foreground">MAPE</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Train: {model.training_time_ms ? `${(model.training_time_ms / 1000).toFixed(1)}s` : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(model.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

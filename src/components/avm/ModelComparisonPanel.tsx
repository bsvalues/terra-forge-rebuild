import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TreeDeciduous, Brain, Trophy, TrendingUp, Target, Zap } from "lucide-react";

interface ModelStats {
  id: string;
  name: string;
  type: "rf" | "nn";
  icon: typeof TreeDeciduous;
  r2Score: number;
  rmse: number;
  mae: number;
  mape: number;
  trainingTime: string;
  inferenceTime: string;
  status: "champion" | "challenger" | "training";
}

export function ModelComparisonPanel() {
  const [models] = useState<ModelStats[]>([
    {
      id: "rf-v3",
      name: "Random Forest v3.2",
      type: "rf",
      icon: TreeDeciduous,
      r2Score: 0.9247,
      rmse: 12847,
      mae: 9234,
      mape: 4.2,
      trainingTime: "2m 34s",
      inferenceTime: "0.8ms",
      status: "champion",
    },
    {
      id: "nn-v2",
      name: "Neural Network v2.1",
      type: "nn",
      icon: Brain,
      r2Score: 0.9189,
      rmse: 13421,
      mae: 9876,
      mape: 4.6,
      trainingTime: "8m 12s",
      inferenceTime: "1.2ms",
      status: "challenger",
    },
  ]);

  const champion = models.find((m) => m.status === "champion");
  const challenger = models.find((m) => m.status === "challenger");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {models.map((model, index) => {
        const Icon = model.icon;
        const isChampion = model.status === "champion";

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
                ? "border-tf-optimized-green/50 shadow-[0_0_30px_hsl(var(--tf-optimized-green)/0.2)]"
                : "border-tf-cyan/30"
            )}
          >
            {/* Champion Badge */}
            {isChampion && (
              <div className="absolute top-4 right-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-tf-optimized-green/20 text-tf-optimized-green text-xs font-medium"
                >
                  <Trophy className="w-3 h-3" />
                  Champion
                </motion.div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className={cn(
                  "p-3 rounded-lg",
                  isChampion ? "bg-tf-optimized-green/20" : "bg-tf-cyan/20"
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6",
                    isChampion ? "text-tf-optimized-green" : "text-tf-cyan"
                  )}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">{model.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {model.type === "rf" ? "Ensemble Learning" : "Deep Learning"}
                </p>
              </div>
            </div>

            {/* Primary Metric */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-4xl font-light",
                    isChampion ? "text-tf-optimized-green" : "text-tf-cyan"
                  )}
                >
                  {(model.r2Score * 100).toFixed(2)}%
                </span>
                <span className="text-sm text-muted-foreground">R² Score</span>
              </div>
              <div className="mt-2 h-2 bg-tf-elevated rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${model.r2Score * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    isChampion ? "bg-tf-optimized-green" : "bg-tf-cyan"
                  )}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-tf-elevated/50">
                <p className="text-lg font-light text-foreground">
                  ${(model.rmse / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-muted-foreground">RMSE</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-tf-elevated/50">
                <p className="text-lg font-light text-foreground">
                  ${(model.mae / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-muted-foreground">MAE</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-tf-elevated/50">
                <p className="text-lg font-light text-foreground">{model.mape}%</p>
                <p className="text-xs text-muted-foreground">MAPE</p>
              </div>
            </div>

            {/* Performance */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Train: {model.trainingTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Inference: {model.inferenceTime}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

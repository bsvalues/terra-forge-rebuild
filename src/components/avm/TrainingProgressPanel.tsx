import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TreeDeciduous, Brain, Loader2 } from "lucide-react";

interface TrainingJob {
  id: string;
  model: string;
  type: "rf" | "nn";
  epoch: number;
  totalEpochs: number;
  loss: number;
  valLoss: number;
  status: "training" | "complete" | "queued";
  eta: string;
}

export function TrainingProgressPanel() {
  const [jobs, setJobs] = useState<TrainingJob[]>([
    {
      id: "rf-train-1",
      model: "Random Forest v3.3",
      type: "rf",
      epoch: 450,
      totalEpochs: 500,
      loss: 0.0234,
      valLoss: 0.0267,
      status: "training",
      eta: "1m 12s",
    },
    {
      id: "nn-train-1",
      model: "Neural Network v2.2",
      type: "nn",
      epoch: 120,
      totalEpochs: 200,
      loss: 0.0312,
      valLoss: 0.0389,
      status: "training",
      eta: "4m 38s",
    },
  ]);

  // Simulate training progress
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.status !== "training") return job;
          const newEpoch = Math.min(job.epoch + 1, job.totalEpochs);
          return {
            ...job,
            epoch: newEpoch,
            loss: Math.max(0.01, job.loss - Math.random() * 0.001),
            valLoss: Math.max(0.015, job.valLoss - Math.random() * 0.0008),
            status: newEpoch >= job.totalEpochs ? "complete" : "training",
          };
        })
      );
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="material-bento rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-light text-foreground">Training Progress</h3>
        <span className="text-xs text-muted-foreground">
          {jobs.filter((j) => j.status === "training").length} active jobs
        </span>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => {
          const Icon = job.type === "rf" ? TreeDeciduous : Brain;
          const progress = (job.epoch / job.totalEpochs) * 100;
          const isComplete = job.status === "complete";

          return (
            <div
              key={job.id}
              className={cn(
                "p-4 rounded-lg border",
                isComplete
                  ? "border-tf-optimized-green/30 bg-tf-optimized-green/5"
                  : "border-border bg-card/50"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      job.type === "rf" ? "bg-tf-optimized-green/20" : "bg-tf-cyan/20"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        job.type === "rf" ? "text-tf-optimized-green" : "text-tf-cyan"
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{job.model}</p>
                    <p className="text-xs text-muted-foreground">
                      Epoch {job.epoch}/{job.totalEpochs}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Loss</p>
                    <p className="text-sm font-medium text-foreground">
                      {job.loss.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Val Loss</p>
                    <p className="text-sm font-medium text-foreground">
                      {job.valLoss.toFixed(4)}
                    </p>
                  </div>
                  {!isComplete && (
                    <div className="flex items-center gap-1 text-tf-cyan">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">{job.eta}</span>
                    </div>
                  )}
                  {isComplete && (
                    <span className="text-xs font-medium text-tf-optimized-green">
                      Complete
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 bg-tf-elevated rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "h-full rounded-full",
                    isComplete
                      ? "bg-tf-optimized-green"
                      : job.type === "rf"
                      ? "bg-gradient-to-r from-tf-optimized-green to-tf-green"
                      : "bg-gradient-to-r from-tf-cyan to-tf-bright-cyan"
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

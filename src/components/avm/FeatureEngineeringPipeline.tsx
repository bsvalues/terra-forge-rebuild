import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Database, Filter, Sparkles, GitBranch, CheckCircle2, Clock } from "lucide-react";
import type { AVMRun } from "@/hooks/useAVMRuns";

interface FeatureEngineeringPipelineProps {
  run: AVMRun | null;
}

export function FeatureEngineeringPipeline({ run }: FeatureEngineeringPipelineProps) {
  const features = (run?.training_config as any)?.features ?? [];
  const sampleSize = run?.sample_size ?? 0;

  const stages = [
    {
      id: "ingestion",
      name: "Data Ingestion",
      description: "Parcel & sales data",
      icon: Database,
      status: "complete" as const,
      metrics: [
        { label: "Records", value: sampleSize.toLocaleString() },
        { label: "Features", value: `${features.length}` },
      ],
    },
    {
      id: "cleaning",
      name: "Data Cleaning",
      description: "Outlier removal & filtering",
      icon: Filter,
      status: "complete" as const,
      metrics: [
        { label: "Qualified", value: `${sampleSize}` },
        { label: "Method", value: "IQR" },
      ],
    },
    {
      id: "engineering",
      name: "Feature Engineering",
      description: "Standardization & encoding",
      icon: Sparkles,
      status: "complete" as const,
      metrics: [
        { label: "Std Features", value: `${features.length}` },
        { label: "Method", value: "Z-Score" },
      ],
    },
    {
      id: "training",
      name: "Model Training",
      description: "OLS regression fit",
      icon: GitBranch,
      status: "complete" as const,
      metrics: [
        { label: "R²", value: `${((run?.r_squared ?? 0) * 100).toFixed(1)}%` },
        { label: "Time", value: run?.training_time_ms ? `${(run.training_time_ms / 1000).toFixed(1)}s` : "—" },
      ],
    },
  ];

  const statusConfig = {
    complete: { bg: "bg-[hsl(var(--tf-optimized-green)/0.2)]", border: "border-[hsl(var(--tf-optimized-green)/0.5)]", text: "text-[hsl(var(--tf-optimized-green))]", icon: CheckCircle2 },
    running: { bg: "bg-[hsl(var(--tf-transcend-cyan)/0.2)]", border: "border-[hsl(var(--tf-transcend-cyan)/0.5)]", text: "text-[hsl(var(--tf-transcend-cyan))]", icon: Clock },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="material-bento rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-light text-foreground">Feature Engineering Pipeline</h3>
          <p className="text-sm text-muted-foreground">Automated ML preprocessing workflow</p>
        </div>
        <span className="text-xs font-medium text-[hsl(var(--tf-optimized-green))]">Complete</span>
      </div>
      <div className="relative">
        <div className="absolute top-8 left-8 right-8 h-0.5 bg-border hidden md:block" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stages.map((stage, index) => {
            const config = statusConfig[stage.status];
            const Icon = stage.icon;
            const StatusIcon = config.icon;
            return (
              <motion.div key={stage.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={cn("relative rounded-lg border p-4 bg-card/50 backdrop-blur-sm", config.border)}>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-lg", config.bg)}><Icon className={cn("w-4 h-4", config.text)} /></div>
                  <StatusIcon className={cn("w-4 h-4", config.text)} />
                </div>
                <h4 className="text-sm font-medium text-foreground mb-1">{stage.name}</h4>
                <p className="text-xs text-muted-foreground mb-3">{stage.description}</p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  {stage.metrics.map((m) => (
                    <div key={m.label} className="text-center">
                      <p className="text-sm font-medium text-foreground">{m.value}</p>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Database,
  Filter,
  Sparkles,
  GitBranch,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface PipelineStage {
  id: string;
  name: string;
  description: string;
  icon: typeof Database;
  status: "complete" | "running" | "pending" | "error";
  metrics: { label: string; value: string }[];
  progress?: number;
}

const statusConfig = {
  complete: {
    bg: "bg-tf-optimized-green/20",
    border: "border-tf-optimized-green/50",
    text: "text-tf-optimized-green",
    icon: CheckCircle2,
  },
  running: {
    bg: "bg-tf-cyan/20",
    border: "border-tf-cyan/50",
    text: "text-tf-cyan",
    icon: Clock,
  },
  pending: {
    bg: "bg-muted/30",
    border: "border-border",
    text: "text-muted-foreground",
    icon: Clock,
  },
  error: {
    bg: "bg-tf-warning-red/20",
    border: "border-tf-warning-red/50",
    text: "text-tf-warning-red",
    icon: AlertCircle,
  },
};

export function FeatureEngineeringPipeline() {
  const [stages] = useState<PipelineStage[]>([
    {
      id: "ingestion",
      name: "Data Ingestion",
      description: "Raw parcel & sales data",
      icon: Database,
      status: "complete",
      metrics: [
        { label: "Records", value: "247,832" },
        { label: "Sources", value: "12" },
      ],
    },
    {
      id: "cleaning",
      name: "Data Cleaning",
      description: "Outlier removal & imputation",
      icon: Filter,
      status: "complete",
      metrics: [
        { label: "Cleaned", value: "98.7%" },
        { label: "Imputed", value: "1.3%" },
      ],
    },
    {
      id: "engineering",
      name: "Feature Engineering",
      description: "Derived features & encoding",
      icon: Sparkles,
      status: "running",
      progress: 67,
      metrics: [
        { label: "Features", value: "156" },
        { label: "Derived", value: "42" },
      ],
    },
    {
      id: "selection",
      name: "Feature Selection",
      description: "SHAP-based importance ranking",
      icon: GitBranch,
      status: "pending",
      metrics: [
        { label: "Top K", value: "48" },
        { label: "Threshold", value: "0.01" },
      ],
    },
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="material-bento rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-light text-foreground">
            Feature Engineering Pipeline
          </h3>
          <p className="text-sm text-muted-foreground">
            Automated ML preprocessing workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pipeline Status:</span>
          <span className="text-xs font-medium text-tf-cyan">Running</span>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-8 left-8 right-8 h-0.5 bg-border hidden md:block" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stages.map((stage, index) => {
            const config = statusConfig[stage.status];
            const Icon = stage.icon;
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative rounded-lg border p-4",
                  "bg-card/50 backdrop-blur-sm",
                  config.border
                )}
              >
                {/* Stage Icon */}
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <Icon className={cn("w-4 h-4", config.text)} />
                  </div>
                  <StatusIcon className={cn("w-4 h-4", config.text)} />
                </div>

                {/* Stage Info */}
                <h4 className="text-sm font-medium text-foreground mb-1">
                  {stage.name}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {stage.description}
                </p>

                {/* Progress Bar (if running) */}
                {stage.status === "running" && stage.progress !== undefined && (
                  <div className="mb-3">
                    <div className="h-1.5 bg-tf-elevated rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.progress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-tf-cyan rounded-full"
                      />
                    </div>
                    <p className="text-xs text-tf-cyan mt-1">{stage.progress}%</p>
                  </div>
                )}

                {/* Metrics */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  {stage.metrics.map((metric) => (
                    <div key={metric.label} className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        {metric.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
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

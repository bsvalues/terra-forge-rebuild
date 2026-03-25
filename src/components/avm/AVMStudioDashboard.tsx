import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelComparisonPanel } from "./ModelComparisonPanel";
import { FeatureEngineeringPipeline } from "./FeatureEngineeringPipeline";
import { ModelMetricsGrid } from "./ModelMetricsGrid";
import { PredictionScatter } from "./charts/PredictionScatter";
import { ResidualDistribution } from "./charts/ResidualDistribution";
import { FeatureImportanceChart } from "./charts/FeatureImportanceChart";
import { AVMStudioActions } from "./AVMStudioActions";
import { TrainingProgressPanel } from "./TrainingProgressPanel";
import { AIValuationPanel } from "./AIValuationPanel";
import { useAVMRuns } from "@/hooks/useAVMRuns";
import { Skeleton } from "@/components/ui/skeleton";

export function AVMStudioDashboard() {
  const [activeTab, setActiveTab] = useState("training");
  const { data: runs, isLoading } = useAVMRuns();

  const champion = runs?.find((r) => r.status === "champion");
  const challenger = runs?.find((r) => r.status === "challenger");
  const hasRuns = runs && runs.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-light text-[hsl(var(--tf-transcend-cyan))]">
            AVM Studio — ML Laboratory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dual-Model Training • Random Forest vs Neural Network • AI Valuation
          </p>
        </div>
        <AVMStudioActions />
      </motion.div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-[hsl(var(--tf-elevated)/0.5)]">
          <TabsTrigger value="training" className="data-[state=active]:bg-[hsl(var(--tf-transcend-cyan)/0.2)]">
            Model Training
          </TabsTrigger>
          <TabsTrigger value="ai-valuation" className="data-[state=active]:bg-[hsl(var(--tf-transcend-cyan)/0.2)]">
            AI Valuation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-6 mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-64 rounded-lg" />
                <Skeleton className="h-64 rounded-lg" />
              </div>
              <Skeleton className="h-40 rounded-lg" />
            </div>
          ) : hasRuns ? (
            <>
              {/* Model Comparison Panel */}
              <ModelComparisonPanel runs={runs} />

              {/* Feature Engineering Pipeline — shows real data info */}
              <FeatureEngineeringPipeline run={champion ?? null} />

              {/* Metrics Grid */}
              <ModelMetricsGrid champion={champion ?? null} challenger={challenger ?? null} />

              {/* Visualization Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="material-bento rounded-lg p-5"
                >
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Predicted vs Actual — Scatter Analysis
                  </h3>
                  <PredictionScatter predictions={champion?.predictions ?? []} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="material-bento rounded-lg p-5"
                >
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Residual Distribution — Error Analysis
                  </h3>
                  <ResidualDistribution predictions={champion?.predictions ?? []} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="material-bento rounded-lg p-5"
                >
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Feature Importance — Model Weights
                  </h3>
                  <FeatureImportanceChart
                    rfFeatures={champion?.feature_importance ?? []}
                    nnFeatures={challenger?.feature_importance ?? []}
                  />
                </motion.div>
              </div>
            </>
          ) : (
            <TrainingProgressPanel />
          )}
        </TabsContent>

        <TabsContent value="ai-valuation" className="mt-6">
          <AIValuationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

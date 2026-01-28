import { motion } from "framer-motion";
import { ModelComparisonPanel } from "./ModelComparisonPanel";
import { FeatureEngineeringPipeline } from "./FeatureEngineeringPipeline";
import { ModelMetricsGrid } from "./ModelMetricsGrid";
import { PredictionScatter } from "./charts/PredictionScatter";
import { ResidualDistribution } from "./charts/ResidualDistribution";
import { FeatureImportanceChart } from "./charts/FeatureImportanceChart";
import { AVMStudioActions } from "./AVMStudioActions";
import { TrainingProgressPanel } from "./TrainingProgressPanel";

export function AVMStudioDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-light text-gradient-sovereign">
            AVM Studio — ML Laboratory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dual-Model Training • Random Forest vs Neural Network
          </p>
        </div>
        <AVMStudioActions />
      </motion.div>

      {/* Model Comparison Panel */}
      <ModelComparisonPanel />

      {/* Training Progress */}
      <TrainingProgressPanel />

      {/* Feature Engineering Pipeline */}
      <FeatureEngineeringPipeline />

      {/* Metrics Grid */}
      <ModelMetricsGrid />

      {/* Visualization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Predicted vs Actual — Scatter Analysis
          </h3>
          <PredictionScatter />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Residual Distribution — Error Analysis
          </h3>
          <ResidualDistribution />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Feature Importance — SHAP Values
          </h3>
          <FeatureImportanceChart />
        </motion.div>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { ResidualVsFittedPlot } from "./charts/ResidualVsFittedPlot";
import { QQPlot } from "./charts/QQPlot";
import { ScaleLocationPlot } from "./charts/ScaleLocationPlot";
import { CooksDistancePlot } from "./charts/CooksDistancePlot";

export function DiagnosticPlotsPanel() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-4"
      >
        <p className="text-sm text-muted-foreground">
          Standard diagnostic plots for assessing regression model assumptions and identifying influential observations.
          These plots follow the classic R-style diagnostic framework.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Residuals vs Fitted
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Checks linearity assumption. Look for random scatter around zero.
          </p>
          <ResidualVsFittedPlot />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Normal Q-Q Plot
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Checks normality of residuals. Points should follow the diagonal line.
          </p>
          <QQPlot />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Scale-Location Plot
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Checks homoscedasticity. Look for horizontal spread of residuals.
          </p>
          <ScaleLocationPlot />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Cook's Distance
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Identifies influential observations. Values &gt; 0.5 require attention.
          </p>
          <CooksDistancePlot />
        </motion.div>
      </div>
    </div>
  );
}

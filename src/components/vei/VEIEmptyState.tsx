import { motion } from "framer-motion";
import { Database, TrendingUp, Upload } from "lucide-react";

export function VEIEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <div className="glass-card rounded-lg p-12 text-center max-w-2xl mx-auto">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-tf-cyan/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-tf-cyan" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-light text-gradient-sovereign mb-3">
          Insufficient Data for Ratio Analysis
        </h2>
        
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          VEI metrics require matched assessment and qualified sales data. 
          Use the IDS Ingest pipeline to import parcels, assessments, and sales records, 
          then return here for on-demand ratio analysis.
        </p>

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">What you'll need:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">📊</span>
              <span>Parcels with assessed values</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">💰</span>
              <span>Qualified sales transactions</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">📅</span>
              <span>Assessment records by tax year</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

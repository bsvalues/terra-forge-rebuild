import { motion } from "framer-motion";
import { Database, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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
              <Database className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-tf-cyan/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-tf-cyan" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-light text-gradient-sovereign mb-3">
          No Active Study Period
        </h2>
        
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          To view VEI metrics, you need to create a study period and import assessment ratio data. 
          Study periods define the timeframe for your ratio studies and equity analysis.
        </p>

        <div className="space-y-3">
          <Button className="gap-2" variant="default">
            <Plus className="w-4 h-4" />
            Create Study Period
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Or ask an admin to set up a study period for your jurisdiction.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">What you'll need:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">📊</span>
              <span>Parcel data with assessed values</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">💰</span>
              <span>Qualified sales transactions</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">📅</span>
              <span>Study period date range</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

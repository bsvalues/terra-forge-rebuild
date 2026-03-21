import { motion } from "framer-motion";
import { SacredBalancePanel } from "./SacredBalancePanel";
import { QuantumMetricsGrid } from "./QuantumMetricsGrid";
import { BalanceRadar } from "./charts/BalanceRadar";
import { SacredFlowChart } from "./charts/SacredFlowChart";
import { QuantumOscillator } from "./charts/QuantumOscillator";
import { CostForgeActions } from "./CostForgeActions";
import { CostScheduleManager } from "./CostScheduleManager";
import { CostApproachRunner } from "./CostApproachRunner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CostForgeDashboard() {
  return (
    <div className="space-y-0">
      <Tabs defaultValue="schedules">
        <div className="px-6 pt-5 border-b border-border/40 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Cost Forge</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cost approach schedules, depreciation tables, and RCN analysis
            </p>
          </div>
          <TabsList className="mb-[-1px]">
            <TabsTrigger value="schedules" className="text-xs">Schedules</TabsTrigger>
            <TabsTrigger value="runner" className="text-xs">Runner</TabsTrigger>
            <TabsTrigger value="legacy" className="text-xs text-muted-foreground">Legacy View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="schedules" className="mt-0">
          <CostScheduleManager />
        </TabsContent>

        <TabsContent value="runner" className="mt-0">
          <CostApproachRunner />
        </TabsContent>

        <TabsContent value="legacy" className="mt-0 p-6 space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-light text-gradient-sovereign">
            3-6-9 Quantum Valuation Engine
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sacred Balance Framework — "If you only knew the magnificence of 3, 6, and 9"
          </p>
        </div>
        <CostForgeActions />
      </motion.div>

      {/* Sacred Balance Panel - The 3-6-9 Core */}
      <SacredBalancePanel />

      {/* Quantum Metrics Grid */}
      <QuantumMetricsGrid />

      {/* Visualization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="material-bento rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Balance Radar — Sacred Geometry
          </h3>
          <BalanceRadar />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="material-bento rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Quantum Oscillator — Real-Time
          </h3>
          <QuantumOscillator />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="material-bento rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Sacred Flow — Energy Distribution
          </h3>
          <SacredFlowChart />
        </motion.div>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// TerraFusion OS — Phase 26: Segment-Driven Revaluation Dashboard

import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, BarChart3, Scale } from "lucide-react";
import { SegmentManagerPanel } from "./SegmentManagerPanel";
import { SegmentCalibrationPanel } from "./SegmentCalibrationPanel";
import { EquityRebalancingPanel } from "./EquityRebalancingPanel";

export function SegmentRevaluationDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-[hsl(var(--tf-transcend-cyan))] tracking-tight">
          Segment-Driven Revaluation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define market segments, run per-segment calibration, and rebalance equity
        </p>
      </motion.div>

      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList className="bg-[hsl(var(--tf-elevated)/0.5)]">
          <TabsTrigger value="segments" className="text-xs gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Segment Manager
          </TabsTrigger>
          <TabsTrigger value="calibration" className="text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Segment Calibration
          </TabsTrigger>
          <TabsTrigger value="rebalance" className="text-xs gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Equity Rebalancing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="segments">
          <SegmentManagerPanel />
        </TabsContent>

        <TabsContent value="calibration">
          <SegmentCalibrationPanel />
        </TabsContent>

        <TabsContent value="rebalance">
          <EquityRebalancingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

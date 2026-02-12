import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Hammer, TrendingUp, Calculator, BarChart3, Activity, AlertTriangle, ChevronRight, Brain, Layers, Microscope, Compass } from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";
import { VEIMetricCard } from "@/components/vei/VEIMetricCard";
import { VEISummaryPanel } from "@/components/vei/VEISummaryPanel";
import { PRDTrendChart } from "@/components/vei/charts/PRDTrendChart";
import { CODTrendChart } from "@/components/vei/charts/CODTrendChart";
import { TierRatioPlot } from "@/components/vei/charts/TierRatioPlot";
import { VEIDashboardSkeleton } from "@/components/vei/VEIDashboardSkeleton";
import { CompsView } from "./CompsView";
import { VEIEmptyState } from "@/components/vei/VEIEmptyState";
import { VEIDashboard } from "@/components/vei/VEIDashboard";
import { RegressionStudioDashboard } from "@/components/regression/RegressionStudioDashboard";
import { AVMStudioDashboard } from "@/components/avm/AVMStudioDashboard";
import { SegmentDiscoveryDashboard } from "@/components/segments";
import { ValuationAnatomyDashboard } from "@/components/anatomy";
import { 
  PRDDrilldownDialog, 
  CODDrilldownDialog, 
  TierSlopeDrilldownDialog,
  AppealsDrilldownDialog 
} from "@/components/vei/drilldown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useStudyPeriods,
  useVEIMetrics,
  useVEIMetricsTrend,
  useAssessmentRatiosByTier,
  useAppealsByTier,
  useSampleSize,
} from "@/hooks/useVEIData";

type ForgeView = "vei" | "regression" | "avm" | "segments" | "anatomy" | "comps";

export function ForgeTab() {
  const [activeView, setActiveView] = useState<ForgeView>("vei");

  const forgeViews: { id: ForgeView; label: string; icon: React.ElementType }[] = [
    { id: "vei", label: "Equity (VEI)", icon: Activity },
    { id: "regression", label: "Regression", icon: Microscope },
    { id: "avm", label: "AVM Studio", icon: Brain },
    { id: "segments", label: "Segments", icon: Layers },
    { id: "anatomy", label: "Anatomy", icon: Compass },
    { id: "comps", label: "Comparables", icon: TrendingUp },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Forge Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4 border-b border-border/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-suite-forge/20 flex items-center justify-center">
              <Hammer className="w-5 h-5 text-suite-forge" />
            </div>
            <div>
              <h2 className="text-xl font-light text-foreground">TerraForge</h2>
              <p className="text-xs text-muted-foreground">Build value — equity analysis, models, calibration</p>
            </div>
          </div>

          {/* Sub-view Tabs */}
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ForgeView)}>
            <TabsList className="bg-tf-surface/50">
              {forgeViews.map((view) => {
                const Icon = view.icon;
                return (
                  <TabsTrigger key={view.id} value={view.id} className="text-xs gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {view.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeView === "vei" && <VEIDashboard />}
        {activeView === "regression" && <RegressionStudioDashboard />}
        {activeView === "avm" && <AVMStudioDashboard />}
        {activeView === "segments" && <SegmentDiscoveryDashboard />}
        {activeView === "anatomy" && <ValuationAnatomyDashboard />}
        {activeView === "comps" && <CompsView />}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Hammer, TrendingUp, Activity, Brain, Layers, Microscope, Compass, Factory as FactoryIcon, ExternalLink, FlaskConical, DollarSign, BarChart3, MapPin, Undo2, Target, Grid3X3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLatestCalibrationRun } from "@/hooks/useFactoryMetrics";
import { CompsView } from "./CompsView";
import { VEIDashboard } from "@/components/vei/VEIDashboard";
import { RegressionStudioDashboard } from "@/components/regression/RegressionStudioDashboard";
import { AVMStudioDashboard } from "@/components/avm/AVMStudioDashboard";
import { SegmentDiscoveryDashboard } from "@/components/segments";
import { ValuationAnatomyDashboard } from "@/components/anatomy";
import { AvmRunPanel } from "@/components/valuation/AvmRunPanel";
import { CostApproachPanel } from "@/components/valuation/CostApproachPanel";
import { RatioStudyPanel } from "@/components/valuation/RatioStudyPanel";
import { NeighborhoodRatioStudyDashboard } from "@/components/valuation/NeighborhoodRatioStudyDashboard";
import { ParcelComparisonView } from "../ParcelComparisonView";
import { BatchAdjustmentReviewQueue } from "@/components/forge/BatchAdjustmentReviewQueue";
import { ComparativeSnapshotDiff } from "@/components/forge/ComparativeSnapshotDiff";
import { ValuationConfidenceVisualizer } from "@/components/forge/ValuationConfidenceVisualizer";
import { NeighborhoodEquityMatrix } from "@/components/forge/NeighborhoodEquityMatrix";
import { AssessmentMethodologyViewer } from "@/components/forge/AssessmentMethodologyViewer";
import { 
  PRDDrilldownDialog, 
  CODDrilldownDialog, 
  TierSlopeDrilldownDialog,
  AppealsDrilldownDialog 
} from "@/components/vei/drilldown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useStudyPeriods,
  useAssessmentRatiosByTier,
  useAppealsByTier,
  useSampleSize,
} from "@/hooks/useVEIData";

import {
  ArrowLeftRight,
} from "lucide-react";

type ForgeView = "vei" | "regression" | "avm" | "segments" | "anatomy" | "comps" | "avmrun" | "cost" | "ratio" | "compare" | "nbhd-ratio" | "adjustments" | "snapshots" | "confidence" | "equity-matrix";

export function ForgeTab() {
  const [activeView, setActiveView] = useState<ForgeView>("vei");

  const forgeViews: { id: ForgeView; label: string; icon: React.ElementType }[] = [
    { id: "vei", label: "Equity (VEI)", icon: Activity },
    { id: "regression", label: "Regression", icon: Microscope },
    { id: "avm", label: "AVM Studio", icon: Brain },
    { id: "segments", label: "Segments", icon: Layers },
    { id: "anatomy", label: "Anatomy", icon: Compass },
    { id: "comps", label: "Comparables", icon: TrendingUp },
    { id: "avmrun", label: "AVM Pipeline", icon: FlaskConical },
    { id: "cost", label: "Cost Approach", icon: DollarSign },
    { id: "ratio", label: "Ratio Study", icon: BarChart3 },
    { id: "compare", label: "Compare", icon: ArrowLeftRight },
    { id: "nbhd-ratio", label: "Nbhd Ratios", icon: MapPin },
    { id: "adjustments", label: "Adjustments", icon: Undo2 },
    { id: "snapshots", label: "Snapshots", icon: ArrowLeftRight },
    { id: "confidence", label: "Confidence", icon: Target },
    { id: "equity-matrix", label: "Equity Matrix", icon: Grid3X3 },
  ];

  const navigate = useNavigate();

  // Latest calibration run for context
  const { data: latestRun } = useLatestCalibrationRun();

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

          <div className="flex items-center gap-3">
            {/* Open in Factory link */}
            <button
              onClick={() => navigate("/factory/regression")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--tf-surface))] transition-colors"
            >
              <FactoryIcon className="w-3.5 h-3.5" />
              Open in Factory
              <ExternalLink className="w-3 h-3" />
            </button>

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
        </div>

        {/* Latest calibration run banner */}
        {latestRun && (
          <div className="mt-3 flex items-center gap-3 p-2 rounded-lg bg-[hsl(var(--tf-surface)/0.5)] border border-border/30">
            <Badge variant="outline" className="text-[10px]">{latestRun.status}</Badge>
            <span className="text-xs text-muted-foreground">
              Latest calibration: <span className="text-foreground font-medium">{latestRun.neighborhood_code}</span>
              {" · "}R² {latestRun.r_squared?.toFixed(4) ?? "—"} · {latestRun.sample_size ?? 0} samples
            </span>
            <button
              onClick={() => navigate(`/factory/regression`)}
              className="ml-auto text-[10px] text-tf-cyan hover:underline"
            >
              View →
            </button>
          </div>
        )}
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeView === "vei" && <VEIDashboard />}
        {activeView === "regression" && <RegressionStudioDashboard />}
        {activeView === "avm" && <AVMStudioDashboard />}
        {activeView === "segments" && <SegmentDiscoveryDashboard />}
        {activeView === "anatomy" && <ValuationAnatomyDashboard />}
        {activeView === "comps" && <CompsView />}
        {activeView === "avmrun" && <AvmRunPanel />}
        {activeView === "cost" && <CostApproachPanel />}
        {activeView === "ratio" && <RatioStudyPanel />}
        {activeView === "compare" && <div className="p-6"><ParcelComparisonView /></div>}
        {activeView === "nbhd-ratio" && <NeighborhoodRatioStudyDashboard />}
        {activeView === "adjustments" && <div className="p-6"><BatchAdjustmentReviewQueue /></div>}
        {activeView === "snapshots" && <div className="p-6"><ComparativeSnapshotDiff /></div>}
        {activeView === "confidence" && <div className="p-6"><ValuationConfidenceVisualizer /></div>}
        {activeView === "equity-matrix" && <div className="p-6"><NeighborhoodEquityMatrix /></div>}
      </div>
    </div>
  );
}

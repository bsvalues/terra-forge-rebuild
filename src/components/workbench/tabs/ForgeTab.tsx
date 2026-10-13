import { useNavigate } from "react-router-dom";
import { TrendingUp, Activity, Brain, Layers, Microscope, Compass, Factory as FactoryIcon, ExternalLink, FlaskConical, DollarSign, BarChart3, MapPin, Undo2, Target, Grid3X3, BookOpen, Database } from "lucide-react";
import { ComparableSalesPanel } from "../ComparableSalesPanel";
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
import { ParcelComparisonDiff } from "@/components/forge/ParcelComparisonDiff";
import { CostForgeDashboard } from "@/components/costforge/CostForgeDashboard";
import { CalcTracePanel } from "@/components/costforge/CalcTracePanel";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { AscendParcelPanel } from "@/components/forge/AscendParcelPanel";
import { WorkToolBar } from "@/components/navigation/WorkToolBar";
import { useWorkspaceTool } from "@/hooks/useWorkspaceTool";
import { Button } from "@/components/ui/button";
import { ParcelDetailEditor } from "../ParcelDetailEditor";

import {
  ArrowLeftRight,
} from "lucide-react";

type ForgeView = "details" | "vei" | "regression" | "avm" | "segments" | "anatomy" | "comps" | "avmrun" | "cost" | "ratio" | "compare" | "nbhd-ratio" | "adjustments" | "snapshots" | "confidence" | "equity-matrix" | "methodology" | "costforge" | "ascend" | "diff";

export function ForgeTab() {
  const [activeView, setActiveView] = useWorkspaceTool<ForgeView>("assessmentTool", ["details", "vei", "regression", "avm", "segments", "anatomy", "comps", "avmrun", "cost", "ratio", "compare", "nbhd-ratio", "adjustments", "snapshots", "confidence", "equity-matrix", "methodology", "costforge", "ascend", "diff"], "comps");

  const forgeViews: { id: ForgeView; label: string; icon: React.ElementType; group?: string }[] = [
    { id: "details", label: "Property details", icon: Database },
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
    { id: "methodology", label: "Methodology", icon: BookOpen },
    { id: "costforge", label: "CostForge", icon: DollarSign },
    { id: "ascend", label: "Legacy Data", icon: Database },
    { id: "diff", label: "Diff", icon: ArrowLeftRight },
  ];

  const navigate = useNavigate();
  const { parcel } = useWorkbench();
  const parcelId = parcel.id;

  // Latest calibration run for context


  return (
    <div className="h-full flex flex-col">
      <div className="module-page pb-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Assessment</h2><Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/factory/calibration")}><FactoryIcon className="h-4 w-4" />County valuation tools<ExternalLink className="h-3 w-3" /></Button></div>
        <WorkToolBar tools={forgeViews.map(view => ({ ...view, group: ["vei", "regression", "avm", "segments", "nbhd-ratio", "equity-matrix"].includes(view.id) ? "County analysis" : "Assessment review" }))} primary={["comps", "details", "cost"]} active={activeView} onSelect={setActiveView} />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeView === "details" && <div className="module-page"><ParcelDetailEditor /></div>}
        {activeView === "vei" && <VEIDashboard />}
        {activeView === "regression" && <RegressionStudioDashboard />}
        {activeView === "avm" && <AVMStudioDashboard />}
        {activeView === "segments" && <SegmentDiscoveryDashboard />}
        {activeView === "anatomy" && <ValuationAnatomyDashboard />}
        {activeView === "comps" && <ComparableSalesPanel />}
        {activeView === "avmrun" && <AvmRunPanel />}
        {activeView === "cost" && <CostApproachPanel />}
        {activeView === "ratio" && <RatioStudyPanel />}
        {activeView === "compare" && <div className="p-6"><ParcelComparisonView /></div>}
        {activeView === "nbhd-ratio" && <NeighborhoodRatioStudyDashboard />}
        {activeView === "adjustments" && <div className="p-6"><BatchAdjustmentReviewQueue /></div>}
        {activeView === "snapshots" && <div className="p-6"><ComparativeSnapshotDiff /></div>}
        {activeView === "confidence" && <div className="p-6"><ValuationConfidenceVisualizer /></div>}
        {activeView === "equity-matrix" && <div className="p-6"><NeighborhoodEquityMatrix /></div>}
        {activeView === "methodology" && <div className="p-6"><AssessmentMethodologyViewer /></div>}
        {activeView === "costforge" && (
          <div className="space-y-6 p-6">
            <CostForgeDashboard />
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Calculation Trace
              </h3>
              <CalcTracePanel parcelId={parcelId} />
            </div>
          </div>
        )}
        {activeView === "ascend" && <div className="p-6"><AscendParcelPanel /></div>}
        {activeView === "diff" && <div className="p-6"><ParcelComparisonDiff /></div>}
      </div>
    </div>
  );
}

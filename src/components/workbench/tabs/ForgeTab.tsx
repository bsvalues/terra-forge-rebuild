import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Hammer, TrendingUp, Calculator, BarChart3, Activity, AlertTriangle, ChevronRight } from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";
import { VEIMetricCard } from "@/components/vei/VEIMetricCard";
import { VEISummaryPanel } from "@/components/vei/VEISummaryPanel";
import { PRDTrendChart } from "@/components/vei/charts/PRDTrendChart";
import { CODTrendChart } from "@/components/vei/charts/CODTrendChart";
import { TierRatioPlot } from "@/components/vei/charts/TierRatioPlot";
import { VEIDashboardSkeleton } from "@/components/vei/VEIDashboardSkeleton";
import { VEIEmptyState } from "@/components/vei/VEIEmptyState";
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

type DrilldownType = "prd" | "cod" | "tier" | "appeals" | null;
type ForgeView = "equity" | "models" | "comps";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export function ForgeTab() {
  const { studyPeriod: workbenchStudyPeriod, setStudyPeriod } = useWorkbench();
  const [activeView, setActiveView] = useState<ForgeView>("equity");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(
    workbenchStudyPeriod.id ?? undefined
  );
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownType>(null);

  // Fetch all study periods
  const { data: studyPeriods, isLoading: isLoadingPeriods } = useStudyPeriods();

  // Auto-select active period on first load
  useEffect(() => {
    if (studyPeriods && studyPeriods.length > 0 && !selectedPeriodId) {
      const activePeriod = studyPeriods.find((p) => p.status === "active");
      const periodId = activePeriod?.id || studyPeriods[0].id;
      setSelectedPeriodId(periodId);
      
      // Update workbench context
      const period = studyPeriods.find(p => p.id === periodId);
      if (period) {
        setStudyPeriod({
          id: period.id,
          name: period.name,
          status: period.status,
          startDate: period.start_date,
          endDate: period.end_date,
        });
      }
    }
  }, [studyPeriods, selectedPeriodId, setStudyPeriod]);

  // Sync with workbench context
  useEffect(() => {
    if (workbenchStudyPeriod.id && workbenchStudyPeriod.id !== selectedPeriodId) {
      setSelectedPeriodId(workbenchStudyPeriod.id);
    }
  }, [workbenchStudyPeriod.id, selectedPeriodId]);

  const studyPeriod = studyPeriods?.find((p) => p.id === selectedPeriodId);

  // Fetch VEI metrics for selected period
  const { data: metrics, isLoading: isLoadingMetrics } = useVEIMetrics(selectedPeriodId);
  const { data: trendData, isLoading: isLoadingTrend } = useVEIMetricsTrend();
  const { data: tierData, isLoading: isLoadingTiers } = useAssessmentRatiosByTier(selectedPeriodId);
  const { data: appealsData } = useAppealsByTier(selectedPeriodId);
  const { data: sampleSize } = useSampleSize(selectedPeriodId);

  const isLoading = isLoadingPeriods || (selectedPeriodId && (isLoadingMetrics || isLoadingTrend || isLoadingTiers));

  // Status helpers
  const getPRDStatus = (prd: number) => {
    const deviation = Math.abs(prd - 1);
    if (deviation <= 0.02) return { status: "excellent", label: "Excellent" };
    if (deviation <= 0.05) return { status: "good", label: "Good" };
    if (deviation <= 0.10) return { status: "caution", label: "Caution" };
    return { status: "concern", label: "Concern" };
  };

  const getCODStatus = (cod: number) => {
    if (cod <= 10) return { status: "excellent", label: "Excellent" };
    if (cod <= 15) return { status: "good", label: "Good" };
    if (cod <= 20) return { status: "caution", label: "Caution" };
    return { status: "concern", label: "Concern" };
  };

  const getTierSlopeStatus = (slope: number) => {
    const absSlope = Math.abs(slope);
    if (absSlope <= 0.02) return { status: "excellent", label: "Neutral" };
    if (absSlope <= 0.05) return { status: "good", label: "Slight Bias" };
    if (absSlope <= 0.10) return { status: "caution", label: "Regressivity Signal" };
    return { status: "concern", label: "Strong Regressivity" };
  };

  const getAppealsStatus = (rate: number) => {
    if (rate <= 3) return { status: "excellent", label: "Low" };
    if (rate <= 5) return { status: "good", label: "Moderate" };
    if (rate <= 8) return { status: "caution", label: "High" };
    return { status: "concern", label: "Critical" };
  };

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

          {/* View Tabs */}
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ForgeView)}>
            <TabsList className="bg-tf-surface/50">
              <TabsTrigger value="equity" className="text-xs gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Equity Analysis
              </TabsTrigger>
              <TabsTrigger value="models" className="text-xs gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Valuation Models
              </TabsTrigger>
              <TabsTrigger value="comps" className="text-xs gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Comparables
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeView === "equity" && (
          <EquityAnalysisView
            isLoading={isLoading}
            studyPeriod={studyPeriod}
            studyPeriods={studyPeriods}
            metrics={metrics}
            trendData={trendData}
            tierData={tierData}
            appealsData={appealsData}
            sampleSize={sampleSize}
            activeDrilldown={activeDrilldown}
            setActiveDrilldown={setActiveDrilldown}
            getPRDStatus={getPRDStatus}
            getCODStatus={getCODStatus}
            getTierSlopeStatus={getTierSlopeStatus}
            getAppealsStatus={getAppealsStatus}
          />
        )}

        {activeView === "models" && (
          <PlaceholderView
            icon={Calculator}
            title="Valuation Models"
            description="Run and calibrate mass appraisal models"
          />
        )}

        {activeView === "comps" && (
          <PlaceholderView
            icon={TrendingUp}
            title="Sales Comparables"
            description="Find and analyze comparable sales"
          />
        )}
      </div>

      {/* Drill-down Dialogs */}
      {studyPeriod && (
        <DrilldownDialogs
          activeDrilldown={activeDrilldown}
          setActiveDrilldown={setActiveDrilldown}
          metrics={metrics}
          trendData={trendData}
          tierData={tierData}
          appealsData={appealsData}
          studyPeriod={studyPeriod}
        />
      )}
    </div>
  );
}

interface EquityViewProps {
  isLoading: boolean;
  studyPeriod: any;
  studyPeriods: any[] | undefined;
  metrics: any;
  trendData: any[] | undefined;
  tierData: any[] | undefined;
  appealsData: any[] | undefined;
  sampleSize: number | undefined;
  activeDrilldown: DrilldownType;
  setActiveDrilldown: (type: DrilldownType) => void;
  getPRDStatus: (prd: number) => { status: string; label: string };
  getCODStatus: (cod: number) => { status: string; label: string };
  getTierSlopeStatus: (slope: number) => { status: string; label: string };
  getAppealsStatus: (rate: number) => { status: string; label: string };
}

function EquityAnalysisView({
  isLoading,
  studyPeriod,
  studyPeriods,
  metrics,
  trendData,
  tierData,
  appealsData,
  sampleSize,
  activeDrilldown,
  setActiveDrilldown,
  getPRDStatus,
  getCODStatus,
  getTierSlopeStatus,
  getAppealsStatus,
}: EquityViewProps) {
  if (isLoading) {
    return (
      <div className="p-6">
        <VEIDashboardSkeleton />
      </div>
    );
  }

  if (!studyPeriods || studyPeriods.length === 0 || !studyPeriod) {
    return (
      <div className="p-6">
        <VEIEmptyState />
      </div>
    );
  }

  // Transform data for charts
  const prdTrendData = {
    current: metrics?.prd ?? 1.0,
    trend: trendData?.map((t) => t.prd ?? 1.0) ?? [],
    years: trendData?.map((t) => new Date(t.study_periods.start_date).getFullYear()) ?? [],
    target: studyPeriod.target_prd_low ? (studyPeriod.target_prd_low + (studyPeriod.target_prd_high ?? 1.03)) / 2 : 1.0,
    tolerance: studyPeriod.target_prd_high && studyPeriod.target_prd_low 
      ? (studyPeriod.target_prd_high - studyPeriod.target_prd_low) / 2 
      : 0.03,
  };

  const codTrendData = {
    current: metrics?.cod ?? 0,
    trend: trendData?.map((t) => t.cod ?? 0) ?? [],
    years: trendData?.map((t) => new Date(t.study_periods.start_date).getFullYear()) ?? [],
    target: 10,
    upperLimit: studyPeriod.target_cod ?? 15,
  };

  const tierMedians = tierData?.map((t) => ({
    tier: t.tier,
    median: t.median,
    count: t.count,
    color: t.color,
  })) ?? [];

  const lowMedian = tierMedians.find((t) => t.tier === "low" || t.tier.includes("Q1"))?.median ?? 1.0;
  const highMedian = tierMedians.find((t) => t.tier === "high" || t.tier.includes("Q4"))?.median ?? 1.0;
  const tierSlope = highMedian - lowMedian;
  const highTierAppealsRate = appealsData?.find((a) => a.tier === "high" || a.tier.includes("Q4"))?.rate ?? 0;

  const prdStatus = getPRDStatus(metrics?.prd ?? 1.0);
  const codStatus = getCODStatus(metrics?.cod ?? 0);
  const tierSlopeStatus = getTierSlopeStatus(tierSlope);
  const appealsStatus = getAppealsStatus(highTierAppealsRate);

  const studyPeriodLabel = `${new Date(studyPeriod.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${new Date(studyPeriod.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  const currentYear = new Date(studyPeriod.end_date).getFullYear();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-5"
    >
      {/* Summary Panel - Compact */}
      <motion.div variants={itemVariants}>
        <VEISummaryPanel
          studyPeriod={studyPeriodLabel}
          propertyClass="Residential"
          sampleSize={sampleSize ?? 0}
          currentYear={currentYear}
        />
      </motion.div>

      {/* Key Metrics Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <VEIMetricCard
          title="PRD"
          value={(metrics?.prd ?? 1.0).toFixed(3)}
          subtitle="Price-Related Differential"
          status={prdStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={prdStatus.label}
          icon={TrendingUp}
          target="1.000"
          onClick={() => setActiveDrilldown("prd")}
        />
        <VEIMetricCard
          title="COD"
          value={`${(metrics?.cod ?? 0).toFixed(1)}%`}
          subtitle="Coefficient of Dispersion"
          status={codStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={codStatus.label}
          icon={Activity}
          target="≤10%"
          onClick={() => setActiveDrilldown("cod")}
        />
        <VEIMetricCard
          title="Tier Slope"
          value={tierSlope >= 0 ? `+${tierSlope.toFixed(2)}` : tierSlope.toFixed(2)}
          subtitle="Q1→Q4 Spread"
          status={tierSlopeStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={tierSlopeStatus.label}
          icon={BarChart3}
          target="~0.00"
          onClick={() => setActiveDrilldown("tier")}
        />
        <VEIMetricCard
          title="Appeals"
          value={`${highTierAppealsRate.toFixed(1)}%`}
          subtitle="High-Value Rate"
          status={appealsStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={appealsStatus.label}
          icon={AlertTriangle}
          target="<5%"
          onClick={() => setActiveDrilldown("appeals")}
        />
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div 
          variants={itemVariants} 
          className="glass-card rounded-xl p-5 cursor-pointer hover:border-suite-forge/40 transition-colors"
          onClick={() => setActiveDrilldown("prd")}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">PRD Trend</h3>
              <p className="text-xs text-muted-foreground">Price-Related Differential</p>
            </div>
            <span className="text-xl font-light text-suite-forge">{(metrics?.prd ?? 1.0).toFixed(3)}</span>
          </div>
          <PRDTrendChart data={prdTrendData} />
        </motion.div>

        <motion.div 
          variants={itemVariants} 
          className="glass-card rounded-xl p-5 cursor-pointer hover:border-suite-forge/40 transition-colors"
          onClick={() => setActiveDrilldown("cod")}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">COD Trend</h3>
              <p className="text-xs text-muted-foreground">Coefficient of Dispersion</p>
            </div>
            <span className="text-xl font-light text-suite-forge">{(metrics?.cod ?? 0).toFixed(1)}%</span>
          </div>
          <CODTrendChart data={codTrendData} />
        </motion.div>
      </div>

      {/* Tier Ratio Plot */}
      <motion.div 
        variants={itemVariants} 
        className="glass-card rounded-xl p-5 cursor-pointer hover:border-suite-forge/40 transition-colors"
        onClick={() => setActiveDrilldown("tier")}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Tier Ratio Distribution</h3>
            <p className="text-xs text-muted-foreground">Median ratios by value quartile — {currentYear}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tf-cyan" />
              Target: 1.00
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tf-amber" />
              ±3%
            </span>
          </div>
        </div>
        <TierRatioPlot data={tierMedians} />
      </motion.div>
    </motion.div>
  );
}

interface PlaceholderViewProps {
  icon: any;
  title: string;
  description: string;
}

function PlaceholderView({ icon: Icon, title, description }: PlaceholderViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-suite-forge/10 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-suite-forge/50" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">{description}</p>
        <p className="text-xs text-muted-foreground/60 mt-4">Coming soon in TerraForge</p>
      </div>
    </motion.div>
  );
}

interface DrilldownDialogsProps {
  activeDrilldown: DrilldownType;
  setActiveDrilldown: (type: DrilldownType) => void;
  metrics: any;
  trendData: any[] | undefined;
  tierData: any[] | undefined;
  appealsData: any[] | undefined;
  studyPeriod: any;
}

function DrilldownDialogs({
  activeDrilldown,
  setActiveDrilldown,
  metrics,
  trendData,
  tierData,
  appealsData,
  studyPeriod,
}: DrilldownDialogsProps) {
  const prdTrendData = {
    current: metrics?.prd ?? 1.0,
    trend: trendData?.map((t) => t.prd ?? 1.0) ?? [],
    years: trendData?.map((t) => new Date(t.study_periods.start_date).getFullYear()) ?? [],
    target: studyPeriod.target_prd_low ? (studyPeriod.target_prd_low + (studyPeriod.target_prd_high ?? 1.03)) / 2 : 1.0,
    tolerance: studyPeriod.target_prd_high && studyPeriod.target_prd_low 
      ? (studyPeriod.target_prd_high - studyPeriod.target_prd_low) / 2 
      : 0.03,
  };

  const codTrendData = {
    current: metrics?.cod ?? 0,
    trend: trendData?.map((t) => t.cod ?? 0) ?? [],
    years: trendData?.map((t) => new Date(t.study_periods.start_date).getFullYear()) ?? [],
    target: 10,
    upperLimit: studyPeriod.target_cod ?? 15,
  };

  const tierMedians = tierData?.map((t) => ({
    tier: t.tier,
    median: t.median,
    count: t.count,
    color: t.color,
  })) ?? [];

  const lowMedian = tierMedians.find((t) => t.tier === "low" || t.tier.includes("Q1"))?.median ?? 1.0;
  const highMedian = tierMedians.find((t) => t.tier === "high" || t.tier.includes("Q4"))?.median ?? 1.0;
  const tierSlope = highMedian - lowMedian;
  const highTierAppealsRate = appealsData?.find((a) => a.tier === "high" || a.tier.includes("Q4"))?.rate ?? 0;

  return (
    <>
      <PRDDrilldownDialog
        open={activeDrilldown === "prd"}
        onOpenChange={(open) => !open && setActiveDrilldown(null)}
        data={prdTrendData}
      />
      <CODDrilldownDialog
        open={activeDrilldown === "cod"}
        onOpenChange={(open) => !open && setActiveDrilldown(null)}
        data={codTrendData}
      />
      <TierSlopeDrilldownDialog
        open={activeDrilldown === "tier"}
        onOpenChange={(open) => !open && setActiveDrilldown(null)}
        data={{ slope: tierSlope, tierMedians }}
      />
      <AppealsDrilldownDialog
        open={activeDrilldown === "appeals"}
        onOpenChange={(open) => !open && setActiveDrilldown(null)}
        data={{ highTierRate: highTierAppealsRate, byTier: appealsData ?? [] }}
      />
    </>
  );
}

import { motion } from "framer-motion";
import { PRDTrendChart } from "./charts/PRDTrendChart";
import { TierRatioPlot } from "./charts/TierRatioPlot";
import { CODTrendChart } from "./charts/CODTrendChart";
import { VEIMetricCard } from "./VEIMetricCard";
import { VEISummaryPanel } from "./VEISummaryPanel";
import { VEIExportActions } from "./VEIExportActions";
import { VEIDashboardSkeleton } from "./VEIDashboardSkeleton";
import { VEIEmptyState } from "./VEIEmptyState";
import { Activity, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";
import {
  useActiveStudyPeriod,
  useVEIMetrics,
  useVEIMetricsTrend,
  useAssessmentRatiosByTier,
  useAppealsByTier,
  useSampleSize,
} from "@/hooks/useVEIData";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function VEIDashboard() {
  // Fetch active study period
  const { data: studyPeriod, isLoading: isLoadingPeriod } = useActiveStudyPeriod();
  
  // Fetch VEI metrics for active period
  const { data: metrics, isLoading: isLoadingMetrics } = useVEIMetrics(studyPeriod?.id);
  
  // Fetch trend data across all periods
  const { data: trendData, isLoading: isLoadingTrend } = useVEIMetricsTrend();
  
  // Fetch tier ratio data
  const { data: tierData, isLoading: isLoadingTiers } = useAssessmentRatiosByTier(studyPeriod?.id);
  
  // Fetch appeals by tier
  const { data: appealsData } = useAppealsByTier(studyPeriod?.id);
  
  // Fetch sample size
  const { data: sampleSize } = useSampleSize(studyPeriod?.id);

  const isLoading = isLoadingPeriod || isLoadingMetrics || isLoadingTrend || isLoadingTiers;

  // Show skeleton while loading
  if (isLoading) {
    return <VEIDashboardSkeleton />;
  }

  // Show empty state if no study period
  if (!studyPeriod) {
    return <VEIEmptyState />;
  }

  // Transform trend data for charts
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

  // Calculate tier slope (Q4 - Q1 median difference)
  const q1Median = tierMedians.find((t) => t.tier.includes("Q1"))?.median ?? 1.0;
  const q4Median = tierMedians.find((t) => t.tier.includes("Q4"))?.median ?? 1.0;
  const tierSlope = q4Median - q1Median;

  // Get Q4 appeal rate
  const q4AppealsRate = appealsData?.find((a) => a.tier.includes("Q4"))?.rate ?? 0;

  // Status helpers
  const getPRDStatus = (prd: number) => {
    const deviation = Math.abs(prd - 1);
    if (deviation <= 0.02) return { status: "excellent", label: "Excellent", color: "vei-excellent" };
    if (deviation <= 0.05) return { status: "good", label: "Good", color: "vei-good" };
    if (deviation <= 0.10) return { status: "caution", label: "Caution", color: "vei-caution" };
    return { status: "concern", label: "Concern", color: "vei-concern" };
  };

  const getCODStatus = (cod: number) => {
    if (cod <= 10) return { status: "excellent", label: "Excellent", color: "vei-excellent" };
    if (cod <= 15) return { status: "good", label: "Good", color: "vei-good" };
    if (cod <= 20) return { status: "caution", label: "Caution", color: "vei-caution" };
    return { status: "concern", label: "Concern", color: "vei-concern" };
  };

  const getTierSlopeStatus = (slope: number) => {
    const absSlope = Math.abs(slope);
    if (absSlope <= 0.02) return { status: "excellent", label: "Neutral", color: "vei-excellent" };
    if (absSlope <= 0.05) return { status: "good", label: "Slight Bias", color: "vei-good" };
    if (absSlope <= 0.10) return { status: "caution", label: "Regressivity Signal", color: "vei-caution" };
    return { status: "concern", label: "Strong Regressivity", color: "vei-concern" };
  };

  const getAppealsStatus = (rate: number) => {
    if (rate <= 3) return { status: "excellent", label: "Low Concentration", color: "vei-excellent" };
    if (rate <= 5) return { status: "good", label: "Moderate", color: "vei-good" };
    if (rate <= 8) return { status: "caution", label: "High-Value Clustering", color: "vei-caution" };
    return { status: "concern", label: "Critical Clustering", color: "vei-concern" };
  };

  const prdStatus = getPRDStatus(metrics?.prd ?? 1.0);
  const codStatus = getCODStatus(metrics?.cod ?? 0);
  const tierSlopeStatus = getTierSlopeStatus(tierSlope);
  const appealsStatus = getAppealsStatus(q4AppealsRate);

  // Format study period dates
  const studyPeriodLabel = `${new Date(studyPeriod.start_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })} - ${new Date(studyPeriod.end_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  const currentYear = new Date(studyPeriod.end_date).getFullYear();

  // Build export data
  const exportData = {
    currentYear,
    prd: prdTrendData,
    cod: codTrendData,
    tierMedians,
    appeals: {
      byTier: appealsData ?? [],
    },
    studyPeriod: studyPeriodLabel,
    propertyClass: "Residential",
    sampleSize: sampleSize ?? 0,
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-gradient-sovereign tracking-tight">
            VEI Suite Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Vertical Equity Index — Minimum Viable Standard (VEI-MVS)
          </p>
        </div>
        <VEIExportActions data={exportData} />
      </motion.div>

      {/* Summary Panel */}
      <motion.div variants={itemVariants}>
        <VEISummaryPanel
          studyPeriod={studyPeriodLabel}
          propertyClass="Residential"
          sampleSize={sampleSize ?? 0}
          currentYear={currentYear}
        />
      </motion.div>

      {/* Key Metrics Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <VEIMetricCard
          title="PRD (Current)"
          value={(metrics?.prd ?? 1.0).toFixed(3)}
          subtitle="Price-Related Differential"
          status={prdStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={prdStatus.label}
          icon={TrendingUp}
          target="1.000"
        />
        <VEIMetricCard
          title="COD (Current)"
          value={`${(metrics?.cod ?? 0).toFixed(1)}%`}
          subtitle="Coefficient of Dispersion"
          status={codStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={codStatus.label}
          icon={Activity}
          target="≤10%"
        />
        <VEIMetricCard
          title="Tier Slope"
          value={tierSlope >= 0 ? `+${tierSlope.toFixed(2)}` : tierSlope.toFixed(2)}
          subtitle="Q1 to Q4 Median Spread"
          status={tierSlopeStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={tierSlopeStatus.label}
          icon={BarChart3}
          target="~0.00"
        />
        <VEIMetricCard
          title="Appeals Concentration"
          value={`${q4AppealsRate.toFixed(1)}%`}
          subtitle="Q4 Appeal Rate"
          status={appealsStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={appealsStatus.label}
          icon={AlertTriangle}
          target="<5%"
        />
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRD Trend */}
        <motion.div variants={itemVariants} className="glass-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-foreground">PRD Trend</h2>
              <p className="text-sm text-muted-foreground">Price-Related Differential History</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-light text-tf-cyan">{(metrics?.prd ?? 1.0).toFixed(3)}</span>
              <p className="text-xs text-muted-foreground">Current Value</p>
            </div>
          </div>
          <PRDTrendChart data={prdTrendData} />
        </motion.div>

        {/* COD Trend */}
        <motion.div variants={itemVariants} className="glass-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-foreground">COD Trend</h2>
              <p className="text-sm text-muted-foreground">Coefficient of Dispersion History</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-light text-tf-cyan">{(metrics?.cod ?? 0).toFixed(1)}%</span>
              <p className="text-xs text-muted-foreground">Current Value</p>
            </div>
          </div>
          <CODTrendChart data={codTrendData} />
        </motion.div>
      </div>

      {/* Tier Ratio Plot - Full Width */}
      <motion.div variants={itemVariants} className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">Tier Ratio Plot</h2>
            <p className="text-sm text-muted-foreground">
              Median Assessment Ratios by Value Quartile — {currentYear}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tf-cyan"></span>
              Target: 1.00
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tf-amber"></span>
              ±3% Tolerance
            </span>
          </div>
        </div>
        <TierRatioPlot data={tierMedians} />
      </motion.div>

      {/* Footer Info */}
      <motion.div variants={itemVariants} className="text-center text-xs text-muted-foreground py-4">
        <p>
          VEI-MVS is a descriptive, non-punitive monitoring tool. Not a compliance score or enforcement mechanism.
        </p>
        <p className="mt-1">
          Implementation spec (optional). Not a policy endorsement. Vendor-neutral framework.
        </p>
      </motion.div>
    </motion.div>
  );
}

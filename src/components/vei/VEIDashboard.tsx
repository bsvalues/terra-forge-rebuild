import { motion } from "framer-motion";
import { PRDTrendChart } from "./charts/PRDTrendChart";
import { TierRatioPlot } from "./charts/TierRatioPlot";
import { CODTrendChart } from "./charts/CODTrendChart";
import { VEIMetricCard } from "./VEIMetricCard";
import { VEISummaryPanel } from "./VEISummaryPanel";
import { VEIExportActions } from "./VEIExportActions";
import { Activity, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";

// Sample VEI data - in production this would come from the database
const mockVEIData = {
  currentYear: 2024,
  prd: {
    current: 1.02,
    trend: [0.99, 1.01, 1.03, 1.02, 1.02],
    years: [2020, 2021, 2022, 2023, 2024],
    target: 1.0,
    tolerance: 0.03,
  },
  cod: {
    current: 11.8,
    trend: [14.2, 13.5, 12.8, 12.1, 11.8],
    years: [2020, 2021, 2022, 2023, 2024],
    target: 10,
    upperLimit: 15,
  },
  tierMedians: [
    { tier: "Q1 (Low)", median: 0.96, count: 1250, color: "var(--tier-q1)" },
    { tier: "Q2", median: 0.99, count: 1340, color: "var(--tier-q2)" },
    { tier: "Q3", median: 1.01, count: 1280, color: "var(--tier-q3)" },
    { tier: "Q4 (High)", median: 1.04, count: 1190, color: "var(--tier-q4)" },
  ],
  appeals: {
    byTier: [
      { tier: "Q1", count: 45, rate: 3.6 },
      { tier: "Q2", count: 38, rate: 2.8 },
      { tier: "Q3", count: 52, rate: 4.1 },
      { tier: "Q4", count: 89, rate: 7.5 },
    ],
  },
  studyPeriod: "January 2024 - December 2024",
  propertyClass: "Residential",
  sampleSize: 5060,
};

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

  const prdStatus = getPRDStatus(mockVEIData.prd.current);
  const codStatus = getCODStatus(mockVEIData.cod.current);

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
        <VEIExportActions data={mockVEIData} />
      </motion.div>

      {/* Summary Panel */}
      <motion.div variants={itemVariants}>
        <VEISummaryPanel
          studyPeriod={mockVEIData.studyPeriod}
          propertyClass={mockVEIData.propertyClass}
          sampleSize={mockVEIData.sampleSize}
          currentYear={mockVEIData.currentYear}
        />
      </motion.div>

      {/* Key Metrics Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <VEIMetricCard
          title="PRD (Current)"
          value={mockVEIData.prd.current.toFixed(3)}
          subtitle="Price-Related Differential"
          status={prdStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={prdStatus.label}
          icon={TrendingUp}
          target="1.000"
        />
        <VEIMetricCard
          title="COD (Current)"
          value={`${mockVEIData.cod.current.toFixed(1)}%`}
          subtitle="Coefficient of Dispersion"
          status={codStatus.status as "excellent" | "good" | "caution" | "concern"}
          statusLabel={codStatus.label}
          icon={Activity}
          target="≤10%"
        />
        <VEIMetricCard
          title="Tier Slope"
          value="+0.08"
          subtitle="Q1 to Q4 Median Spread"
          status="caution"
          statusLabel="Regressivity Signal"
          icon={BarChart3}
          target="~0.00"
        />
        <VEIMetricCard
          title="Appeals Concentration"
          value="7.5%"
          subtitle="Q4 Appeal Rate"
          status="concern"
          statusLabel="High-Value Clustering"
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
              <h2 className="text-lg font-medium text-foreground">PRD Trend (5-Year)</h2>
              <p className="text-sm text-muted-foreground">Price-Related Differential History</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-light text-tf-cyan">{mockVEIData.prd.current.toFixed(3)}</span>
              <p className="text-xs text-muted-foreground">Current Value</p>
            </div>
          </div>
          <PRDTrendChart data={mockVEIData.prd} />
        </motion.div>

        {/* COD Trend */}
        <motion.div variants={itemVariants} className="glass-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-foreground">COD Trend (5-Year)</h2>
              <p className="text-sm text-muted-foreground">Coefficient of Dispersion History</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-light text-tf-cyan">{mockVEIData.cod.current.toFixed(1)}%</span>
              <p className="text-xs text-muted-foreground">Current Value</p>
            </div>
          </div>
          <CODTrendChart data={mockVEIData.cod} />
        </motion.div>
      </div>

      {/* Tier Ratio Plot - Full Width */}
      <motion.div variants={itemVariants} className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">Tier Ratio Plot</h2>
            <p className="text-sm text-muted-foreground">
              Median Assessment Ratios by Value Quartile — {mockVEIData.currentYear}
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
        <TierRatioPlot data={mockVEIData.tierMedians} />
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

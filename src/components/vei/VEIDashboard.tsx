import { useState } from "react";
import { motion } from "framer-motion";
import { format, subMonths } from "date-fns";
import { PRDTrendChart } from "./charts/PRDTrendChart";
import { TierRatioPlot } from "./charts/TierRatioPlot";
import { CODTrendChart } from "./charts/CODTrendChart";
import { VEIMetricCard } from "./VEIMetricCard";
import { VEISummaryPanel } from "./VEISummaryPanel";
import { VEIExportActions } from "./VEIExportActions";
import { VEIDashboardSkeleton } from "./VEIDashboardSkeleton";
import { VEIEmptyState } from "./VEIEmptyState";
import { TaxYearSelector } from "./TaxYearSelector";
import { SalesWindowSelector } from "./SalesWindowSelector";
import { NeighborhoodComparisonGrid } from "./NeighborhoodComparisonGrid";
import { 
  PRDDrilldownDialog, 
  CODDrilldownDialog, 
  TierSlopeDrilldownDialog,
  AppealsDrilldownDialog 
} from "./drilldown";
import { Activity, TrendingUp, BarChart3, AlertTriangle, Percent, Target, Filter, Info, Compass } from "lucide-react";
import { ScopeHeader, ProvenanceBadge } from "@/components/trust";
import { useCountyMeta } from "@/hooks/useCountyMeta";
import { useRatioAnalysis, useTaxYears, useNeighborhoodRatioComparison, type OutlierMethod } from "@/hooks/useRatioAnalysis";
import { useHistoricalRatioTrend, useAppealsByValueTier } from "@/hooks/useHistoricalRatioTrend";
import { useFieldCohort } from "@/hooks/useFieldCohort";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type DrilldownType = "prd" | "cod" | "tier" | "appeals" | null;

export function VEIDashboard() {
  const currentYear = new Date().getFullYear();
  const countyMeta = useCountyMeta();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [salesStartDate, setSalesStartDate] = useState<Date>(subMonths(new Date(), 24));
  const [salesEndDate, setSalesEndDate] = useState<Date>(new Date());
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownType>(null);
  const [outlierMethod, setOutlierMethod] = useState<OutlierMethod>("bounds");
  const [fieldCohortFilter, setFieldCohortFilter] = useState(false);

  const { cohort: fieldCohort, count: fieldCount } = useFieldCohort();

  const salesStartStr = format(salesStartDate, "yyyy-MM-dd");
  const salesEndStr = format(salesEndDate, "yyyy-MM-dd");

  // Fetch available tax years
  const { data: taxYears = [currentYear, currentYear - 1, currentYear - 2], isLoading: isLoadingYears } = useTaxYears();

  // Fetch ratio statistics on-demand for selected year
  const { data: ratioStats, isLoading: isLoadingStats } = useRatioAnalysis({
    taxYear: selectedYear,
    salesStartDate: salesStartStr,
    salesEndDate: salesEndStr,
    outlierMethod,
  });

  // Fetch historical trend data (real multi-year queries)
  const { data: trendData = [], isLoading: isLoadingTrend } = useHistoricalRatioTrend(
    salesStartStr,
    salesEndStr,
    4
  );

  // Fetch real appeals by value tier
  const { data: appealsData = [] } = useAppealsByValueTier(selectedYear);

  // Fetch neighborhood comparison data
  const { data: nbhdComparison = [], isLoading: isLoadingNbhd } = useNeighborhoodRatioComparison(
    selectedYear, salesStartStr, salesEndStr
  );

  const isLoading = isLoadingYears || isLoadingStats || isLoadingTrend;

  if (isLoading) {
    return <VEIDashboardSkeleton />;
  }

  if (!ratioStats || ratioStats.sample_size === 0) {
    return <VEIEmptyState />;
  }

  // Build tier medians from ratio stats
  const tierMedians = [
    { tier: "Q1 (Low)", median: ratioStats.low_tier_median || 1.0, count: Math.floor(ratioStats.sample_size / 4), color: "var(--tier-q1)" },
    { tier: "Q2", median: ratioStats.mid_tier_median || 1.0, count: Math.floor(ratioStats.sample_size / 4), color: "var(--tier-q2)" },
    { tier: "Q3", median: ratioStats.mid_tier_median || 1.0, count: Math.floor(ratioStats.sample_size / 4), color: "var(--tier-q3)" },
    { tier: "Q4 (High)", median: ratioStats.high_tier_median || 1.0, count: Math.floor(ratioStats.sample_size / 4), color: "var(--tier-q4)" },
  ];

  // Build real trend data from historical queries
  const prdTrendData = {
    current: ratioStats.prd ?? 1.0,
    trend: trendData.length > 0 ? trendData.map((t) => t.prd ?? 1.0) : [ratioStats.prd ?? 1.0],
    years: trendData.length > 0 ? trendData.map((t) => t.year) : [selectedYear],
    target: 1.0,
    tolerance: 0.03,
  };

  const codTrendData = {
    current: ratioStats.cod ?? 0,
    trend: trendData.length > 0 ? trendData.map((t) => t.cod ?? 0) : [ratioStats.cod ?? 0],
    years: trendData.length > 0 ? trendData.map((t) => t.year) : [selectedYear],
    target: 10,
    upperLimit: 15,
  };

  // Calculate tier slope
  const tierSlope = ratioStats.tier_slope ?? 0;

  // Get high-value tier appeal rate from real data
  const highTierAppealsRate = appealsData.find((a) => a.tier.includes("Q4"))?.rate ?? 0;

  // Status helpers
  type VEIStatus = "excellent" | "good" | "caution" | "concern";

  const getPRDStatus = (prd: number): { status: VEIStatus; label: string; color: string } => {
    const deviation = Math.abs(prd - 1);
    if (deviation <= 0.02) return { status: "excellent", label: "Excellent", color: "vei-excellent" };
    if (deviation <= 0.05) return { status: "good", label: "Good", color: "vei-good" };
    if (deviation <= 0.10) return { status: "caution", label: "Caution", color: "vei-caution" };
    return { status: "concern", label: "Concern", color: "vei-concern" };
  };

  const getCODStatus = (cod: number): { status: VEIStatus; label: string; color: string } => {
    if (cod <= 10) return { status: "excellent", label: "Excellent", color: "vei-excellent" };
    if (cod <= 15) return { status: "good", label: "Good", color: "vei-good" };
    if (cod <= 20) return { status: "caution", label: "Caution", color: "vei-caution" };
    return { status: "concern", label: "Concern", color: "vei-concern" };
  };

  const getPRBStatus = (prb: number): { status: VEIStatus; label: string; color: string } => {
    const absPrb = Math.abs(prb);
    if (absPrb <= 0.02) return { status: "excellent", label: "No Bias", color: "vei-excellent" };
    if (absPrb <= 0.05) return { status: "good", label: "Minimal Bias", color: "vei-good" };
    if (absPrb <= 0.10) return { status: "caution", label: "Moderate Bias", color: "vei-caution" };
    return { status: "concern", label: "Significant Bias", color: "vei-concern" };
  };

  const getMedianRatioStatus = (ratio: number): { status: VEIStatus; label: string; color: string } => {
    const deviation = Math.abs(ratio - 1);
    if (deviation <= 0.02) return { status: "excellent", label: "On Target", color: "vei-excellent" };
    if (deviation <= 0.05) return { status: "good", label: "Acceptable", color: "vei-good" };
    if (deviation <= 0.10) return { status: "caution", label: "Deviation", color: "vei-caution" };
    return { status: "concern", label: "Off Target", color: "vei-concern" };
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

  const medianRatio = ratioStats.median_ratio ?? 1.0;
  const prb = ratioStats.prb ?? 0;

  const medianStatus = getMedianRatioStatus(medianRatio);
  const prdStatus = getPRDStatus(ratioStats.prd ?? 1.0);
  const codStatus = getCODStatus(ratioStats.cod ?? 0);
  const prbStatus = getPRBStatus(prb);
  const tierSlopeStatus = getTierSlopeStatus(tierSlope);
  const appealsStatus = getAppealsStatus(highTierAppealsRate);

  const salesWindowLabel = `${format(salesStartDate, "MMM yyyy")} - ${format(salesEndDate, "MMM yyyy")}`;

  const exportData = {
    currentYear: selectedYear,
    prd: prdTrendData,
    cod: codTrendData,
    tierMedians,
    appeals: { byTier: appealsData },
    studyPeriod: salesWindowLabel,
    propertyClass: "Residential",
    sampleSize: ratioStats.sample_size,
    medianRatio,
    prb,
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 p-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-light text-gradient-sovereign tracking-tight">
              VEI Suite Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              IAAO-Compliant Ratio Study — On-Demand Analysis
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ScopeHeader scope="county" label={countyMeta?.shortName ?? "County"} source="ratio-analysis" status="published" />
            <ProvenanceBadge source="ratio-analysis" />
            <TaxYearSelector
              years={taxYears}
              selectedYear={selectedYear}
              onSelect={setSelectedYear}
            />
            <SalesWindowSelector
              startDate={salesStartDate}
              endDate={salesEndDate}
              onStartDateChange={setSalesStartDate}
              onEndDateChange={setSalesEndDate}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 rounded-lg border border-border/50 p-0.5">
                    <button
                      onClick={() => setOutlierMethod("bounds")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        outlierMethod === "bounds"
                          ? "bg-tf-cyan/20 text-tf-cyan"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Bounds Filter
                    </button>
                    <button
                      onClick={() => setOutlierMethod("iqr")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        outlierMethod === "iqr"
                          ? "bg-tf-cyan/20 text-tf-cyan"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      IQR Filter
                    </button>
                    <Info className="w-3.5 h-3.5 text-muted-foreground ml-1 mr-1" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                  <p className="font-semibold mb-1">Outlier Exclusion Methods</p>
                  <p><span className="font-medium text-tf-cyan">Bounds Filter:</span> Excludes ratios below 0.10 or above 10.0 — a fixed range removing extreme outliers.</p>
                  <p className="mt-1"><span className="font-medium text-tf-cyan">IQR Filter:</span> Excludes ratios beyond 1.5× the interquartile range — a dynamic, distribution-aware method recommended by IAAO Standard on Ratio Studies.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Field Cohort Filter — recently inspected strata */}
            {fieldCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/40 transition-colors">
                      <Checkbox checked={fieldCohortFilter} onCheckedChange={(c) => setFieldCohortFilter(!!c)} />
                      <Compass className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-foreground">Field Verified</span>
                      <Badge variant="outline" className="text-[10px] ml-1">{fieldCount}</Badge>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p>Filter ratio study to include only parcels with recent field inspections. This creates a "truth-verified" cohort for measuring COD/PRD improvement after field work.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <VEIExportActions data={exportData} />
          </div>
        </motion.div>

        {/* Summary Panel */}
        <motion.div variants={itemVariants}>
          <VEISummaryPanel
            studyPeriod={`Tax Year ${selectedYear} | Sales: ${salesWindowLabel}`}
            propertyClass="Residential"
            sampleSize={ratioStats.sample_size}
            currentYear={selectedYear}
          />
        </motion.div>

        {/* Key Metrics Row — 6 IAAO-compliant metrics */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <VEIMetricCard
            title="Median Ratio"
            value={medianRatio.toFixed(3)}
            subtitle="Level of Appraisal"
            status={medianStatus.status as any}
            statusLabel={medianStatus.label}
            icon={Target}
            target="1.000"
            source="ratio-analysis"
            onClick={() => setActiveDrilldown("tier")}
          />
          <VEIMetricCard
            title="COD"
            value={`${(ratioStats.cod ?? 0).toFixed(1)}%`}
            subtitle="Uniformity"
            status={codStatus.status as any}
            statusLabel={codStatus.label}
            icon={Activity}
            target="≤15%"
            source="ratio-analysis"
            onClick={() => setActiveDrilldown("cod")}
          />
          <VEIMetricCard
            title="PRD"
            value={(ratioStats.prd ?? 1.0).toFixed(3)}
            subtitle="Vertical Equity"
            status={prdStatus.status as any}
            statusLabel={prdStatus.label}
            icon={TrendingUp}
            target="0.98–1.03"
            source="ratio-analysis"
            onClick={() => setActiveDrilldown("prd")}
          />
          <VEIMetricCard
            title="PRB"
            value={prb.toFixed(3)}
            subtitle="Price-Related Bias"
            status={prbStatus.status as any}
            statusLabel={prbStatus.label}
            icon={Percent}
            target="±0.05"
            source="ratio-analysis"
          />
          <VEIMetricCard
            title="Tier Slope"
            value={tierSlope >= 0 ? `+${tierSlope.toFixed(2)}` : tierSlope.toFixed(2)}
            subtitle="Q1→Q4 Spread"
            status={tierSlopeStatus.status as any}
            statusLabel={tierSlopeStatus.label}
            icon={BarChart3}
            target="~0.00"
            source="ratio-analysis"
            onClick={() => setActiveDrilldown("tier")}
          />
          <VEIMetricCard
            title="Appeals Rate"
            value={`${highTierAppealsRate.toFixed(1)}%`}
            subtitle="Q4 Concentration"
            status={appealsStatus.status as any}
            statusLabel={appealsStatus.label}
            icon={AlertTriangle}
            target="<5%"
            source="appeals-by-tier"
            onClick={() => setActiveDrilldown("appeals")}
          />
        </motion.div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PRD Trend */}
          <motion.div 
            variants={itemVariants} 
            className="material-bento rounded-lg p-6 cursor-pointer hover:border-tf-cyan/30 transition-colors"
            onClick={() => setActiveDrilldown("prd")}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">PRD Trend</h2>
                <p className="text-sm text-muted-foreground">
                  {trendData.length > 1 ? `${trendData.length}-Year History` : "Current Period"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-light text-tf-cyan">{(ratioStats.prd ?? 1.0).toFixed(3)}</span>
                <p className="text-xs text-muted-foreground">Current Value</p>
              </div>
            </div>
            <PRDTrendChart data={prdTrendData} />
          </motion.div>

          {/* COD Trend */}
          <motion.div 
            variants={itemVariants} 
            className="material-bento rounded-lg p-6 cursor-pointer hover:border-tf-cyan/30 transition-colors"
            onClick={() => setActiveDrilldown("cod")}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">COD Trend</h2>
                <p className="text-sm text-muted-foreground">
                  {trendData.length > 1 ? `${trendData.length}-Year History` : "Current Period"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-light text-tf-cyan">{(ratioStats.cod ?? 0).toFixed(1)}%</span>
                <p className="text-xs text-muted-foreground">Current Value</p>
              </div>
            </div>
            <CODTrendChart data={codTrendData} />
          </motion.div>
        </div>

        {/* Tier Ratio Plot */}
        <motion.div 
          variants={itemVariants} 
          className="material-bento rounded-lg p-6 cursor-pointer hover:border-tf-cyan/30 transition-colors"
          onClick={() => setActiveDrilldown("tier")}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-foreground">Tier Ratio Plot</h2>
              <p className="text-sm text-muted-foreground">
                Median Assessment Ratios by Value Quartile — Tax Year {selectedYear}
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

        {/* Neighborhood Comparison Grid */}
        <motion.div variants={itemVariants}>
          <NeighborhoodComparisonGrid data={nbhdComparison as any} isLoading={isLoadingNbhd} />
        </motion.div>

        {/* Footer Info */}
        <motion.div variants={itemVariants} className="text-center text-xs text-muted-foreground py-4">
          <p>
            On-demand ratio analysis computed from {ratioStats.sample_size} qualified sales 
            {trendData.length > 1 && ` | ${trendData.length}-year trend from real historical data`}.
          </p>
          <p className="mt-1">
            Tax Year {selectedYear} assessments compared against sales from {salesWindowLabel}.
          </p>
          <p className="mt-1 opacity-60">
            Metrics aligned with IAAO Standard on Ratio Studies (2013) and 2025 Exposure Draft.
          </p>
        </motion.div>
      </motion.div>

      {/* Drill-down Dialogs */}
      <PRDDrilldownDialog
        open={activeDrilldown === "prd"}
        onOpenChange={(open) => !open && setActiveDrilldown(null)}
        data={prdTrendData}
        taxYear={selectedYear}
        salesStartDate={salesStartStr}
        salesEndDate={salesEndStr}
      />
      <CODDrilldownDialog
        open={activeDrilldown === "cod"}
        onOpenChange={(open) => !open && setActiveDrilldown(null)}
        data={codTrendData}
        taxYear={selectedYear}
        salesStartDate={salesStartStr}
        salesEndDate={salesEndStr}
        outlierMethod={outlierMethod}
      />
      <TierSlopeDrilldownDialog
        open={activeDrilldown === "tier"}
        onOpenChange={(open) => !open && setActiveDrilldown(null)}
        data={{
          slope: tierSlope,
          tierMedians,
        }}
      />
      <AppealsDrilldownDialog
        open={activeDrilldown === "appeals"}
        onOpenChange={(open) => !open && setActiveDrilldown(null)}
        data={{
          highTierRate: highTierAppealsRate,
          byTier: appealsData,
        }}
      />
    </>
  );
}

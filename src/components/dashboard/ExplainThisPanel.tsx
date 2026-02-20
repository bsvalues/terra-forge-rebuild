// TerraFusion OS — ExplainThisPanel (X-Ray Vision 2.0)
// "Explain this number" — Source · Freshness · What to do next
// Click any number → plain-English explanation with safe fix paths + proof links.

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info, X, Database, Clock, AlertTriangle, ArrowRight,
  CheckCircle2, TrendingUp, BookOpen, Zap, ChevronLeft,
  ChevronRight, Shield, ExternalLink, Eye, Activity,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Metric Catalog ─────────────────────────────────────────────
// Every key number on screen has an entry here.
// Copy rule: zero jargon, plain English, "So what?" anchored to lived reality.

export interface MetricExplanation {
  label: string;
  whatItMeans: string;
  /** "So what?" — one sentence connecting to lived reality */
  soWhat: string;
  whereItCameFrom: string;
  whatChangesIt: string;
  ifItLooksWrong: { label: string; target: string; safe?: boolean }[];
  healthNote?: string;
  /** Proof vault links */
  proofLinks?: { label: string; target: string }[];
}

export const METRIC_CATALOG: Record<string, MetricExplanation> = {
  "parcels.total": {
    label: "Total Parcels",
    whatItMeans: "The total number of land parcels in your county's database. Each parcel is a unique piece of land that gets assessed separately.",
    soWhat: "This affects readiness because every parcel needs a certified value before the roll closes — if this number is off, your count may be wrong.",
    whereItCameFrom: "Counted directly from your parcels table. Updated every time you import or sync parcel records.",
    whatChangesIt: "Parcel imports, CAMA syncs, new subdivisions, or merges. If this drops unexpectedly, check the last import in Data Ingestion.",
    ifItLooksWrong: [
      { label: "Review last import", target: "home:ids", safe: true },
      { label: "View data quality report", target: "home:quality", safe: true },
    ],
    proofLinks: [
      { label: "View import receipts", target: "registry:trust" },
      { label: "Open audit trail", target: "registry:trust" },
    ],
    healthNote: "This number should only grow over time. A sudden drop usually means an import overwrite issue.",
  },
  "sales.total": {
    label: "Total Sales",
    whatItMeans: "The number of recorded property sales in your county. This is the raw data that ratio studies and calibration runs are built on.",
    soWhat: "This affects model reliability because calibration needs at least 30–50 qualified sales per neighborhood to produce defensible values.",
    whereItCameFrom: "Counted from your sales table. Updated when you import a sales file or sync from your CAMA system.",
    whatChangesIt: "Sales CSV imports, CAMA syncs, or manual entries. Adding a new sales file will increase this count.",
    ifItLooksWrong: [
      { label: "Import a sales file", target: "home:ids", safe: true },
      { label: "Review data quality", target: "home:quality", safe: true },
    ],
    proofLinks: [
      { label: "View last import receipt", target: "registry:trust" },
    ],
    healthNote: "Ratio studies need at least 30–50 qualified sales per neighborhood for reliable results.",
  },
  "assessments.total": {
    label: "Total Assessments",
    whatItMeans: "The number of assessment records in the system, across all tax years. Each parcel can have one assessment per year.",
    soWhat: "This affects your certification rate — every parcel needs an assessment for the current tax year before the roll can close.",
    whereItCameFrom: "Counted from your assessments table. Added when assessments are imported or created during calibration.",
    whatChangesIt: "Assessment imports, valuation model runs that write new values, or direct edits in the workbench.",
    ifItLooksWrong: [
      { label: "Import assessment data", target: "home:ids", safe: true },
      { label: "Review model runs", target: "registry:trust", safe: true },
    ],
    proofLinks: [
      { label: "View model run receipts", target: "registry:trust" },
    ],
  },
  "assessments.certRate": {
    label: "Certification Rate",
    whatItMeans: "The percentage of this year's assessments that have been marked as certified. 100% means your roll is ready.",
    soWhat: "This is your go/no-go number — counties cannot close the roll until this reaches 100%, and every day it stays low is a compliance risk.",
    whereItCameFrom: "Calculated from assessments where certified = true, divided by total assessments for the current tax year.",
    whatChangesIt: "Certifying neighborhoods through the Dais workflow. Each certification action updates this number.",
    ifItLooksWrong: [
      { label: "Check certification status", target: "home:readiness", safe: true },
      { label: "Review pending certifications", target: "workbench:dais", safe: true },
    ],
    proofLinks: [
      { label: "Open certification audit trail", target: "registry:trust" },
    ],
    healthNote: "Most counties target 100% certification before the roll deadline. Use Roll Readiness to track your progress.",
  },
  "quality.overall": {
    label: "Data Quality Score",
    whatItMeans: "A single score (0–100%) that measures how complete your parcel data is. It averages three checks: do parcels have coordinates, a property class, and a neighborhood code?",
    soWhat: "This affects model reliability and map accuracy — below 80%, valuation model results may be unreliable and maps will have gaps.",
    whereItCameFrom: "Calculated from the percentage of parcels that have coordinates, a property class, and a neighborhood code assigned.",
    whatChangesIt: "Importing GIS data, classifying unclassified parcels, or assigning neighborhood codes. Each fix moves this number up.",
    ifItLooksWrong: [
      { label: "Fix missing coordinates", target: "factory:geoequity", safe: true },
      { label: "Classify unclassified parcels", target: "home:quality", safe: true },
      { label: "Assign neighborhood codes", target: "home:quality", safe: true },
    ],
    proofLinks: [
      { label: "View quality audit log", target: "registry:trust" },
    ],
    healthNote: "Aim for 90%+ before running valuation models. Below 80%, model results may be unreliable.",
  },
  "quality.coords": {
    label: "Parcel Coordinates",
    whatItMeans: "The percentage of your parcels that have GPS coordinates (latitude/longitude). Without coordinates, parcels can't appear on maps or pass spatial equity checks.",
    soWhat: "This affects appeals posture — a parcel without coordinates can't be shown on a map, which weakens your defense in any appeal hearing.",
    whereItCameFrom: "Parcels where latitude and longitude are both filled in, as a percentage of total parcels.",
    whatChangesIt: "Importing a GIS shapefile, running address geocoding, or manually entering coordinates.",
    ifItLooksWrong: [
      { label: "Import GIS data", target: "home:ids", safe: true },
      { label: "Run spatial analysis", target: "factory:geoequity", safe: true },
    ],
    proofLinks: [
      { label: "View GIS import receipts", target: "registry:trust" },
    ],
    healthNote: "Missing coordinates block map views and neighborhood validation checks.",
  },
  "quality.propertyClass": {
    label: "Property Class Coverage",
    whatItMeans: "The percentage of parcels with a property class assigned (like Residential, Commercial, Agricultural). Valuation models need this to pick the right cost schedule.",
    soWhat: "This affects valuation accuracy — unclassified parcels get the wrong cost schedule, which directly causes valuation errors and appeal exposure.",
    whereItCameFrom: "Parcels where property_class is filled in, as a percentage of total parcels.",
    whatChangesIt: "Bulk classification from a CAMA export, or manual assignment in the workbench.",
    ifItLooksWrong: [
      { label: "Bulk assign from CAMA", target: "home:ids", safe: true },
      { label: "Review unclassified parcels", target: "home:quality", safe: true },
    ],
    proofLinks: [
      { label: "View classification receipts", target: "registry:trust" },
    ],
    healthNote: "Unclassified parcels get the wrong cost schedule, which causes valuation errors.",
  },
  "quality.neighborhood": {
    label: "Neighborhood Coverage",
    whatItMeans: "The percentage of parcels assigned to a neighborhood code. Neighborhood codes group parcels for calibration runs and ratio studies.",
    soWhat: "This affects calibration coverage — if any parcels are unassigned, those areas will be skipped during model runs, leaving values undefended.",
    whereItCameFrom: "Parcels where neighborhood_code is filled in, as a percentage of total parcels.",
    whatChangesIt: "Importing a neighborhood assignment file, or GIS-based neighborhood delineation.",
    ifItLooksWrong: [
      { label: "Import neighborhood codes", target: "home:ids", safe: true },
      { label: "Run spatial analysis", target: "factory:geoequity", safe: true },
    ],
    proofLinks: [
      { label: "View neighborhood audit log", target: "registry:trust" },
    ],
    healthNote: "100% neighborhood coverage is required for calibration runs to cover the whole county.",
  },
  "workflows.pendingAppeals": {
    label: "Pending Appeals",
    whatItMeans: "The number of property owner appeals that have been filed and are waiting for a decision. Each one represents a parcel where the owner is contesting their assessed value.",
    soWhat: "This affects your appeals workload because each pending appeal has a legal deadline — missing one can result in automatic value reductions.",
    whereItCameFrom: "Appeals table where status is 'filed', 'pending', or 'scheduled'.",
    whatChangesIt: "New appeals filed by property owners, or existing appeals being resolved or scheduled for a hearing.",
    ifItLooksWrong: [
      { label: "Review pending appeals", target: "workbench:dais", safe: true },
      { label: "Generate a proof packet", target: "workbench:dossier", safe: true },
    ],
    proofLinks: [
      { label: "View appeal audit trail", target: "registry:trust" },
      { label: "Open proof vault", target: "registry:trust" },
    ],
    healthNote: "Unresolved appeals create compliance deadlines. Each one should have a resolution date assigned.",
  },
  "workflows.openPermits": {
    label: "Open Permits",
    whatItMeans: "Building and renovation permits that have been filed but not yet closed. Open permits may mean a property has been improved and needs a reassessment.",
    soWhat: "This affects assessment accuracy and readiness because unreviewed improvements mean some assessed values are lower than they should be.",
    whereItCameFrom: "Permits table where status is 'applied', 'pending', or 'issued'.",
    whatChangesIt: "New permit applications, inspections completed, or permits finalized.",
    ifItLooksWrong: [
      { label: "Review open permits", target: "workbench:dais", safe: true },
    ],
    proofLinks: [
      { label: "View permit audit trail", target: "registry:trust" },
    ],
    healthNote: "Permits that stay open past their expected completion date often indicate a property improvement that hasn't been assessed yet.",
  },
  "workflows.pendingExemptions": {
    label: "Pending Exemptions",
    whatItMeans: "Exemption applications (homestead, veteran, senior, etc.) that are waiting for a decision. Approved exemptions reduce the taxable value of a parcel.",
    soWhat: "This affects your levy accuracy — unprocessed exemptions mean taxpayers may be over-billed, which creates liability and complaint exposure.",
    whereItCameFrom: "Exemptions table where status is 'pending'.",
    whatChangesIt: "New exemption applications, or pending ones being approved or denied.",
    ifItLooksWrong: [
      { label: "Review exemption queue", target: "workbench:dais", safe: true },
    ],
    proofLinks: [
      { label: "View exemption audit trail", target: "registry:trust" },
    ],
  },
  "calibration.runCount": {
    label: "Model Runs",
    whatItMeans: "The number of calibration runs that have been saved in the system. Each run is a snapshot of a valuation model — the coefficients, the sales used, and the quality statistics.",
    soWhat: "This affects your defensibility — every appeal requires proof that your value came from a documented model run, not a guess.",
    whereItCameFrom: "Counted from the calibration_runs table. Increases every time you run and save a regression model.",
    whatChangesIt: "Running a model in TerraForge or the Factory. Each saved run adds one to this count.",
    ifItLooksWrong: [
      { label: "View model runs in Proof Vault", target: "registry:trust", safe: true },
      { label: "Run a new model", target: "factory:calibration", safe: true },
    ],
    proofLinks: [
      { label: "Open Proof Vault", target: "registry:trust" },
      { label: "View last model receipt", target: "registry:trust" },
    ],
  },
};

// ─── History tracking (module-level, persists while app is open) ──
const panelHistory: string[] = [];

// ─── Types ───────────────────────────────────────────────────────

interface ExplainThisPanelProps {
  metricKey: string;
  fetchedAt?: string | null;
  lastChangeLabel?: string | null;
  override?: Partial<MetricExplanation>;
  onNavigate?: (target: string) => void;
  className?: string;
  children?: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────

export function ExplainThisPanel({
  metricKey,
  fetchedAt,
  lastChangeLabel,
  override,
  onNavigate,
  className,
  children,
}: ExplainThisPanelProps) {
  const [open, setOpen] = useState(false);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [activeKey, setActiveKey] = useState(metricKey);

  const entry = METRIC_CATALOG[activeKey];
  if (!entry) return <>{children}</>;

  const merged: MetricExplanation = { ...entry, ...override };

  const timeLabel = fetchedAt
    ? format(new Date(fetchedAt), "MMM d 'at' h:mm a")
    : null;
  const ageLabel = fetchedAt
    ? formatDistanceToNow(new Date(fetchedAt), { addSuffix: true })
    : null;

  const handleOpen = () => {
    // Track in history
    if (panelHistory[panelHistory.length - 1] !== metricKey) {
      panelHistory.push(metricKey);
    }
    setActiveKey(metricKey);
    setHistoryIdx(panelHistory.length - 1);
    setOpen(true);
  };

  const handleBack = () => {
    const prevIdx = historyIdx - 1;
    if (prevIdx >= 0) {
      setHistoryIdx(prevIdx);
      setActiveKey(panelHistory[prevIdx]);
    }
  };

  const handleForward = () => {
    const nextIdx = historyIdx + 1;
    if (nextIdx < panelHistory.length) {
      setHistoryIdx(nextIdx);
      setActiveKey(panelHistory[nextIdx]);
    }
  };

  const canGoBack = historyIdx > 0;
  const canGoForward = historyIdx < panelHistory.length - 1;
  const lastViewed = panelHistory.length > 1 && historyIdx > 0
    ? METRIC_CATALOG[panelHistory[historyIdx - 1]]?.label
    : null;

  return (
    <span className="relative inline-block">
      <span
        className={cn(
          "cursor-pointer group inline-flex items-center gap-1",
          className
        )}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        aria-label={`Explain ${merged.label}`}
      >
        {children}
        <Info
          className={cn(
            "w-3 h-3 shrink-0 transition-colors",
            open
              ? "text-[hsl(var(--tf-transcend-cyan))]"
              : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
          )}
        />
      </span>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute z-50 left-0 top-full mt-2 w-84 rounded-xl border border-[hsl(var(--tf-transcend-cyan)/0.2)] bg-card shadow-xl overflow-hidden"
              style={{ width: "22rem" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-[hsl(var(--tf-transcend-cyan)/0.05)]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-tf-cyan" />
                    <span className="text-xs font-semibold text-tf-cyan">
                      Explain this number
                    </span>
                  </div>
                  {/* X-Ray Vision badge */}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[hsl(var(--tf-transcend-cyan)/0.12)] text-[9px] font-bold uppercase tracking-wider text-tf-cyan border border-[hsl(var(--tf-transcend-cyan)/0.2)]">
                    <Zap className="w-2 h-2" />
                    X-Ray
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* History navigation */}
                  <button
                    onClick={handleBack}
                    disabled={!canGoBack}
                    className={cn(
                      "p-1 rounded transition-colors",
                      canGoBack
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/20 cursor-not-allowed"
                    )}
                    title="Previous metric"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleForward}
                    disabled={!canGoForward}
                    className={cn(
                      "p-1 rounded transition-colors",
                      canGoForward
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/20 cursor-not-allowed"
                    )}
                    title="Next metric"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-header: source · freshness · next action */}
              <div className="px-4 py-2 border-b border-border/30 bg-[hsl(var(--tf-substrate)/0.3)]">
                <p className="text-[10px] text-muted-foreground/60 tracking-widest uppercase">
                  Source · Freshness · What to do next
                </p>
              </div>

              {/* Last viewed hint */}
              {lastViewed && (
                <div className="px-4 py-1.5 border-b border-border/20 bg-[hsl(var(--tf-substrate)/0.2)]">
                  <p className="text-[10px] text-muted-foreground/50">
                    Last viewed: <span className="text-muted-foreground/70">{lastViewed}</span>
                  </p>
                </div>
              )}

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Metric name */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{merged.label}</h3>
                </div>

                {/* What it means */}
                <Section icon={BookOpen} label="What it means">
                  <p className="text-xs text-foreground/80 leading-relaxed">{merged.whatItMeans}</p>
                  {/* So what? */}
                  <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-[hsl(var(--tf-transcend-cyan)/0.06)] border border-[hsl(var(--tf-transcend-cyan)/0.15)]">
                    <TrendingUp className="w-3 h-3 text-tf-cyan shrink-0 mt-0.5" />
                    <p className="text-[11px] text-foreground/70 leading-relaxed italic">{merged.soWhat}</p>
                  </div>
                </Section>

                {/* Where it came from */}
                <Section icon={Database} label="Source">
                  <p className="text-xs text-muted-foreground leading-relaxed">{merged.whereItCameFrom}</p>
                </Section>

                {/* As of */}
                {timeLabel && (
                  <Section icon={Clock} label="Freshness">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-foreground">{timeLabel}</span>
                      <span className="text-[10px] text-muted-foreground/50">({ageLabel})</span>
                    </div>
                  </Section>
                )}

                {/* Why it changed */}
                <Section icon={Activity} label="Updated because">
                  {lastChangeLabel ? (
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      <span className="font-medium text-tf-cyan">Last change: </span>
                      {lastChangeLabel}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">{merged.whatChangesIt}</p>
                  )}
                </Section>

                {/* Health note */}
                {merged.healthNote && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-sacred-gold)/0.07)] border border-[hsl(var(--tf-sacred-gold)/0.2)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-tf-gold shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{merged.healthNote}</p>
                  </div>
                )}

                {/* If it looks wrong */}
                {merged.ifItLooksWrong.length > 0 && (
                  <Section icon={CheckCircle2} label="If it looks wrong">
                    <div className="space-y-1.5">
                      {merged.ifItLooksWrong.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            onNavigate?.(action.target);
                            setOpen(false);
                          }}
                          className="w-full flex items-start justify-between px-3 py-2 rounded-lg bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] border border-border/40 hover:border-[hsl(var(--tf-transcend-cyan)/0.3)] transition-all text-left group"
                        >
                          <div className="flex-1">
                            <span className="text-xs text-foreground">{action.label}</span>
                            {action.safe !== false && (
                              <p className="text-[10px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" />
                                Nothing changes until you confirm
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-tf-cyan transition-colors shrink-0 mt-0.5" />
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Prove it — Proof Vault links */}
                {merged.proofLinks && merged.proofLinks.length > 0 && (
                  <Section icon={ExternalLink} label="Prove it">
                    <div className="space-y-1">
                      {merged.proofLinks.map((link, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            onNavigate?.(link.target);
                            setOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--tf-surface)/0.5)] transition-colors text-left group"
                        >
                          <span className="text-[11px] text-[hsl(var(--tf-transcend-cyan))] group-hover:underline">
                            {link.label}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/50 group-hover:text-tf-cyan transition-colors" />
                        </button>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

// ─── Section helper ──────────────────────────────────────────────

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

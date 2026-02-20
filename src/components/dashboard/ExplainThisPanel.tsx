// TerraFusion OS — ExplainThisPanel (X-Ray Vision 2.0)
// Click any number → plain-English explanation:
//   What it means · Where it came from · As of · Why it changed · What to do if it looks wrong
// "You're not looking at data. You're reading the county."

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info, X, Database, Clock, AlertTriangle, ArrowRight,
  CheckCircle2, TrendingUp, BookOpen, Zap,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Metric Catalog ─────────────────────────────────────────────
// Every key number on screen has an entry here.
// Copy rule: zero jargon, first-grade language, then add depth.

export interface MetricExplanation {
  /** Short human label shown at top of panel */
  label: string;
  /** Plain English: what is this number counting */
  whatItMeans: string;
  /** Where the data physically lives */
  whereItCameFrom: string;
  /** Plain English: what normally changes this */
  whatChangesIt: string;
  /** If it looks wrong, what should you check first (max 3 steps) */
  ifItLooksWrong: { label: string; target: string }[];
  /** Optional: context about healthy ranges */
  healthNote?: string;
}

export const METRIC_CATALOG: Record<string, MetricExplanation> = {
  "parcels.total": {
    label: "Total Parcels",
    whatItMeans: "The total number of land parcels in your county's database. Each parcel is a unique piece of land that gets assessed separately.",
    whereItCameFrom: "Counted directly from your parcels table. Updated every time you import or sync parcel records.",
    whatChangesIt: "Parcel imports, CAMA syncs, new subdivisions, or merges. If this drops unexpectedly, check the last import in Data Ingestion.",
    ifItLooksWrong: [
      { label: "Check last import", target: "home:ids" },
      { label: "View data quality report", target: "home:quality" },
    ],
    healthNote: "This number should only grow over time. A sudden drop usually means an import overwrite issue.",
  },
  "sales.total": {
    label: "Total Sales",
    whatItMeans: "The number of recorded property sales in your county. This is the raw data that ratio studies and calibration runs are built on.",
    whereItCameFrom: "Counted from your sales table. Updated when you import a sales file or sync from your CAMA system.",
    whatChangesIt: "Sales CSV imports, CAMA syncs, or manual entries. Adding a new sales file will increase this count.",
    ifItLooksWrong: [
      { label: "Import a sales file", target: "home:ids" },
      { label: "Review data quality", target: "home:quality" },
    ],
    healthNote: "Ratio studies need at least 30–50 qualified sales per neighborhood for reliable results.",
  },
  "assessments.total": {
    label: "Total Assessments",
    whatItMeans: "The number of assessment records in the system, across all tax years. Each parcel can have one assessment per year.",
    whereItCameFrom: "Counted from your assessments table. Added when assessments are imported or created during calibration.",
    whatChangesIt: "Assessment imports, valuation model runs that write new values, or direct edits in the workbench.",
    ifItLooksWrong: [
      { label: "Import assessment data", target: "home:ids" },
      { label: "Review model runs", target: "registry:trust" },
    ],
  },
  "assessments.certRate": {
    label: "Certification Rate",
    whatItMeans: "The percentage of this year's assessments that have been marked as certified. 100% means your roll is ready.",
    whereItCameFrom: "Calculated from assessments where certified = true, divided by total assessments for the current tax year.",
    whatChangesIt: "Certifying neighborhoods through the Dais workflow. Each certification action updates this number.",
    ifItLooksWrong: [
      { label: "Check certification status", target: "home:readiness" },
      { label: "Review pending certifications", target: "workbench:dais" },
    ],
    healthNote: "Most counties target 100% certification before the roll deadline. Use Roll Readiness to track your progress.",
  },
  "quality.overall": {
    label: "Data Quality Score",
    whatItMeans: "A single score (0–100%) that measures how complete your parcel data is. It averages three checks: do parcels have coordinates, a property class, and a neighborhood code?",
    whereItCameFrom: "Calculated from the percentage of parcels that have coordinates, a property class, and a neighborhood code assigned.",
    whatChangesIt: "Importing GIS data, classifying unclassified parcels, or assigning neighborhood codes. Each fix moves this number up.",
    ifItLooksWrong: [
      { label: "Fix missing coordinates", target: "factory:geoequity" },
      { label: "Classify unclassified parcels", target: "home:quality" },
      { label: "Assign neighborhood codes", target: "home:quality" },
    ],
    healthNote: "Aim for 90%+ before running valuation models. Below 80%, model results may be unreliable.",
  },
  "quality.coords": {
    label: "Parcel Coordinates",
    whatItMeans: "The percentage of your parcels that have GPS coordinates (latitude/longitude). Without coordinates, parcels can't appear on maps or pass spatial equity checks.",
    whereItCameFrom: "Parcels where latitude and longitude are both filled in, as a percentage of total parcels.",
    whatChangesIt: "Importing a GIS shapefile, running address geocoding, or manually entering coordinates.",
    ifItLooksWrong: [
      { label: "Import GIS data", target: "home:ids" },
      { label: "Run spatial analysis", target: "factory:geoequity" },
    ],
    healthNote: "Missing coordinates block map views and neighborhood validation checks.",
  },
  "quality.propertyClass": {
    label: "Property Class Coverage",
    whatItMeans: "The percentage of parcels with a property class assigned (like Residential, Commercial, Agricultural). Valuation models need this to pick the right cost schedule.",
    whereItCameFrom: "Parcels where property_class is filled in, as a percentage of total parcels.",
    whatChangesIt: "Bulk classification from a CAMA export, or manual assignment in the workbench.",
    ifItLooksWrong: [
      { label: "Bulk assign from CAMA", target: "home:ids" },
      { label: "Review unclassified parcels", target: "home:quality" },
    ],
    healthNote: "Unclassified parcels get the wrong cost schedule, which causes valuation errors.",
  },
  "quality.neighborhood": {
    label: "Neighborhood Coverage",
    whatItMeans: "The percentage of parcels assigned to a neighborhood code. Neighborhood codes group parcels for calibration runs and ratio studies.",
    whereItCameFrom: "Parcels where neighborhood_code is filled in, as a percentage of total parcels.",
    whatChangesIt: "Importing a neighborhood assignment file, or GIS-based neighborhood delineation.",
    ifItLooksWrong: [
      { label: "Import neighborhood codes", target: "home:ids" },
      { label: "Run spatial analysis", target: "factory:geoequity" },
    ],
    healthNote: "100% neighborhood coverage is required for calibration runs to cover the whole county.",
  },
  "workflows.pendingAppeals": {
    label: "Pending Appeals",
    whatItMeans: "The number of property owner appeals that have been filed and are waiting for a decision. Each one represents a parcel where the owner is contesting their assessed value.",
    whereItCameFrom: "Appeals table where status is 'filed', 'pending', or 'scheduled'.",
    whatChangesIt: "New appeals filed by property owners, or existing appeals being resolved or scheduled for a hearing.",
    ifItLooksWrong: [
      { label: "Review pending appeals", target: "workbench:dais:appeals" },
      { label: "Generate a proof packet", target: "workbench:dossier" },
    ],
    healthNote: "Unresolved appeals create compliance deadlines. Each one should have a resolution date assigned.",
  },
  "workflows.openPermits": {
    label: "Open Permits",
    whatItMeans: "Building and renovation permits that have been filed but not yet closed. Open permits may mean a property has been improved and needs a reassessment.",
    whereItCameFrom: "Permits table where status is 'applied', 'pending', or 'issued'.",
    whatChangesIt: "New permit applications, inspections completed, or permits finalized.",
    ifItLooksWrong: [
      { label: "Review open permits", target: "workbench:dais:permits" },
    ],
    healthNote: "Permits that stay open past their expected completion date often indicate a property improvement that hasn't been assessed yet.",
  },
  "workflows.pendingExemptions": {
    label: "Pending Exemptions",
    whatItMeans: "Exemption applications (homestead, veteran, senior, etc.) that are waiting for a decision. Approved exemptions reduce the taxable value of a parcel.",
    whereItCameFrom: "Exemptions table where status is 'pending'.",
    whatChangesIt: "New exemption applications, or pending ones being approved or denied.",
    ifItLooksWrong: [
      { label: "Review exemption queue", target: "workbench:dais:exemptions" },
    ],
  },
  "calibration.runCount": {
    label: "Model Runs",
    whatItMeans: "The number of calibration runs that have been saved in the system. Each run is a snapshot of a valuation model — the coefficients, the sales used, and the quality statistics.",
    whereItCameFrom: "Counted from the calibration_runs table. Increases every time you run and save a regression model.",
    whatChangesIt: "Running a model in TerraForge or the Factory. Each saved run adds one to this count.",
    ifItLooksWrong: [
      { label: "View model runs in Proof Vault", target: "registry:trust" },
      { label: "Run a new model", target: "factory:calibration" },
    ],
  },
};

// ─── Types ───────────────────────────────────────────────────────

interface ExplainThisPanelProps {
  /** Key into METRIC_CATALOG — e.g. "parcels.total" */
  metricKey: string;
  /** ISO timestamp of last data fetch */
  fetchedAt?: string | null;
  /** Last event that changed this metric (plain English, optional) */
  lastChangeLabel?: string | null;
  /** Custom override for the metric explanation */
  override?: Partial<MetricExplanation>;
  /** Navigate callback for "if it looks wrong" actions */
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
  const entry = METRIC_CATALOG[metricKey];
  if (!entry) return <>{children}</>;

  const merged: MetricExplanation = { ...entry, ...override };

  const timeLabel = fetchedAt
    ? format(new Date(fetchedAt), "MMM d 'at' h:mm a")
    : null;
  const ageLabel = fetchedAt
    ? formatDistanceToNow(new Date(fetchedAt), { addSuffix: true })
    : null;

  return (
    <span className="relative inline-block">
      {/* Trigger: clicking the children (or a fallback info button) */}
      <span
        className={cn(
          "cursor-pointer group inline-flex items-center gap-1",
          className
        )}
        onClick={() => setOpen(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(v => !v)}
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

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop tap-to-close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute z-50 left-0 top-full mt-2 w-80 rounded-xl border border-[hsl(var(--tf-transcend-cyan)/0.2)] bg-card shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-[hsl(var(--tf-transcend-cyan)/0.05)]">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-tf-cyan" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-tf-cyan">
                    X-Ray Vision
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Metric name */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{merged.label}</h3>
                </div>

                {/* What it means */}
                <Section icon={BookOpen} label="What it means">
                  <p className="text-xs text-foreground/80 leading-relaxed">{merged.whatItMeans}</p>
                </Section>

                {/* Where it came from */}
                <Section icon={Database} label="Where it came from">
                  <p className="text-xs text-muted-foreground leading-relaxed">{merged.whereItCameFrom}</p>
                </Section>

                {/* As of */}
                {timeLabel && (
                  <Section icon={Clock} label="As of">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground">{timeLabel}</span>
                      <span className="text-[10px] text-muted-foreground/50">({ageLabel})</span>
                    </div>
                  </Section>
                )}

                {/* Why it changed */}
                <Section icon={TrendingUp} label="Why it changes">
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
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] border border-border/40 hover:border-[hsl(var(--tf-transcend-cyan)/0.3)] transition-all text-left group"
                        >
                          <span className="text-xs text-foreground">{action.label}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-tf-cyan transition-colors" />
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

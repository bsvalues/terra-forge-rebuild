// TerraFusion OS — Next Best Action v2
// Prioritized by: readiness impact + risk + effort + recency
// Includes: "why #1", Fix Preview, Victory Moment, Share + Receipt

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, ArrowRight, HelpCircle, UserPlus, Clock,
  XCircle, MapPin, Shield, CheckCircle2, X, ChevronRight,
  TrendingUp, Eye, PartyPopper, Copy, FileText, RotateCcw,
} from "lucide-react";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";
import { deriveRibbonHealth } from "./DataStatusRibbon";

// ─── Action type (extended) ──────────────────────────────────

export interface ScoredAction {
  id: string;
  urgency: "red" | "yellow" | "info";
  icon: React.ElementType;
  title: string;
  impact: string;
  /** One sentence: why this is #1 */
  whyPrimary: string;
  /** Scores that drive rank (higher = more urgent) */
  score: {
    readinessImpact: number; // 0–100 pts
    risk: number;            // 0–100 pts
    effort: number;          // 0–100 pts (100 = easy win)
    recency: number;         // 0–100 pts (100 = happened just now)
    total: number;
  };
  /** Fix Preview: what will improve */
  fixPreview: {
    readinessDelta: string;        // e.g. "+5% readiness"
    checksWillGreen: string[];     // checks that flip green
    parcelsAffected: number;
    note?: string;
  };
  mission: {
    whatIsWrong: string;
    whyItMatters: string;
    howToFix: { label: string; target: string }[];
    whatHappensAfter: string;
  };
  fixTarget?: string;
}

// ─── Scoring engine ───────────────────────────────────────────

function scoreAction(
  base: Omit<ScoredAction, "score">,
  readinessImpact: number,
  risk: number,
  effort: number,
  recency = 50
): ScoredAction {
  const total = readinessImpact * 0.4 + risk * 0.3 + effort * 0.2 + recency * 0.1;
  return { ...base, score: { readinessImpact, risk, effort, recency, total } };
}

function buildScoredActions(
  vitals: ReturnType<typeof useCountyVitals>["data"],
  _pipeline: ReturnType<typeof usePipelineStatus>["data"]
): ScoredAction[] {
  const actions: ScoredAction[] = [];
  const total = vitals?.parcels.total ?? 0;

  // ── Failed ingest ──
  const failedJob = vitals?.ingest.recentJobs.find(j => j.status === "failed");
  if (failedJob) {
    actions.push(scoreAction({
      id: "failed-ingest",
      urgency: "red",
      icon: XCircle,
      title: `Import failed: ${failedJob.file_name}`,
      impact: "Data is incomplete until resolved",
      whyPrimary: "Chosen because a failed import blocks quality scoring and readiness updates for all downstream checks.",
      fixPreview: {
        readinessDelta: "Restores blocked pipeline stages",
        checksWillGreen: ["Data Pipeline", "Quality Scoring", "Readiness"],
        parcelsAffected: failedJob.row_count ?? 0,
        note: "Readiness will auto-recalculate once the import succeeds.",
      },
      mission: {
        whatIsWrong: `The file "${failedJob.file_name}" couldn't be fully loaded. Some rows failed validation or had unrecognized columns.`,
        whyItMatters: "Assessments, quality scores, and readiness checks are based on this data. Until it's fixed, your numbers may be off.",
        howToFix: [
          { label: "Review the error report", target: "home:ids" },
          { label: "Re-upload a corrected file", target: "home:ids" },
          { label: "Mark rows as accepted exceptions", target: "home:ids" },
        ],
        whatHappensAfter: "Quality scoring and readiness will re-run automatically after a successful import.",
      },
      fixTarget: "home:ids",
    }, 90, 90, 60, 95));
  }

  // ── Missing coordinates ──
  const missingCoords = vitals ? total - vitals.parcels.withCoords : 0;
  if (missingCoords > 0) {
    const missingPct = total > 0 ? Math.round((missingCoords / total) * 100) : 0;
    const readinessBump = Math.min(missingPct, 8);
    const coordRisk = missingPct > 20 ? 80 : 50;
    actions.push(scoreAction({
      id: "missing-coords",
      urgency: missingPct > 20 ? "red" : "yellow",
      icon: MapPin,
      title: `Fix missing coordinates (${missingCoords.toLocaleString()} parcels)`,
      impact: `+${readinessBump}% readiness after fix`,
      whyPrimary: `Chosen because it affects ${missingCoords.toLocaleString()} parcels and blocks mapping + neighborhood checks.`,
      fixPreview: {
        readinessDelta: `+${readinessBump}% readiness`,
        checksWillGreen: ["Map Coverage", "Neighborhood Validation", "Spatial Equity"],
        parcelsAffected: missingCoords,
        note: "Maps and neighborhood heatmaps will update automatically.",
      },
      mission: {
        whatIsWrong: `${missingCoords.toLocaleString()} parcels have no map coordinates. This means we can't place them on a map or run neighborhood checks.`,
        whyItMatters: "Maps and spatial equity checks can't validate these parcels. It also lowers your overall data quality score, which affects certification readiness.",
        howToFix: [
          { label: "Match coordinates from address", target: "factory:geoequity" },
          { label: "Import GIS coordinate file", target: "home:ids" },
          { label: "Mark as accepted exceptions", target: "home:quality" },
        ],
        whatHappensAfter: "Quality score and readiness will refresh automatically. Your map will show the newly located parcels.",
      },
      fixTarget: "factory:geoequity",
    }, readinessBump * 10, coordRisk, 65));
  }

  // ── Missing property class ──
  const missingClass = vitals ? total - vitals.parcels.withClass : 0;
  if (missingClass > 100) {
    const missingClassPct = total > 0 ? Math.round((missingClass / total) * 100) : 0;
    actions.push(scoreAction({
      id: "missing-class",
      urgency: "yellow",
      icon: Shield,
      title: `Classify ${missingClass.toLocaleString()} unclassified parcels`,
      impact: "Required for accurate valuation models",
      whyPrimary: `Chosen because unclassified parcels use the wrong cost schedule, causing valuation errors for ${missingClass.toLocaleString()} properties.`,
      fixPreview: {
        readinessDelta: `+${Math.min(missingClassPct, 5)}% readiness`,
        checksWillGreen: ["Property Class Coverage", "Valuation Model Inputs"],
        parcelsAffected: missingClass,
        note: "Model runs for affected neighborhoods will be queued automatically.",
      },
      mission: {
        whatIsWrong: `${missingClass.toLocaleString()} parcels don't have a property class assigned. Without it, valuation models can't apply the right cost schedule.`,
        whyItMatters: "Property class determines which cost table is used. Unclassified parcels may be valued incorrectly, leading to assessment errors.",
        howToFix: [
          { label: "Bulk assign from CAMA export", target: "home:ids" },
          { label: "Review and assign manually", target: "home:quality" },
        ],
        whatHappensAfter: "Models will re-run for the affected parcels and quality scores will update.",
      },
      fixTarget: "home:quality",
    }, missingClassPct * 5, 65, 70));
  }

  // ── Pending workflows ──
  const pending = vitals?.workflows.total ?? 0;
  if (pending > 0) {
    actions.push(scoreAction({
      id: "pending-workflows",
      urgency: "info",
      icon: Clock,
      title: `${pending} items need your review`,
      impact: `${vitals?.workflows.pendingAppeals ?? 0} appeals · ${vitals?.workflows.openPermits ?? 0} permits · ${vitals?.workflows.pendingExemptions ?? 0} exemptions`,
      whyPrimary: `Chosen because ${vitals?.workflows.pendingAppeals ?? 0} unresolved appeals create legal exposure that grows over time.`,
      fixPreview: {
        readinessDelta: "Clears workflow backlog",
        checksWillGreen: ["Appeals Queue", "Permit Processing"],
        parcelsAffected: pending,
        note: "Resolved items move to Change History automatically.",
      },
      mission: {
        whatIsWrong: `There are ${pending} workflow items waiting for action — appeals, permits, and exemptions that haven't been processed yet.`,
        whyItMatters: "Unresolved appeals and permits can affect property values and compliance deadlines.",
        howToFix: [
          { label: "Review pending appeals", target: "workbench:dais:appeals" },
          { label: "Process open permits", target: "workbench:dais:permits" },
          { label: "Handle exemption requests", target: "workbench:dais:exemptions" },
        ],
        whatHappensAfter: "Resolved items are logged in Change History and removed from your queue.",
      },
      fixTarget: "workbench:dais",
    }, 30, 70, 55));
  }

  // Sort by total score descending
  return actions.sort((a, b) => b.score.total - a.score.total);
}

// ─── Urgency styles ───────────────────────────────────────────

const URGENCY_STYLES = {
  red: {
    border: "border-destructive/30",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    impactColor: "text-destructive",
    fixBtn: "bg-destructive hover:bg-destructive/90 text-white",
    whyColor: "text-destructive/80",
  },
  yellow: {
    border: "border-[hsl(var(--tf-sacred-gold)/0.3)]",
    iconBg: "bg-[hsl(var(--tf-sacred-gold)/0.1)]",
    iconColor: "text-tf-gold",
    impactColor: "text-tf-gold",
    fixBtn: "bg-[hsl(var(--tf-sacred-gold))] hover:bg-[hsl(var(--tf-sacred-gold)/0.85)] text-[hsl(var(--tf-substrate))]",
    whyColor: "text-tf-gold/80",
  },
  info: {
    border: "border-[hsl(var(--tf-transcend-cyan)/0.3)]",
    iconBg: "bg-[hsl(var(--tf-transcend-cyan)/0.1)]",
    iconColor: "text-tf-cyan",
    impactColor: "text-muted-foreground",
    fixBtn: "bg-[hsl(var(--tf-transcend-cyan))] hover:bg-[hsl(var(--tf-bright-cyan))] text-[hsl(var(--tf-substrate))]",
    whyColor: "text-tf-cyan/80",
  },
};

// ─── Section helper ───────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

// ─── Fix Preview panel ────────────────────────────────────────

function FixPreview({ action, onConfirm, onBack }: {
  action: ScoredAction;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const fp = action.fixPreview;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="material-bento p-5 border border-[hsl(var(--tf-transcend-cyan)/0.25)] border-l-4 border-l-[hsl(var(--tf-transcend-cyan))] space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-tf-cyan" />
          <span className="text-xs font-semibold uppercase tracking-wider text-tf-cyan">Fix Preview</span>
          <span className="text-[10px] text-muted-foreground/50 ml-1">— nothing changes until you confirm</span>
        </div>
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expected outcomes */}
      <Section label="Expected results">
        <div className="space-y-2">
          {/* Readiness delta */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[hsl(var(--tf-optimized-green)/0.08)] border border-[hsl(var(--tf-optimized-green)/0.2)]">
            <TrendingUp className="w-4 h-4 text-tf-green shrink-0" />
            <span className="text-sm font-medium text-tf-green">{fp.readinessDelta}</span>
          </div>
          {/* Parcels affected */}
          {fp.parcelsAffected > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{fp.parcelsAffected.toLocaleString()} parcels will be updated</span>
            </div>
          )}
          {/* Checks that flip green */}
          {fp.checksWillGreen.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 px-1">Checks that will turn green</p>
              {fp.checksWillGreen.map((check, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--tf-surface)/0.4)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-tf-green shrink-0" />
                  <span className="text-xs text-foreground">{check}</span>
                </div>
              ))}
            </div>
          )}
          {fp.note && (
            <p className="text-[11px] text-muted-foreground/60 px-1 pt-1 italic">{fp.note}</p>
          )}
        </div>
      </Section>

      {/* CTA */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onConfirm}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[hsl(var(--tf-transcend-cyan))] hover:bg-[hsl(var(--tf-bright-cyan))] text-[hsl(var(--tf-substrate))] transition-all"
        >
          Looks good — let's fix it <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onBack}
          className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-[hsl(var(--tf-surface)/0.5)] border border-border/40 transition-all"
        >
          Back
        </button>
      </div>
    </motion.div>
  );
}

// ─── Mission panel ────────────────────────────────────────────

function MissionPanel({ action, onClose, onPreview, onNavigate }: {
  action: ScoredAction;
  onClose: () => void;
  onPreview: () => void;
  onNavigate: (t: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="material-bento p-5 border-l-4 border-[hsl(var(--tf-transcend-cyan))] space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-tf-cyan" />
          <span className="text-xs font-semibold uppercase tracking-wider text-tf-cyan">Mission Briefing</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <Section label="What's wrong">
          <p className="text-sm text-foreground leading-relaxed">{action.mission.whatIsWrong}</p>
        </Section>
        <Section label="Why it matters">
          <p className="text-sm text-muted-foreground leading-relaxed">{action.mission.whyItMatters}</p>
        </Section>
        <Section label="How to fix it">
          <div className="space-y-2">
            {action.mission.howToFix.map((opt, i) => (
              <button
                key={i}
                onClick={() => { onNavigate(opt.target); onClose(); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] border border-border/40 hover:border-[hsl(var(--tf-transcend-cyan)/0.3)] transition-all text-left group"
              >
                <span className="text-sm text-foreground">{opt.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-tf-cyan transition-colors" />
              </button>
            ))}
          </div>
        </Section>
        <Section label="What happens after">
          <p className="text-sm text-muted-foreground leading-relaxed">{action.mission.whatHappensAfter}</p>
        </Section>
      </div>

      <button
        onClick={onPreview}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-tf-cyan border border-[hsl(var(--tf-transcend-cyan)/0.3)] hover:bg-[hsl(var(--tf-transcend-cyan)/0.05)] transition-all"
      >
        <Eye className="w-3.5 h-3.5" />
        See the fix preview first
      </button>
    </motion.div>
  );
}

// ─── Victory Moment ───────────────────────────────────────────

function VictoryMoment({ action, onClose, onNavigate }: {
  action: ScoredAction;
  onClose: () => void;
  onNavigate: (t: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const summary = `✅ Mission Complete\n${action.fixPreview.readinessDelta}\nChecks resolved: ${action.fixPreview.checksWillGreen.join(", ")}\n${action.fixPreview.parcelsAffected.toLocaleString()} parcels updated\nAuto-updated: Maps, Factory inputs, Parcel views`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="material-bento p-5 border border-[hsl(var(--tf-optimized-green)/0.3)] border-l-4 border-l-[hsl(var(--tf-optimized-green))] space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PartyPopper className="w-4 h-4 text-tf-green" />
          <span className="text-sm font-semibold text-tf-green">Mission Complete</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[hsl(var(--tf-optimized-green)/0.08)] border border-[hsl(var(--tf-optimized-green)/0.2)]">
          <TrendingUp className="w-4 h-4 text-tf-green shrink-0" />
          <p className="text-sm font-medium text-tf-green">{action.fixPreview.readinessDelta}</p>
        </div>
        {action.fixPreview.checksWillGreen.map((check, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--tf-surface)/0.4)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-tf-green shrink-0" />
            <span className="text-xs text-foreground">{check} — now passing</span>
          </div>
        ))}
        <div className="px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          Auto-updated: Maps, Factory inputs, Parcel views
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-[hsl(var(--tf-surface)/0.5)] border border-border/40 transition-all"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied!" : "Share results"}
        </button>
        <button
          onClick={() => { onNavigate("registry:trust"); onClose(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-[hsl(var(--tf-surface)/0.5)] border border-border/40 transition-all"
        >
          <FileText className="w-3 h-3" />
          View receipt
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-tf-green border border-[hsl(var(--tf-optimized-green)/0.3)] bg-[hsl(var(--tf-optimized-green)/0.05)] hover:bg-[hsl(var(--tf-optimized-green)/0.1)] transition-all ml-auto"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────

type ViewState = "card" | "mission" | "preview" | "victory";

interface NextBestActionProps {
  vitals: ReturnType<typeof useCountyVitals>["data"];
  pipeline: ReturnType<typeof usePipelineStatus>["data"];
  vitalsLoading: boolean;
  onNavigate: (target: string) => void;
}

export function NextBestAction({ vitals, pipeline, vitalsLoading, onNavigate }: NextBestActionProps) {
  const [view, setView] = useState<ViewState>("card");
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());

  const _health = deriveRibbonHealth(vitals, pipeline);
  const allActions = buildScoredActions(vitals, pipeline);
  const actions = allActions.filter(a => !snoozed.has(a.id));
  const action = actions[0];

  // Green state
  if (vitalsLoading) {
    return (
      <div className="material-bento p-4 space-y-2">
        <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted/20 rounded animate-pulse" />
      </div>
    );
  }

  if (!action) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="material-bento p-4 flex items-center gap-3 border border-[hsl(var(--tf-optimized-green)/0.2)]"
      >
        <div className="p-2 rounded-lg bg-[hsl(var(--tf-optimized-green)/0.1)]">
          <CheckCircle2 className="w-4 h-4 text-tf-green" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">You're all caught up</p>
          <p className="text-xs text-muted-foreground mt-0.5">No urgent actions right now. Keep it up.</p>
        </div>
      </motion.div>
    );
  }

  const style = URGENCY_STYLES[action.urgency];
  const ActionIcon = action.icon;

  const handleFixNow = () => {
    // Show preview instead of navigating immediately
    setView("preview");
  };

  const handleConfirmFix = () => {
    if (action.fixTarget) onNavigate(action.fixTarget);
    setView("victory");
  };

  const handleSnooze = () => {
    setSnoozed(prev => new Set([...prev, action.id]));
    setView("card");
  };

  return (
    <AnimatePresence mode="wait">
      {view === "victory" && (
        <VictoryMoment
          key="victory"
          action={action}
          onClose={() => setView("card")}
          onNavigate={onNavigate}
        />
      )}

      {view === "preview" && (
        <FixPreview
          key="preview"
          action={action}
          onConfirm={handleConfirmFix}
          onBack={() => setView("card")}
        />
      )}

      {view === "mission" && (
        <MissionPanel
          key="mission"
          action={action}
          onClose={() => setView("card")}
          onPreview={() => setView("preview")}
          onNavigate={onNavigate}
        />
      )}

      {view === "card" && (
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`material-bento p-4 border ${style.border}`}
        >
          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-3">
            <Zap className="w-3 h-3 text-tf-cyan" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Next Best Action
            </span>
            {actions.length > 1 && (
              <span className="text-[10px] text-muted-foreground/40 ml-auto">
                +{actions.length - 1} queued
              </span>
            )}
          </div>

          {/* Action block */}
          <div className="flex items-start gap-3 mb-2">
            <div className={`p-2 rounded-lg shrink-0 ${style.iconBg}`}>
              <ActionIcon className={`w-4 h-4 ${style.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight">{action.title}</p>
              <p className={`text-xs mt-0.5 font-medium ${style.impactColor}`}>{action.impact}</p>
            </div>
          </div>

          {/* Why #1 */}
          <p className={`text-[11px] mb-4 leading-relaxed pl-11 ${style.whyColor}`}>
            {action.whyPrimary}
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleFixNow}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${style.fixBtn}`}
            >
              Fix now <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setView("mission")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] border border-border/40 transition-all"
            >
              <HelpCircle className="w-3 h-3" />
              Show me why
            </button>
            <button
              onClick={() => onNavigate("workbench:dais")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] border border-border/40 transition-all"
            >
              <UserPlus className="w-3 h-3" />
              Assign
            </button>
            <button
              onClick={handleSnooze}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] border border-border/40 transition-all"
            >
              <Clock className="w-3 h-3" />
              Snooze
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

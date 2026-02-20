// TerraFusion OS — Next Best Action Card
// One prioritized fix. Plain English. Buttons that work.
// "Here's the one thing to do next. Click it. You'll be fine."

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  ArrowRight,
  HelpCircle,
  UserPlus,
  Clock,
  AlertTriangle,
  XCircle,
  MapPin,
  Shield,
  Upload,
  CheckCircle2,
  X,
  ChevronRight,
} from "lucide-react";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";
import { deriveRibbonHealth } from "./DataStatusRibbon";
import { Button } from "@/components/ui/button";

// ─── Action registry ──────────────────────────────────────────

export interface Action {
  id: string;
  urgency: "red" | "yellow" | "info";
  icon: React.ElementType;
  title: string;
  impact: string;
  // Mission flow
  mission: {
    whatIsWrong: string;
    whyItMatters: string;
    howToFix: { label: string; target: string }[];
    whatHappensAfter: string;
  };
  fixTarget?: string; // nav target for "Fix Now"
}

function buildActions(
  vitals: ReturnType<typeof useCountyVitals>["data"],
  pipeline: ReturnType<typeof usePipelineStatus>["data"]
): Action[] {
  const actions: Action[] = [];

  // Failed ingest
  const failedJob = vitals?.ingest.recentJobs.find(j => j.status === "failed");
  if (failedJob) {
    actions.push({
      id: "failed-ingest",
      urgency: "red",
      icon: XCircle,
      title: `Import failed: ${failedJob.file_name}`,
      impact: "Data is incomplete until this is resolved",
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
    });
  }

  // Missing coordinates
  const missingCoords = vitals ? vitals.parcels.total - vitals.parcels.withCoords : 0;
  if (missingCoords > 0) {
    const pct = vitals
      ? Math.round(((vitals.parcels.total - vitals.parcels.withCoords) / vitals.parcels.total) * 100)
      : 0;
    actions.push({
      id: "missing-coords",
      urgency: pct > 20 ? "red" : "yellow",
      icon: MapPin,
      title: `Fix missing coordinates (${missingCoords.toLocaleString()} parcels)`,
      impact: `+${Math.min(pct, 8)}% readiness after fix`,
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
    });
  }

  // Missing property class
  const missingClass = vitals ? vitals.parcels.total - vitals.parcels.withClass : 0;
  if (missingClass > 100) {
    actions.push({
      id: "missing-class",
      urgency: "yellow",
      icon: Shield,
      title: `Classify ${missingClass.toLocaleString()} unclassified parcels`,
      impact: "Required for accurate valuation models",
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
    });
  }

  // Pending workflows
  const pending = vitals?.workflows.total ?? 0;
  if (pending > 0) {
    actions.push({
      id: "pending-workflows",
      urgency: "info",
      icon: Clock,
      title: `${pending} items need your review`,
      impact: `${vitals?.workflows.pendingAppeals ?? 0} appeals · ${vitals?.workflows.openPermits ?? 0} permits · ${vitals?.workflows.pendingExemptions ?? 0} exemptions`,
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
    });
  }

  return actions;
}

// ─── Mission Flow Dialog ──────────────────────────────────────

function MissionPanel({ action, onClose, onNavigate }: { action: Action; onClose: () => void; onNavigate: (t: string) => void }) {
  const urgencyIcon = action.urgency === "red" ? XCircle : action.urgency === "yellow" ? AlertTriangle : CheckCircle2;
  const UrgencyIcon = urgencyIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="material-bento p-5 border-l-4 border-[hsl(var(--tf-transcend-cyan))] space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-tf-cyan" />
          <span className="text-xs font-semibold uppercase tracking-wider text-tf-cyan">Mission Briefing</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-3">
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
    </motion.div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60 mb-1">{label}</p>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

interface NextBestActionProps {
  vitals: ReturnType<typeof useCountyVitals>["data"];
  pipeline: ReturnType<typeof usePipelineStatus>["data"];
  vitalsLoading: boolean;
  onNavigate: (target: string) => void;
}

const URGENCY_STYLES = {
  red: {
    border: "border-destructive/30",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    impactColor: "text-destructive",
    fixBtn: "bg-destructive hover:bg-destructive/90 text-white",
  },
  yellow: {
    border: "border-[hsl(var(--tf-sacred-gold)/0.3)]",
    iconBg: "bg-[hsl(var(--tf-sacred-gold)/0.1)]",
    iconColor: "text-tf-gold",
    impactColor: "text-tf-gold",
    fixBtn: "bg-[hsl(var(--tf-sacred-gold))] hover:bg-[hsl(var(--tf-sacred-gold)/0.85)] text-[hsl(var(--tf-substrate))]",
  },
  info: {
    border: "border-[hsl(var(--tf-transcend-cyan)/0.3)]",
    iconBg: "bg-[hsl(var(--tf-transcend-cyan)/0.1)]",
    iconColor: "text-tf-cyan",
    impactColor: "text-muted-foreground",
    fixBtn: "bg-[hsl(var(--tf-transcend-cyan))] hover:bg-[hsl(var(--tf-bright-cyan))] text-[hsl(var(--tf-substrate))]",
  },
};

export function NextBestAction({ vitals, pipeline, vitalsLoading, onNavigate }: NextBestActionProps) {
  const [missionOpen, setMissionOpen] = useState(false);
  const [snoozed, setSnoozed] = useState<string | null>(null);

  const health = deriveRibbonHealth(vitals, pipeline);
  const allActions = buildActions(vitals, pipeline);
  const actions = allActions.filter(a => a.id !== snoozed);
  const action = actions[0]; // Always show the single top priority

  // If everything is green, show a success state
  if (!action || health.state === "green") {
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

  if (vitalsLoading) {
    return (
      <div className="material-bento p-4 space-y-2">
        <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted/20 rounded animate-pulse" />
      </div>
    );
  }

  const style = URGENCY_STYLES[action.urgency];
  const ActionIcon = action.icon;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {missionOpen ? (
          <MissionPanel
            key="mission"
            action={action}
            onClose={() => setMissionOpen(false)}
            onNavigate={onNavigate}
          />
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`material-bento p-4 border ${style.border}`}
          >
            {/* Label */}
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="w-3 h-3 text-tf-cyan" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Next Best Action
              </span>
              {actions.length > 1 && (
                <span className="text-[10px] text-muted-foreground/50 ml-auto">
                  +{actions.length - 1} more
                </span>
              )}
            </div>

            {/* Action */}
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2 rounded-lg shrink-0 ${style.iconBg}`}>
                <ActionIcon className={`w-4 h-4 ${style.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">{action.title}</p>
                <p className={`text-xs mt-0.5 font-medium ${style.impactColor}`}>{action.impact}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { if (action.fixTarget) onNavigate(action.fixTarget); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${style.fixBtn}`}
              >
                Fix now <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setMissionOpen(true)}
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
                onClick={() => setSnoozed(action.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] border border-border/40 transition-all"
              >
                <Clock className="w-3 h-3" />
                Snooze
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

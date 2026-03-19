// TerraFusion OS — Data Doctor Dashboard (Phase 66+67)
// AI diagnoses. PostGIS repairs. Humans approve.
// "The data said it wants a second opinion" — Ralph Wiggum, Chief Diagnostician

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RemediationWorkbench } from "./RemediationWorkbench";
import {
  Stethoscope, MapPin, Home, Copy, GitCompareArrows, Brain,
  AlertTriangle, Play, Loader2, Shield, ShieldAlert, ShieldX,
  ChevronRight, Clock, Zap, ArrowRight, CheckCircle2, XCircle,
  BarChart3, RefreshCw, Info, Sparkles, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useDataDoctorStatus,
  useRunDiagnosis,
  LANE_CONFIG,
  LANE_ORDER,
  fixTierLabel,
  fixTierColor,
  severityWeight,
  type DQLane,
  type DQIssue,
  type LaneSummary,
} from "@/hooks/useDataDoctor";
import { useCountyMeta } from "@/hooks/useCountyMeta";
import { ScopeHeader, ProvenanceBadge } from "@/components/trust";
import ReactMarkdown from "react-markdown";

// ── Icon map ────────────────────────────────────────────────────
const LANE_ICONS: Record<string, any> = {
  MapPin, Home, Copy, GitCompareArrows, Brain, AlertTriangle,
};

function getLaneIcon(lane: DQLane) {
  const iconName = LANE_CONFIG[lane]?.icon || "Shield";
  return LANE_ICONS[iconName] || Shield;
}

// ── Severity badge ──────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { class: string; label: string }> = {
    critical: { class: "bg-red-500/15 text-red-400 border-red-500/30", label: "Critical" },
    high: { class: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "High" },
    medium: { class: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Medium" },
    low: { class: "bg-muted/30 text-muted-foreground border-border", label: "Low" },
  };
  const c = config[severity] || config.low;
  return <Badge variant="outline" className={`text-[9px] px-1.5 ${c.class}`}>{c.label}</Badge>;
}

// ── Fix Tier Badge ──────────────────────────────────────────────
function FixTierBadge({ tier }: { tier: string }) {
  const config: Record<string, { icon: any; class: string }> = {
    auto_apply: { icon: Zap, class: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    review_confirm: { icon: CheckCircle2, class: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    human_resolve: { icon: XCircle, class: "text-red-400 bg-red-500/10 border-red-500/20" },
  };
  const c = config[tier] || config.review_confirm;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 gap-1 ${c.class}`}>
      <Icon className="h-2.5 w-2.5" />
      {fixTierLabel(tier as any)}
    </Badge>
  );
}

// ── Blocker Panel ───────────────────────────────────────────────
function BlockerPanel({ issues }: { issues: DQIssue[] }) {
  const blockers = issues.filter((i) => i.is_hard_blocker);
  if (blockers.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        <span className="text-xs text-emerald-400 font-medium">No hard blockers — data is gate-eligible</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ShieldX className="h-4 w-4 text-red-400" />
        <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
          {blockers.length} Hard Blocker{blockers.length !== 1 ? "s" : ""} — Must Resolve Before Certification
        </span>
      </div>
      {blockers.map((b) => (
        <div key={b.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
          <ShieldAlert className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{b.issue_title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{b.blocker_reason}</p>
          </div>
          <SeverityBadge severity={b.severity} />
        </div>
      ))}
    </div>
  );
}

// ── Lane Card ───────────────────────────────────────────────────
function LaneCard({
  lane,
  summary,
  expanded,
  onToggle,
}: {
  lane: DQLane;
  summary: LaneSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = LANE_CONFIG[lane];
  const Icon = getLaneIcon(lane);

  if (summary.total_issues === 0) {
    return (
      <div className={`p-3 rounded-xl border ${config.borderColor} ${config.bgColor} opacity-60`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-foreground">{config.label}</h4>
            <p className="text-[10px] text-muted-foreground">{config.description}</p>
          </div>
          <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
            Clean ✓
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <motion.div layout className={`rounded-xl border ${config.borderColor} overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full p-3 ${config.bgColor} hover:brightness-110 transition-all text-left`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-foreground">{config.label}</h4>
              {summary.hard_blockers > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                  {summary.hard_blockers} blocker{summary.hard_blockers !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{config.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-lg font-bold font-mono ${config.color}`}>
              {summary.total_issues}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {summary.affected_parcels.toLocaleString()} parcels
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2 border-t border-border/30">
              {/* Policy info */}
              <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-start gap-2">
                  <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p><span className="text-foreground font-medium">Auto-fix when:</span> {summary.policy.autoApplyWhen}</p>
                    <p><span className="text-red-400 font-medium">Never auto-fix:</span> {summary.policy.neverAutoFix}</p>
                    <p><span className="text-foreground font-medium">Trust hierarchy:</span> {summary.policy.trustHierarchy.join(" → ")}</p>
                  </div>
                </div>
              </div>

              {/* Issues list */}
              {summary.top_issues.map((issue) => (
                <div key={issue.id} className="flex items-start gap-2 p-2 rounded-lg bg-card/50 border border-border/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{issue.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {issue.affected_count.toLocaleString()} parcels
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <SeverityBadge severity={issue.severity} />
                    <FixTierBadge tier={issue.fix_tier} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Treatment Plan Panel ────────────────────────────────────────
function TreatmentPlanPanel({ plan }: { plan: Record<string, any> }) {
  if (!plan || plan.error || plan.fallback) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Treatment Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {plan.executive_summary && (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{plan.executive_summary}</ReactMarkdown>
          </div>
        )}

        {plan.quick_wins && Array.isArray(plan.quick_wins) && (
          <div>
            <h5 className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">Quick Wins</h5>
            {plan.quick_wins.map((win: any, i: number) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <Zap className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{typeof win === "string" ? win : win.description || win.issue || JSON.stringify(win)}</span>
              </div>
            ))}
          </div>
        )}

        {plan.risk_assessment && (
          <div>
            <h5 className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">Risks</h5>
            <p className="text-muted-foreground">{typeof plan.risk_assessment === "string" ? plan.risk_assessment : JSON.stringify(plan.risk_assessment)}</p>
          </div>
        )}

        {plan.estimated_completion_hours && (
          <div className="flex items-center gap-2 pt-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              Estimated remediation: <span className="text-foreground font-medium">{plan.estimated_completion_hours} hours</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════

export function DataDoctorDashboard() {
  const countyMeta = useCountyMeta();
  // Use the SLCO county ID
  const countyId = "00000000-0000-0000-0000-000000000002";

  const { data: status, isLoading } = useDataDoctorStatus(countyId);
  const runDiagnosis = useRunDiagnosis();
  const [expandedLane, setExpandedLane] = useState<DQLane | null>(null);

  const hasRun = !!status?.latest_run;
  const isRunning = runDiagnosis.isPending || status?.latest_run?.status === "running";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Data Doctor</h2>
              <p className="text-xs text-muted-foreground">
                AI-powered diagnosis • PostGIS-driven repair • Human-approved mutations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ScopeHeader
              scope="county"
              label={countyMeta?.shortName ?? "County"}
              source="data-doctor"
              status="draft"
            />
            <Button
              size="sm"
              onClick={() => runDiagnosis.mutate(countyId)}
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : hasRun ? (
                <RefreshCw className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isRunning ? "Diagnosing..." : hasRun ? "Re-Diagnose" : "Run Diagnosis"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* No diagnosis yet */}
      {!hasRun && !isLoading && !isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 space-y-4"
        >
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 inline-block">
            <Stethoscope className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">No diagnosis yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Run the Data Doctor to analyze your parcel dataset. The AI will diagnose issues,
              prioritize remediation lanes, and generate a Treatment Plan.
            </p>
          </div>
          <Button onClick={() => runDiagnosis.mutate(countyId)} disabled={isRunning} className="gap-2">
            <Play className="h-4 w-4" />
            Run First Diagnosis
          </Button>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Results */}
      {hasRun && status && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Issues Found",
                value: status.total_issues,
                icon: AlertTriangle,
                color: status.total_issues > 0 ? "text-amber-400" : "text-emerald-400",
              },
              {
                label: "Hard Blockers",
                value: status.total_hard_blockers,
                icon: ShieldX,
                color: status.total_hard_blockers > 0 ? "text-red-400" : "text-emerald-400",
              },
              {
                label: "Affected Parcels",
                value: status.total_affected_parcels,
                icon: BarChart3,
                color: "text-primary",
              },
              {
                label: "Last Diagnosis",
                value: status.latest_run?.completed_at
                  ? new Date(status.latest_run.completed_at).toLocaleTimeString()
                  : "—",
                icon: Clock,
                color: "text-muted-foreground",
              },
            ].map((stat, i) => (
              <div key={i} className="p-3 rounded-xl bg-card/80 border border-border/30 text-center">
                <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
                <div className={`text-lg font-bold font-mono ${stat.color}`}>
                  {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Hard Blockers Panel */}
          <BlockerPanel issues={status.all_issues} />

          {/* AI Treatment Plan */}
          {status.latest_run?.treatment_plan && (
            <TreatmentPlanPanel plan={status.latest_run.treatment_plan} />
          )}

          {/* Remediation Lanes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Remediation Lanes
              </h3>
              <span className="text-[10px] text-muted-foreground">
                (ordered by recommended priority)
              </span>
            </div>
            <div className="space-y-2">
              {LANE_ORDER.map((lane) => (
                <LaneCard
                  key={lane}
                  lane={lane}
                  summary={status.lanes[lane] || { total_issues: 0, hard_blockers: 0, affected_parcels: 0, avg_priority: 0, top_issues: [], policy: { autoApplyWhen: "", neverAutoFix: "", trustHierarchy: [] } }}
                  expanded={expandedLane === lane}
                  onToggle={() => setExpandedLane(expandedLane === lane ? null : lane)}
                />
              ))}
            </div>
          </div>

          {/* Issue Priority Queue */}
          {status.all_issues.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  Priority Queue — Impact × Confidence × Reversibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-1.5">
                    {[...status.all_issues]
                      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
                      .map((issue, idx) => (
                        <div
                          key={issue.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
                        >
                          <span className="text-[10px] text-muted-foreground font-mono w-5 text-right">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{issue.issue_title}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[9px] text-muted-foreground">
                                Impact: {Math.round(issue.impact_score)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                Confidence: {Math.round(issue.confidence_score)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                Reversibility: {Math.round(issue.reversibility_score)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[9px] px-1.5 font-mono">
                                  P{Math.round(issue.priority_score || 0)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Priority Score = (Impact×0.5) + (Confidence×0.3) + (Reversibility×0.2)
                              </TooltipContent>
                            </Tooltip>
                            <SeverityBadge severity={issue.severity} />
                            <FixTierBadge tier={issue.fix_tier} />
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}

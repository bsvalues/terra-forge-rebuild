// TerraFusion OS — Defensibility Score Card (Phase 69)
// "My defensibility score is a hundred and purple" — Ralph Wiggum, Assessor
//
// Four pillars: Data Completeness, Data Consistency, Market Support, Model Stability
// Wired to County Pulse via get_county_vitals() RPC — no direct DB calls.

import { motion } from "framer-motion";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Database, GitCompareArrows, TrendingUp, Brain,
  ChevronRight, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { DefensibilityScore, DefensibilityVerdict, DataQualityVitals } from "@/hooks/useCountyVitals";

// ── Verdict display config ──────────────────────────────────────
const VERDICT_CONFIG: Record<DefensibilityVerdict, {
  label: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  strong: {
    label: "Strong",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    description: "Appraisal posture is defensible across all pillars",
  },
  watch: {
    label: "Watch",
    icon: ShieldAlert,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "Some pillars need attention before certification",
  },
  at_risk: {
    label: "At Risk",
    icon: ShieldX,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    description: "Critical gaps threaten appraisal defensibility",
  },
};

// ── Pillar config ───────────────────────────────────────────────
const PILLARS = [
  {
    key: "dataCompleteness" as const,
    label: "Data Completeness",
    icon: Database,
    description: "Coordinates, property class, neighborhood, and assessment coverage",
    color: "text-blue-400",
  },
  {
    key: "dataConsistency" as const,
    label: "Data Consistency",
    icon: GitCompareArrows,
    description: "Open DQ issues and hard blockers penalize this score",
    color: "text-purple-400",
  },
  {
    key: "marketSupport" as const,
    label: "Market Support",
    icon: TrendingUp,
    description: "Sales ratio relative to IAAO-recommended 5% threshold",
    color: "text-amber-400",
  },
  {
    key: "modelStability" as const,
    label: "Model Stability",
    icon: Brain,
    description: "Calibration coverage and average R² across neighborhoods",
    color: "text-emerald-400",
  },
];

// ── Score color helper ──────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

// ── Main Component ──────────────────────────────────────────────
interface DefensibilityScoreCardProps {
  defensibility: DefensibilityScore;
  dataQuality?: DataQualityVitals;
  onNavigate?: (target: string) => void;
  compact?: boolean;
}

export function DefensibilityScoreCard({
  defensibility,
  dataQuality,
  onNavigate,
  compact = false,
}: DefensibilityScoreCardProps) {
  const verdict = VERDICT_CONFIG[defensibility.verdict] || VERDICT_CONFIG.at_risk;
  const VerdictIcon = verdict.icon;

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`p-3 rounded-xl border ${verdict.borderColor} ${verdict.bgColor} cursor-pointer transition-all`}
        onClick={() => onNavigate?.("data-doctor")}
      >
        <div className="flex items-center gap-3">
          <VerdictIcon className={`h-5 w-5 ${verdict.color}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold font-mono ${verdict.color}`}>
                {defensibility.overall}
              </span>
              <Badge variant="outline" className={`text-[8px] px-1 ${verdict.color} ${verdict.borderColor}`}>
                {verdict.label}
              </Badge>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
              Defensibility
            </span>
          </div>
          {onNavigate && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </motion.div>
    );
  }

  return (
    <Card className={`border ${verdict.borderColor} overflow-hidden`}>
      <CardHeader className={`pb-3 ${verdict.bgColor}`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <VerdictIcon className={`h-4 w-4 ${verdict.color}`} />
            Defensibility Score
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold font-mono ${verdict.color}`}>
              {defensibility.overall}
            </span>
            <Badge variant="outline" className={`text-[9px] ${verdict.color} ${verdict.borderColor}`}>
              {verdict.label}
            </Badge>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {verdict.description}
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {/* Pillar breakdown */}
        {PILLARS.map((pillar) => {
          const score = defensibility.pillars[pillar.key];
          const PillarIcon = pillar.icon;
          return (
            <div key={pillar.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PillarIcon className={`h-3.5 w-3.5 ${pillar.color}`} />
                  <span className="text-xs font-medium text-foreground">{pillar.label}</span>
                </div>
                <span className={`text-sm font-bold font-mono ${scoreColor(score)}`}>
                  {score}%
                </span>
              </div>
              <Progress value={score} className="h-1.5" />
              <p className="text-[9px] text-muted-foreground">{pillar.description}</p>
            </div>
          );
        })}

        {/* DQ quick summary */}
        {dataQuality && (
          <div className="pt-2 border-t border-border/20">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                {dataQuality.hardBlockers > 0 ? (
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                )}
                <span className="text-muted-foreground">
                  {dataQuality.openIssues} open issues • {dataQuality.hardBlockers} blockers
                </span>
              </div>
              {dataQuality.latestSnapshot?.quality_score != null && (
                <Badge variant="outline" className="text-[8px] px-1">
                  DQ: {Math.round(dataQuality.latestSnapshot.quality_score)}%
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Drill-through */}
        {onNavigate && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onNavigate("data-doctor")}
              className="flex-1 text-[10px] text-center py-1.5 rounded-lg bg-muted/20 border border-border/20 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
            >
              Data Doctor →
            </button>
            <button
              onClick={() => onNavigate("readiness")}
              className="flex-1 text-[10px] text-center py-1.5 rounded-lg bg-muted/20 border border-border/20 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
            >
              Roll Readiness →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

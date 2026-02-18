// TerraFusion OS — Roll Readiness Command Center
// "I bent the DOM and it said thank you." — Ralph Wiggum, DOM Whisperer
// The certification state smells like victory (and also like paste).

import { motion } from "framer-motion";
import { useRollReadiness, type ReadinessCheck, type NeighborhoodReadiness, type RollReadinessData } from "@/hooks/useRollReadiness";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ScopeHeader, ProvenanceBadge } from "@/components/trust";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart3,
  ListChecks,
  MapPin,
  TrendingUp,
  Scale,
  FileText,
  Database,
  Target,
} from "lucide-react";

// ── Verdict Banner ──────────────────────────────────────────────
function VerdictBanner({ score, verdict }: { score: number; verdict: "GO" | "CAUTION" | "NO_GO" }) {
  const config = {
    GO: {
      icon: ShieldCheck,
      label: "ROLL READY",
      subtitle: "All pre-certification checks passed. You may proceed with certification.",
      bg: "bg-[hsl(var(--tf-optimized-green)/0.08)]",
      border: "border-[hsl(var(--tf-optimized-green)/0.25)]",
      iconColor: "text-[hsl(var(--tf-optimized-green))]",
      scoreColor: "text-[hsl(var(--tf-optimized-green))]",
      glow: "shadow-[0_0_40px_hsl(var(--tf-optimized-green)/0.15)]",
    },
    CAUTION: {
      icon: ShieldAlert,
      label: "CAUTION",
      subtitle: "Some checks need attention. Review warnings before certifying.",
      bg: "bg-[hsl(var(--tf-sacred-gold)/0.08)]",
      border: "border-[hsl(var(--tf-sacred-gold)/0.25)]",
      iconColor: "text-[hsl(var(--tf-sacred-gold))]",
      scoreColor: "text-[hsl(var(--tf-sacred-gold))]",
      glow: "shadow-[0_0_40px_hsl(var(--tf-sacred-gold)/0.15)]",
    },
    NO_GO: {
      icon: ShieldX,
      label: "NOT READY",
      subtitle: "Critical checks failed. Resolve blockers before certification.",
      bg: "bg-[hsl(var(--tf-warning-red)/0.08)]",
      border: "border-[hsl(var(--tf-warning-red)/0.25)]",
      iconColor: "text-[hsl(var(--tf-warning-red))]",
      scoreColor: "text-[hsl(var(--tf-warning-red))]",
      glow: "shadow-[0_0_40px_hsl(var(--tf-warning-red)/0.15)]",
    },
  }[verdict];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "material-bento rounded-2xl p-6 sm:p-8 border-2",
        config.bg, config.border, config.glow
      )}
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Score Ring */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" opacity={0.3} />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${score * 3.267} 326.7`}
              className={config.scoreColor}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-light", config.scoreColor)}>{score}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
          </div>
        </div>

        {/* Verdict Text */}
        <div className="text-center sm:text-left flex-1">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <Icon className={cn("w-7 h-7", config.iconColor)} />
            <h2 className={cn("text-2xl sm:text-3xl font-light tracking-tight", config.scoreColor)}>
              {config.label}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            {config.subtitle}
          </p>
          <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start">
            <span className="text-xs text-muted-foreground">
              TY {new Date().getFullYear()} Pre-Certification Assessment
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Checklist Item ──────────────────────────────────────────────
function ChecklistItem({ check, index }: { check: ReadinessCheck; index: number }) {
  const statusConfig = {
    pass: { icon: CheckCircle2, color: "text-[hsl(var(--tf-optimized-green))]", bg: "bg-[hsl(var(--tf-optimized-green)/0.08)]", border: "border-[hsl(var(--tf-optimized-green)/0.15)]" },
    warn: { icon: AlertTriangle, color: "text-[hsl(var(--tf-sacred-gold))]", bg: "bg-[hsl(var(--tf-sacred-gold)/0.08)]", border: "border-[hsl(var(--tf-sacred-gold)/0.15)]" },
    fail: { icon: XCircle, color: "text-[hsl(var(--tf-warning-red))]", bg: "bg-[hsl(var(--tf-warning-red)/0.08)]", border: "border-[hsl(var(--tf-warning-red)/0.15)]" },
  }[check.status];

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        "material-bento rounded-xl p-4 border",
        statusConfig.bg, statusConfig.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <StatusIcon className={cn("w-5 h-5", statusConfig.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground">{check.label}</h4>
            <Badge variant="outline" className={cn("shrink-0 text-xs", statusConfig.color, statusConfig.border)}>
              {check.metric}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
          {check.detail && (
            <p className={cn("text-xs mt-1.5 font-medium", statusConfig.color)}>
              {check.detail}
            </p>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
          w:{check.weight}
        </span>
      </div>
    </motion.div>
  );
}

// ── Neighborhood Row ────────────────────────────────────────────
function NeighborhoodRow({ nbhd, index }: { nbhd: NeighborhoodReadiness; index: number }) {
  const scoreColor = nbhd.score >= 80 ? "text-[hsl(var(--tf-optimized-green))]"
    : nbhd.score >= 50 ? "text-[hsl(var(--tf-sacred-gold))]"
    : "text-[hsl(var(--tf-warning-red))]";

  const barColor = nbhd.certRate === 100 ? "bg-[hsl(var(--tf-optimized-green))]"
    : nbhd.certRate >= 50 ? "bg-[hsl(var(--tf-sacred-gold))]"
    : "bg-[hsl(var(--tf-warning-red))]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-b-0"
    >
      <span className="text-xs font-mono text-muted-foreground w-20 shrink-0 truncate" title={nbhd.code}>
        {nbhd.code}
      </span>

      {/* Score */}
      <span className={cn("text-sm font-medium w-10 text-right shrink-0", scoreColor)}>
        {nbhd.score}
      </span>

      {/* Cert progress */}
      <div className="flex-1 min-w-0">
        <div className="h-2 rounded-full bg-[hsl(var(--tf-elevated)/0.5)] overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${nbhd.certRate}%` }} />
        </div>
      </div>

      <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">
        {nbhd.certRate}%
      </span>

      {/* Calibration badge */}
      {nbhd.hasCalibration ? (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[hsl(var(--tf-optimized-green)/0.3)] text-[hsl(var(--tf-optimized-green))]">
          R²:{nbhd.rSquared ? (nbhd.rSquared * 100).toFixed(0) : "—"}%
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/50 text-muted-foreground">
          No Cal
        </Badge>
      )}

      <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">
        {nbhd.parcelCount} p
      </span>
    </motion.div>
  );
}

// ── Summary Stats Grid ──────────────────────────────────────────
function SummaryGrid({ summary }: { summary: RollReadinessData["summary"] }) {
  const stats = [
    { label: "Total Parcels", value: summary.totalParcels.toLocaleString(), icon: Database, color: "text-[hsl(var(--tf-transcend-cyan))]" },
    { label: "Certified", value: `${summary.certRate}%`, icon: ShieldCheck, color: summary.certRate === 100 ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-sacred-gold))]" },
    { label: "Calibrated", value: `${summary.calibratedNeighborhoods}/${summary.totalNeighborhoods}`, icon: TrendingUp, color: "text-[hsl(var(--tf-transcend-cyan))]" },
    { label: "Data Quality", value: `${summary.avgDataQuality}%`, icon: Target, color: summary.avgDataQuality >= 80 ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-sacred-gold))]" },
    { label: "Pending Appeals", value: summary.pendingAppeals.toString(), icon: Scale, color: summary.pendingAppeals === 0 ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-warning-red))]" },
    { label: "Open Permits", value: summary.openPermits.toString(), icon: FileText, color: "text-muted-foreground" },
    { label: "Pending Exemptions", value: summary.pendingExemptions.toString(), icon: ListChecks, color: "text-muted-foreground" },
    { label: "Missing Assessments", value: summary.missingAssessments.toLocaleString(), icon: AlertTriangle, color: summary.missingAssessments === 0 ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-warning-red))]" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="material-bento rounded-xl p-3 text-center"
          >
            <Icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
            <div className={cn("text-lg font-medium", stat.color)}>{stat.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────
export function RollReadinessDashboard() {
  const { data, isLoading } = useRollReadiness();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const failedChecks = data.checks.filter(c => c.status === "fail");
  const warnChecks = data.checks.filter(c => c.status === "warn");
  const passChecks = data.checks.filter(c => c.status === "pass");

  return (
    <div className="space-y-6">
      {/* Scope + Provenance */}
      <div className="flex items-center justify-end gap-2">
        <ScopeHeader scope="county" label="Benton" source="roll-readiness" status="draft" />
        <ProvenanceBadge source="roll-readiness" />
      </div>

      {/* Hero Verdict */}
      <VerdictBanner score={data.overallScore} verdict={data.verdict} />

      {/* Summary Stats */}
      <SummaryGrid summary={data.summary} />

      {/* Tabs: Checklist / Neighborhoods */}
      <Tabs defaultValue="checklist" className="space-y-4">
        <TabsList className="bg-[hsl(var(--tf-elevated)/0.5)]">
          <TabsTrigger value="checklist" className="text-xs gap-1.5">
            <ListChecks className="w-3.5 h-3.5" />
            Checklist
            {failedChecks.length > 0 && (
              <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {failedChecks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="neighborhoods" className="text-xs gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Neighborhoods
            <span className="ml-1 text-[10px] text-muted-foreground">{data.neighborhoods.length}</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* ── Checklist Tab ── */}
        <TabsContent value="checklist" className="space-y-3">
          {failedChecks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-[hsl(var(--tf-warning-red))] uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Failed ({failedChecks.length})
              </h3>
              {failedChecks.map((check, i) => (
                <ChecklistItem key={check.id} check={check} index={i} />
              ))}
            </div>
          )}
          {warnChecks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-[hsl(var(--tf-sacred-gold))] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Warnings ({warnChecks.length})
              </h3>
              {warnChecks.map((check, i) => (
                <ChecklistItem key={check.id} check={check} index={i} />
              ))}
            </div>
          )}
          {passChecks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-[hsl(var(--tf-optimized-green))] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Passed ({passChecks.length})
              </h3>
              {passChecks.map((check, i) => (
                <ChecklistItem key={check.id} check={check} index={i} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Neighborhoods Tab ── */}
        <TabsContent value="neighborhoods">
          <div className="material-bento rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Neighborhood Readiness Grid</h3>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[hsl(var(--tf-optimized-green))]" />
                  ≥80
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[hsl(var(--tf-sacred-gold))]" />
                  50-79
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[hsl(var(--tf-warning-red))]" />
                  &lt;50
                </span>
              </div>
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 py-2 border-b border-border/50 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span className="w-20 shrink-0">Nbhd</span>
              <span className="w-10 text-right shrink-0">Score</span>
              <span className="flex-1">Certification</span>
              <span className="w-10 text-right shrink-0">Rate</span>
              <span className="w-16 text-center shrink-0">Model</span>
              <span className="w-12 text-right shrink-0">Parcels</span>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {data.neighborhoods.map((nbhd, i) => (
                <NeighborhoodRow key={nbhd.code} nbhd={nbhd} index={i} />
              ))}
              {data.neighborhoods.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No neighborhoods found. Import parcel data with neighborhood codes to see readiness.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Summary Tab ── */}
        <TabsContent value="summary">
          <div className="material-bento rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-foreground">Roll Readiness Summary</h3>

            <div className="space-y-3">
              <SummaryRow label="Overall Readiness Score" value={`${data.overallScore}/100`}
                color={data.verdict === "GO" ? "text-[hsl(var(--tf-optimized-green))]" : data.verdict === "CAUTION" ? "text-[hsl(var(--tf-sacred-gold))]" : "text-[hsl(var(--tf-warning-red))]"} />
              <SummaryRow label="Certification Progress" value={`${data.summary.certRate}%`}
                color={data.summary.certRate === 100 ? "text-[hsl(var(--tf-optimized-green))]" : "text-foreground"} />
              <SummaryRow label="Neighborhoods Calibrated" value={`${data.summary.calibratedNeighborhoods} of ${data.summary.totalNeighborhoods}`}
                color="text-foreground" />
              <SummaryRow label="Data Quality Average" value={`${data.summary.avgDataQuality}%`}
                color={data.summary.avgDataQuality >= 80 ? "text-[hsl(var(--tf-optimized-green))]" : "text-foreground"} />
              <SummaryRow label="Unresolved Blockers" value={(data.summary.pendingAppeals + data.summary.openPermits + data.summary.pendingExemptions).toString()}
                color={data.summary.pendingAppeals + data.summary.openPermits + data.summary.pendingExemptions === 0 ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-warning-red))]"} />
              <SummaryRow label="Checks Passed" value={`${passChecks.length}/${data.checks.length}`}
                color={passChecks.length === data.checks.length ? "text-[hsl(var(--tf-optimized-green))]" : "text-foreground"} />
            </div>

            <div className="pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Roll Readiness Score is a weighted composite of certification coverage (30%),
                model calibration (25%), appeal resolution (20%), data completeness (15%), and
                assessment coverage (10%). A score of 90+ indicates the roll is ready for certification.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", color)}>{value}</span>
    </div>
  );
}

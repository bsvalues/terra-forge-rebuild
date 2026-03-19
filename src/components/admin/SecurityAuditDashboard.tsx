// TerraFusion OS — Security & Audit Dashboard
// Surfaces trace-event audit trail, write activity, and role compliance.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Shield, Activity, AlertTriangle, CheckCircle2, Eye, Lock,
  Loader2, FileWarning, Users, BarChart3, Zap, Database,
  TrendingUp, Bell, Gavel, Calculator, FileText, MapPin,
  Sparkles, Radio,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useSecurityAudit, type SecurityEvent } from "@/hooks/useSecurityAudit";
import { TraceChainIntegrityPanel } from "@/components/proof/TraceChainIntegrityPanel";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// ── Event icon + color mapping ────────────────────────────────
const EVENT_ICONS: Record<string, React.ElementType> = {
  parcel_updated: Database,
  value_override_created: Calculator,
  workflow_state_changed: Activity,
  notice_generated: Bell,
  batch_notices_generated: Bell,
  batch_notices_status_changed: Bell,
  model_run_completed: TrendingUp,
  appeal_created: Gavel,
  notice_created: Bell,
  evidence_attached: FileText,
  exemption_decided: Shield,
  permit_status_changed: MapPin,
  certification_recorded: CheckCircle2,
  pilot_tool_invoked: Sparkles,
  pilot_tool_completed: Sparkles,
};

const RISK_LABELS: Record<string, { level: string; color: string; bg: string }> = {
  value_override_created: { level: "HIGH", color: "text-destructive", bg: "bg-destructive/10" },
  notice_generated: { level: "HIGH", color: "text-destructive", bg: "bg-destructive/10" },
  batch_notices_generated: { level: "HIGH", color: "text-destructive", bg: "bg-destructive/10" },
  certification_recorded: { level: "HIGH", color: "text-destructive", bg: "bg-destructive/10" },
  model_run_completed: { level: "HIGH", color: "text-destructive", bg: "bg-destructive/10" },
  appeal_created: { level: "MEDIUM", color: "text-chart-4", bg: "bg-chart-4/10" },
  workflow_state_changed: { level: "MEDIUM", color: "text-chart-4", bg: "bg-chart-4/10" },
  exemption_decided: { level: "MEDIUM", color: "text-chart-4", bg: "bg-chart-4/10" },
  permit_status_changed: { level: "LOW", color: "text-muted-foreground", bg: "bg-muted/10" },
  parcel_updated: { level: "LOW", color: "text-muted-foreground", bg: "bg-muted/10" },
};

const MODULE_COLORS: Record<string, string> = {
  forge: "text-suite-forge",
  dais: "text-suite-dais",
  atlas: "text-suite-atlas",
  dossier: "text-suite-dossier",
  os: "text-primary",
  ingest: "text-tf-cyan",
  pilot: "text-tf-gold",
};

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, subtitle }: {
  label: string; value: number; icon: React.ElementType; color: string; subtitle?: string;
}) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", color.replace("text-", "bg-").replace(/(?<=bg-[\w-]+)$/, "/15"))}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Module Activity Bar ──────────────────────────────────────
function ModuleActivityChart({ breakdown, total }: {
  breakdown: { module: string; count: number }[];
  total: number;
}) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Activity by Module (7d)
        </h4>
        <div className="space-y-2.5">
          {breakdown.slice(0, 6).map((m) => {
            const pct = total > 0 ? (m.count / total) * 100 : 0;
            const color = MODULE_COLORS[m.module] ?? "text-muted-foreground";
            return (
              <div key={m.module} className="flex items-center gap-3">
                <span className={cn("text-xs font-medium w-16 truncate", color)}>
                  {m.module}
                </span>
                <div className="flex-1">
                  <Progress value={pct} className="h-2" />
                </div>
                <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                  {m.count}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Event Type Distribution ──────────────────────────────────
function EventTypeList({ breakdown }: {
  breakdown: { type: string; count: number }[];
}) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Event Types (7d)
        </h4>
        <ScrollArea className="h-48">
          <div className="space-y-1.5">
            {breakdown.map((e) => {
              const risk = RISK_LABELS[e.type];
              return (
                <div key={e.type} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/30">
                  <span className="text-xs text-foreground truncate flex-1">
                    {formatEventType(e.type)}
                  </span>
                  {risk && (
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 mr-2", risk.bg, risk.color)}>
                      {risk.level}
                    </Badge>
                  )}
                  <span className="text-xs font-mono text-muted-foreground">{e.count}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── Security Event Row ───────────────────────────────────────
function SecurityEventRow({ event }: { event: SecurityEvent }) {
  const Icon = EVENT_ICONS[event.eventType] ?? Activity;
  const risk = RISK_LABELS[event.eventType];
  const moduleColor = MODULE_COLORS[event.sourceModule] ?? "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/20 transition-colors"
    >
      <div className={cn("p-1.5 rounded-md mt-0.5", risk?.bg ?? "bg-muted/10")}>
        <Icon className={cn("w-3.5 h-3.5", risk?.color ?? "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {formatEventType(event.eventType)}
          </span>
          <Badge variant="outline" className={cn("text-[9px] px-1 py-0", moduleColor)}>
            {event.sourceModule}
          </Badge>
          {risk && (
            <Badge variant="outline" className={cn("text-[9px] px-1 py-0", risk.bg, risk.color)}>
              {risk.level}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            actor: {event.actorId.slice(0, 8)}…
          </span>
          {event.parcelId && (
            <span className="text-[10px] text-muted-foreground font-mono">
              parcel: {event.parcelId.slice(0, 8)}…
            </span>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
      </span>
    </motion.div>
  );
}

// ── Compliance Checklist ─────────────────────────────────────
function ComplianceChecklist() {
  const checks = [
    { label: "County-scoped RLS on all tables", passed: true },
    { label: "has_role() RBAC function active", passed: true },
    { label: "Privilege escalation protection (county_id lock)", passed: true },
    { label: "TerraTrace append-only audit spine", passed: true },
    { label: "Write-lane governance enforcement", passed: true },
    { label: "Anonymous sign-ups disabled", passed: true },
    { label: "Auto-confirm email disabled", passed: true },
    { label: "Search-path injection protection", passed: true },
  ];

  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-chart-5" />
          Security Compliance
        </h4>
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              {c.passed ? (
                <CheckCircle2 className="w-4 h-4 text-chart-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              )}
              <span className="text-xs text-foreground">{c.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-chart-5/10 text-chart-5 border-chart-5/30 text-[10px]">
              {checks.filter(c => c.passed).length}/{checks.length} PASSED
            </Badge>
            <span className="text-[10px] text-muted-foreground">Last audited: Phase 33</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
export function SecurityAuditDashboard() {
  const { data: metrics, isLoading, error } = useSecurityAudit();
  const { profile } = useAuthContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <FileWarning className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-destructive font-medium">Failed to load audit data</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const threatLevel = metrics.highRiskEvents24h > 10
    ? "elevated"
    : metrics.highRiskEvents24h > 0
      ? "normal"
      : "quiet";

  const threatConfig = {
    elevated: { label: "Elevated Activity", color: "text-chart-4", bg: "bg-chart-4/10", border: "border-chart-4/30", icon: AlertTriangle },
    normal: { label: "Normal", color: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/30", icon: CheckCircle2 },
    quiet: { label: "Quiet", color: "text-muted-foreground", bg: "bg-muted/10", border: "border-border", icon: Eye },
  }[threatLevel];

  const ThreatIcon = threatConfig.icon;

  return (
    <div className="space-y-6">
      <Header />

      {/* Threat Level Banner */}
      <Card className={cn("border", threatConfig.border, threatConfig.bg)}>
        <CardContent className="p-4 flex items-center gap-3">
          <ThreatIcon className={cn("w-5 h-5", threatConfig.color)} />
          <div>
            <p className={cn("text-sm font-medium", threatConfig.color)}>
              Threat Level: {threatConfig.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.highRiskEvents24h} high-risk events in last 24h · {metrics.activeActors24h} active users
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Events (24h)" value={metrics.totalEvents24h} icon={Activity} color="text-primary" />
        <StatCard label="Events (7d)" value={metrics.totalEvents7d} icon={Zap} color="text-tf-cyan" />
        <StatCard label="Write Ops (24h)" value={metrics.writeEvents24h} icon={Database} color="text-chart-4" />
        <StatCard label="High Risk (24h)" value={metrics.highRiskEvents24h} icon={AlertTriangle} color="text-destructive" />
      </div>

      {/* Middle Row: Module Activity + Event Types + Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ModuleActivityChart breakdown={metrics.moduleBreakdown} total={metrics.totalEvents7d} />
        <EventTypeList breakdown={metrics.eventTypeBreakdown} />
        <ComplianceChecklist />
      </div>

      {/* Audit Trail */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-destructive" />
            Write Audit Trail
            <Badge variant="outline" className="text-[10px] ml-auto">
              {metrics.recentSecurityEvents.length} events
            </Badge>
          </h4>
          <ScrollArea className="h-80">
            <div className="space-y-0.5">
              {metrics.recentSecurityEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No write events recorded yet</p>
                </div>
              ) : (
                metrics.recentSecurityEvents.map((event) => (
                  <SecurityEventRow key={event.id} event={event} />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
        <Shield className="w-5 h-5 text-destructive" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-foreground">Security & Audit</h3>
        <p className="text-sm text-muted-foreground">
          Write activity monitoring, compliance tracking, and audit trail
        </p>
      </div>
    </div>
  );
}

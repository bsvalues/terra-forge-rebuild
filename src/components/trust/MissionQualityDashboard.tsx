// TerraFusion OS — Mission Quality Dashboard
// Registry → Health section showing mission governance metrics.
// Constitutional: no direct supabase calls — uses useSmartActions + local stats.

import { motion } from "framer-motion";
import {
  Target,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MISSION_REGISTRY, IMPACT_LABELS, type MissionDefinition } from "@/lib/missionConstitution";
import { useSmartActions } from "@/hooks/useSmartActions";
import { ProvenanceBadge } from "@/components/trust/ProvenanceBadge";

// ── In-memory mission event log (session-scoped) ──
// In production this would be backed by trace_events; for now we derive from local state.
interface MissionStats {
  triggered: number;
  completed: number;
  dismissed: number;
  avgResolutionMinutes: number | null;
  rollbackCount: number;
}

function useMissionStats(): MissionStats {
  // Derive from current active missions count as proxy
  const actions = useSmartActions();
  return {
    triggered: MISSION_REGISTRY.length,
    completed: MISSION_REGISTRY.length - actions.length,
    dismissed: 0,
    avgResolutionMinutes: null,
    rollbackCount: 0,
  };
}

export function MissionQualityDashboard() {
  const stats = useMissionStats();
  const activeMissions = useSmartActions();
  const fetchedAt = new Date().toISOString();

  const falsePositiveRate = stats.triggered > 0
    ? Math.round((stats.dismissed / stats.triggered) * 100)
    : 0;

  const completionRate = stats.triggered > 0
    ? Math.round((stats.completed / stats.triggered) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Mission Quality</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {MISSION_REGISTRY.length} defined
          </Badge>
        </div>
        <ProvenanceBadge source="mission-quality" fetchedAt={fetchedAt} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI icon={<Activity className="w-3.5 h-3.5" />} label="Triggered" value={stats.triggered} status="neutral" />
        <KPI icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Completed" value={`${completionRate}%`} status={completionRate > 60 ? "ok" : "warn"} />
        <KPI icon={<Clock className="w-3.5 h-3.5" />} label="Avg Resolution" value={stats.avgResolutionMinutes ? `${stats.avgResolutionMinutes}m` : "—"} status="neutral" />
        <KPI icon={<XCircle className="w-3.5 h-3.5" />} label="False Positive Rate" value={`${falsePositiveRate}%`} status={falsePositiveRate < 15 ? "ok" : "warn"} />
      </div>

      {/* Mission Registry Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Mission Registry
        </h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Mission</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Scope</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Threshold</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">SLA</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Impact</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {MISSION_REGISTRY.map((m) => {
                const isActive = activeMissions.some((a) => a.id === m.id);
                const impact = IMPACT_LABELS[m.impactCategory];
                return (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border/50 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{m.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{m.id}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{m.scope}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">≥ {m.threshold}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.slaCooldownDays}d</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px]" style={{ color: impact.color }}>{impact.label}</span>
                    </td>
                    <td className="px-3 py-2">
                      {isActive ? (
                        <Badge className="text-[9px] px-1.5 py-0 bg-chart-4/15 text-chart-4 border-chart-4/30">
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                          CLEAR
                        </Badge>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Governance metadata */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <ShieldCheck className="w-3 h-3" />
        <span>All missions governed by <code className="font-mono bg-muted/40 px-1 rounded">missionConstitution.ts</code> — single source of truth</span>
      </div>
    </div>
  );
}

// ── KPI Card ──
function KPI({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: string | number; status: "ok" | "warn" | "neutral" }) {
  const border = status === "ok" ? "border-[hsl(var(--tf-optimized-green)/0.3)]" : status === "warn" ? "border-[hsl(var(--tf-sacred-gold)/0.3)]" : "border-border";
  const text = status === "ok" ? "text-[hsl(var(--tf-optimized-green))]" : status === "warn" ? "text-[hsl(var(--tf-sacred-gold))]" : "text-foreground";
  return (
    <div className={`rounded-xl border p-3 ${border}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">{icon}{label}</div>
      <div className={`text-xl font-mono font-semibold ${text}`}>{value}</div>
    </div>
  );
}

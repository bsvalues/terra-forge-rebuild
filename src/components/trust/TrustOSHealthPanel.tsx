// TerraFusion OS — Trust OS Health Panel (Registry Tab)
// Surfaces live constitutional signals: nav violations, cache health, ChangeReceipt log.
// Constitutional: no supabase.* calls — pure hook + constitutionGuards consumption.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Database,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProvenanceNumber } from "@/components/trust/ProvenanceNumber";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import {
  getConstitutionSnapshot,
  getNavAttempts,
  CANONICAL_QUERY_KEYS,
  type NavAttempt,
  type ConstitutionSnapshot,
} from "@/lib/constitutionGuards";

// ── Signal Card ────────────────────────────────────────────────────
interface SignalCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  status: "ok" | "warn" | "error" | "neutral";
}

const STATUS_STYLES: Record<SignalCardProps["status"], string> = {
  ok: "border-[hsl(var(--tf-optimized-green)/0.3)] bg-[hsl(var(--tf-optimized-green)/0.06)]",
  warn: "border-[hsl(var(--tf-sacred-gold)/0.35)] bg-[hsl(var(--tf-sacred-gold)/0.06)]",
  error: "border-[hsl(var(--tf-warning-red)/0.35)] bg-[hsl(var(--tf-warning-red)/0.06)]",
  neutral: "border-border bg-muted/20",
};

const STATUS_TEXT: Record<SignalCardProps["status"], string> = {
  ok: "text-[hsl(var(--tf-optimized-green))]",
  warn: "text-[hsl(var(--tf-sacred-gold))]",
  error: "text-[hsl(var(--tf-warning-red))]",
  neutral: "text-foreground",
};

function SignalCard({ icon, label, value, sub, status }: SignalCardProps) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${STATUS_STYLES[status]}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-mono font-semibold ${STATUS_TEXT[status]}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────
export function TrustOSHealthPanel() {
  const [snapshot, setSnapshot] = useState<ConstitutionSnapshot>(() =>
    getConstitutionSnapshot()
  );
  const [navAttempts, setNavAttempts] = useState<NavAttempt[]>(() =>
    getNavAttempts()
  );
  const [refreshedAt, setRefreshedAt] = useState<string>(new Date().toISOString());
  const { health, circuitMetrics, isLoading: healthLoading } = useSystemHealth();

  // Refresh constitution snapshot every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshot(getConstitutionSnapshot());
      setNavAttempts(getNavAttempts());
      setRefreshedAt(new Date().toISOString());
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setSnapshot(getConstitutionSnapshot());
    setNavAttempts(getNavAttempts());
    setRefreshedAt(new Date().toISOString());
  };

  // Constitution gates status
  const gate1Status = "ok" as const; // No supabase.* in components (enforced by ESLint)
  const gate2Status = "ok" as const; // No rogue invalidateQueries (enforced by ESLint)
  const gate3Status: SignalCardProps["status"] =
    snapshot.blockedNavAttempts > 0 ? "warn" : "ok";

  // System health
  const overallHealthStatus: SignalCardProps["status"] =
    health?.overall === "healthy"
      ? "ok"
      : health?.overall === "degraded"
      ? "warn"
      : health?.overall === "unhealthy"
      ? "error"
      : "neutral";

  // Circuit breakers
  const openCircuits = Object.values(circuitMetrics).filter(
    (m) => m.state === "open"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[hsl(var(--tf-optimized-green))]" />
          <span className="text-sm font-medium text-foreground">Trust OS Health</span>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 bg-[hsl(var(--tf-optimized-green)/0.12)] text-[hsl(var(--tf-optimized-green))] border-[hsl(var(--tf-optimized-green)/0.3)]"
          >
            LIVE
          </Badge>
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground text-xs transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* ── Section 1: Constitution Gates ─── */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Constitution Gates
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SignalCard
            icon={<Database className="w-3.5 h-3.5" />}
            label="Gate #1 — DB in Components"
            value="0"
            sub="supabase.* violations · enforced by ESLint"
            status={gate1Status}
          />
          <SignalCard
            icon={<Activity className="w-3.5 h-3.5" />}
            label="Gate #2 — Rogue Invalidations"
            value="0"
            sub="invalidateQueries outside registry · ESLint"
            status={gate2Status}
          />
          <SignalCard
            icon={<Navigation className="w-3.5 h-3.5" />}
            label="Gate #3 — Illegal Nav Attempts"
            value={snapshot.blockedNavAttempts}
            sub={`${snapshot.totalNavAttempts} total attempts this session`}
            status={gate3Status}
          />
        </div>
      </div>

      {/* ── Section 2: System Health ─── */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          System Health
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SignalCard
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
            label="Overall Status"
            value={healthLoading ? "…" : (health?.overall ?? "unknown")}
            sub={health ? `as of ${new Date(health.timestamp).toLocaleTimeString()}` : "checking…"}
            status={overallHealthStatus}
          />
          <SignalCard
            icon={<Activity className="w-3.5 h-3.5" />}
            label="Latency"
            value={health?.uptime ?? "—"}
            sub="last health check round-trip"
            status={
              health?.uptime
                ? parseInt(health.uptime) < 500
                  ? "ok"
                  : parseInt(health.uptime) < 2000
                  ? "warn"
                  : "error"
                : "neutral"
            }
          />
          <SignalCard
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            label="Open Circuit Breakers"
            value={openCircuits}
            sub={`${Object.keys(circuitMetrics).length} total breakers monitored`}
            status={openCircuits === 0 ? "ok" : openCircuits === 1 ? "warn" : "error"}
          />
        </div>

        {/* Health check detail */}
        {health?.checks && health.checks.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Check</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Latency</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Detail</th>
                </tr>
              </thead>
              <tbody>
                {health.checks.map((check, idx) => (
                  <tr key={check.service ?? idx} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium text-foreground">{check.service}</td>
                    <td className="px-3 py-2">
                      {check.status === "healthy" ? (
                        <div className="flex items-center gap-1 text-[hsl(var(--tf-optimized-green))]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>healthy</span>
                        </div>
                      ) : check.status === "degraded" ? (
                        <div className="flex items-center gap-1 text-[hsl(var(--tf-sacred-gold))]">
                          <AlertTriangle className="w-3 h-3" />
                          <span>degraded</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[hsl(var(--tf-warning-red))]">
                          <XCircle className="w-3 h-3" />
                          <span>unhealthy</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {check.latencyMs != null ? `${check.latencyMs}ms` : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-48">
                      {check.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3: Circuit Breakers ─── */}
      {Object.keys(circuitMetrics).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Circuit Breakers
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(circuitMetrics).map(([name, m]) => (
              <div
                key={name}
                className={`rounded-lg border px-3 py-2 ${
                  m.state === "closed"
                    ? "border-[hsl(var(--tf-optimized-green)/0.2)] bg-[hsl(var(--tf-optimized-green)/0.04)]"
                    : m.state === "half_open"
                    ? "border-[hsl(var(--tf-sacred-gold)/0.3)] bg-[hsl(var(--tf-sacred-gold)/0.05)]"
                    : "border-[hsl(var(--tf-warning-red)/0.3)] bg-[hsl(var(--tf-warning-red)/0.05)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground truncate">{name}</span>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase ${
                      m.state === "closed"
                        ? "text-[hsl(var(--tf-optimized-green))]"
                        : m.state === "half_open"
                        ? "text-[hsl(var(--tf-sacred-gold))]"
                        : "text-[hsl(var(--tf-warning-red))]"
                    }`}
                  >
                    {m.state}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {m.failures} failures · {m.successes} successes
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 4: Navigation Attempt Log ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Navigation Attempts
          </h3>
          <ProvenanceNumber source="constitution-guards" fetchedAt={refreshedAt}>
            {navAttempts.length} logged
          </ProvenanceNumber>
        </div>

        {navAttempts.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-muted/10 px-4 py-6 text-center text-xs text-muted-foreground">
            No navigation attempts logged yet. Interact with the app to populate.
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Target</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {navAttempts.map((attempt) => (
                  <tr
                    key={attempt.id}
                    className={`border-b border-border/50 transition-colors ${
                      attempt.blocked ? "bg-[hsl(var(--tf-warning-red)/0.04)]" : "hover:bg-muted/20"
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(attempt.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium text-foreground">
                      {attempt.target}
                    </td>
                    <td className="px-3 py-2">
                      {attempt.blocked ? (
                        <div className="flex items-center gap-1 text-[hsl(var(--tf-warning-red))]">
                          <XCircle className="w-3 h-3" />
                          <span>BLOCKED</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[hsl(var(--tf-optimized-green))]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>OK</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-[10px] max-w-48 truncate">
                      {attempt.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 5: Canonical Query Key Registry ─── */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Canonical Query Key Registry ({CANONICAL_QUERY_KEYS.length} keys)
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {CANONICAL_QUERY_KEYS.map((key) => (
            <code
              key={key}
              className="px-2 py-0.5 rounded-md bg-muted/40 border border-border/50 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {key}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

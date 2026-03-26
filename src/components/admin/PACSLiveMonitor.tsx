// TerraFusion OS — Phase 90: PACS Live Sync Monitor
// Operational delta dashboard — shows drift between live PACS database
// and TerraFusion canonical tables. Complements the Phase 83 bootstrap panel.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Server,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePACSDeltaReport, type PACSDriftProduct, type PACSSyncStatus } from "@/hooks/usePACSDelta";
import { useRunBentonPACSSeed } from "@/hooks/useRunBentonPACSSeed";
import { useRunBentonQualityGate } from "@/hooks/useRunBentonQualityGate";
import type { BentonQualityReport, QualityMetric } from "@/hooks/useRunBentonQualityGate";

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConnectionBadge({
  connected,
  latencyMs,
  loading,
}: {
  connected: boolean | undefined;
  latencyMs: number | null | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Badge className="gap-1.5 bg-transparent border border-yellow-500/40 text-yellow-400">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Checking
      </Badge>
    );
  }
  if (connected) {
    return (
      <Badge className="gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <Wifi className="h-3 w-3" />
        Live{latencyMs != null ? ` · ${latencyMs}ms` : ""}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1.5 bg-transparent border border-slate-500/40 text-slate-400">
      <WifiOff className="h-3 w-3" />
      Offline
    </Badge>
  );
}

function SyncStatusBadge({ status }: { status: PACSSyncStatus }) {
  const configs: Record<PACSSyncStatus, { label: string; cls: string }> = {
    "in-sync": { label: "In Sync", cls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
    drifted: { label: "Drifted", cls: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
    stale: { label: "Stale", cls: "bg-red-500/20 text-red-400 border border-red-500/30" },
    offline: { label: "Offline", cls: "bg-slate-600/40 text-slate-400 border border-slate-500/30" },
    unknown: { label: "Unknown", cls: "bg-slate-600/40 text-slate-400 border border-slate-500/30" },
  };
  const { label, cls } = configs[status];
  return (
    <Badge className={cn("text-xs bg-transparent", cls)}>
      {label}
    </Badge>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | null;
  loading: boolean;
  accent?: "success" | "warning" | "danger" | "default";
}) {
  const accentCls = {
    success: "text-emerald-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
    default: "text-white",
  }[accent ?? "default"];

  return (
    <Card className="border-slate-700/50 bg-slate-800/40">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="text-slate-400">{icon}</div>
        </div>
        <div className={cn("mt-2 text-2xl font-bold tabular-nums", loading ? "blur-sm" : "", accentCls)}>
          {loading ? "···" : (value ?? "—")}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{label}</div>
      </CardContent>
    </Card>
  );
}

function DriftIcon({ drift }: { drift: number | null }) {
  if (drift === null) return <Minus className="h-3.5 w-3.5 text-slate-500" />;
  if (drift === 0) return <Minus className="h-3.5 w-3.5 text-emerald-400" />;
  if (drift > 0) return <TrendingUp className="h-3.5 w-3.5 text-yellow-400" />;
  return <TrendingDown className="h-3.5 w-3.5 text-blue-400" />;
}

function ProductRow({ product }: { product: PACSDriftProduct }) {
  return (
    <tr className="border-b border-slate-700/40 last:border-0 hover:bg-slate-800/30 transition-colors">
      <td className="py-3 pl-4 pr-2">
        <div className="font-medium text-sm text-slate-200">{product.label}</div>
        <div className="text-xs text-slate-500 font-mono">{product.pacsTable}</div>
      </td>
      <td className="py-3 px-2 text-sm text-slate-500 font-mono">{product.tfTable}</td>
      <td className="py-3 px-2 text-right tabular-nums text-sm text-slate-300">
        {product.pacsCount != null ? product.pacsCount.toLocaleString() : "—"}
      </td>
      <td className="py-3 px-2 text-right tabular-nums text-sm text-slate-300">
        {product.tfCount != null ? product.tfCount.toLocaleString() : "—"}
      </td>
      <td className="py-3 px-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <DriftIcon drift={product.drift} />
          <span
            className={cn(
              "tabular-nums text-sm",
              product.drift === 0 ? "text-emerald-400"
              : product.drift !== null ? "text-yellow-400"
              : "text-slate-500"
            )}
          >
            {product.drift != null ? (product.drift > 0 ? `+${product.drift.toLocaleString()}` : product.drift.toLocaleString()) : "—"}
          </span>
        </div>
      </td>
      <td className="py-3 pr-4 pl-2">
        <SyncStatusBadge status={product.status} />
      </td>
    </tr>
  );
}

function QualityMetricRow({ metric }: { metric: QualityMetric }) {
  const statusIcon = {
    pass: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    warn: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
    fail: <AlertTriangle className="h-4 w-4 text-red-400" />,
    skip: <Minus className="h-4 w-4 text-slate-500" />,
  }[metric.status];

  return (
    <div className="border-b border-slate-700/30 last:border-0 py-3">
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="text-sm font-medium text-slate-200">{metric.title}</span>
        {metric.coveragePct != null && (
          <span className="ml-auto text-xs tabular-nums text-slate-400">
            {metric.coveragePct.toFixed(1)}%
            {metric.thresholdPct != null && ` / ${metric.thresholdPct}% required`}
          </span>
        )}
      </div>
      {metric.coveragePct != null && metric.thresholdPct != null && (
        <Progress
          value={Math.min(metric.coveragePct, 100)}
          className={cn(
            "mt-1.5 h-1",
            metric.status === "pass" ? "[&>div]:bg-emerald-500"
            : metric.status === "warn" ? "[&>div]:bg-yellow-500"
            : "[&>div]:bg-red-500"
          )}
        />
      )}
      <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
      {metric.nextAction && (
        <p className="mt-0.5 text-xs text-blue-400 italic">{metric.nextAction}</p>
      )}
    </div>
  );
}

function QualityGatePanel({ report }: { report: BentonQualityReport }) {
  const [open, setOpen] = useState(true);
  const statusBadgeClass = {
    pass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    warn: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    fail: "bg-red-500/20 text-red-400 border-red-500/30",
    skip: "bg-slate-600/40 text-slate-400 border-slate-500/30",
  }[report.overallStatus];

  return (
    <Card className="border-slate-700/50 bg-slate-800/40">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-700/20 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-base text-slate-200">Quality Gate Results</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs bg-transparent border", statusBadgeClass)}>
                  {report.overallStatus.toUpperCase()}
                </Badge>
                <div className="flex gap-2 text-xs text-slate-500">
                  <span className="text-emerald-400">{report.passCount}✓</span>
                  {report.warnCount > 0 && <span className="text-yellow-400">{report.warnCount}⚠</span>}
                  {report.failCount > 0 && <span className="text-red-400">{report.failCount}✗</span>}
                </div>
                {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </div>
            </div>
            {report.seedComplete && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Seed complete — all hard gates passed
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="divide-y divide-slate-700/30">
              {report.metrics.map((m) => (
                <QualityMetricRow key={m.id} metric={m} />
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Audited {formatDistanceToNow(new Date(report.executedAt))} ago
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PACSLiveMonitor() {
  const [syncResultOpen, setSyncResultOpen] = useState(false);

  const report = usePACSDeltaReport();
  const seedMutation = useRunBentonPACSSeed();
  const qualityGateMutation = useRunBentonQualityGate();

  const data = report.data;
  const health = data?.connectionHealth;

  const handleSyncAll = () => {
    setSyncResultOpen(false);
    seedMutation.mutate(undefined, {
      onSuccess: (result) => {
        setSyncResultOpen(true);
        if (result.productsFailed === 0) {
          toast.success("PACS sync complete", {
            description: `${result.productsSucceeded} products · ${result.totalRows.toLocaleString()} rows in ${(result.durationMs / 1000).toFixed(1)}s`,
          });
        } else {
          toast.warning("PACS sync finished with errors", {
            description: `${result.productsSucceeded} succeeded, ${result.productsFailed} failed`,
          });
        }
        report.refetch();
      },
      onError: (err) => {
        toast.error("Sync failed", { description: err instanceof Error ? err.message : "Unknown error" });
      },
    });
  };

  const handleRunQualityGates = () => {
    qualityGateMutation.mutate(undefined, {
      onError: (err) => {
        toast.error("Quality gate run failed", { description: err instanceof Error ? err.message : "Unknown error" });
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-r from-slate-800 to-cyan-900/40 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/20 p-2">
              <Database className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">PACS Sync Intelligence</h2>
              <p className="text-sm text-slate-400">
                Benton County WA · True Automation CIAPS · FIPS 53005 · Read-Only
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionBadge
              connected={health?.connected}
              latencyMs={health?.latencyMs}
              loading={report.isLoading}
            />
            <Button
              className="h-8 rounded-md px-3 text-sm border border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700/50"
              onClick={() => report.refetch()}
              disabled={report.isFetching}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", report.isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
        {!health?.connected && data && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <p className="text-xs text-yellow-300">
              {health?.error
                ? `PACS connector offline: ${health.error}`
                : "PACS connector is offline — TF counts shown, PACS counts unavailable. Configure the pacs-query edge function to enable live comparison."}
            </p>
          </div>
        )}
        {data && (
          <p className="mt-2 text-xs text-slate-600">
            Report generated {formatDistanceToNow(new Date(data.reportGeneratedAt))} ago
            {data.lastIngestJobAt && (
              <> · Last ingest job {formatDistanceToNow(new Date(data.lastIngestJobAt))} ago</>
            )}
          </p>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Wifi className="h-4 w-4" />}
          label="PACS Connection"
          value={data ? (health?.connected ? `${health.latencyMs ?? "?"}ms` : "Offline") : null}
          loading={report.isLoading}
          accent={health?.connected ? "success" : "default"}
        />
        <StatCard
          icon={<Database className="h-4 w-4" />}
          label="PACS Total Records"
          value={data ? data.totalPacsRows.toLocaleString() : null}
          loading={report.isLoading}
        />
        <StatCard
          icon={<Server className="h-4 w-4" />}
          label="TF Total Records"
          value={data ? data.totalTfRows.toLocaleString() : null}
          loading={report.isLoading}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Total Row Drift"
          value={data ? data.totalDrift.toLocaleString() : null}
          loading={report.isLoading}
          accent={data?.totalDrift === 0 ? "success" : data?.totalDrift != null ? "warning" : "default"}
        />
      </div>

      {/* ── Product Drift Table ── */}
      <Card className="border-slate-700/50 bg-slate-800/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Product Delta Status
            </CardTitle>
            {data && data.totalDrift === 0 && health?.connected && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All products in sync
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {report.isLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-10 animate-pulse rounded bg-slate-700/40" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="py-2 pl-4 pr-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Product
                    </th>
                    <th className="py-2 px-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      TF Table
                    </th>
                    <th className="py-2 px-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">
                      PACS
                    </th>
                    <th className="py-2 px-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">
                      TF
                    </th>
                    <th className="py-2 px-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Drift
                    </th>
                    <th className="py-2 pr-4 pl-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.products ?? []).map((p) => (
                    <ProductRow key={p.id} product={p} />
                  ))}
                </tbody>
              </table>
              {!data?.products.length && (
                <p className="py-6 text-center text-sm text-slate-500">
                  No delta data — run a refresh to populate.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sync Controls ── */}
      <Card className="border-slate-700/50 bg-slate-800/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            Synchronization Controls
          </CardTitle>
          <p className="text-xs text-slate-500">
            Runs all 6 PACS sync products through the contract runtime. Read-only from PACS; writes to TerraFusion only.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              onClick={handleSyncAll}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing…
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Sync All Products
                </>
              )}
            </Button>
            <Button
              className="border border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700/50"
              onClick={handleRunQualityGates}
              disabled={qualityGateMutation.isPending}
            >
              {qualityGateMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Running gates…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  Run Quality Gates
                </>
              )}
            </Button>
          </div>

          {/* Sync Progress */}
          <AnimatePresence>
            {seedMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4"
              >
                <div className="flex items-center gap-2 text-sm text-cyan-300">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running PACS contract sync for Benton County…
                </div>
                <Progress className="mt-2 [&>div]:bg-cyan-500" value={undefined} />
                <p className="mt-1.5 text-xs text-slate-500">
                  Extract → Schema Check → Quality Gates → Watermark → Trace
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sync Results */}
          <AnimatePresence>
            {seedMutation.isSuccess && seedMutation.data && syncResultOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <Collapsible open={syncResultOpen} onOpenChange={setSyncResultOpen}>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between text-sm font-medium text-emerald-300 hover:text-emerald-200 transition-colors">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Sync complete — {seedMutation.data.totalRows.toLocaleString()} rows in{" "}
                          {(seedMutation.data.durationMs / 1000).toFixed(1)}s
                        </span>
                        {syncResultOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 space-y-1.5">
                        {seedMutation.data.syncResult.products.map((p) => (
                          <div key={p.productId} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{p.productName}</span>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums text-slate-300">
                                {p.rowCount.toLocaleString()} rows
                              </span>
                              <Badge
                              className={cn(
                                "text-[10px] py-0 bg-transparent border",
                                  p.status === "success"
                                    ? "border-emerald-500/30 text-emerald-400"
                                    : p.status === "skipped"
                                    ? "border-slate-500/30 text-slate-400"
                                    : "border-red-500/30 text-red-400"
                                )}
                              >
                                {p.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 flex justify-between text-xs text-slate-500">
                          <span>{seedMutation.data.productsSucceeded} succeeded · {seedMutation.data.productsFailed} failed · {seedMutation.data.productsSkipped} skipped</span>
                          <span>{seedMutation.data.seedYear} appraisal year</span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* ── Quality Gate Results ── */}
      <AnimatePresence>
        {qualityGateMutation.isSuccess && qualityGateMutation.data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <QualityGatePanel report={qualityGateMutation.data} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Info footer ── */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-700/30 bg-slate-900/20 p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
        <p className="text-xs text-slate-600 leading-relaxed">
          All PACS queries are read-only (db_datareader). No data leaves TerraFusion's write boundary.
          Drift counts are indicative — a positive drift means PACS has records not yet in TF.
          Use the Phase 83 Bootstrap Panel for initial seeding; use this panel for ongoing delta syncs.
        </p>
      </div>
    </div>
  );
}

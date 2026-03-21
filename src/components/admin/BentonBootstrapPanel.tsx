// TerraFusion OS — Phase 83.7/83.8: Benton County Bootstrap Panel
// ═══════════════════════════════════════════════════════════
// Admin UI for initialising and validating the full Benton
// County dataset. Five sections:
//   1. Preflight check — 8 system readiness signals
//   2. Bootstrap executor — wire county, sources, study period
//   3. Quality gate — post-seed coverage audit (Phase 83.8)
//   4. Seed CLI reference — service-key commands for Python seeders
//   5. Reset / Wipe — destroy all Benton county-scoped data (83.8)
// Role-gated to admin only.
// =══════════════════════════════════════════════════════════

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Map,
  Play,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronRight,
  Shield,
  Database,
  Layers,
  ClipboardCheck,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useRunBentonBootstrapPreflight,
  useExecuteBentonBootstrap,
  type BentonBootstrapCheck,
  type BentonBootstrapCheckStatus,
  type BentonBootstrapReport,
  type BentonBootstrapExecutionResult,
  type BentonBootstrapExecutionStep,
} from "@/hooks/useBentonBootstrap";
import {
  useRunBentonQualityGate,
  type BentonQualityReport,
  type QualityMetric,
  type QualityGateStatus,
} from "@/hooks/useRunBentonQualityGate";

// ────────────────────────────────────────────────────────────
// Wipe Benton Data — Phase 83.8 reset utility
// ────────────────────────────────────────────────────────────

interface WipeResult {
  salesDeleted: number;
  assessmentsDeleted: number;
  parcelsDeleted: number;
}

async function wipeBentonData(): Promise<WipeResult> {
  const { data: county, error: countyError } = await supabase
    .from("counties")
    .select("id")
    .eq("fips_code", "53005")
    .maybeSingle();

  if (countyError) throw new Error(countyError.message);
  if (!county) throw new Error("Benton county does not exist — nothing to wipe.");

  const cid = county.id;

  const [salesRes, assessmentsRes, parcelsRes] = await Promise.all([
    supabase.from("sales").delete({ count: "exact" }).eq("county_id", cid),
    supabase.from("assessments").delete({ count: "exact" }).eq("county_id", cid),
    supabase.from("parcels").delete({ count: "exact" }).eq("county_id", cid),
  ]);

  if (salesRes.error) throw new Error(`Sales delete failed: ${salesRes.error.message}`);
  if (assessmentsRes.error) throw new Error(`Assessments delete failed: ${assessmentsRes.error.message}`);
  if (parcelsRes.error) throw new Error(`Parcels delete failed: ${parcelsRes.error.message}`);

  return {
    salesDeleted: salesRes.count ?? 0,
    assessmentsDeleted: assessmentsRes.count ?? 0,
    parcelsDeleted: parcelsRes.count ?? 0,
  };
}

function useWipeBentonData() {
  return useMutation({
    mutationFn: wipeBentonData,
    onSuccess: (result) => {
      toast.success("Benton data wiped", {
        description: `${result.parcelsDeleted.toLocaleString()} parcels · ${result.assessmentsDeleted.toLocaleString()} assessments · ${result.salesDeleted.toLocaleString()} sales deleted.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Wipe failed", { description: error.message });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Shared status helpers
// ────────────────────────────────────────────────────────────

function checkStatusIcon(status: BentonBootstrapCheckStatus) {
  switch (status) {
    case "ready":
      return <CheckCircle2 className="w-4 h-4 text-chart-2" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-chart-5" />;
    case "blocked":
      return <XCircle className="w-4 h-4 text-destructive" />;
  }
}

function checkStatusBadge(status: BentonBootstrapCheckStatus) {
  const map: Record<BentonBootstrapCheckStatus, string> = {
    ready: "bg-chart-2/10 text-chart-2 border-chart-2/30",
    warning: "bg-chart-5/10 text-chart-5 border-chart-5/30",
    blocked: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[status]}`}>
      {status}
    </Badge>
  );
}

function qualityStatusIcon(status: QualityGateStatus) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="w-4 h-4 text-chart-2" />;
    case "warn":
      return <AlertTriangle className="w-4 h-4 text-chart-5" />;
    case "fail":
      return <XCircle className="w-4 h-4 text-destructive" />;
    case "skip":
      return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
  }
}

function qualityStatusBadge(status: QualityGateStatus) {
  const map: Record<QualityGateStatus, string> = {
    pass: "bg-chart-2/10 text-chart-2 border-chart-2/30",
    warn: "bg-chart-5/10 text-chart-5 border-chart-5/30",
    fail: "bg-destructive/10 text-destructive border-destructive/30",
    skip: "bg-muted/30 text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[status]}`}>
      {status}
    </Badge>
  );
}

function stepStatusBadge(status: BentonBootstrapExecutionStep["status"]) {
  const map: Record<BentonBootstrapExecutionStep["status"], string> = {
    completed: "bg-chart-2/10 text-chart-2 border-chart-2/30",
    skipped: "bg-muted/30 text-muted-foreground border-border",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[status]}`}>
      {status}
    </Badge>
  );
}

function overallBorderClass(status: BentonBootstrapCheckStatus) {
  switch (status) {
    case "ready":
      return "border-chart-2/30";
    case "warning":
      return "border-chart-5/30";
    case "blocked":
      return "border-destructive/30";
  }
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function CheckCard({ check }: { check: BentonBootstrapCheck }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border/50 rounded-lg bg-tf-elevated/30 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-tf-elevated/50 transition-colors">
            {checkStatusIcon(check.status)}
            <span className="flex-1 text-sm font-medium text-foreground">{check.title}</span>
            {checkStatusBadge(check.status)}
            {open ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-0 space-y-1.5 border-t border-border/30">
            <p className="text-xs text-muted-foreground mt-2">{check.detail}</p>
            {check.nextAction && (
              <p className="text-xs text-chart-5">
                <span className="font-medium">Next: </span>
                {check.nextAction}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function QualityMetricCard({ metric }: { metric: QualityMetric }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border/50 rounded-lg bg-tf-elevated/30 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-tf-elevated/50 transition-colors">
            {qualityStatusIcon(metric.status)}
            <span className="flex-1 text-sm font-medium text-foreground">{metric.title}</span>
            {metric.coveragePct !== null && (
              <span className="text-xs text-muted-foreground tabular-nums mr-2">
                {metric.coveragePct}%
              </span>
            )}
            {qualityStatusBadge(metric.status)}
            {open ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-0 space-y-1.5 border-t border-border/30">
            <p className="text-xs text-muted-foreground mt-2">{metric.detail}</p>
            {metric.thresholdPct !== undefined && metric.coveragePct !== null && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      metric.status === "pass"
                        ? "bg-chart-2"
                        : metric.status === "warn"
                        ? "bg-chart-5"
                        : "bg-destructive"
                    }`}
                    style={{ width: `${Math.min(metric.coveragePct, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {metric.coveragePct}% / {metric.thresholdPct}%
                </span>
              </div>
            )}
            {metric.nextAction && (
              <p className="text-xs text-chart-5">
                <span className="font-medium">Next: </span>
                {metric.nextAction}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ────────────────────────────────────────────────────────────
// Section 1: Preflight
// ────────────────────────────────────────────────────────────

function PreflightSection({
  report,
  isPending,
  onRun,
}: {
  report: BentonBootstrapReport | null;
  isPending: boolean;
  onRun: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`material-bento rounded-2xl p-6 border ${
        report ? overallBorderClass(report.overall) : "border-border/30"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">Preflight Check</h3>
          {report && (
            <span className="text-xs text-muted-foreground">
              · {new Date(report.executedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRun}
          disabled={isPending}
          className="gap-2 text-xs h-8 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
        >
          {isPending ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {isPending ? "Running…" : "Run Preflight"}
        </Button>
      </div>

      {!report && !isPending && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Run preflight to assess 8 system readiness signals before bootstrapping Benton County.
        </p>
      )}

      {isPending && (
        <div className="space-y-2 py-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-tf-elevated/50 animate-pulse" />
          ))}
        </div>
      )}

      {report && !isPending && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">Overall:</span>
            {checkStatusBadge(report.overall)}
            {report.countyName && (
              <span className="text-xs text-muted-foreground">
                · {report.countyName}
                {report.countyId && (
                  <span className="opacity-50"> ({report.countyId.slice(0, 8)}…)</span>
                )}
              </span>
            )}
          </div>
          {report.checks.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// Section 2: Bootstrap Executor
// ────────────────────────────────────────────────────────────

function ExecutorSection({
  preflight,
  result,
  isPending,
  onExecute,
}: {
  preflight: BentonBootstrapReport | null;
  result: BentonBootstrapExecutionResult | null;
  isPending: boolean;
  onExecute: () => void;
}) {
  const isBlocked =
    preflight?.checks.find((c) => c.id === "county")?.status === "blocked";
  const canExecute = !!preflight && !isBlocked && !isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="material-bento rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-tf-cyan" />
          <h3 className="text-sm font-semibold text-foreground">Bootstrap Executor</h3>
          {result && (
            <span className="text-xs text-muted-foreground">
              · {new Date(result.executedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={onExecute}
          disabled={!canExecute}
          className="gap-2 text-xs h-8 bg-tf-cyan/20 text-tf-cyan border border-tf-cyan/30 hover:bg-tf-cyan/30"
          variant="outline"
        >
          {isPending ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {isPending ? "Initializing…" : "Initialize Benton Bootstrap"}
        </Button>
      </div>

      {!preflight && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Run preflight first to unlock the bootstrap executor.
        </p>
      )}

      {preflight && isBlocked && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
          <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">
            Benton County tenant does not exist. Create it from onboarding before running the bootstrap executor.
          </p>
        </div>
      )}

      {isPending && (
        <div className="space-y-2 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-tf-elevated/50 animate-pulse" />
          ))}
        </div>
      )}

      {result && !isPending && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={
                result.status === "completed"
                  ? "bg-chart-2/10 text-chart-2 border-chart-2/30"
                  : result.status === "partial"
                  ? "bg-chart-5/10 text-chart-5 border-chart-5/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }
            >
              {result.status}
            </Badge>
            {result.countyName && (
              <span className="text-xs text-muted-foreground">{result.countyName}</span>
            )}
            {result.countyChanged && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                county switched
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            {result.steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-tf-elevated/30 border border-border/30"
              >
                <div className="mt-0.5">
                  {step.status === "completed" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-chart-2" />
                  ) : step.status === "failed" ? (
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{step.title}</span>
                    {stepStatusBadge(step.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {result.nextActions.length > 0 && (
            <div className="rounded-lg bg-chart-5/10 border border-chart-5/30 p-3 space-y-1">
              <p className="text-xs font-medium text-chart-5">Next steps:</p>
              <ul className="space-y-0.5">
                {result.nextActions.map((action, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-chart-5 mt-0.5">›</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// Section 3: Quality Gate (Phase 83.8)
// ────────────────────────────────────────────────────────────

function QualityGateSection({
  report,
  isPending,
  onRun,
}: {
  report: BentonQualityReport | null;
  isPending: boolean;
  onRun: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`material-bento rounded-2xl p-6 border ${
        report
          ? report.overallStatus === "pass"
            ? "border-chart-2/30"
            : report.overallStatus === "warn"
            ? "border-chart-5/30"
            : report.overallStatus === "fail"
            ? "border-destructive/30"
            : "border-border/30"
          : "border-border/30"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-foreground">Quality Gate</h3>
          <span className="text-xs text-muted-foreground">(Phase 83.8)</span>
          {report && (
            <span className="text-xs text-muted-foreground">
              · {new Date(report.executedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRun}
          disabled={isPending}
          className="gap-2 text-xs h-8 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        >
          {isPending ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {isPending ? "Running…" : "Run Quality Gate"}
        </Button>
      </div>

      {!report && !isPending && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Run the quality gate after seeding to audit coordinate coverage, GIS join rate, and data source completeness.
        </p>
      )}

      {isPending && (
        <div className="space-y-2 py-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-tf-elevated/50 animate-pulse" />
          ))}
        </div>
      )}

      {report && !isPending && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {qualityStatusBadge(report.overallStatus)}
            <span className="text-xs text-chart-2">{report.passCount} pass</span>
            {report.warnCount > 0 && (
              <span className="text-xs text-chart-5">{report.warnCount} warn</span>
            )}
            {report.failCount > 0 && (
              <span className="text-xs text-destructive">{report.failCount} fail</span>
            )}
            {report.seedComplete && (
              <Badge className="text-xs bg-chart-2/20 text-chart-2 border-chart-2/30 border">
                seed-complete ✓
              </Badge>
            )}
          </div>
          {report.metrics.map((metric) => (
            <QualityMetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// Section 4: Seed CLI Reference
// ────────────────────────────────────────────────────────────

const CLI_COMMANDS = [
  {
    label: "Full seed (PACS + GIS)",
    cmd: `.\\scripts\\seed_benton.ps1`,
  },
  {
    label: "Dry-run (validate paths only)",
    cmd: `.\\scripts\\seed_benton.ps1 -DryRun`,
  },
  {
    label: "PACS only (skip GIS)",
    cmd: `.\\scripts\\seed_benton.ps1 -PacsOnly`,
  },
  {
    label: "PACS only, skip GDB centroids",
    cmd: `.\\scripts\\seed_benton.ps1 -PacsOnly -SkipGdb`,
  },
  {
    label: "Force re-seed sales",
    cmd: `.\\scripts\\seed_benton.ps1 -PacsOnly --force-sales`,
  },
  {
    label: "GIS only",
    cmd: `.\\scripts\\seed_benton.ps1 -SkipGis:$false -PacsOnly:$false`,
  },
] as const;

function SeedCLISection() {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="material-bento rounded-2xl overflow-hidden"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-tf-elevated/30 transition-colors">
            <Terminal className="w-4 h-4 text-tf-gold" />
            <span className="text-sm font-semibold text-foreground flex-1">Seed CLI Reference</span>
            <span className="text-xs text-muted-foreground mr-2">
              scripts/seed_benton.ps1
            </span>
            {open ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-5 space-y-4 border-t border-border/30">
            <div className="mt-4 rounded-lg bg-tf-elevated/50 border border-border/30 p-4 space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium mb-2">
                Prerequisites — set in <code className="text-tf-cyan">scripts/.env.seed</code>:
              </p>
              <pre className="text-xs text-muted-foreground font-mono">
{`SUPABASE_URL=https://jzuculrmjuwrshramgye.supabase.co
SUPABASE_SERVICE_KEY=<service role key — never commit>
PACS_CSV_DIR=E:\\Exports\\Exports\\dataextract
BENTON_GDB_PATH=E:\\Benton_County_Assessor.gdb`}
              </pre>
            </div>

            <div className="space-y-2">
              {CLI_COMMANDS.map(({ label, cmd }) => (
                <div key={cmd} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <pre className="text-xs text-tf-cyan font-mono bg-tf-elevated/50 rounded px-3 py-2 border border-border/30 overflow-x-auto">
                    {cmd}
                  </pre>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-chart-5/10 border border-chart-5/30 p-3 space-y-1">
              <p className="text-xs font-medium text-chart-5">Note</p>
              <p className="text-xs text-muted-foreground">
                The seed scripts require the Supabase service-role key and direct file access to the
                PACS CSV exports and Benton County GDB. They must be run locally — not from the browser.
                After seeding, run the Quality Gate above to assert seed-complete status.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// Section 5: Reset / Wipe
// ────────────────────────────────────────────────────────────

const RESET_CONFIRM_TOKEN = "RESET BENTON";

function ResetSection({
  result,
  isPending,
  onWipe,
}: {
  result: WipeResult | null;
  isPending: boolean;
  onWipe: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const isConfirmed = confirmText === RESET_CONFIRM_TOKEN;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="material-bento rounded-2xl border border-destructive/20 overflow-hidden"
    >
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          <h3 className="text-sm font-semibold text-foreground">Wipe Benton Data</h3>
          <span className="text-xs text-muted-foreground">(Phase 83.8 Reset)</span>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              className="gap-2 text-xs h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              {isPending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              {isPending ? "Wiping…" : "Wipe Benton Data"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                Wipe All Benton County Data
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <span className="block">
                  This will permanently delete all parcels, assessments, and sales records
                  scoped to Benton County (FIPS 53005). GIS layers and the county tenant row
                  are preserved.
                </span>
                <span className="block font-medium text-foreground">
                  Type <span className="font-mono text-destructive">{RESET_CONFIRM_TOKEN}</span> to confirm:
                </span>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={RESET_CONFIRM_TOKEN}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!isConfirmed}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
                onClick={() => {
                  setConfirmText("");
                  onWipe();
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Wipe & Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="px-6 pb-4 border-t border-destructive/10 pt-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Wipes all county-scoped rows for Benton County. The county tenant and GIS source
          registrations are preserved so the full seed can be re-run immediately after.
        </p>

        {result && !isPending && (
          <div className="flex items-center gap-4 mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="text-center">
              <p className="text-base font-semibold text-foreground tabular-nums">
                {result.parcelsDeleted.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">parcels</p>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground tabular-nums">
                {result.assessmentsDeleted.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">assessments</p>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground tabular-nums">
                {result.salesDeleted.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">sales</p>
            </div>
            <div className="ml-auto">
              <Badge
                variant="outline"
                className="text-xs bg-chart-2/10 text-chart-2 border-chart-2/30"
              >
                wiped ✓
              </Badge>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// Root panel
// ────────────────────────────────────────────────────────────

export function BentonBootstrapPanel() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  const preflightMutation = useRunBentonBootstrapPreflight();
  const executeMutation = useExecuteBentonBootstrap();
  const qualityMutation = useRunBentonQualityGate();
  const wipeMutation = useWipeBentonData();

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="material-bento rounded-2xl p-8 flex flex-col items-center gap-3">
        <Shield className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Map className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Benton County Bootstrap</h3>
          <p className="text-xs text-muted-foreground">
            Benton County, WA · FIPS 53005 · Phase 83 full-stack initialization
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">4-stage pipeline</span>
        </div>
      </motion.div>

      {/* Preflight */}
      <PreflightSection
        report={preflightMutation.data ?? null}
        isPending={preflightMutation.isPending}
        onRun={() => preflightMutation.mutate()}
      />

      {/* Executor */}
      <ExecutorSection
        preflight={preflightMutation.data ?? null}
        result={executeMutation.data ?? null}
        isPending={executeMutation.isPending}
        onExecute={() => executeMutation.mutate()}
      />

      {/* Quality Gate */}
      <QualityGateSection
        report={qualityMutation.data ?? null}
        isPending={qualityMutation.isPending}
        onRun={() => qualityMutation.mutate()}
      />

      {/* CLI Reference */}
      <SeedCLISection />

      {/* Reset */}
      <ResetSection
        result={wipeMutation.data ?? null}
        isPending={wipeMutation.isPending}
        onWipe={() => wipeMutation.mutate()}
      />
    </div>
  );
}

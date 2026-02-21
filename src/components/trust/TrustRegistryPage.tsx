// TerraFusion OS — Trust Registry MVP (Constitutional)
// Tabs: Changes • Runs • Models • Data Catalog • Health
// All data access via hooks — no supabase.from() in this component.

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, BookOpen, History, Search, FlaskConical, Cpu, Filter, X, ShieldCheck, CheckCircle2, AlertCircle, Zap, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScopeHeader } from "./ScopeHeader";
import { ProvenanceNumber } from "./ProvenanceNumber";
import { TrustOSHealthPanel } from "./TrustOSHealthPanel";
import { METRIC_CATALOG, TARGET, getAllMetricKeys } from "@/lib/metrics/metricCatalog";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { useTrustEvents } from "@/hooks/useTrustEvents";
import { DataLearningPanel } from "./DataLearningPanel";
import { useTrustRuns, useTrustModels } from "@/hooks/useTrustModels";

interface TrustRegistryPageProps {
  onNavigate?: (target: string) => void;
}

// ── Canonical IA targets for target validation ────────────────────
const VALID_TARGETS = new Set(Object.values(TARGET));

function isValidTarget(t: string) {
  return VALID_TARGETS.has(t as typeof TARGET[keyof typeof TARGET]) || t.startsWith("workbench") || t.startsWith("factory") || t.startsWith("home") || t.startsWith("registry");
}

type TabId = "changes" | "runs" | "models" | "catalog" | "learning" | "health";

type TimeRange = "1h" | "24h" | "7d" | "30d" | "all";

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: "1h", label: "1 hour" },
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

function getTimeRangeCutoff(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  switch (range) {
    case "1h": return new Date(now.getTime() - 60 * 60 * 1000);
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export function TrustRegistryPage({ onNavigate }: TrustRegistryPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("changes");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [moduleFilter, setModuleFilter] = useState("");
  const { data: vitals } = useCountyVitals();
  const { data: recentEvents, isLoading: eventsLoading } = useTrustEvents();
  const { data: runs, isLoading: runsLoading } = useTrustRuns();
  const { data: models, isLoading: modelsLoading } = useTrustModels();

  const cutoff = getTimeRangeCutoff(timeRange);

  // Filter changes
  const filteredEvents = useMemo(() => {
    if (!recentEvents) return [];
    return recentEvents.filter(evt => {
      if (cutoff && new Date(evt.created_at) < cutoff) return false;
      if (moduleFilter && evt.source_module !== moduleFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return evt.event_type.toLowerCase().includes(term) ||
          evt.source_module.toLowerCase().includes(term) ||
          (evt.artifact_type || "").toLowerCase().includes(term);
      }
      return true;
    });
  }, [recentEvents, cutoff, moduleFilter, searchTerm]);

  // Filter runs
  const filteredRuns = useMemo(() => {
    if (!runs) return [];
    return runs.filter(run => {
      if (cutoff && new Date(run.created_at) < cutoff) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return run.neighborhood_code.toLowerCase().includes(term) ||
          run.model_type.toLowerCase().includes(term) ||
          run.status.toLowerCase().includes(term);
      }
      return true;
    });
  }, [runs, cutoff, searchTerm]);

  // Filter models
  const filteredModels = useMemo(() => {
    if (!models) return [];
    return models.filter(m => {
      if (cutoff && new Date(m.created_at) < cutoff) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return m.model_type.toLowerCase().includes(term) ||
          m.model_version.toLowerCase().includes(term);
      }
      return true;
    });
  }, [models, cutoff, searchTerm]);

  const allMetricKeys = getAllMetricKeys();
  const filteredCatalog = allMetricKeys
    .map(key => ({ key, entry: METRIC_CATALOG[key] }))
    .filter(({ key, entry }) => {
      const term = searchTerm.toLowerCase();
      return !term || key.toLowerCase().includes(term) || entry.label.toLowerCase().includes(term) || entry.whatItMeans.toLowerCase().includes(term);
    });
  const catalogCoverage = { total: allMetricKeys.length, withConfidence: allMetricKeys.filter(k => !!METRIC_CATALOG[k].confidence).length, withUsedIn: allMetricKeys.filter(k => !!(METRIC_CATALOG[k].usedIn?.length)).length };

  // Unique modules for filter
  const uniqueModules = useMemo(() => {
    if (!recentEvents) return [];
    return [...new Set(recentEvents.map(e => e.source_module))].sort();
  }, [recentEvents]);

  const tabs: { id: TabId; label: string; icon: typeof History; count?: number }[] = [
    { id: "changes", label: "Changes", icon: History, count: filteredEvents.length },
    { id: "runs", label: "Runs", icon: FlaskConical, count: filteredRuns.length },
    { id: "models", label: "Models", icon: Cpu, count: filteredModels.length },
    { id: "catalog", label: "Data Catalog", icon: BookOpen },
    { id: "learning", label: "Data Learning", icon: Brain },
    { id: "health", label: "Trust OS Health", icon: ShieldCheck },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--tf-transcend-cyan)/0.12)]">
              <Shield className="w-5 h-5 text-[hsl(var(--tf-transcend-cyan))]" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-foreground">Trust Registry</h1>
              <p className="text-sm text-muted-foreground">Verify what happened, when, and why</p>
            </div>
          </div>
          <ScopeHeader scope="county" label="Benton" source="trust-registry" fetchedAt={vitals?.fetchedAt} status="published" />
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
              activeTab === t.id
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== undefined && (
              <span className="text-[10px] text-muted-foreground ml-1">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filter Bar (for Changes / Runs / Models) ── */}
      {activeTab !== "catalog" && activeTab !== "learning" && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter by keyword…"
              className="w-full h-8 pl-9 pr-3 rounded-lg bg-muted/30 border border-border/50 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Time range pills */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-muted-foreground mr-1" />
            {TIME_RANGES.map(tr => (
              <button
                key={tr.id}
                onClick={() => setTimeRange(tr.id)}
                className={`px-2.5 py-1 rounded-md text-[10px] transition-all ${
                  timeRange === tr.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>

          {/* Module filter (Changes only) */}
          {activeTab === "changes" && uniqueModules.length > 0 && (
            <div className="flex items-center gap-1">
              {moduleFilter && (
                <button
                  onClick={() => setModuleFilter("")}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px]"
                >
                  {moduleFilter} <X className="w-2.5 h-2.5" />
                </button>
              )}
              {!moduleFilter && uniqueModules.slice(0, 5).map(mod => (
                <button
                  key={mod}
                  onClick={() => setModuleFilter(mod)}
                  className="px-2 py-1 rounded-md bg-muted/40 text-muted-foreground text-[10px] hover:text-foreground transition-colors"
                >
                  {mod}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Changes Tab ── */}
      {activeTab === "changes" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {filteredEvents.length} trace events matching filters.
          </p>
          {eventsLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading audit trail…</div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Suite</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Event</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Artifact</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(evt => (
                    <tr key={evt.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(evt.created_at).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[9px] py-0">{evt.source_module}</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">{evt.event_type.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{evt.artifact_type || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-48 truncate">
                        {evt.event_data ? JSON.stringify(evt.event_data).slice(0, 80) : "—"}
                      </td>
                    </tr>
                  ))}
                  {filteredEvents.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No events match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Runs Tab ── */}
      {activeTab === "runs" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {filteredRuns.length} calibration runs matching filters.
          </p>
          {runsLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading runs…</div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Neighborhood</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Model</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">R²</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">RMSE</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">n</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Variables</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map(run => (
                    <tr key={run.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(run.created_at).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">{run.neighborhood_code}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[9px] py-0">{run.model_type}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`text-[9px] py-0 ${
                            run.status === "published"
                              ? "bg-[hsl(var(--tf-optimized-green)/0.15)] text-[hsl(var(--tf-optimized-green))] border-[hsl(var(--tf-optimized-green)/0.3)]"
                              : run.status === "candidate"
                              ? "bg-[hsl(var(--tf-sacred-gold)/0.15)] text-[hsl(var(--tf-sacred-gold))] border-[hsl(var(--tf-sacred-gold)/0.3)]"
                              : ""
                          }`}
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-foreground">
                        {run.r_squared != null ? run.r_squared.toFixed(4) : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {run.rmse != null ? run.rmse.toFixed(0) : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{run.sample_size ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground text-[10px] max-w-32 truncate">
                        {run.variables.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                  {filteredRuns.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No runs match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Models Tab ── */}
      {activeTab === "models" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {filteredModels.length} model receipts matching filters.
          </p>
          {modelsLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading models…</div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Version</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Parcel</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Inputs</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Outputs</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map(m => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[9px] py-0">{m.model_type}</Badge>
                      </td>
                      <td className="px-3 py-2 font-mono font-medium text-foreground">{m.model_version}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-[10px] truncate max-w-24">
                        {m.parcel_id ? m.parcel_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-32 truncate text-[10px]">
                        {JSON.stringify(m.inputs).slice(0, 60)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-32 truncate text-[10px]">
                        {JSON.stringify(m.outputs).slice(0, 60)}
                      </td>
                    </tr>
                  ))}
                  {filteredModels.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No models match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}



      {/* ── Data Catalog QA Tab ── */}
      {activeTab === "catalog" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Coverage summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Catalog entries", value: catalogCoverage.total, icon: BookOpen, ok: true },
              { label: "With confidence", value: catalogCoverage.withConfidence, icon: CheckCircle2, ok: catalogCoverage.withConfidence === catalogCoverage.total },
              { label: "With component map", value: catalogCoverage.withUsedIn, icon: Zap, ok: catalogCoverage.withUsedIn === catalogCoverage.total },
            ].map(stat => (
              <div key={stat.label} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${stat.ok ? "border-border/40 bg-muted/20" : "border-[hsl(var(--tf-sacred-gold)/0.3)] bg-[hsl(var(--tf-sacred-gold)/0.05)]"}`}>
                <stat.icon className={`w-4 h-4 shrink-0 ${stat.ok ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-sacred-gold))]"}`} />
                <div>
                  <p className="text-lg font-semibold text-foreground leading-none">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search metric keys, labels, or definitions…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/30 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              <ProvenanceNumber source="metric-catalog" fetchedAt={vitals?.fetchedAt}>
                {filteredCatalog.length} of {catalogCoverage.total} entries
              </ProvenanceNumber>
            </span>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Metric Key</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Label</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Source</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Confidence</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Used In</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Targets OK</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map(({ key, entry }) => {
                  const allTargets = [
                    ...entry.ifItLooksWrong.map(a => a.target),
                    ...(entry.proofLinks?.map(p => p.target) ?? []),
                  ];
                  const badTargets = allTargets.filter(t => !isValidTarget(t));
                  return (
                    <tr key={key} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono font-medium text-foreground whitespace-nowrap">{key}</td>
                      <td className="px-3 py-2 text-muted-foreground">{entry.label}</td>
                      <td className="px-3 py-2 text-muted-foreground text-[10px] max-w-32 truncate">{entry.whereItCameFrom.slice(0, 60)}</td>
                      <td className="px-3 py-2">
                        {entry.confidence ? (
                          <span title={entry.confidence}><CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--tf-optimized-green))]" /></span>
                        ) : (
                          <span title="No confidence statement"><AlertCircle className="w-3.5 h-3.5 text-[hsl(var(--tf-sacred-gold))]" /></span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {entry.usedIn?.length ? (
                          <div className="flex flex-wrap gap-0.5">
                            {entry.usedIn.map(c => (
                              <Badge key={c} variant="outline" className="text-[9px] py-0">{c}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {badTargets.length === 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--tf-optimized-green))]" />
                        ) : (
                          <span className="text-[10px] text-[hsl(var(--tf-alert-red))]" title={`Bad targets: ${badTargets.join(", ")}`}>
                            {badTargets.length} bad
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── Data Learning Tab ── */}
      {activeTab === "learning" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DataLearningPanel />
        </motion.div>
      )}

      {/* ── Trust OS Health Tab ── */}
      {activeTab === "health" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <TrustOSHealthPanel />
        </motion.div>
      )}
    </div>
  );
}

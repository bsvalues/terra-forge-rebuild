// TerraFusion OS — Trust Registry MVP (Constitutional)
// Tabs: Changes • Runs • Models • Data Catalog • Health
// All data access via hooks — no supabase.from() in this component.

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, BookOpen, History, Search, FlaskConical, Cpu, Filter, X, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScopeHeader } from "./ScopeHeader";
import { ProvenanceNumber } from "./ProvenanceNumber";
import { TrustOSHealthPanel } from "./TrustOSHealthPanel";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { useTrustEvents } from "@/hooks/useTrustEvents";
import { useTrustRuns, useTrustModels } from "@/hooks/useTrustModels";

interface TrustRegistryPageProps {
  onNavigate?: (target: string) => void;
}

// ── Data Catalog ─────────────────────────────────────────────────
const DATA_CATALOG = [
  { field: "parcels.total", definition: "count(*) from parcels table", source: "get_county_vitals() RPC", updateTrigger: "Any parcel insert/delete" },
  { field: "parcels.withCoords", definition: "Parcels where latitude IS NOT NULL", source: "get_county_vitals() RPC", updateTrigger: "Parcel geocoding / import" },
  { field: "parcels.withClass", definition: "Parcels where property_class IS NOT NULL", source: "get_county_vitals() RPC", updateTrigger: "Parcel classification / import" },
  { field: "parcels.withNeighborhood", definition: "Parcels where neighborhood_code IS NOT NULL", source: "get_county_vitals() RPC", updateTrigger: "Neighborhood assignment" },
  { field: "sales.total", definition: "count(*) from sales table", source: "get_county_vitals() RPC", updateTrigger: "Sale record insert" },
  { field: "assessments.total", definition: "count(*) from assessments table (all years)", source: "get_county_vitals() RPC", updateTrigger: "Assessment upsert" },
  { field: "assessments.certified", definition: "Assessments where certified = true", source: "get_county_vitals() RPC", updateTrigger: "Certification action" },
  { field: "assessments.certRate", definition: "certified / total × 100 (client-derived in useCountyVitals only)", source: "useCountyVitals hook", updateTrigger: "Derived from certified + total" },
  { field: "workflows.pendingAppeals", definition: "Appeals where status IN ('filed','pending','scheduled')", source: "get_county_vitals() RPC", updateTrigger: "Appeal status change" },
  { field: "workflows.openPermits", definition: "Permits where status IN ('applied','pending','issued')", source: "get_county_vitals() RPC", updateTrigger: "Permit status change" },
  { field: "workflows.pendingExemptions", definition: "Exemptions where status = 'pending'", source: "get_county_vitals() RPC", updateTrigger: "Exemption decision" },
  { field: "quality.coords", definition: "Round(withCoords / total × 100) — computed only in useCountyVitals", source: "useCountyVitals hook", updateTrigger: "Derived from parcel counts" },
  { field: "quality.propertyClass", definition: "Round(withClass / total × 100) — computed only in useCountyVitals", source: "useCountyVitals hook", updateTrigger: "Derived from parcel counts" },
  { field: "quality.neighborhood", definition: "Round(withNeighborhood / total × 100) — computed only in useCountyVitals", source: "useCountyVitals hook", updateTrigger: "Derived from parcel counts" },
  { field: "quality.overall", definition: "Average of coords%, class%, neighborhood% — computed only in useCountyVitals", source: "useCountyVitals hook", updateTrigger: "Derived from quality fields" },
  { field: "calibration.runCount", definition: "count(*) from calibration_runs", source: "get_county_vitals() RPC", updateTrigger: "Calibration save" },
  { field: "calibration.avgRSquared", definition: "Mean R² across most-recent run per neighborhood — computed only in useCountyVitals", source: "useCountyVitals hook", updateTrigger: "Derived from calibration detail" },
];

type TabId = "changes" | "runs" | "models" | "catalog" | "health";

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

  const filteredCatalog = DATA_CATALOG.filter(
    d => d.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
         d.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {activeTab !== "catalog" && (
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

      {/* ── Data Catalog Tab ── */}
      {activeTab === "catalog" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filter definitions…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/30 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              <ProvenanceNumber source="county-vitals" fetchedAt={vitals?.fetchedAt}>
                {filteredCatalog.length} definitions
              </ProvenanceNumber>
            </span>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Definition</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Source</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Triggers Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map(d => (
                  <tr key={d.field} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-mono font-medium text-foreground whitespace-nowrap">{d.field}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.definition}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[9px] py-0">{d.source}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{d.updateTrigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

// TerraFusion OS — Trust Registry MVP (Constitutional)
// Tabs: Changes • Runs • Models • Data Catalog
// All data access via hooks — no supabase.from() in this component.

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, BookOpen, History, Search, FlaskConical, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScopeHeader } from "./ScopeHeader";
import { ProvenanceNumber } from "./ProvenanceNumber";
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

type TabId = "changes" | "runs" | "models" | "catalog";

export function TrustRegistryPage({ onNavigate }: TrustRegistryPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("changes");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: vitals } = useCountyVitals();
  const { data: recentEvents, isLoading: eventsLoading } = useTrustEvents();
  const { data: runs, isLoading: runsLoading } = useTrustRuns();
  const { data: models, isLoading: modelsLoading } = useTrustModels();

  const filteredCatalog = DATA_CATALOG.filter(
    d => d.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
         d.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs: { id: TabId; label: string; icon: typeof History }[] = [
    { id: "changes", label: "Changes", icon: History },
    { id: "runs", label: "Runs", icon: FlaskConical },
    { id: "models", label: "Models", icon: Cpu },
    { id: "catalog", label: "Data Catalog", icon: BookOpen },
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
          </button>
        ))}
      </div>

      {/* ── Changes Tab ── */}
      {activeTab === "changes" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Showing the 50 most recent trace events across all suites.
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
                  {(recentEvents || []).map(evt => (
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
            Recent calibration runs across all neighborhoods.
          </p>
          {runsLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading runs…</div>
          ) : !runs?.length ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No calibration runs recorded yet.</div>
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
                  {runs.map(run => (
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
            Model receipts — versioned snapshots of every model execution.
          </p>
          {modelsLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading models…</div>
          ) : !models?.length ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No model receipts recorded yet.</div>
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
                  {models.map(m => (
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
    </div>
  );
}

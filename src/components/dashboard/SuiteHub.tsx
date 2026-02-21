import { motion, AnimatePresence } from "framer-motion";
import { useParcelSearch } from "@/hooks/useParcelSearch";
import {
  Search,
  ArrowRight,
  Activity,
  Shield,
  Clock,
  Database,
  Globe,
  Building2,
  Upload,
  Hammer,
  FolderOpen,
  Sparkles,
  Map,
  BarChart3,
  FileText,
  CheckCircle2,
  MapPin,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TerraTraceActivityFeed } from "@/components/proof/TerraTraceActivityFeed";
import { AuditTimelineSparkline } from "./AuditTimelineSparkline";
import { SmartQuickActions } from "./SmartQuickActions";
import { LearningMilestones } from "./LearningMilestones";
import { DataPipelineLedger } from "./DataPipelineLedger";
import { CountyTimeline } from "./CountyTimeline";
import { useState, useRef, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { ProvenanceBadge, ProvenanceNumber, ScopeHeader } from "@/components/trust";
import { DataStatusRibbon } from "./DataStatusRibbon";
import { NextBestAction } from "./NextBestAction";
import { ExplainThisPanel } from "./ExplainThisPanel";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";

interface SuiteHubProps {
  onNavigate: (target: string) => void;
  onParcelNavigate?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

// ─── Suite Registry ───────────────────────────────────────────

type SuiteStatus = "native" | "legacy";

interface SuiteEntry {
  id: string;
  name: string;
  mission: string;
  icon: React.ElementType;
  status: SuiteStatus;
  target: string;
  accentVar: string;
}

const SUITE_REGISTRY: SuiteEntry[] = [
  // Workbench suite tabs — open the workbench with the correct tab active
  { id: "forge", name: "TerraForge", mission: "Build value — models, calibration, comps", icon: Hammer, status: "native", target: "workbench:forge", accentVar: "--suite-forge" },
  { id: "atlas", name: "TerraAtlas", mission: "See the county — maps, layers, spatial tools", icon: Map, status: "native", target: "workbench:atlas", accentVar: "--suite-atlas" },
  { id: "dais", name: "TerraDais", mission: "Operate value — permits, exemptions, appeals", icon: Building2, status: "native", target: "workbench:dais", accentVar: "--suite-dais" },
  { id: "dossier", name: "TerraDossier", mission: "Prove decisions — evidence, narratives, packets", icon: FolderOpen, status: "native", target: "workbench:dossier", accentVar: "--suite-dossier" },
  { id: "pilot", name: "TerraPilot", mission: "AI copilot — guidance, drafting, synthesis", icon: Sparkles, status: "native", target: "workbench:pilot", accentVar: "--tf-transcend-cyan" },
  // Module-level views — use new module:view format
  { id: "field", name: "Field Studio", mission: "Truth capture — inspections, condition, evidence", icon: Compass, status: "native", target: "workbench:field", accentVar: "--tf-transcend-cyan" },
  { id: "factory", name: "Factory", mission: "Mass appraisal — regression, cost, comp review", icon: Globe, status: "native", target: "factory:calibration", accentVar: "--suite-forge" },
  { id: "vei", name: "Ratio Studies", mission: "Equity analysis — IAAO ratio studies, COD, PRD", icon: BarChart3, status: "native", target: "factory:vei", accentVar: "--suite-forge" },
  { id: "geoequity", name: "Spatial Analysis", mission: "Spatial equity — heatmaps, neighborhood analysis", icon: Globe, status: "native", target: "factory:geoequity", accentVar: "--suite-atlas" },
  { id: "ids", name: "Data Ingestion", mission: "Intelligent Data Suite — ingest, quality, routing", icon: Database, status: "native", target: "home:ids", accentVar: "--tf-transcend-cyan" },
  { id: "quality", name: "Data Quality", mission: "Scoring, stale detection, neighborhood heatmap", icon: Shield, status: "native", target: "home:quality", accentVar: "--tf-transcend-cyan" },
  { id: "readiness", name: "Roll Readiness", mission: "Pre-certification checklist, go/no-go verdict", icon: CheckCircle2, status: "native", target: "home:readiness", accentVar: "--tf-optimized-green" },
  { id: "registry", name: "Audit Registry", mission: "Truth ledger — changes, catalog, runs, models", icon: FileText, status: "native", target: "registry:trust", accentVar: "--tf-transcend-cyan" },
];

// ─── Component ────────────────────────────────────────────────

export function SuiteHub({ onNavigate, onParcelNavigate }: SuiteHubProps) {
  const { data: vitals, isLoading: vitalsLoading } = useCountyVitals();
  const { data: pipeline } = usePipelineStatus();
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const debouncedSearch = useDebounce(searchValue, 250);
  const searchRef = useRef<HTMLDivElement>(null);

  // Live parcel search — constitutional: data access via hook
  const { data: searchResults } = useParcelSearch(debouncedSearch);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectParcel = (p: any) => {
    setSearchValue("");
    setSearchFocused(false);
    if (onParcelNavigate) {
      onParcelNavigate({
        id: p.id,
        parcelNumber: p.parcel_number,
        address: p.address,
        assessedValue: p.assessed_value,
      });
    } else {
      onNavigate("workbench");
    }
  };

  const parcelsTotal = vitals?.parcels.total ?? 0;
  const salesTotal = vitals?.sales.total ?? 0;
  const assessmentsTotal = vitals?.assessments.total ?? 0;
  const qualityOverall = vitals?.quality.overall ?? 0;
  const totalWorkflows = vitals?.workflows.total ?? 0;

  const showDropdown = searchFocused && searchValue.trim().length >= 2 && searchResults && searchResults.length > 0;

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-6 sm:space-y-8 max-w-5xl mx-auto">

      {/* ── Data Status Ribbon ── */}
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <DataStatusRibbon vitals={vitals} pipeline={pipeline} vitalsLoading={vitalsLoading} />
        <NextBestAction vitals={vitals} pipeline={pipeline} vitalsLoading={vitalsLoading} onNavigate={onNavigate} />
      </motion.section>

      {/* ── Hero: Workbench Entry ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
              TerraFusion <span className="text-gradient-sovereign font-medium">OS</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Valuation Operating Environment
            </p>
          </div>
          <ScopeHeader
            scope="county"
            label="Benton"
            source="county-vitals"
            fetchedAt={vitals?.fetchedAt}
            status="published"
          />
        </div>

        {/* Workbench Hero Card */}
        <div className="w-full text-left material-bento p-6">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate("workbench")} className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(var(--tf-transcend-cyan))] to-[hsl(var(--tf-bright-cyan))] flex items-center justify-center shadow-[0_4px_16px_hsl(var(--tf-transcend-cyan)/0.3)]">
                <Search className="w-6 h-6 text-[hsl(var(--tf-substrate))]" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground">Property Workbench</h2>
                <p className="text-sm text-muted-foreground">One parcel, one screen, every role</p>
              </div>
            </button>
            <button onClick={() => onNavigate("workbench")} className="group">
              <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Live Search Bar */}
          <div ref={searchRef} className="relative mt-4 pt-4 border-t border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search by PIN or address..."
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-[hsl(var(--tf-elevated))] border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(var(--tf-transcend-cyan)/0.5)] focus:border-[hsl(var(--tf-transcend-cyan)/0.3)] transition-all"
              />
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-50 w-full mt-1 rounded-lg bg-card border border-border shadow-xl overflow-hidden"
                >
                  {searchResults!.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectParcel(p)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border/30 last:border-b-0"
                    >
                      <MapPin className="w-4 h-4 text-tf-cyan shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{p.address}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-mono">{p.parcel_number}</span>
                          {p.city && <span>• {p.city}</span>}
                          {p.neighborhood_code && <span>• {p.neighborhood_code}</span>}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-tf-cyan shrink-0">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(p.assessed_value)}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Inline vitals — single source */}
          <div className="flex items-center gap-3 sm:gap-6 mt-4 flex-wrap">
            <Vital label="Parcels" value={parcelsTotal.toLocaleString()} metricKey="parcels.total" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate} />
            <Vital label="Sales" value={salesTotal.toLocaleString()} metricKey="sales.total" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate} />
            <Vital label="Assessments" value={assessmentsTotal.toLocaleString()} metricKey="assessments.total" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate} />
            <Vital label="Data Quality" value={`${qualityOverall}%`} metricKey="quality.overall" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate} />
            {totalWorkflows > 0 && (
              <Vital label="Pending" value={totalWorkflows.toString()} highlight metricKey="workflows.pendingAppeals" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate} />
            )}
            <ProvenanceBadge source="county-vitals" fetchedAt={vitals?.fetchedAt} />
          </div>
        </div>
      </motion.section>

      {/* ── System Vitals ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Data Quality */}
        <button
          onClick={() => onNavigate("home:quality")}
          className="material-bento p-5 text-left group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--tf-transcend-cyan)/0.12)]">
              <Shield className="w-4 h-4 text-tf-cyan" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground">Data Quality</h3>
              <p className="text-xs text-muted-foreground">Parcel completeness</p>
            </div>
            <Badge variant="outline" className={qualityBadgeClass(qualityOverall)}>
              {qualityOverall}%
            </Badge>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="space-y-2">
            <QualityRow label="Coordinates" value={vitals?.quality.coords ?? 0} metricKey="quality.coords" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate} />
            <QualityRow label="Property Class" value={vitals?.quality.propertyClass ?? 0} metricKey="quality.propertyClass" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate} />
            <QualityRow label="Neighborhood" value={vitals?.quality.neighborhood ?? 0} metricKey="quality.neighborhood" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate} />
          </div>
        </button>

        {/* Pending Workflows */}
        <div className="material-bento p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[hsl(var(--suite-dais)/0.12)]">
              <Clock className="w-4 h-4 text-suite-dais" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Pending Workflows</h3>
              <p className="text-xs text-muted-foreground">Items requiring attention</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <WorkflowButton
              label="Appeals"
              count={vitals?.workflows.pendingAppeals ?? 0}
              colorClass="text-suite-dais"
              metricKey="workflows.pendingAppeals"
              onClick={() => onNavigate("workbench:dais:appeals")}
              fetchedAt={vitals?.fetchedAt}
              onNavigate={onNavigate}
            />
            <WorkflowButton
              label="Permits"
              count={vitals?.workflows.openPermits ?? 0}
              colorClass="text-tf-gold"
              metricKey="workflows.openPermits"
              onClick={() => onNavigate("workbench:dais:permits")}
              fetchedAt={vitals?.fetchedAt}
              onNavigate={onNavigate}
            />
            <WorkflowButton
              label="Exemptions"
              count={vitals?.workflows.pendingExemptions ?? 0}
              colorClass="text-tf-green"
              metricKey="workflows.pendingExemptions"
              onClick={() => onNavigate("workbench:dais:exemptions")}
              fetchedAt={vitals?.fetchedAt}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </motion.section>

      {/* ── Smart Quick Actions ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.35 }}
      >
        <SmartQuickActions onNavigate={onNavigate} />
      </motion.section>

      {/* ── Learning Milestones (Weekly Digest) ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.23, duration: 0.35 }}
      >
        <LearningMilestones />
      </motion.section>

      {/* ── Data Pipeline Ledger ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
      >
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
          <span>Data Pipeline</span>
        </h3>
        <DataPipelineLedger onNavigate={onNavigate} />
      </motion.section>

      {/* ── County Twin Timeline ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27, duration: 0.35 }}
      >
        <div className="material-bento p-5">
          <CountyTimeline onNavigate={onNavigate} maxHeight="400px" />
        </div>
      </motion.section>

      {/* ── Audit Timeline ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
      >
        <AuditTimelineSparkline />
      </motion.section>

      {/* ── Suite Registry ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.35 }}
      >
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
          Suite Registry
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUITE_REGISTRY.map((suite, i) => (
            <motion.button
              key={suite.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.04 }}
              onClick={() => onNavigate(suite.target)}
              className="material-bento p-4 text-left group flex items-start gap-3"
            >
              <div
                className="p-2 rounded-lg shrink-0"
                style={{ background: `hsl(var(${suite.accentVar}) / 0.12)` }}
              >
                <suite.icon
                  className="w-4 h-4"
                  style={{ color: `hsl(var(${suite.accentVar}))` }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{suite.name}</span>
                  <StatusBadge status={suite.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed truncate">
                  {suite.mission}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── Recent Ingest Activity ── */}
      {(vitals?.ingest.recentJobs.length ?? 0) > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" />
              Recent Ingests
            </h3>
            <button
              onClick={() => onNavigate("home:ids")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {vitals!.ingest.recentJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => onNavigate(`ids:versions:${job.id}`)}
                className="material-bento p-4 text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate flex-1">{job.file_name}</span>
                  <Badge variant="outline" className={
                    job.status === "complete"
                      ? "bg-[hsl(var(--tf-optimized-green)/0.1)] text-tf-green border-[hsl(var(--tf-optimized-green)/0.3)] text-[10px]"
                      : job.status === "failed"
                      ? "bg-destructive/10 text-destructive border-destructive/30 text-[10px]"
                      : "text-[10px]"
                  }>
                    {job.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {job.target_table} • {(job.rows_imported || job.row_count || 0).toLocaleString()} rows
                </p>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Activity Feed ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.35 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-3.5 h-3.5 text-tf-cyan" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            TerraTrace Activity
          </h3>
        </div>
        <div className="material-bento p-4">
          <TerraTraceActivityFeed limit={5} />
        </div>
      </motion.section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function Vital({ label, value, highlight, metricKey, fetchedAt, onNavigate }: {
  label: string;
  value: string;
  highlight?: boolean;
  metricKey?: string;
  fetchedAt?: string | null;
  onNavigate?: (t: string) => void;
}) {
  const inner = (
    <span className={`text-sm font-medium ${highlight ? "text-suite-dais" : "text-foreground"}`}>
      {value}
    </span>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {metricKey ? (
        <ExplainThisPanel metricKey={metricKey} fetchedAt={fetchedAt} onNavigate={onNavigate}>
          {inner}
        </ExplainThisPanel>
      ) : inner}
    </div>
  );
}

function QualityRow({ label, value, metricKey, fetchedAt, onNavigate }: {
  label: string;
  value: number;
  metricKey?: string;
  fetchedAt?: string | null;
  onNavigate?: (t: string) => void;
}) {
  const pct = <span className="text-xs font-mono w-10 text-right text-muted-foreground">{value}%</span>;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <Progress value={value} className="h-1.5 flex-1" />
      {metricKey ? (
        <ExplainThisPanel metricKey={metricKey} fetchedAt={fetchedAt} onNavigate={onNavigate}>
          {pct}
        </ExplainThisPanel>
      ) : pct}
    </div>
  );
}

function qualityBadgeClass(overall: number): string {
  if (overall >= 80) return "bg-[hsl(var(--tf-optimized-green)/0.1)] text-tf-green border-[hsl(var(--tf-optimized-green)/0.3)]";
  if (overall >= 50) return "bg-[hsl(var(--tf-sacred-gold)/0.1)] text-tf-gold border-[hsl(var(--tf-sacred-gold)/0.3)]";
  return "bg-[hsl(var(--destructive)/0.1)] text-destructive border-[hsl(var(--destructive)/0.3)]";
}

function StatusBadge({ status }: { status: SuiteStatus }) {
  const styles: Record<SuiteStatus, string> = {
    native: "bg-[hsl(var(--tf-optimized-green)/0.1)] text-tf-green border-[hsl(var(--tf-optimized-green)/0.3)]",
    legacy: "bg-[hsl(var(--tf-sacred-gold)/0.1)] text-tf-gold border-[hsl(var(--tf-sacred-gold)/0.3)]",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider border ${styles[status]}`}>
      {status}
    </span>
  );
}

function WorkflowButton({ label, count, colorClass, onClick, metricKey, fetchedAt, onNavigate }: {
  label: string;
  count: number;
  colorClass: string;
  onClick: () => void;
  metricKey?: string;
  fetchedAt?: string | null;
  onNavigate?: (t: string) => void;
}) {
  const num = <p className={`text-2xl font-light ${colorClass}`}>{count}</p>;
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-lg bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] transition-colors text-center"
    >
      {metricKey ? (
        <ExplainThisPanel metricKey={metricKey} fetchedAt={fetchedAt} onNavigate={onNavigate}>
          {num}
        </ExplainThisPanel>
      ) : num}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </button>
  );
}

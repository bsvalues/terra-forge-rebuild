// TerraFusion OS — Information Architecture Map (OS Kernel)
// This file is the SINGLE SOURCE OF TRUTH for all navigation, routing, scopes, and templates.
// Rule: A route is illegal unless declared here. No orphan tabs. No feature-slamming.

import {
  Home,
  Search,
  Factory,
  BookOpen,
  Database,
  Target,
  ShieldCheck,
  Shield,
  BarChart3,
  Map,
  Compass,
  TrendingUp,
  Brain,
  Hexagon,
  Radar,
  Layers,
  Mail,
  Download,
  GitCompareArrows,
  Clock,
  Filter,
  Zap,
  FileText,
  Scale,
  AlertTriangle,
  Settings,
  Eye,
  Activity,
  FolderTree,
  type LucideIcon,
} from "lucide-react";

// ── Scopes ────────────────────────────────────────────────────────
export type DataScope = "county" | "neighborhood" | "parcel" | "run";

// ── Templates ─────────────────────────────────────────────────────
export type PageTemplate = "county" | "parcel" | "factory" | "registry";

// ── Data Suites (the ONLY read-contracts components may consume) ─
export type DataSuite =
  | "CountyVitals"
  | "Parcel360"
  | "Factory"
  | "Registry";

// ── Primary Module IDs (the only dock-level entries) ──────────────
export const PRIMARY_MODULE_IDS = ["home", "workbench", "factory", "registry"] as const;
export type PrimaryModuleId = (typeof PRIMARY_MODULE_IDS)[number];

// ── View IDs (sub-views within a primary module) ──────────────────
export type ViewId = string;

// ── Module Definition ─────────────────────────────────────────────
export interface ModuleDefinition {
  id: PrimaryModuleId;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  scope: DataScope;
  template: PageTemplate;
  allowedSuites: DataSuite[];
  /** Sub-views available within this module */
  views: ViewDefinition[];
}

export interface ViewDefinition {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  /** Which scope this view operates in (may differ from parent module) */
  scope: DataScope;
}

// ── Legacy Route Redirects ────────────────────────────────────────
export interface LegacyRedirect {
  legacyId: string;
  targetModule: PrimaryModuleId;
  targetView?: ViewId;
}

// ── The Canonical IA Map ──────────────────────────────────────────
export const IA_MODULES: ModuleDefinition[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    shortcut: "⌘1",
    scope: "county",
    template: "county",
    allowedSuites: ["CountyVitals"],
    views: [
      { id: "dashboard", label: "Command Briefing", icon: Home, scope: "county" },
      { id: "sync", label: "Legacy Sync", icon: Database, scope: "county" },
      { id: "county-pipeline", label: "County Pipeline", icon: BarChart3, scope: "county" },
      { id: "data-doctor", label: "Data Doctor", icon: Shield, scope: "county" },
      { id: "webhooks", label: "Webhooks", icon: Mail, scope: "county" },
      { id: "watchlist", label: "Watchlist", icon: Eye, scope: "county" },
      { id: "recents", label: "Recent Parcels", icon: Clock, scope: "county" },
      { id: "quality", label: "Data Quality", icon: Shield, scope: "county" },
      { id: "readiness", label: "Roll Readiness", icon: ShieldCheck, scope: "county" },
      { id: "geometry", label: "Geometry Health", icon: Hexagon, scope: "county" },
      { id: "neighborhoods", label: "Neighborhoods", icon: Map, scope: "county" },
      { id: "nbhd-rollup", label: "Nbhd Rollup", icon: BarChart3, scope: "county" },
      { id: "launch-reval", label: "Launch Reval", icon: Zap, scope: "county" },
      { id: "reval-progress", label: "Reval Progress", icon: TrendingUp, scope: "county" },
      { id: "reval-report", label: "Reval Report", icon: FileText, scope: "county" },
      { id: "reval-notices", label: "Reval Notices", icon: Mail, scope: "county" },
      { id: "appeal-insights", label: "Appeal Insights", icon: Scale, scope: "county" },
      { id: "appeal-risk", label: "Appeal Risk", icon: AlertTriangle, scope: "county" },
      { id: "notices", label: "Notice Center", icon: Mail, scope: "county" },
      { id: "exports", label: "Export Center", icon: Download, scope: "county" },
      { id: "reports", label: "Advanced Reports", icon: BarChart3, scope: "county" },
      { id: "smart-views", label: "Smart Views", icon: Filter, scope: "county" },
      { id: "bulk-ops", label: "Bulk Operations", icon: Layers, scope: "county" },
      { id: "scheduler", label: "Task Scheduler", icon: Clock, scope: "county" },
      { id: "activity", label: "Activity Feed", icon: Radar, scope: "county" },
      { id: "validation", label: "Validation Rules", icon: Target, scope: "county" },
      { id: "pacs-quality-gates", label: "Legacy Quality Gates", icon: ShieldCheck, scope: "county" },
      { id: "reconciliation", label: "Data Reconciliation", icon: GitCompareArrows, scope: "county" },
      { id: "pacs-analytics", label: "Legacy Analytics", icon: Activity, scope: "county" },
      { id: "value-change", label: "Value Change Tracker", icon: TrendingUp, scope: "county" },
      { id: "ratio-study", label: "Ratio Study", icon: BarChart3, scope: "county" },
      { id: "exemption-analysis", label: "Exemption Analysis", icon: ShieldCheck, scope: "county" },
      { id: "settings", label: "Settings", icon: Settings, scope: "county" },
    ],
  },
  {
    id: "workbench",
    label: "Workbench",
    icon: Search,
    shortcut: "⌘2",
    scope: "parcel",
    template: "parcel",
    allowedSuites: ["Parcel360"],
    views: [
      { id: "property", label: "Property 360", icon: Search, scope: "parcel" },
      { id: "pacs-dossier", label: "PACS Dossier", icon: Database, scope: "parcel" },
      { id: "field", label: "Field Studio", icon: Compass, scope: "parcel" },
      { id: "compare", label: "Compare", icon: GitCompareArrows, scope: "parcel" },
    ],
  },
  {
    id: "factory",
    label: "Factory",
    icon: Factory,
    shortcut: "⌘3",
    scope: "neighborhood",
    template: "factory",
    allowedSuites: ["Factory"],
    views: [
      { id: "calibration", label: "Calibration", icon: Factory, scope: "neighborhood" },
      { id: "vei", label: "Ratio Studies", icon: BarChart3, scope: "run" },
      { id: "geoequity", label: "Spatial Analysis", icon: Map, scope: "neighborhood" },
      { id: "avm", label: "AVM Studio", icon: Brain, scope: "run" },
      { id: "analytics", label: "Analytics", icon: TrendingUp, scope: "run" },
      { id: "advanced-analytics", label: "Advanced Analytics", icon: Radar, scope: "run" },
      { id: "segments", label: "Segments", icon: Layers, scope: "neighborhood" },
      { id: "iaao-compliance", label: "IAAO Compliance", icon: ShieldCheck, scope: "county" },
    ],
  },
  {
    id: "registry",
    label: "Registry",
    icon: BookOpen,
    shortcut: "⌘4",
    scope: "run",
    template: "registry",
    allowedSuites: ["Registry"],
    views: [
      { id: "trust", label: "Audit Log", icon: BookOpen, scope: "run" },
      { id: "audit-chain", label: "Audit Timeline", icon: Activity, scope: "run" },
      { id: "ledger", label: "Value Ledger", icon: GitCompareArrows, scope: "run" },
      { id: "catalog", label: "Data Catalog", icon: Database, scope: "county" },
      { id: "models", label: "Model Registry", icon: TrendingUp, scope: "run" },
      { id: "axiomfs", label: "File System", icon: FolderTree, scope: "county" },
    ],
  },
];

// ── Legacy ID → New Module mapping (no breakage) ──────────────────
export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  // Home absorbs these
  { legacyId: "dashboard", targetModule: "home", targetView: "dashboard" },
  { legacyId: "watchlist", targetModule: "home", targetView: "watchlist" },
  { legacyId: "recents", targetModule: "home", targetView: "recents" },
  { legacyId: "ids", targetModule: "home", targetView: "ids" },
  { legacyId: "quality", targetModule: "home", targetView: "quality" },
  { legacyId: "readiness", targetModule: "home", targetView: "readiness" },
  { legacyId: "geometry", targetModule: "home", targetView: "geometry" },
  { legacyId: "notices", targetModule: "home", targetView: "notices" },
  { legacyId: "exports", targetModule: "home", targetView: "exports" },
  { legacyId: "reports", targetModule: "home", targetView: "reports" },
  { legacyId: "smart-views", targetModule: "home", targetView: "smart-views" },
  { legacyId: "bulk-ops", targetModule: "home", targetView: "bulk-ops" },
  { legacyId: "scheduler", targetModule: "home", targetView: "scheduler" },
  { legacyId: "sync", targetModule: "home", targetView: "sync" },
  { legacyId: "activity", targetModule: "home", targetView: "activity" },
  { legacyId: "validation", targetModule: "home", targetView: "validation" },
  { legacyId: "neighborhoods", targetModule: "home", targetView: "neighborhoods" },
  { legacyId: "appeal-insights", targetModule: "home", targetView: "appeal-insights" },
  { legacyId: "slco-pipeline", targetModule: "home", targetView: "county-pipeline" },
  { legacyId: "settings", targetModule: "home", targetView: "settings" },
  { legacyId: "data-ops", targetModule: "home", targetView: "data-ops" },
  { legacyId: "webhooks", targetModule: "home", targetView: "webhooks" },
  { legacyId: "data-doctor", targetModule: "home", targetView: "data-doctor" },
  { legacyId: "pacs-quality-gates", targetModule: "home", targetView: "pacs-quality-gates" },
  { legacyId: "nbhd-rollup", targetModule: "home", targetView: "nbhd-rollup" },
  { legacyId: "reconciliation", targetModule: "home", targetView: "reconciliation" },
  { legacyId: "pacs-analytics", targetModule: "home", targetView: "pacs-analytics" },
  { legacyId: "value-change", targetModule: "home", targetView: "value-change" },
  { legacyId: "ratio-study", targetModule: "home", targetView: "ratio-study" },
  { legacyId: "exemption-analysis", targetModule: "home", targetView: "exemption-analysis" },
  { legacyId: "pacs-dossier", targetModule: "workbench", targetView: "pacs-dossier" },
  // Factory absorbs these
  { legacyId: "vei", targetModule: "factory", targetView: "vei" },
  { legacyId: "geoequity", targetModule: "factory", targetView: "geoequity" },
  { legacyId: "avm", targetModule: "factory", targetView: "avm" },
  { legacyId: "analytics", targetModule: "factory", targetView: "analytics" },
  { legacyId: "advanced-analytics", targetModule: "factory", targetView: "advanced-analytics" },
  { legacyId: "segments", targetModule: "factory", targetView: "segments" },
  { legacyId: "iaao-compliance", targetModule: "factory", targetView: "iaao-compliance" },
  // Workbench absorbs Field
  { legacyId: "field", targetModule: "workbench", targetView: "field" },
  { legacyId: "compare", targetModule: "workbench", targetView: "compare" },
  // Registry absorbs Trust
  { legacyId: "trust", targetModule: "registry", targetView: "trust" },
  { legacyId: "ledger", targetModule: "registry", targetView: "ledger" },
  { legacyId: "catalog", targetModule: "registry", targetView: "catalog" },
  { legacyId: "models", targetModule: "registry", targetView: "models" },
  // Revaluation actions → Factory calibration
  { legacyId: "launch-reval", targetModule: "factory", targetView: "calibration" },
];

// ── Helpers ───────────────────────────────────────────────────────

/** Get a module definition by its primary ID */
export function getModule(id: PrimaryModuleId): ModuleDefinition {
  return IA_MODULES.find((m) => m.id === id)!;
}

/** Resolve a legacy module ID to its new (module, view) pair */
export function resolveLegacyId(legacyId: string): { module: PrimaryModuleId; view?: ViewId } | null {
  // If it's already a primary module, return it directly
  if (PRIMARY_MODULE_IDS.includes(legacyId as PrimaryModuleId)) {
    return { module: legacyId as PrimaryModuleId };
  }
  const redirect = LEGACY_REDIRECTS.find((r) => r.legacyId === legacyId);
  if (!redirect) return null;
  return { module: redirect.targetModule, view: redirect.targetView };
}

/** Get all view IDs across all modules (for validation) */
export function getAllViewIds(): string[] {
  return IA_MODULES.flatMap((m) => m.views.map((v) => v.id));
}

/** Validate that a navigation target is legal */
export function isLegalNavigation(moduleId: string, viewId?: string): boolean {
  const mod = IA_MODULES.find((m) => m.id === moduleId);
  if (!mod) return false;
  if (!viewId) return true;
  return mod.views.some((v) => v.id === viewId);
}

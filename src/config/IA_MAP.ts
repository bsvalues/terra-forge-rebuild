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
      { id: "ids", label: "Data Ingestion", icon: Database, scope: "county" },
      { id: "quality", label: "Data Quality", icon: Target, scope: "county" },
      { id: "readiness", label: "Roll Readiness", icon: ShieldCheck, scope: "county" },
      { id: "geometry", label: "Geometry Health", icon: Hexagon, scope: "county" },
      { id: "sync", label: "Sync Engine", icon: Shield, scope: "county" },
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
      { id: "field", label: "Field Studio", icon: Compass, scope: "parcel" },
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
    ],
  },
];

// ── Legacy ID → New Module mapping (no breakage) ──────────────────
export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  // Home absorbs these
  { legacyId: "dashboard", targetModule: "home", targetView: "dashboard" },
  { legacyId: "ids", targetModule: "home", targetView: "ids" },
  { legacyId: "quality", targetModule: "home", targetView: "quality" },
  { legacyId: "readiness", targetModule: "home", targetView: "readiness" },
  { legacyId: "geometry", targetModule: "home", targetView: "geometry" },
  { legacyId: "sync", targetModule: "home", targetView: "sync" },
  // Factory absorbs these
  { legacyId: "vei", targetModule: "factory", targetView: "vei" },
  { legacyId: "geoequity", targetModule: "factory", targetView: "geoequity" },
  { legacyId: "avm", targetModule: "factory", targetView: "avm" },
  { legacyId: "analytics", targetModule: "factory", targetView: "analytics" },
  // Workbench absorbs Field
  { legacyId: "field", targetModule: "workbench", targetView: "field" },
  // Registry absorbs Trust
  { legacyId: "trust", targetModule: "registry", targetView: "trust" },
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

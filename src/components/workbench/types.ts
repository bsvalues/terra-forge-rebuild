// TerraFusion OS - Property Workbench Types

export type WorkMode = "overview" | "valuation" | "mapping" | "admin" | "case";
export type SuiteTab = "summary" | "forge" | "atlas" | "dais" | "dossier" | "pilot";
export type PilotMode = "pilot" | "muse";
export type SystemState = "idle" | "boot" | "processing" | "alert" | "success";

export interface ParcelContext {
  id: string | null;
  parcelNumber: string | null;
  address: string | null;
  city: string | null;
  assessedValue: number | null;
  propertyClass: string | null;
  neighborhoodCode: string | null;
}

export interface StudyPeriodContext {
  id: string | null;
  name: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface WorkbenchContext {
  parcel: ParcelContext;
  studyPeriod: StudyPeriodContext;
  workMode: WorkMode;
  activeTab: SuiteTab;
  pilotMode: PilotMode;
  systemState: SystemState;
}

export interface SuiteConfig {
  id: SuiteTab;
  name: string;
  icon: string;
  mission: string;
  color: string;
  writePermissions: string[];
}

export interface WorkModeConfig {
  id: WorkMode;
  name: string;
  icon: string;
  description: string;
  defaultTab: SuiteTab;
  color: string;
}

export const SUITE_CONFIGS: Record<SuiteTab, SuiteConfig> = {
  summary: {
    id: "summary",
    name: "Summary",
    icon: "LayoutDashboard",
    mission: "Universal view of identity, ownership, and value history",
    color: "tf-cyan",
    writePermissions: [],
  },
  forge: {
    id: "forge",
    name: "Forge",
    icon: "Hammer",
    mission: "Build value — models, calibration, comps, analysis",
    color: "suite-forge",
    writePermissions: ["valuation", "cama", "comps", "models"],
  },
  atlas: {
    id: "atlas",
    name: "Atlas",
    icon: "Globe",
    mission: "See the county — maps, layers, spatial tools",
    color: "suite-atlas",
    writePermissions: ["gis", "layers", "boundaries", "neighborhoods"],
  },
  dais: {
    id: "dais",
    name: "Dais",
    icon: "Building2",
    mission: "Operate value — permits, exemptions, appeals",
    color: "suite-dais",
    writePermissions: ["workflows", "permits", "exemptions", "appeals", "notices"],
  },
  dossier: {
    id: "dossier",
    name: "Dossier",
    icon: "FolderOpen",
    mission: "Prove the decision — evidence, narratives, packets",
    color: "suite-dossier",
    writePermissions: ["documents", "narratives", "packets", "cases"],
  },
  pilot: {
    id: "pilot",
    name: "Pilot",
    icon: "Sparkles",
    mission: "AI copilot — guidance, drafting, synthesis",
    color: "tf-cyan",
    writePermissions: [],
  },
};

export const WORK_MODE_CONFIGS: Record<WorkMode, WorkModeConfig> = {
  overview: {
    id: "overview",
    name: "Overview",
    icon: "Eye",
    description: "Big picture view for initial review",
    defaultTab: "summary",
    color: "mode-overview",
  },
  valuation: {
    id: "valuation",
    name: "Valuation",
    icon: "Calculator",
    description: "Value work, models, comps, cost approach",
    defaultTab: "forge",
    color: "mode-valuation",
  },
  mapping: {
    id: "mapping",
    name: "Mapping",
    icon: "Map",
    description: "Spatial analysis and GIS layers",
    defaultTab: "atlas",
    color: "mode-mapping",
  },
  admin: {
    id: "admin",
    name: "Admin",
    icon: "ClipboardList",
    description: "Workflows, permits, exemptions",
    defaultTab: "dais",
    color: "mode-admin",
  },
  case: {
    id: "case",
    name: "Case",
    icon: "Briefcase",
    description: "Evidence gathering and packet assembly",
    defaultTab: "dossier",
    color: "mode-case",
  },
};

// TerraPilot Tool Categories
export interface PilotTool {
  id: string;
  name: string;
  category: "navigation" | "workflow" | "data" | "execution" | "monitoring" | "draft" | "explain" | "summarize" | "synthesize";
  mode: PilotMode;
  suite: SuiteTab | "os";
  risk: "read" | "write-low" | "write-medium" | "write-high";
  description: string;
}

export const PILOT_TOOLS: PilotTool[] = [
  // Pilot Mode - Operator Tools
  { id: "route_to_parcel", name: "Open Parcel", category: "navigation", mode: "pilot", suite: "summary", risk: "read", description: "Navigate to a specific parcel" },
  { id: "switch_work_mode", name: "Switch Mode", category: "navigation", mode: "pilot", suite: "summary", risk: "read", description: "Change work mode context" },
  { id: "fetch_comps", name: "Find Comparables", category: "data", mode: "pilot", suite: "forge", risk: "read", description: "Search for comparable properties" },
  { id: "run_model", name: "Run Model", category: "execution", mode: "pilot", suite: "forge", risk: "write-medium", description: "Execute valuation model" },
  { id: "generate_notice", name: "Generate Notice", category: "execution", mode: "pilot", suite: "dais", risk: "write-high", description: "Create official notice" },
  { id: "assign_task", name: "Assign Task", category: "workflow", mode: "pilot", suite: "dais", risk: "write-medium", description: "Delegate work to team" },
  
  // Muse Mode - Creator Tools
  { id: "draft_notice", name: "Draft Notice", category: "draft", mode: "muse", suite: "dais", risk: "write-low", description: "Draft official correspondence" },
  { id: "explain_value_change", name: "Explain Value", category: "explain", mode: "muse", suite: "forge", risk: "read", description: "Explain valuation changes" },
  { id: "summarize_parcel", name: "Summarize Parcel", category: "summarize", mode: "muse", suite: "summary", risk: "read", description: "Generate parcel overview" },
  { id: "synthesize_evidence", name: "Synthesize Evidence", category: "synthesize", mode: "muse", suite: "dossier", risk: "read", description: "Compile case evidence" },
];

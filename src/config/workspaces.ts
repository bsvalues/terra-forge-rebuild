import { Home, Search, Database, Hammer, Map, Scale, BookOpen, Settings, type LucideIcon } from "lucide-react";
import { IA_MODULES, buildUrlPath, type PrimaryModuleId, type ViewDefinition } from "./IA_MAP";

export interface WorkspaceTool extends ViewDefinition {
  module: PrimaryModuleId;
  view: string;
  path: string;
  workspaceId: string;
  workspaceLabel: string;
}
export interface WorkspaceDefinition {
  id: string;
  label: string;
  purpose: string;
  icon: LucideIcon;
  tools: WorkspaceTool[];
}

const definitions: Array<Omit<WorkspaceDefinition, "tools"> & { targets: string[] }> = [
  { id: "home", label: "Home", purpose: "County workspace", icon: Home, targets: ["home:dashboard"] },
  { id: "property", label: "Property Workbench", purpose: "Find and review a property", icon: Search, targets: ["workbench:property", "workbench:compare", "workbench:field", "workbench:pacs-dossier", "home:recents", "home:watchlist", "home:smart-views"] },
  { id: "data", label: "Data & Sync", purpose: "Sources, imports and reconciliation", icon: Database, targets: ["home:ids", "home:sync", "home:county-pipeline", "home:quality", "home:reconciliation", "home:validation", "home:pacs-quality-gates", "home:ingest-audit", "home:data-doctor", "home:schema-diff", "home:data-ops", "home:pacs-analytics", "home:county-onboarding", "home:county-compatibility"] },
  { id: "forge", label: "TerraForge", purpose: "Valuation and mass appraisal", icon: Hammer, targets: ["factory:calibration", "factory:vei", "factory:avm", "factory:analytics", "factory:advanced-analytics", "factory:segments", "factory:iaao-compliance", "home:ratio-study", "home:value-change", "home:nbhd-rollup", "home:launch-reval", "home:reval-progress", "home:reval-report", "home:county-benchmarks"] },
  { id: "atlas", label: "TerraAtlas", purpose: "Maps and neighborhood geography", icon: Map, targets: ["factory:geoequity", "home:neighborhoods", "home:geometry"] },
  { id: "dais", label: "TerraDais", purpose: "Appeals, notices and county operations", icon: Scale, targets: ["home:appeal-insights", "home:appeal-risk", "home:nbhd-review", "home:notices", "home:reval-notices", "home:exemption-analysis", "home:readiness", "home:county-readiness", "home:bulk-ops", "home:scheduler"] },
  { id: "dossier", label: "TerraDossier", purpose: "Records, evidence and audit history", icon: BookOpen, targets: ["registry:trust", "registry:audit-chain", "registry:ledger", "registry:catalog", "registry:models", "registry:axiomfs", "home:reports", "home:exports", "home:activity"] },
  { id: "settings", label: "Settings", purpose: "County configuration and integrations", icon: Settings, targets: ["home:settings", "home:webhooks"] },
];

/** A presentation index only: route IDs and constitutional data owners are unchanged. */
export const WORKSPACES: WorkspaceDefinition[] = definitions.map(({ targets, ...workspace }) => ({
  ...workspace,
  tools: targets.map(target => {
    const [moduleId, viewId] = target.split(":");
    const module = IA_MODULES.find(m => m.id === moduleId);
    const view = module?.views.find(v => v.id === viewId);
    if (!module || !view) throw new Error(`Unregistered workspace target: ${target}`);
    return { ...view, module: module.id, view: view.id, path: buildUrlPath(module.id, view.id), workspaceId: workspace.id, workspaceLabel: workspace.label };
  }),
}));

export function findWorkspace(module: PrimaryModuleId, view: string | null): WorkspaceDefinition | undefined {
  const resolved = view ?? ({ home: "dashboard", workbench: "property", factory: "calibration", registry: "trust" }[module]);
  return WORKSPACES.find(w => w.tools.some(t => t.module === module && t.view === resolved));
}

export function searchWorkspaceTools(query: string): WorkspaceTool[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return WORKSPACES.flatMap(w => w.tools).filter(t => words.every(word =>
    `${t.label} ${t.view} ${t.workspaceLabel} ${t.scope}`.toLowerCase().includes(word),
  ));
}
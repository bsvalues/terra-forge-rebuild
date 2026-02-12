import { useMemo } from "react";
import type { WorkMode, SuiteTab } from "@/components/workbench/types";

/**
 * Canonical Scene identifiers for the TerraFusion OS Stage.
 * Each scene represents a known component arrangement — the system
 * selects scenes based on context, never generating new UI.
 */
export type CanonicalScene =
  | "ingestion-gate"
  | "ratio-study-cockpit"
  | "neighborhood-review"
  | "property-workbench"
  | "calibration-run"
  | "appeal-defense-pack"
  | "command-briefing";

export interface SceneDescriptor {
  scene: CanonicalScene;
  /** The OS module key that maps to this scene in AppLayout */
  module: string;
  label: string;
  description: string;
  defaultTab: SuiteTab;
}

const SCENE_LIBRARY: Record<CanonicalScene, SceneDescriptor> = {
  "command-briefing": {
    scene: "command-briefing",
    module: "dashboard",
    label: "Command Briefing",
    description: "System-wide data health and operational readiness",
    defaultTab: "summary",
  },
  "ingestion-gate": {
    scene: "ingestion-gate",
    module: "ids",
    label: "Ingestion Gate",
    description: "QA checklists, data health, ingest wizard",
    defaultTab: "summary",
  },
  "ratio-study-cockpit": {
    scene: "ratio-study-cockpit",
    module: "vei",
    label: "Ratio Study Cockpit",
    description: "COD/PRD metrics, tier plots, drift warnings",
    defaultTab: "forge",
  },
  "neighborhood-review": {
    scene: "neighborhood-review",
    module: "geoequity",
    label: "Neighborhood Review",
    description: "Map, parcel details, sales data",
    defaultTab: "atlas",
  },
  "property-workbench": {
    scene: "property-workbench",
    module: "workbench",
    label: "Property Workbench",
    description: "Summary, Forge, Atlas, Dais, Dossier tabs",
    defaultTab: "summary",
  },
  "calibration-run": {
    scene: "calibration-run",
    module: "vei",
    label: "Calibration Run",
    description: "Parameters, distributions, impact analysis",
    defaultTab: "forge",
  },
  "appeal-defense-pack": {
    scene: "appeal-defense-pack",
    module: "workbench",
    label: "Appeal Defense Pack",
    description: "Comps, narrative builder, audit trail",
    defaultTab: "dossier",
  },
};

interface ContextModeInput {
  /** Current active module in AppLayout */
  activeModule: string;
  /** Current work mode (from WorkbenchContext or top-level) */
  workMode: WorkMode;
  /** Whether a parcel is currently selected */
  hasParcel: boolean;
}

/**
 * Resolves the active Canonical Scene based on current context.
 *
 * This is "Agentic UX" — the system selects known component
 * arrangements, never generating new UI.
 */
export function useContextMode({ activeModule, workMode, hasParcel }: ContextModeInput): SceneDescriptor {
  return useMemo(() => {
    // 1. Module-based resolution (primary)
    switch (activeModule) {
      case "ids":
        return SCENE_LIBRARY["ingestion-gate"];

      case "vei":
        // If in valuation mode, surface calibration; otherwise ratio cockpit
        if (workMode === "valuation") {
          return SCENE_LIBRARY["calibration-run"];
        }
        return SCENE_LIBRARY["ratio-study-cockpit"];

      case "geoequity":
        return SCENE_LIBRARY["neighborhood-review"];

      case "workbench":
        // If in case mode with a parcel, show appeal defense
        if (workMode === "case" && hasParcel) {
          return SCENE_LIBRARY["appeal-defense-pack"];
        }
        return SCENE_LIBRARY["property-workbench"];

      case "dashboard":
      default:
        return SCENE_LIBRARY["command-briefing"];
    }
  }, [activeModule, workMode, hasParcel]);
}

/** Export the full library for command palette / scene switching */
export const CANONICAL_SCENES = SCENE_LIBRARY;

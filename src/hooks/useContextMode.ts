import { useMemo } from "react";
import type { WorkMode, SuiteTab } from "@/components/workbench/types";
import type { PrimaryModuleId } from "@/config/IA_MAP";

/**
 * Canonical Scene identifiers for the TerraFusion OS Stage.
 * Aligned with the 4-module IA: Home / Workbench / Factory / Registry
 */
export type CanonicalScene =
  | "command-briefing"
  | "ingestion-gate"
  | "ratio-study-cockpit"
  | "neighborhood-review"
  | "property-workbench"
  | "calibration-run"
  | "appeal-defense-pack"
  | "trust-registry";

export interface SceneDescriptor {
  scene: CanonicalScene;
  module: PrimaryModuleId;
  label: string;
  description: string;
  defaultTab: SuiteTab;
}

const SCENE_LIBRARY: Record<CanonicalScene, SceneDescriptor> = {
  "command-briefing": {
    scene: "command-briefing",
    module: "home",
    label: "Command Briefing",
    description: "System-wide data health and operational readiness",
    defaultTab: "summary",
  },
  "ingestion-gate": {
    scene: "ingestion-gate",
    module: "home",
    label: "Ingestion Gate",
    description: "QA checklists, data health, ingest wizard",
    defaultTab: "summary",
  },
  "ratio-study-cockpit": {
    scene: "ratio-study-cockpit",
    module: "factory",
    label: "Ratio Study Cockpit",
    description: "COD/PRD metrics, tier plots, drift warnings",
    defaultTab: "forge",
  },
  "neighborhood-review": {
    scene: "neighborhood-review",
    module: "factory",
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
    module: "factory",
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
  "trust-registry": {
    scene: "trust-registry",
    module: "registry",
    label: "Trust Registry",
    description: "Audit log, data catalog, model versions",
    defaultTab: "summary",
  },
};

interface ContextModeInput {
  activeModule: string;
  workMode: WorkMode;
  hasParcel: boolean;
}

/**
 * Resolves the active Canonical Scene based on current context.
 * Updated for the 4-module IA (Home / Workbench / Factory / Registry).
 */
export function useContextMode({ activeModule, workMode, hasParcel }: ContextModeInput): SceneDescriptor {
  return useMemo(() => {
    switch (activeModule) {
      case "home":
        return SCENE_LIBRARY["command-briefing"];

      case "factory":
        if (workMode === "valuation") {
          return SCENE_LIBRARY["calibration-run"];
        }
        return SCENE_LIBRARY["ratio-study-cockpit"];

      case "workbench":
        if (workMode === "case" && hasParcel) {
          return SCENE_LIBRARY["appeal-defense-pack"];
        }
        return SCENE_LIBRARY["property-workbench"];

      case "registry":
        return SCENE_LIBRARY["trust-registry"];

      default:
        return SCENE_LIBRARY["command-briefing"];
    }
  }, [activeModule, workMode, hasParcel]);
}

export const CANONICAL_SCENES = SCENE_LIBRARY;

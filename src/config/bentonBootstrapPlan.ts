import {
  Database,
  Globe,
  Map,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type BentonBootstrapStepStatus = "implemented" | "partial" | "planned";

export interface BentonBootstrapStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  color: string;
  bgColor: string;
  status: BentonBootstrapStepStatus;
}

export const BENTON_BOOTSTRAP_STEPS: BentonBootstrapStep[] = [
  {
    id: "county-tenant",
    icon: Database,
    title: "Confirm Benton County Tenant",
    description: "Create or join Benton County, WA using FIPS 53005 so all data remains county-scoped from the start.",
    action: "County Ready",
    color: "text-primary",
    bgColor: "bg-primary/10",
    status: "implemented",
  },
  {
    id: "pacs-lane",
    icon: Globe,
    title: "Connect Benton PACS Lane",
    description: "Use the Benton PACS contract and source-lane registry to target property core, valuations, neighborhoods, permits, appeals, and exemptions.",
    action: "Connect PACS",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
    status: "partial",
  },
  {
    id: "gis-seed",
    icon: Map,
    title: "Seed Benton GIS Layers",
    description: "Load Benton parcels first, then jurisdictions, taxing districts, and neighborhoods through GIS Ops using ArcGIS services or exported FGDB layers.",
    action: "Open GIS Ops",
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
    status: "partial",
  },
  {
    id: "validation",
    icon: ShieldCheck,
    title: "Run Quality And Join Checks",
    description: "Verify `geo_id`, `prop_id`, `hood_cd`, and `tax_district_id` joins before treating Benton as seed-complete.",
    action: "Validate",
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    status: "planned",
  },
  {
    id: "pilot",
    icon: Sparkles,
    title: "Open Benton Operator Flow",
    description: "Use TerraPilot and county operations once Benton PACS and GIS sources are seeded and defensibility checks pass.",
    action: "Open Pilot",
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
    status: "planned",
  },
];

export function isBentonCountyName(countyName: string) {
  return /benton/i.test(countyName);
}
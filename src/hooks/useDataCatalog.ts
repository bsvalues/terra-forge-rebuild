// TerraFusion OS — Phase 55: Data Catalog Hook
// Queries table-level metadata (row counts, freshness) for the governance catalog

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogDomain {
  id: string;
  name: string;
  label: string;
  owner: "OS Core" | "TerraForge" | "TerraDais" | "TerraDossier" | "TerraAtlas" | "TerraTrace";
  scope: "county" | "parcel" | "run";
  description: string;
  fields: string[];
  rowCount: number | null;
  lastUpdated: string | null;
}

// Static domain registry — the Write-Lane Matrix codified
const DOMAIN_DEFINITIONS: Omit<CatalogDomain, "rowCount" | "lastUpdated">[] = [
  {
    id: "parcels",
    name: "parcels",
    label: "Parcels",
    owner: "OS Core",
    scope: "county",
    description: "Property identity records — PIN, situs address, legal description, and physical characteristics",
    fields: ["parcel_number", "address", "assessed_value", "property_class", "neighborhood_code", "year_built", "building_area", "land_area", "bedrooms", "bathrooms"],
  },
  {
    id: "assessments",
    name: "assessments",
    label: "Assessments",
    owner: "TerraForge",
    scope: "parcel",
    description: "Tax-year valuations — land, improvement, and total assessed value per parcel per year",
    fields: ["parcel_id", "tax_year", "land_value", "improvement_value", "total_value", "certified", "assessment_reason"],
  },
  {
    id: "sales",
    name: "sales",
    label: "Sales",
    owner: "OS Core",
    scope: "parcel",
    description: "Arm's-length transactions used for ratio studies and comparable selection",
    fields: ["parcel_id", "sale_date", "sale_price", "sale_type", "grantor", "grantee", "qualified"],
  },
  {
    id: "calibration_runs",
    name: "calibration_runs",
    label: "Calibration Runs",
    owner: "TerraForge",
    scope: "run",
    description: "Regression model runs per neighborhood — coefficients, diagnostics, and R² metrics",
    fields: ["neighborhood_code", "model_type", "variables", "r_squared", "rmse", "sample_size", "status"],
  },
  {
    id: "appeals",
    name: "appeals",
    label: "Appeals",
    owner: "TerraDais",
    scope: "parcel",
    description: "Property value appeals — filing date, hearing schedule, resolution outcome",
    fields: ["parcel_id", "appeal_date", "original_value", "requested_value", "final_value", "status", "resolution_type"],
  },
  {
    id: "exemptions",
    name: "exemptions",
    label: "Exemptions",
    owner: "TerraDais",
    scope: "parcel",
    description: "Tax exemption applications — homestead, veteran, senior, agricultural",
    fields: ["parcel_id", "exemption_type", "status", "exemption_amount", "application_date", "tax_year"],
  },
  {
    id: "notices",
    name: "notices",
    label: "Notices",
    owner: "TerraDais",
    scope: "parcel",
    description: "Assessment change notices — generated, drafted, mailed to property owners",
    fields: ["parcel_id", "notice_type", "subject", "status", "ai_drafted", "recipient_name"],
  },
  {
    id: "dossier_documents",
    name: "dossier_documents",
    label: "Documents",
    owner: "TerraDossier",
    scope: "parcel",
    description: "Uploaded and generated evidence files — photos, sketches, appraisal reports",
    fields: ["parcel_id", "document_type", "file_name", "file_path", "mime_type", "file_size_bytes"],
  },
  {
    id: "dossier_narratives",
    name: "dossier_narratives",
    label: "Narratives",
    owner: "TerraDossier",
    scope: "parcel",
    description: "AI-generated and manual narratives — defense, summary, hearing preparation",
    fields: ["parcel_id", "narrative_type", "title", "ai_generated", "model_used"],
  },
  {
    id: "gis_features",
    name: "gis_features",
    label: "GIS Features",
    owner: "TerraAtlas",
    scope: "county",
    description: "Spatial geometry features — parcel boundaries, annotations, overlay layers",
    fields: ["layer_id", "geometry_type", "coordinates", "centroid_lat", "centroid_lng", "properties"],
  },
  {
    id: "neighborhoods",
    name: "neighborhoods",
    label: "Neighborhoods",
    owner: "TerraAtlas",
    scope: "county",
    description: "Administrative neighborhood boundaries and metadata for market segmentation",
    fields: ["hood_cd", "hood_name", "year", "geometry", "metadata"],
  },
  {
    id: "value_adjustments",
    name: "value_adjustments",
    label: "Value Adjustments",
    owner: "TerraForge",
    scope: "parcel",
    description: "Immutable ledger of value changes — regression, manual, calibration adjustments",
    fields: ["parcel_id", "adjustment_type", "previous_value", "new_value", "adjustment_reason", "applied_at"],
  },
];

// Tables we can safely count via the Supabase client
const COUNTABLE_TABLES = [
  "parcels", "assessments", "calibration_runs", "appeals",
  "exemptions", "notices", "dossier_documents", "dossier_narratives",
  "gis_features", "neighborhoods", "value_adjustments",
] as const;

async function fetchCatalogData(): Promise<CatalogDomain[]> {
  // Fire all count queries in parallel
  const countResults = await Promise.allSettled(
    COUNTABLE_TABLES.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) return { table, count: null, lastUpdated: null };

      // Get most recent updated_at
      let lastUpdated: string | null = null;
      const hasUpdatedAt = !["gis_features", "value_adjustments"].includes(table);
      if (hasUpdatedAt) {
        const { data: latest } = await supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        lastUpdated = (latest as Record<string, unknown>)?.updated_at as string ?? null;
      }

      return { table, count: count ?? 0, lastUpdated };
    })
  );

  const countMap = new Map<string, { count: number | null; lastUpdated: string | null }>();
  countResults.forEach((r, i) => {
    if (r.status === "fulfilled") {
      countMap.set(r.value.table, { count: r.value.count, lastUpdated: r.value.lastUpdated });
    } else {
      countMap.set(COUNTABLE_TABLES[i], { count: null, lastUpdated: null });
    }
  });

  return DOMAIN_DEFINITIONS.map((d) => ({
    ...d,
    rowCount: countMap.get(d.name)?.count ?? null,
    lastUpdated: countMap.get(d.name)?.lastUpdated ?? null,
  }));
}

export function useDataCatalog() {
  return useQuery({
    queryKey: ["data-catalog"],
    queryFn: fetchCatalogData,
    staleTime: 60_000,
  });
}

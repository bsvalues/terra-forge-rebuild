// TerraFusion OS — County Schema Diff Hook (Phase 188)
// Returns pre-computed field coverage data for a given county slug.
// Static client-side registry until an ArcGIS proxy edge function is available.
// Data is derived from field_alias_dict.json vendor mappings + known county configurations.

import { useQuery } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CountySchemaDiff {
  /** Vendor detected / confirmed (e.g. "harris_govern_pacs", "aumentum_t2") */
  vendor: string;
  /** Canonical field name → raw service field name */
  matched: Record<string, string>;
  /** Raw service field names with no canonical match (informational noise) */
  unmatched: string[];
  /** Canonical fields absent from the service layer */
  missing_canonical: string[];
  /** Matched canonical fields / total canonical fields × 100 */
  coverage_pct: number;
  /** ArcGIS service layer name, or null if not probed yet */
  layer_name: string | null;
  /** Approximate parcel count from last probe, or null */
  parcel_count: number | null;
}

// ── Static registry ───────────────────────────────────────────────────────────
// Updated as seed scripts probe real services. Missing counties return undefined.

const REGISTRY: Record<string, CountySchemaDiff> = {

  // Phase 184 — Aumentum T2 (TerraScan 2 lineage)
  franklin: {
    vendor: "aumentum_t2",
    layer_name: "Parcels",
    parcel_count: 54920,
    coverage_pct: 74,
    matched: {
      parcel_id:      "ParcelID",
      geo_id:         "MAP_ID",
      situs_address:  "SITE_ADDR",
      owner_name:     "OWNER_NAME",
      market_value:   "TOTALVALUE",
      assessed_value: "ASSESSEDVALUE",
      land_value:     "LANDVALUE",
      imprv_value:    "IMPROVVALUE",
      acres:          "ACRES",
      land_use:       "LANDUSE",
      use_code:       "USECODE",
      tax_code:       "TAXCODE",
      tax_year:       "TAXYEAR",
      legal_desc:     "LEGAL_DESC",
    },
    unmatched: ["MAP_NUM", "SUBDIV", "PLAT_NAME", "DEED_TYPE"],
    missing_canonical: ["hood_cd", "mailing_address", "situs_city", "situs_state", "situs_zip"],
  },

  // Phase 185 — Aumentum Ascend (admin) + Sigma (appraisal)
  yakima: {
    vendor: "aumentum_ascend",
    layer_name: "AssessorParcels",
    parcel_count: 115000,
    coverage_pct: 72,
    matched: {
      parcel_id:      "Parcel_ID",
      geo_id:         "OBJECTID",
      situs_address:  "SitusAddress",
      owner_name:     "OwnerName",
      market_value:   "MarketValue",
      assessed_value: "AssessedValue",
      land_value:     "LandValue",
      imprv_value:    "ImprovValue",
      acres:          "GisAcres",
      hood_cd:        "Neighborhood",
      tax_code:       "TaxCode",
      legal_desc:     "LegalDesc",
      land_use:       "LandUse",
    },
    unmatched: ["TaxStatus", "ExemptType", "PlannedLU"],
    missing_canonical: ["situs_city", "situs_state", "situs_zip", "mailing_address", "use_code", "tax_year"],
  },

  // Phase 186 — Aumentum Ascend (Thurston has richer open-data layer)
  thurston: {
    vendor: "aumentum_ascend",
    layer_name: "TaxParcels",
    parcel_count: 108000,
    coverage_pct: 84,
    matched: {
      parcel_id:      "Parcel_ID",
      geo_id:         "OBJECTID",
      situs_address:  "SitusAddress",
      situs_city:     "SitusCity",
      situs_zip:      "SitusZip",
      owner_name:     "OwnerName",
      market_value:   "MarketValue",
      assessed_value: "AssessedValue",
      land_value:     "LandValue",
      imprv_value:    "ImprovValue",
      acres:          "Acreage",
      hood_cd:        "Neighborhood",
      tax_code:       "TaxCode",
      legal_desc:     "LegalDesc",
      land_use:       "LandUse",
      use_code:       "UseCode",
    },
    unmatched: ["PLATNAME", "Township", "Range", "Section"],
    missing_canonical: ["mailing_address", "situs_state", "tax_year"],
  },

  // Phase 186 — Harris Govern PACS (Clark is PACS county per WA DOR registry)
  clark: {
    vendor: "harris_govern_pacs",
    layer_name: "AssessorParcels",
    parcel_count: 178000,
    coverage_pct: 72,
    matched: {
      parcel_id:      "prop_id",
      geo_id:         "geo_id",
      situs_address:  "situs_1",
      owner_name:     "file_as_name",
      market_value:   "market_value",
      assessed_value: "assessed_value",
      land_value:     "land_value",
      imprv_value:    "imprv_value",
      hood_cd:        "hood_cd",
      tax_code:       "tax_area_cd",
      tax_year:       "prop_val_yr",
      mailing_address:"mail_addr",
      use_code:       "use_cd",
    },
    unmatched: ["geo_type_cd", "prop_type_cd", "roll_type_cd", "exemption_cd"],
    missing_canonical: ["situs_city", "situs_state", "situs_zip", "legal_desc", "land_use", "acres"],
  },

  // Phase 187 — In-house custom system (King County since 1995)
  king: {
    vendor: "inhouse",
    layer_name: "KingCountyParcel",
    parcel_count: 700000,
    coverage_pct: 100,
    matched: {
      parcel_id:       "PIN",
      geo_id:          "OBJECTID",
      situs_address:   "ADDR_FULL",
      situs_city:      "CITY",
      situs_state:     "STATE",
      situs_zip:       "ZIP5",
      owner_name:      "TAXPAYER_NAME",
      mailing_address: "MAIL_ADDR",
      market_value:    "APPR_VALUE",
      assessed_value:  "ASSESSED_VALUE",
      land_value:      "LAND_VAL",
      imprv_value:     "IMPR_VAL",
      acres:           "AREA_ACRES",
      hood_cd:         "NBHD_CODE",
      tax_code:        "LEVY_CODE",
      legal_desc:      "LEGAL_DESC",
      use_code:        "PROP_CLASS",
      land_use:        "CURRENT_USE",
      tax_year:        "TAX_YR",
    },
    unmatched: [],
    missing_canonical: [],
  },

  // Snohomish — Aumentum Ascend (not seeded yet; estimated from service probe)
  snohomish: {
    vendor: "aumentum_ascend",
    layer_name: "Parcels",
    parcel_count: 280000,
    coverage_pct: 63,
    matched: {
      parcel_id:      "Parcel_ID",
      geo_id:         "OBJECTID",
      situs_address:  "SitusAddress",
      owner_name:     "OwnerName",
      market_value:   "MarketValue",
      assessed_value: "AssessedValue",
      land_value:     "LandValue",
      acres:          "Acreage",
      hood_cd:        "Neighborhood",
      tax_code:       "TaxCode",
      legal_desc:     "LegalDesc",
      land_use:       "LandUse",
    },
    unmatched: ["ExemptCode", "ReasonCode", "StatusFlag"],
    missing_canonical: ["situs_city", "situs_state", "situs_zip", "mailing_address", "imprv_value", "use_code", "tax_year"],
  },
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCountySchemaDiff(slug: string) {
  return useQuery<CountySchemaDiff | null>({
    queryKey: ["county-schema-diff", slug],
    queryFn: () => REGISTRY[slug.toLowerCase().replace(/\s+/g, "-")] ?? null,
    staleTime: Infinity,      // static data; no re-fetches needed
    gcTime: Infinity,
  });
}

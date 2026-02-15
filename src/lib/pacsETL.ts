/**
 * TerraFusion OS — PACS Multi-Table ETL Processor
 * Joins normalized True Automation CSV exports into unified parcel records.
 * 
 * Input tables: situs, imprv, imprv_items, land_detail, owner, account, permits, address,
 *               roll_value_history, exempt, linked_owners, sketches, images
 * Output: Unified parcel records + permits + assessments + exemptions ready for DB upsert
 */

import Papa from "papaparse";

// ============================================================
// Table Detection — identify PACS table type from CSV headers
// ============================================================

export type PACSTableType = 
  | "situs" 
  | "imprv" 
  | "imprv_items" 
  | "imprv_details"
  | "land_detail" 
  | "owner" 
  | "account" 
  | "permits" 
  | "address"
  | "roll_value_history"
  | "exempt"
  | "linked_owners"
  | "sketches"
  | "images"
  | "prop_val"
  | "unknown";

const TABLE_SIGNATURES: Record<PACSTableType, string[]> = {
  situs: ["situs_display", "situs_street", "situs_city", "situs_zip"],
  imprv: ["imprv_id", "imprv_val", "living_area", "actual_year_built"],
  imprv_items: ["imprv_id", "bedrooms", "baths", "foundation", "extwall_desc"],
  imprv_details: ["imprv_det_type_cd", "imprv_det_desc", "imprv_det_area", "imprv_det_class_cd"],
  land_detail: ["size_acres", "size_square_feet", "land_type_cd", "land_soil_code"],
  owner: ["owner_id"],
  account: ["acct_id", "file_as_name"],
  permits: ["bldg_permit_id", "bldg_permit_num", "bldg_permit_type_cd", "bldg_permit_issue_dt"],
  address: ["addr_line1", "addr_city", "addr_state"],
  roll_value_history: ["prop_val_yr", "improvements", "land_market", "appraised_val", "assessed_val"],
  exempt: ["exmpt_type_cd", "exmpt_subtype_cd", "exemption_pct"],
  linked_owners: ["file_as_name", "owner_desc"],
  sketches: ["sketch", "imprv_id"],
  images: ["image_path", "image_nm", "image_type"],
  prop_val: ["property_use_cd", "hood_cd", "appraised_val", "geo_id"],
  unknown: [],
};

export function detectTableType(headers: string[]): PACSTableType {
  const lowerHeaders = new Set(headers.map(h => h.toLowerCase().trim()));
  
  let bestMatch: PACSTableType = "unknown";
  let bestScore = 0;
  
  for (const [tableType, signatures] of Object.entries(TABLE_SIGNATURES)) {
    if (tableType === "unknown") continue;
    const score = signatures.filter(sig => lowerHeaders.has(sig.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = tableType as PACSTableType;
    }
  }
  
  // Special case: owner.csv has very few columns (prop_id, owner_id)
  if (bestMatch === "unknown" && lowerHeaders.has("owner_id") && lowerHeaders.has("prop_id") && lowerHeaders.size <= 3) {
    return "owner";
  }
  
  return bestScore >= 1 ? bestMatch : "unknown";
}

// ============================================================
// File Parsing
// ============================================================

export interface PACSParsedTable {
  type: PACSTableType;
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export async function parsePACSFile(file: File): Promise<PACSParsedTable> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const type = detectTableType(headers);
        resolve({
          type,
          fileName: file.name,
          headers,
          rows: results.data as Record<string, string>[],
          rowCount: results.data.length,
        });
      },
      error: (err) => reject(err),
    });
  });
}

// ============================================================
// Multi-Table Join — produces unified parcel records
// ============================================================

export interface UnifiedParcel {
  parcel_number: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  assessed_value: number;
  improvement_value: number | null;
  land_value: number | null;
  building_area: number | null;
  year_built: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  land_area: number | null;
  property_class: string | null;
  neighborhood_code: string | null;
}

export interface UnifiedPermit {
  parcel_number: string;
  permit_number: string;
  permit_type: string;
  status: string;
  description: string | null;
  application_date: string;
  estimated_value: number | null;
}

export interface UnifiedAssessment {
  parcel_number: string;
  tax_year: number;
  improvement_value: number;
  land_value: number;
  total_value: number;
}

export interface UnifiedExemption {
  parcel_number: string;
  exemption_type: string;
  exemption_subtype: string | null;
  exemption_percentage: number | null;
}

export interface PACSJoinResult {
  parcels: UnifiedParcel[];
  permits: UnifiedPermit[];
  assessments: UnifiedAssessment[];
  exemptions: UnifiedExemption[];
  stats: {
    situsCount: number;
    imprvCount: number;
    imprvItemsCount: number;
    imprvDetailsCount: number;
    landCount: number;
    ownerCount: number;
    permitCount: number;
    rollValueCount: number;
    exemptCount: number;
    linkedOwnerCount: number;
    sketchCount: number;
    imageCount: number;
    propValCount: number;
    joinedParcels: number;
    joinedPermits: number;
    joinedAssessments: number;
    joinedExemptions: number;
  };
}

export function joinPACSTables(tables: PACSParsedTable[]): PACSJoinResult {
  const byType = (t: PACSTableType) => tables.find(tb => tb.type === t);
  
  const situsTable = byType("situs");
  const imprvTable = byType("imprv");
  const imprvItemsTable = byType("imprv_items");
  const imprvDetailsTable = byType("imprv_details");
  const landTable = byType("land_detail");
  const permitsTable = byType("permits");
  const rollValueTable = byType("roll_value_history");
  const exemptTable = byType("exempt");
  const propValTable = byType("prop_val");
  
  // ---- Build lookup maps ----
  
  // Roll value history: pick latest year per prop_id for parcel assessed_value, 
  // and collect all years for assessments
  const latestRollByProp = new Map<string, { assessed_val: number; improvement_value: number; land_value: number; year: number }>();
  const allAssessments: UnifiedAssessment[] = [];
  
  if (rollValueTable) {
    for (const row of rollValueTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid) continue;
      const year = parseInt(row.prop_val_yr || "") || 0;
      if (year === 0) continue;
      
      const improvVal = parseFloat((row.improvements || "0").replace(/[,$]/g, "")) || 0;
      const landVal = parseFloat((row.land_market || "0").replace(/[,$]/g, "")) || 0;
      const assessedVal = parseFloat((row.assessed_val || "0").replace(/[,$]/g, "")) || 0;
      const appraisedVal = parseFloat((row.appraised_val || "0").replace(/[,$]/g, "")) || 0;
      const totalValue = assessedVal > 0 ? assessedVal : appraisedVal;
      
      // Collect for assessments table
      if (totalValue > 0 || improvVal > 0 || landVal > 0) {
        allAssessments.push({
          parcel_number: pid,
          tax_year: year,
          improvement_value: improvVal,
          land_value: landVal,
          total_value: totalValue,
        });
      }
      
      // Track latest year for parcel spine values
      const existing = latestRollByProp.get(pid);
      if (!existing || year > existing.year) {
        latestRollByProp.set(pid, {
          assessed_val: totalValue,
          improvement_value: improvVal,
          land_value: landVal,
          year,
        });
      }
    }
  }
  
  // Improvement: pick primary improvement per prop_id (largest living_area)
  const imprvByProp = new Map<string, { living_area: number | null; year_built: number | null; imprv_val: number; imprv_id: string; total_imprv_val: number }>();
  if (imprvTable) {
    const totalVal = new Map<string, number>();
    for (const row of imprvTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid) continue;
      const val = parseFloat((row.imprv_val || "0").replace(/[,$]/g, "")) || 0;
      totalVal.set(pid, (totalVal.get(pid) || 0) + val);
    }
    
    for (const row of imprvTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid) continue;
      const la = parseFloat(row.living_area || "") || null;
      const yb = parseFloat(row.actual_year_built || "") || null;
      const existing = imprvByProp.get(pid);
      
      if (!existing || (la && (!existing.living_area || la > existing.living_area))) {
        imprvByProp.set(pid, {
          living_area: la,
          year_built: yb,
          imprv_val: parseFloat((row.imprv_val || "0").replace(/[,$]/g, "")) || 0,
          imprv_id: row.imprv_id || "",
          total_imprv_val: totalVal.get(pid) || 0,
        });
      }
    }
  }
  
  // Improvement items: beds/baths by imprv_id (and prop_id)
  const itemsByImprv = new Map<string, { bedrooms: number | null; bathrooms: number | null }>();
  const itemsByProp = new Map<string, { bedrooms: number | null; bathrooms: number | null }>();
  if (imprvItemsTable) {
    for (const row of imprvItemsTable.rows) {
      const iid = row.imprv_id?.trim();
      const pid = row.prop_id?.trim();
      const beds = parseFloat(row.bedrooms || "") || null;
      const baths = parseFloat(row.baths || "") || null;
      const halfBaths = parseFloat(row.halfbath || "") || null;
      const totalBaths = baths != null ? baths + (halfBaths ? halfBaths * 0.5 : 0) : null;
      
      if (beds || totalBaths) {
        if (iid) {
          const existing = itemsByImprv.get(iid);
          if (!existing || (beds && !existing.bedrooms)) {
            itemsByImprv.set(iid, { bedrooms: beds, bathrooms: totalBaths });
          }
        }
        if (pid) {
          const existing = itemsByProp.get(pid);
          if (!existing || (beds && !existing.bedrooms)) {
            itemsByProp.set(pid, { bedrooms: beds, bathrooms: totalBaths });
          }
        }
      }
    }
  }
  
  // Improvement details: aggregate living area and condition by prop_id
  const detailsByProp = new Map<string, { living_area: number; below_grade: number; condition: string | null; year_built: number | null; num_stories: number | null }>();
  if (imprvDetailsTable) {
    for (const row of imprvDetailsTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid) continue;
      const detType = (row.imprv_det_type_cd || row.imprv_det_desc || "").trim().toUpperCase();
      const isMainArea = detType.includes("MA") || detType.includes("MAIN AREA");
      const area = parseFloat((row.imprv_det_area || "0").replace(/[,]/g, "")) || 0;
      const la = parseFloat((row.living_area || "0").replace(/[,]/g, "")) || 0;
      const bla = parseFloat((row.below_grade_living_area || "0").replace(/[,]/g, "")) || 0;
      const existing = detailsByProp.get(pid) || { living_area: 0, below_grade: 0, condition: null, year_built: null, num_stories: null };
      
      // Sum living area from rows that have it, or from MA-type rows
      if (la > 0) {
        existing.living_area = Math.max(existing.living_area, la);
      } else if (isMainArea && area > 0) {
        existing.living_area = Math.max(existing.living_area, area);
      }
      if (bla > 0) existing.below_grade = Math.max(existing.below_grade, bla);
      
      const cond = row.condition_cd?.trim();
      if (cond && cond !== "" && !existing.condition) existing.condition = cond;
      
      const yb = parseInt(row.yr_built || "") || null;
      if (yb && (!existing.year_built || yb > existing.year_built)) existing.year_built = yb;
      
      const stories = parseFloat(row.num_stories || "") || null;
      if (stories && !existing.num_stories) existing.num_stories = stories;
      
      detailsByProp.set(pid, existing);
    }
  }
  
  // Prop val: master valuation record with neighborhood codes, property class, assessed values
  const propValByProp = new Map<string, { hood_cd: string | null; property_use_cd: string | null; property_use_desc: string | null; appraised_val: number; assessed_val: number; land_hstd: number; land_non_hstd: number; imprv_hstd: number; imprv_non_hstd: number; legal_acreage: number | null; geo_id: string | null }>();
  if (propValTable) {
    for (const row of propValTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid) continue;
      propValByProp.set(pid, {
        hood_cd: row.hood_cd?.trim() || null,
        property_use_cd: row.property_use_cd?.trim() || null,
        property_use_desc: row.property_use_desc?.trim() || null,
        appraised_val: parseFloat((row.appraised_val || "0").replace(/[,$]/g, "")) || 0,
        assessed_val: parseFloat((row.assessed_val || "0").replace(/[,$]/g, "")) || 0,
        land_hstd: parseFloat((row.land_hstd_val || "0").replace(/[,$]/g, "")) || 0,
        land_non_hstd: parseFloat((row.land_non_hstd_val || "0").replace(/[,$]/g, "")) || 0,
        imprv_hstd: parseFloat((row.imprv_hstd_val || "0").replace(/[,$]/g, "")) || 0,
        imprv_non_hstd: parseFloat((row.imprv_non_hstd_val || "0").replace(/[,$]/g, "")) || 0,
        legal_acreage: parseFloat((row.legal_acreage || "").replace(/[,]/g, "")) || null,
        geo_id: row.geo_id?.trim() || null,
      });
    }
  }

  // Land: sum acres per prop_id
  const landByProp = new Map<string, number>();
  if (landTable) {
    for (const row of landTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid) continue;
      const sqft = parseFloat((row.size_square_feet || "").replace(/[,]/g, "")) || 0;
      const acres = parseFloat((row.size_acres || "").replace(/[,]/g, "")) || 0;
      const area = sqft > 0 ? sqft : (acres > 0 ? Math.round(acres * 43560) : 0);
      if (area > 0) {
        landByProp.set(pid, (landByProp.get(pid) || 0) + area);
      }
    }
  }
  
  // ---- Build unified parcels from situs as base ----
  const parcels: UnifiedParcel[] = [];
  const seenPropIds = new Set<string>();
  
  if (situsTable) {
    for (const row of situsTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid || seenPropIds.has(pid)) continue;
      seenPropIds.add(pid);
      
      const imprv = imprvByProp.get(pid);
      const imprvId = imprv?.imprv_id || "";
      const items = (imprvId && itemsByImprv.get(imprvId)) || itemsByProp.get(pid);
      const details = detailsByProp.get(pid);
      const landArea = landByProp.get(pid) || null;
      const rollVal = latestRollByProp.get(pid);
      const pv = propValByProp.get(pid);
      
      const address = (row.situs_display || "").trim();
      if (!address || address === "") continue;
      
      // Value priority: prop_val > roll_value_history > imprv totals
      const assessedValue = pv?.assessed_val || rollVal?.assessed_val || imprv?.total_imprv_val || 0;
      const improvementValue = pv ? (pv.imprv_hstd + pv.imprv_non_hstd) || rollVal?.improvement_value || null : rollVal?.improvement_value ?? imprv?.total_imprv_val ?? null;
      const landValue = pv ? (pv.land_hstd + pv.land_non_hstd) || rollVal?.land_value || null : rollVal?.land_value ?? null;
      
      // Living area: prefer imprv table, fall back to imprv_details aggregation
      const buildingArea = imprv?.living_area || details?.living_area || null;
      const yearBuilt = imprv?.year_built || details?.year_built || null;
      
      // Land area: prefer land_detail, fall back to prop_val legal_acreage
      const effectiveLandArea = landArea || (pv?.legal_acreage ? Math.round(pv.legal_acreage * 43560) : null);
      
      parcels.push({
        parcel_number: pid,
        address: address || "UNKNOWN",
        city: row.situs_city?.trim() || null,
        state: row.situs_state?.trim() || null,
        zip_code: row.situs_zip?.trim() || null,
        assessed_value: assessedValue,
        improvement_value: improvementValue,
        land_value: landValue,
        building_area: buildingArea,
        year_built: yearBuilt,
        bedrooms: items?.bedrooms || null,
        bathrooms: items?.bathrooms || null,
        land_area: effectiveLandArea,
        property_class: pv?.property_use_cd || null,
        neighborhood_code: pv?.hood_cd || null,
      });
    }
  }
  
  // ---- Build permits ----
  const permits: UnifiedPermit[] = [];
  if (permitsTable) {
    for (const row of permitsTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid) continue;
      
      const permitNum = (row.bldg_permit_num || row.bldg_permit_id || "").trim();
      if (!permitNum) continue;
      
      const issueDate = row.bldg_permit_issue_dt?.trim();
      let formattedDate = new Date().toISOString().split("T")[0];
      if (issueDate) {
        const d = new Date(issueDate);
        if (!isNaN(d.getTime())) formattedDate = d.toISOString().split("T")[0];
      }
      
      permits.push({
        parcel_number: pid,
        permit_number: permitNum,
        permit_type: (row.bldg_permit_type_cd || "OTHER").trim(),
        status: (row.bldg_permit_status || row.cad_status_description || "UNKNOWN").trim(),
        description: (row.bld_permit_desc || row.bldg_permit_cmnt || "").trim() || null,
        application_date: formattedDate,
        estimated_value: parseFloat((row.bldg_permit_val || "").replace(/[,$]/g, "")) || null,
      });
    }
  }
  
  // ---- Build exemptions ----
  const exemptions: UnifiedExemption[] = [];
  if (exemptTable) {
    for (const row of exemptTable.rows) {
      const pid = row.prop_id?.trim();
      if (!pid) continue;
      
      const type = (row.exmpt_type_cd || "").trim();
      if (!type) continue;
      
      exemptions.push({
        parcel_number: pid,
        exemption_type: type,
        exemption_subtype: (row.exmpt_subtype_cd || "").trim() || null,
        exemption_percentage: parseFloat(row.exemption_pct || "") || null,
      });
    }
  }
  
  return {
    parcels,
    permits,
    assessments: allAssessments,
    exemptions,
    stats: {
      situsCount: situsTable?.rowCount || 0,
      imprvCount: imprvTable?.rowCount || 0,
      imprvItemsCount: imprvItemsTable?.rowCount || 0,
      imprvDetailsCount: imprvDetailsTable?.rowCount || 0,
      landCount: landTable?.rowCount || 0,
      ownerCount: tables.find(t => t.type === "owner")?.rowCount || 0,
      permitCount: permitsTable?.rowCount || 0,
      rollValueCount: rollValueTable?.rowCount || 0,
      exemptCount: exemptTable?.rowCount || 0,
      linkedOwnerCount: tables.find(t => t.type === "linked_owners")?.rowCount || 0,
      sketchCount: tables.find(t => t.type === "sketches")?.rowCount || 0,
      imageCount: tables.find(t => t.type === "images")?.rowCount || 0,
      propValCount: propValTable?.rowCount || 0,
      joinedParcels: parcels.length,
      joinedPermits: permits.length,
      joinedAssessments: allAssessments.length,
      joinedExemptions: exemptions.length,
    },
  };
}

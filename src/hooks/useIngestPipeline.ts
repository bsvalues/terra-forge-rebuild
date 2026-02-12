import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export type IngestStep = "select" | "upload" | "mapping" | "validate" | "preview" | "publish" | "complete";
export type TargetTable = "parcels" | "sales" | "assessments";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  fileSize: number;
  rowCount: number;
}

export interface FieldMapping {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
  isHolyTrinity: boolean;
}

export interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  issues: { row: number; field: string; message: string; severity: "error" | "warning" }[];
  fieldCompleteness: Record<string, number>;
}

// Alias memory: common county field names → canonical target fields
const FIELD_ALIASES: Record<string, string[]> = {
  parcel_number: ["parid", "apn", "parcel_id", "parcelid", "parcel_number", "parcel_no", "parcelno", "pin", "pid", "property_id", "prop_id", "account_number", "acct_no", "tax_id"],
  address: ["situs", "situs_address", "situsaddress", "situs_display", "prop_addr", "property_address", "street_address", "location", "address", "addr", "situs_addr"],
  city: ["situs_city", "city", "situscity", "prop_city"],
  state: ["situs_state", "state", "situsstate", "prop_state"],
  zip_code: ["situs_zip", "zip", "zipcode", "zip_code", "situszip", "postal"],
  property_class: ["prop_class", "property_class", "class", "class_code", "use_code", "land_use", "prop_type", "property_type", "property_use_cd", "property_use_desc"],
  assessed_value: ["total_value", "totalvalue", "total_assessed", "assessed_value", "assessedvalue", "tot_val", "appraised_value", "market_value", "mkt_val", "fmv", "totalmarketvalue", "total_market_value"],
  land_value: ["land_value", "landvalue", "land_val", "land_assessed", "landval"],
  improvement_value: ["improvement_value", "improvementvalue", "impr_value", "impr_val", "bldg_value", "building_value", "impval", "imprv_adjval"],
  land_area: ["land_area", "landarea", "lot_size", "lotsize", "lot_area", "acreage", "acres", "sqft_lot", "land_sqft", "totalacres"],
  building_area: ["building_area", "buildingarea", "sqft", "square_feet", "bldg_sqft", "living_area", "heated_sqft", "gross_area", "total_sqft", "totalarea"],
  year_built: ["year_built", "yearbuilt", "yr_built", "yrbuilt", "built_year"],
  bedrooms: ["bedrooms", "beds", "bed", "bedrms", "num_beds"],
  bathrooms: ["bathrooms", "baths", "bath", "bathrms", "num_baths", "full_baths"],
  neighborhood_code: ["neighborhood", "nbhd", "nbhd_code", "neighborhood_code", "nghbrhd", "area_code"],
  // Sales fields
  sale_date: ["sale_date", "saledate", "sold_date", "closing_date", "transfer_date", "recording_date", "rec_date"],
  sale_price: ["sale_price", "saleprice", "sale_amt", "sold_price", "consideration", "sale_amount", "price", "adjustedsaleprice", "originalsaleprice"],
  sale_type: ["sale_type", "saletype", "transaction_type", "conv_type", "sl_ratio_type_cd"],
  grantor: ["grantor", "seller", "seller_name", "from_name"],
  grantee: ["grantee", "buyer", "buyer_name", "to_name"],
  deed_type: ["deed_type", "deedtype", "instrument_type", "doc_type", "deed_type_cd"],
  instrument_number: ["instrument_number", "instrument_no", "doc_number", "doc_no", "recording_number", "book_page", "excise_number"],
  is_qualified: ["qualified", "is_qualified", "arms_length", "valid_sale", "qual_sale"],
  // Assessment fields
  tax_year: ["tax_year", "taxyear", "year", "assessment_year", "roll_year"],
  // Spatial fields
  latitude: ["latitude", "lat", "ycoord", "y_coord", "y"],
  longitude: ["longitude", "lng", "lon", "xcoord", "x_coord", "x"],
};

const HOLY_TRINITY: Record<TargetTable, string[]> = {
  parcels: ["parcel_number", "assessed_value", "address"],
  sales: ["parcel_number", "sale_price", "sale_date"],
  assessments: ["parcel_number", "total_value", "tax_year"],
};

const TARGET_SCHEMAS: Record<TargetTable, { name: string; label: string; type: string }[]> = {
  parcels: [
    { name: "parcel_number", label: "Parcel Number", type: "string" },
    { name: "address", label: "Situs Address", type: "string" },
    { name: "city", label: "City", type: "string" },
    { name: "state", label: "State", type: "string" },
    { name: "zip_code", label: "ZIP Code", type: "string" },
    { name: "property_class", label: "Property Class", type: "string" },
    { name: "assessed_value", label: "Total Assessed Value", type: "number" },
    { name: "land_value", label: "Land Value", type: "number" },
    { name: "improvement_value", label: "Improvement Value", type: "number" },
    { name: "land_area", label: "Land Area (sqft)", type: "number" },
    { name: "building_area", label: "Building Area (sqft)", type: "number" },
    { name: "year_built", label: "Year Built", type: "number" },
    { name: "bedrooms", label: "Bedrooms", type: "number" },
    { name: "bathrooms", label: "Bathrooms", type: "number" },
    { name: "neighborhood_code", label: "Neighborhood Code", type: "string" },
    { name: "latitude", label: "Latitude", type: "number" },
    { name: "longitude", label: "Longitude", type: "number" },
  ],
  sales: [
    { name: "parcel_number", label: "Parcel Number (join key)", type: "string" },
    { name: "sale_date", label: "Sale Date", type: "date" },
    { name: "sale_price", label: "Sale Price", type: "number" },
    { name: "sale_type", label: "Sale Type", type: "string" },
    { name: "grantor", label: "Grantor (Seller)", type: "string" },
    { name: "grantee", label: "Grantee (Buyer)", type: "string" },
    { name: "deed_type", label: "Deed Type", type: "string" },
    { name: "instrument_number", label: "Instrument Number", type: "string" },
    { name: "is_qualified", label: "Qualified Sale", type: "boolean" },
  ],
  assessments: [
    { name: "parcel_number", label: "Parcel Number (join key)", type: "string" },
    { name: "tax_year", label: "Tax Year", type: "number" },
    { name: "land_value", label: "Land Value", type: "number" },
    { name: "improvement_value", label: "Improvement Value", type: "number" },
    { name: "total_value", label: "Total Value", type: "number" },
    { name: "assessment_date", label: "Assessment Date", type: "date" },
    { name: "assessment_reason", label: "Assessment Reason", type: "string" },
  ],
};

export function useIngestPipeline() {
  const { profile } = useAuthContext();
  const [step, setStep] = useState<IngestStep>("select");
  const [targetTable, setTargetTable] = useState<TargetTable>("parcels");
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);

  const schema = TARGET_SCHEMAS[targetTable];
  const holyTrinity = HOLY_TRINITY[targetTable];

  const parseFile = useCallback(async (file: File) => {
    return new Promise<ParsedFile>((resolve, reject) => {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
              reject(new Error("No sheets found in workbook"));
              return;
            }
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
            if (jsonData.length === 0) {
              reject(new Error("No data found in spreadsheet"));
              return;
            }
            const headers = Object.keys(jsonData[0]);
            // Convert all values to strings for consistent mapping
            const rows = jsonData.map(row => {
              const stringRow: Record<string, string> = {};
              for (const key of headers) {
                stringRow[key] = row[key] != null ? String(row[key]) : "";
              }
              return stringRow;
            });
            resolve({
              headers,
              rows,
              fileName: file.name,
              fileSize: file.size,
              rowCount: rows.length,
            });
          } catch (err: any) {
            reject(new Error(`Failed to parse Excel file: ${err.message}`));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          if (!results.meta.fields || results.meta.fields.length === 0) {
            reject(new Error("No columns detected in file"));
            return;
          }
          resolve({
            headers: results.meta.fields,
            rows: results.data as Record<string, string>[],
            fileName: file.name,
            fileSize: file.size,
            rowCount: results.data.length,
          });
        },
        error: (err) => reject(err),
      });
    });
  }, []);

  const autoMapFields = useCallback((headers: string[]): FieldMapping[] => {
    const results: FieldMapping[] = [];
    const usedTargets = new Set<string>();

    for (const header of headers) {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
      
      let bestMatch: { target: string; confidence: number } | null = null;

      for (const field of schema) {
        const aliases = FIELD_ALIASES[field.name] || [field.name];
        
        // Exact match
        if (aliases.includes(normalized)) {
          bestMatch = { target: field.name, confidence: 1.0 };
          break;
        }
        
        // Partial match
        for (const alias of aliases) {
          if (normalized.includes(alias) || alias.includes(normalized)) {
            const conf = Math.max(alias.length, normalized.length) > 0
              ? Math.min(alias.length, normalized.length) / Math.max(alias.length, normalized.length) * 0.8
              : 0;
            if (!bestMatch || conf > bestMatch.confidence) {
              bestMatch = { target: field.name, confidence: conf };
            }
          }
        }
      }

      if (bestMatch && bestMatch.confidence >= 0.5 && !usedTargets.has(bestMatch.target)) {
        usedTargets.add(bestMatch.target);
        results.push({
          sourceColumn: header,
          targetColumn: bestMatch.target,
          confidence: bestMatch.confidence,
          isHolyTrinity: holyTrinity.includes(bestMatch.target),
        });
      } else {
        results.push({
          sourceColumn: header,
          targetColumn: "",
          confidence: 0,
          isHolyTrinity: false,
        });
      }
    }

    return results;
  }, [schema, holyTrinity]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);

      // Upload to storage
      const filePath = `${profile?.county_id || "default"}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("data-imports")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Continue anyway — file is parsed in memory
      }

      // Create ingest job record
      const { data: job, error: jobError } = await supabase
        .from("ingest_jobs")
        .insert({
          county_id: profile?.county_id || "",
          user_id: profile?.user_id || "",
          file_name: file.name,
          file_path: filePath,
          file_size_bytes: file.size,
          target_table: targetTable,
          status: "uploaded",
          row_count: parsed.rowCount,
        })
        .select()
        .single();

      if (!jobError && job) {
        setJobId(job.id);
      }

      // Auto-map fields
      const autoMappings = autoMapFields(parsed.headers);
      setMappings(autoMappings);
      setStep("mapping");
      
      toast.success(`Parsed ${parsed.rowCount.toLocaleString()} rows from ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse file");
    }
  }, [parseFile, autoMapFields, profile, targetTable]);

  const validateData = useCallback(() => {
    if (!parsedFile) return;

    const activeMapping = mappings.filter(m => m.targetColumn);
    const issues: ValidationResult["issues"] = [];
    const fieldCompleteness: Record<string, number> = {};
    let validRows = 0;
    let invalidRows = 0;

    // Check field completeness
    for (const mapping of activeMapping) {
      let filled = 0;
      for (const row of parsedFile.rows) {
        const val = row[mapping.sourceColumn];
        if (val !== null && val !== undefined && val !== "") filled++;
      }
      fieldCompleteness[mapping.targetColumn] = (filled / parsedFile.rowCount) * 100;
    }

    // Validate each row
    for (let i = 0; i < Math.min(parsedFile.rowCount, 1000); i++) {
      const row = parsedFile.rows[i];
      let rowValid = true;

      for (const mapping of activeMapping) {
        const val = row[mapping.sourceColumn];
        const field = schema.find(f => f.name === mapping.targetColumn);
        if (!field) continue;

        // Required field check (Holy Trinity)
        if (holyTrinity.includes(mapping.targetColumn) && (!val || val === "")) {
          issues.push({ row: i + 1, field: mapping.targetColumn, message: `Missing required field: ${field.label}`, severity: "error" });
          rowValid = false;
        }

        // Type checks
        if (val && field.type === "number") {
          const num = parseFloat(String(val).replace(/[,$]/g, ""));
          if (isNaN(num)) {
            issues.push({ row: i + 1, field: mapping.targetColumn, message: `Invalid number: "${val}"`, severity: "error" });
            rowValid = false;
          } else if (mapping.targetColumn === "assessed_value" && num < 0) {
            issues.push({ row: i + 1, field: mapping.targetColumn, message: `Negative assessed value: ${num}`, severity: "warning" });
          } else if (mapping.targetColumn === "year_built" && (num < 1700 || num > 2030)) {
            issues.push({ row: i + 1, field: mapping.targetColumn, message: `Unusual year built: ${num}`, severity: "warning" });
          } else if (mapping.targetColumn === "sale_price" && num <= 0) {
            issues.push({ row: i + 1, field: mapping.targetColumn, message: `Zero/negative sale price`, severity: "error" });
            rowValid = false;
          }
        }

        if (val && field.type === "date") {
          const date = new Date(val);
          if (isNaN(date.getTime())) {
            issues.push({ row: i + 1, field: mapping.targetColumn, message: `Invalid date: "${val}"`, severity: "error" });
            rowValid = false;
          }
        }
      }

      if (rowValid) validRows++;
      else invalidRows++;
    }

    // If we only checked a sample, extrapolate
    const sampledRatio = Math.min(parsedFile.rowCount, 1000) / parsedFile.rowCount;
    const result: ValidationResult = {
      totalRows: parsedFile.rowCount,
      validRows: sampledRatio < 1 ? Math.round(validRows / sampledRatio) : validRows,
      invalidRows: sampledRatio < 1 ? Math.round(invalidRows / sampledRatio) : invalidRows,
      issues: issues.slice(0, 100), // Cap at 100 displayed issues
      fieldCompleteness,
    };

    setValidation(result);

    // Update job status
    if (jobId) {
      supabase.from("ingest_jobs").update({
        status: "validating",
        column_mapping: Object.fromEntries(mappings.filter(m => m.targetColumn).map(m => [m.sourceColumn, m.targetColumn])),
        validation_results: { validRows: result.validRows, invalidRows: result.invalidRows, issueCount: result.issues.length },
      }).eq("id", jobId).then(() => {});
    }

    setStep("validate");
  }, [parsedFile, mappings, schema, holyTrinity, jobId]);

  const publishData = useCallback(async () => {
    if (!parsedFile || !profile?.county_id) return;

    setPublishing(true);
    setPublishProgress(0);
    setStep("publish");

    const activeMapping = mappings.filter(m => m.targetColumn);
    const BATCH_SIZE = 100;
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    // For sales, we need to join parcel_number → parcel_id
    let parcelLookup: Record<string, string> = {};
    if (targetTable === "sales" || targetTable === "assessments") {
      const { data: parcels } = await supabase
        .from("parcels")
        .select("id, parcel_number")
        .eq("county_id", profile.county_id);
      if (parcels) {
        parcelLookup = Object.fromEntries(parcels.map(p => [p.parcel_number, p.id]));
      }
    }

    for (let i = 0; i < parsedFile.rowCount; i += BATCH_SIZE) {
      const batch = parsedFile.rows.slice(i, i + BATCH_SIZE);
      const records: Record<string, unknown>[] = [];

      for (const row of batch) {
        const record: Record<string, unknown> = { county_id: profile.county_id };
        let skip = false;

        for (const mapping of activeMapping) {
          let val: unknown = row[mapping.sourceColumn];
          const field = schema.find(f => f.name === mapping.targetColumn);
          if (!field || val === "" || val === null || val === undefined) continue;

          if (field.type === "number") {
            val = parseFloat(String(val).replace(/[,$]/g, ""));
            if (isNaN(val as number)) val = null;
          }
          if (field.type === "boolean") {
            const s = String(val).toLowerCase();
            val = ["true", "yes", "1", "y"].includes(s);
          }
          if (field.type === "date") {
            const d = new Date(String(val));
            if (!isNaN(d.getTime())) val = d.toISOString().split("T")[0];
            else val = null;
          }

          // For sales/assessments, convert parcel_number to parcel_id
          if (mapping.targetColumn === "parcel_number" && (targetTable === "sales" || targetTable === "assessments")) {
            const pid = parcelLookup[String(val)];
            if (pid) {
              record["parcel_id"] = pid;
            } else {
              skip = true;
              break;
            }
            continue;
          }

          record[mapping.targetColumn] = val;
        }

        if (!skip) records.push(record);
        else failed++;
      }

      if (records.length > 0) {
        const table = targetTable === "assessments" ? "assessments" : targetTable;
        const { error } = await supabase.from(table).upsert(records as any[], {
          onConflict: targetTable === "parcels" ? "county_id,parcel_number" : undefined,
        });

        if (error) {
          // Fallback: insert one by one
          for (const record of records) {
            const { error: singleErr } = await supabase.from(table).insert(record as any);
            if (singleErr) {
              failed++;
              errors.push(singleErr.message);
            } else {
              imported++;
            }
          }
        } else {
          imported += records.length;
        }
      }

      setPublishProgress(Math.round(((i + BATCH_SIZE) / parsedFile.rowCount) * 100));
    }

    // Update job
    if (jobId) {
      await supabase.from("ingest_jobs").update({
        status: "complete",
        rows_imported: imported,
        rows_failed: failed,
        errors: errors.slice(0, 50),
      }).eq("id", jobId);
    }

    setPublishProgress(100);
    setPublishing(false);
    setStep("complete");
    toast.success(`Published ${imported.toLocaleString()} records. ${failed > 0 ? `${failed} failed.` : ""}`);
  }, [parsedFile, mappings, schema, profile, targetTable, jobId]);

  const reset = useCallback(() => {
    setStep("select");
    setParsedFile(null);
    setMappings([]);
    setValidation(null);
    setJobId(null);
    setPublishing(false);
    setPublishProgress(0);
  }, []);

  return {
    step, setStep,
    targetTable, setTargetTable,
    parsedFile,
    mappings, setMappings,
    validation,
    jobId,
    publishing, publishProgress,
    schema, holyTrinity,
    handleFileUpload,
    validateData,
    publishData,
    reset,
  };
}

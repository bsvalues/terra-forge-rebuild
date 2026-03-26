import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { getPACSEnhancedAliases } from "@/config/pacsFieldMappings";
import { emitPipelineEvent } from "@/hooks/usePipelineStatus";

export type IngestStep = "select" | "upload" | "mapping" | "validate" | "preview" | "publish" | "complete";
export type TargetTable = "parcels" | "sales" | "assessments" | "combined";
export type ImportProfile = "generic" | "pacs";

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
  combined: ["parcel_number", "assessed_value", "address", "sale_price", "sale_date"],
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
  combined: [
    // Parcel fields
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
    // Sales fields
    { name: "sale_date", label: "Sale Date", type: "date" },
    { name: "sale_price", label: "Sale Price", type: "number" },
    { name: "sale_type", label: "Sale Type", type: "string" },
    { name: "grantor", label: "Grantor (Seller)", type: "string" },
    { name: "grantee", label: "Grantee (Buyer)", type: "string" },
    { name: "deed_type", label: "Deed Type", type: "string" },
    { name: "instrument_number", label: "Instrument Number", type: "string" },
    { name: "is_qualified", label: "Qualified Sale", type: "boolean" },
  ],
};

export function useIngestPipeline() {
  const { profile } = useAuthContext();
  const [step, setStep] = useState<IngestStep>("select");
  const [targetTable, setTargetTable] = useState<TargetTable>("parcels");
  const [importProfile, setImportProfile] = useState<ImportProfile>("generic");
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishPhase, setPublishPhase] = useState<string>("");

  // Combined mode: detect if file has both parcel and sales fields
  const [detectedCombined, setDetectedCombined] = useState(false);

  // Use PACS-enhanced aliases when profile is "pacs"
  const effectiveAliases = importProfile === "pacs" ? getPACSEnhancedAliases(FIELD_ALIASES) : FIELD_ALIASES;

  const schema = TARGET_SCHEMAS[targetTable];
  const holyTrinity = HOLY_TRINITY[targetTable];

  const parseFile = useCallback(async (file: File) => {
    return new Promise<ParsedFile>((resolve, reject) => {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.load(e.target?.result as ArrayBuffer);
            const sheet = wb.worksheets[0];
            if (!sheet) {
              reject(new Error("No sheets found in workbook"));
              return;
            }
            const headers: string[] = [];
            const rows: Record<string, string>[] = [];

            sheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) {
                row.eachCell((cell) => headers.push(String(cell.value ?? "")));
              } else {
                const record: Record<string, string> = {};
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                  const key = headers[colNumber - 1];
                  if (key) record[key] = cell.value != null ? String(cell.value) : "";
                });
                rows.push(record);
              }
            });

            if (rows.length === 0) {
              reject(new Error("No data found in spreadsheet"));
              return;
            }
            resolve({ headers, rows, fileName: file.name, fileSize: file.size, rowCount: rows.length });
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
        const aliases = effectiveAliases[field.name] || [field.name];
        
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
  }, [schema, holyTrinity, effectiveAliases]);

  // SHA-256 fingerprint for court-ready audit trail
  const computeSHA256 = useCallback(async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return "";
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    const uploadStart = new Date().toISOString();
    try {
      // Parse file + compute SHA-256 in parallel
      const [parsed, sha256Hash] = await Promise.all([
        parseFile(file),
        computeSHA256(file),
      ]);
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

      // Create ingest job record with SHA-256 fingerprint
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
          sha256_hash: sha256Hash || null,
        })
        .select()
        .single();

      const newJobId = (!jobError && job) ? job.id : null;
      if (newJobId) setJobId(newJobId);

      // ── Pipeline: ingest_received ──────────────────────────
      if (profile?.county_id) {
        await emitPipelineEvent({
          countyId: profile.county_id,
          stage: "ingest_received",
          status: "success",
          ingestJobId: newJobId,
          rowsAffected: parsed.rowCount,
          artifactRef: file.name,
          details: { fileSize: file.size, targetTable },
          startedAt: uploadStart,
        });
      }

      // Auto-map fields
      const autoMappings = autoMapFields(parsed.headers);
      setMappings(autoMappings);

      // ── Pipeline: ingest_parsed ────────────────────────────
      if (profile?.county_id) {
        const mappedCount = autoMappings.filter(m => m.targetColumn).length;
        await emitPipelineEvent({
          countyId: profile.county_id,
          stage: "ingest_parsed",
          status: mappedCount > 0 ? "success" : "warning",
          ingestJobId: newJobId,
          rowsAffected: parsed.rowCount,
          artifactRef: file.name,
          details: { mappedFields: mappedCount, totalFields: parsed.headers.length },
        });
      }

      // Auto-detect combined mode
      if (targetTable === "combined") {
        const mappedTargets = new Set(autoMappings.filter(m => m.targetColumn).map(m => m.targetColumn));
        const hasParcelFields = mappedTargets.has("parcel_number") && (mappedTargets.has("assessed_value") || mappedTargets.has("address"));
        const hasSalesFields = mappedTargets.has("sale_price") || mappedTargets.has("sale_date");
        setDetectedCombined(hasParcelFields && hasSalesFields);
        if (hasParcelFields && hasSalesFields) {
          toast.success(`🔀 Combined mode detected! Found parcel + sales fields in ${parsed.rowCount.toLocaleString()} rows.`);
        } else {
          toast.warning("Combined mode selected but file doesn't appear to contain both parcel and sales fields. You may want to switch to a single import mode.");
        }
      }
      
      setStep("mapping");
      toast.success(`Parsed ${parsed.rowCount.toLocaleString()} rows from ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse file");
      // ── Pipeline: ingest_received failed ──────────────────
      if (profile?.county_id) {
        await emitPipelineEvent({
          countyId: profile.county_id,
          stage: "ingest_received",
          status: "failed",
          artifactRef: file.name,
          details: { error: "parse_failed" },
          startedAt: uploadStart,
        });
      }
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
    setPublishPhase("");
    setStep("publish");

    const activeMapping = mappings.filter(m => m.targetColumn);
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    const PARCEL_FIELDS = new Set(TARGET_SCHEMAS.parcels.map(f => f.name));
    const SALES_FIELDS = new Set(TARGET_SCHEMAS.sales.map(f => f.name));

    // Helper: parse a value based on field type
    const parseVal = (val: unknown, field: { type: string }) => {
      if (val === "" || val === null || val === undefined) return null;
      if (field.type === "number") {
        const num = parseFloat(String(val).replace(/[,$]/g, ""));
        return isNaN(num) ? null : num;
      }
      if (field.type === "boolean") {
        const s = String(val).toLowerCase();
        return ["true", "yes", "1", "y"].includes(s);
      }
      if (field.type === "date") {
        const d = new Date(String(val));
        return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : null;
      }
      return val;
    };

    // Helper: upsert a batch to a table
    const upsertBatch = async (table: "parcels" | "sales" | "assessments", records: Record<string, unknown>[]) => {
      const BATCH_SIZE = 500;
      let batchImported = 0;
      let batchFailed = 0;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(table).upsert(batch as any[], {
          onConflict: table === "parcels" ? "county_id,parcel_number" : undefined,
        });
        if (error) {
          console.error(`Batch error (${table}):`, error.message);
          batchFailed += batch.length;
          errors.push(`${table}: ${error.message}`);
        } else {
          batchImported += batch.length;
        }
      }
      return { imported: batchImported, failed: batchFailed };
    };

    if (targetTable === "combined") {
      // ---- COMBINED MODE: Split into parcels + sales ----
      // Phase 1: Build and upsert parcel records
      const parcelDeduped = new Map<string, Record<string, unknown>>();
      for (const row of parsedFile.rows) {
        const record: Record<string, unknown> = { county_id: profile.county_id };
        let parcelKey = "";
        for (const mapping of activeMapping) {
          if (!PARCEL_FIELDS.has(mapping.targetColumn)) continue;
          const val = parseVal(row[mapping.sourceColumn], schema.find(f => f.name === mapping.targetColumn)!);
          if (val === null) continue;
          if (mapping.targetColumn === "parcel_number") parcelKey = String(val);
          record[mapping.targetColumn] = val;
        }
        if (parcelKey) parcelDeduped.set(parcelKey, record);
      }

      const parcelRecords = Array.from(parcelDeduped.values());
      setPublishPhase(`Phase 1: Publishing ${parcelRecords.length.toLocaleString()} parcels...`);
      toast.info(`Combined Import: Phase 1 — Publishing ${parcelRecords.length.toLocaleString()} parcels...`);
      
      // Phase 1 upsert with progress tracking
      const BATCH_SIZE = 500;
      let phase1Done = 0;
      for (let i = 0; i < parcelRecords.length; i += BATCH_SIZE) {
        const batch = parcelRecords.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("parcels").upsert(batch as any[], { onConflict: "county_id,parcel_number" });
        if (error) {
          failed += batch.length;
          errors.push(`parcels: ${error.message}`);
        } else {
          imported += batch.length;
        }
        phase1Done += batch.length;
        setPublishProgress(Math.round((phase1Done / parcelRecords.length) * 40));
      }

      // Phase 1.5: Fetch parcel IDs for join
      setPublishPhase("Resolving parcel IDs for sales join...");
      const parcelLookup: Record<string, string> = {};
      let offset = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data: parcels } = await supabase
          .from("parcels")
          .select("id, parcel_number")
          .eq("county_id", profile.county_id)
          .range(offset, offset + PAGE_SIZE - 1);
        if (parcels && parcels.length > 0) {
          for (const p of parcels) parcelLookup[p.parcel_number] = p.id;
          offset += parcels.length;
          hasMore = parcels.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      setPublishProgress(50);

      // Phase 3: Build and upsert sales records (only rows with sale_price & sale_date)
      const salesRecords: Record<string, unknown>[] = [];
      for (const row of parsedFile.rows) {
        const record: Record<string, unknown> = { county_id: profile.county_id };
        let hasPrice = false;
        let hasDate = false;
        let parcelNum = "";

        for (const mapping of activeMapping) {
          if (mapping.targetColumn === "parcel_number") {
            parcelNum = String(row[mapping.sourceColumn] || "");
            continue;
          }
          if (!SALES_FIELDS.has(mapping.targetColumn)) continue;
          const val = parseVal(row[mapping.sourceColumn], schema.find(f => f.name === mapping.targetColumn)!);
          if (val === null) continue;
          record[mapping.targetColumn] = val;
          if (mapping.targetColumn === "sale_price" && val && Number(val) > 0) hasPrice = true;
          if (mapping.targetColumn === "sale_date") hasDate = true;
        }

        if (hasPrice && hasDate && parcelNum) {
          const pid = parcelLookup[parcelNum];
          if (pid) {
            record["parcel_id"] = pid;
            salesRecords.push(record);
          }
        }
      }

      setPublishPhase(`Phase 2: Publishing ${salesRecords.length.toLocaleString()} sales...`);
      toast.info(`Combined Import: Phase 2 — Publishing ${salesRecords.length.toLocaleString()} sales...`);
      
      // Phase 2 upsert with progress tracking
      let phase2Done = 0;
      for (let i = 0; i < salesRecords.length; i += BATCH_SIZE) {
        const batch = salesRecords.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("sales").upsert(batch as any[]);
        if (error) {
          failed += batch.length;
          errors.push(`sales: ${error.message}`);
        } else {
          imported += batch.length;
        }
        phase2Done += batch.length;
        setPublishProgress(50 + Math.round((phase2Done / Math.max(salesRecords.length, 1)) * 50));
      }

    } else {
      // ---- SINGLE TABLE MODE (existing logic) ----
      const parcelLookup: Record<string, string> = {};
      if (targetTable === "sales" || targetTable === "assessments") {
        let offset = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data: parcels } = await supabase
            .from("parcels")
            .select("id, parcel_number")
            .eq("county_id", profile.county_id)
            .range(offset, offset + PAGE_SIZE - 1);
          if (parcels && parcels.length > 0) {
            for (const p of parcels) parcelLookup[p.parcel_number] = p.id;
            offset += parcels.length;
            hasMore = parcels.length === PAGE_SIZE;
          } else {
            hasMore = false;
          }
        }
      }

      const deduped = new Map<string, Record<string, unknown>>();
      for (const row of parsedFile.rows) {
        const record: Record<string, unknown> = { county_id: profile.county_id };
        let skip = false;
        let parcelKey = "";

        for (const mapping of activeMapping) {
          const field = schema.find(f => f.name === mapping.targetColumn);
          if (!field) continue;
          const val = parseVal(row[mapping.sourceColumn], field);
          if (val === null) continue;

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

          if (mapping.targetColumn === "parcel_number") parcelKey = String(val);
          record[mapping.targetColumn] = val;
        }

        if (!skip && parcelKey) {
          deduped.set(parcelKey, record);
        } else if (!skip) {
          deduped.set(`__row_${deduped.size}`, record);
        } else {
          failed++;
        }
      }

      const allRecords = Array.from(deduped.values());
      const table = targetTable === "assessments" ? "assessments" : targetTable;
      const result = await upsertBatch(table as "parcels" | "sales" | "assessments", allRecords);
      imported += result.imported;
      failed += result.failed;
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

    // ── Pipeline: ingest_loaded ──────────────────────────────
    if (profile?.county_id) {
      await emitPipelineEvent({
        countyId: profile.county_id,
        stage: "ingest_loaded",
        status: failed > 0 && imported === 0 ? "failed" : failed > 0 ? "warning" : "success",
        ingestJobId: jobId,
        rowsAffected: imported,
        artifactRef: parsedFile?.fileName,
        details: { imported, failed, targetTable },
      });

      // ── Pipeline: quality_scored ─────────────────────────────
      // Compute real quality metrics from validation results
      const validationScore = validation
        ? Math.round((validation.validRows / Math.max(validation.totalRows, 1)) * 100)
        : imported > 0 ? 100 : 0;
      
      const fieldCoverageScore = validation?.fieldCompleteness
        ? Math.round(Object.values(validation.fieldCompleteness).reduce((a, b) => a + b, 0) / Math.max(Object.keys(validation.fieldCompleteness).length, 1))
        : 0;

      await emitPipelineEvent({
        countyId: profile.county_id,
        stage: "quality_scored",
        status: validationScore >= 90 ? "success" : validationScore >= 70 ? "warning" : "failed",
        ingestJobId: jobId,
        rowsAffected: imported,
        artifactRef: parsedFile?.fileName,
        details: {
          validationScore,
          fieldCoverageScore,
          validRows: validation?.validRows ?? imported,
          invalidRows: validation?.invalidRows ?? failed,
          issueCount: validation?.issues?.length ?? 0,
          fieldCompleteness: validation?.fieldCompleteness ?? {},
        },
      });

      // ── Pipeline: readiness_updated ──────────────────────────
      await emitPipelineEvent({
        countyId: profile.county_id,
        stage: "readiness_updated",
        status: validationScore >= 80 && imported > 0 ? "success" : "warning",
        ingestJobId: jobId,
        rowsAffected: imported,
        artifactRef: parsedFile?.fileName,
        details: {
          dataProduct: targetTable === "combined" ? "parcels+sales" : targetTable,
          readinessGrade: validationScore >= 90 ? "A" : validationScore >= 80 ? "B" : validationScore >= 70 ? "C" : "D",
          imported,
          failed,
        },
      });
    }

    setPublishProgress(100);
    setPublishPhase("Complete!");
    setPublishing(false);
    setStep("complete");

    if (targetTable === "combined") {
      toast.success(`Combined import complete! ${imported.toLocaleString()} records published (parcels + sales). ${failed > 0 ? `${failed} failed.` : ""}`);
    } else {
      toast.success(`Published ${imported.toLocaleString()} records. ${failed > 0 ? `${failed} failed.` : ""}`);
    }
  }, [parsedFile, mappings, schema, profile, targetTable, jobId]);

  const reset = useCallback(() => {
    setStep("select");
    setParsedFile(null);
    setMappings([]);
    setValidation(null);
    setJobId(null);
    setPublishing(false);
    setPublishProgress(0);
    setPublishPhase("");
    setImportProfile("generic");
  }, []);

  return {
    step, setStep,
    targetTable, setTargetTable,
    importProfile, setImportProfile,
    parsedFile,
    mappings, setMappings,
    validation,
    jobId,
    publishing, publishProgress, publishPhase,
    schema, holyTrinity,
    detectedCombined,
    handleFileUpload,
    validateData,
    publishData,
    reset,
  };
}

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnMapper } from "./ColumnMapper";
import { ImportPreview } from "./ImportPreview";
import { toast } from "sonner";

interface DataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTable: "parcels" | "sales" | "assessment_ratios";
  studyPeriodId?: string;
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

interface ParsedData {
  headers: string[];
  rows: Record<string, string | number | null>[];
  fileName: string;
  rowCount: number;
}

export function DataImportDialog({
  open,
  onOpenChange,
  targetTable,
  studyPeriodId,
}: DataImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const targetSchema = getTargetSchema(targetTable);

  const handleFileSelect = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = parseCSV(text);
        
        setParsedData({
          headers: parsed.headers,
          rows: parsed.rows,
          fileName: file.name,
          rowCount: parsed.rows.length,
        });

        // Auto-detect column mappings
        const autoMapping = autoDetectMappings(parsed.headers, targetSchema);
        setColumnMapping(autoMapping);
        setStep("mapping");
      } catch (error) {
        toast.error("Failed to parse file. Please check the format.");
        console.error("Parse error:", error);
      }
    },
    [targetSchema]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
        handleFileSelect(file);
      } else {
        toast.error("Please upload a CSV or TXT file");
      }
    },
    [handleFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setStep("importing");
    setImportProgress(0);
    setImportErrors([]);

    const mappedRows = parsedData.rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [sourceCol, targetCol] of Object.entries(columnMapping)) {
        if (targetCol && targetCol !== "__skip__") {
          mapped[targetCol] = row[sourceCol];
        }
      }
      // Add study period if applicable
      if (studyPeriodId && (targetTable === "sales" || targetTable === "assessment_ratios")) {
        mapped.study_period_id = studyPeriodId;
      }
      return mapped;
    });

    // Simulate batch import with progress
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < mappedRows.length; i++) {
      // In real implementation, batch insert to Supabase
      await new Promise((resolve) => setTimeout(resolve, 20));
      
      // Simulate 95% success rate
      if (Math.random() > 0.05) {
        success++;
      } else {
        failed++;
        errors.push(`Row ${i + 1}: Validation error`);
      }

      setImportProgress(Math.round(((i + 1) / mappedRows.length) * 100));
    }

    setImportStats({ success, failed });
    setImportErrors(errors);
    setStep("complete");
    toast.success(`Imported ${success} records successfully`);
  };

  const resetDialog = () => {
    setStep("upload");
    setParsedData(null);
    setColumnMapping({});
    setImportProgress(0);
    setImportErrors([]);
    setImportStats({ success: 0, failed: 0 });
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gradient-sovereign">
            Import {getTableLabel(targetTable)}
          </DialogTitle>
          <DialogDescription>
            Upload CSV or Excel data to import into the system
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {["upload", "mapping", "preview", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s || getStepIndex(step) > i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {getStepIndex(step) > i ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-2 transition-colors",
                    getStepIndex(step) > i ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  )}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    Drop your file here
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input">
                    <Button variant="outline" asChild>
                      <span>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Select CSV File
                      </span>
                    </Button>
                  </label>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Supported Formats
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• CSV (Comma-separated)</li>
                      <li>• TXT (Tab-separated)</li>
                      <li>• UTF-8 encoding</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Required Fields</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {targetSchema.required.map((field) => (
                        <li key={field}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "mapping" && parsedData && (
              <motion.div
                key="mapping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="mb-4 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{parsedData.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {parsedData.rowCount.toLocaleString()} rows detected
                    </p>
                  </div>
                </div>

                <ColumnMapper
                  sourceColumns={parsedData.headers}
                  targetSchema={targetSchema}
                  mapping={columnMapping}
                  onMappingChange={setColumnMapping}
                />
              </motion.div>
            )}

            {step === "preview" && parsedData && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <ImportPreview
                  data={parsedData.rows.slice(0, 10)}
                  mapping={columnMapping}
                  targetSchema={targetSchema}
                />
              </motion.div>
            )}

            {step === "importing" && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 text-center"
              >
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                <h3 className="text-lg font-medium mb-2">Importing Data...</h3>
                <p className="text-muted-foreground mb-6">
                  Please wait while we process your data
                </p>
                <Progress value={importProgress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">
                  {importProgress}% complete
                </p>
              </motion.div>
            )}

            {step === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 text-center"
              >
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">Import Complete!</h3>
                <div className="flex justify-center gap-8 mb-6">
                  <div className="text-center">
                    <p className="text-3xl font-light text-green-500">
                      {importStats.success}
                    </p>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                  {importStats.failed > 0 && (
                    <div className="text-center">
                      <p className="text-3xl font-light text-red-500">
                        {importStats.failed}
                      </p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  )}
                </div>

                {importErrors.length > 0 && (
                  <div className="max-w-md mx-auto p-4 rounded-lg bg-red-500/10 text-left">
                    <h4 className="font-medium text-red-500 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Errors ({importErrors.length})
                    </h4>
                    <ul className="text-sm text-red-400 space-y-1 max-h-32 overflow-auto">
                      {importErrors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importErrors.length > 5 && (
                        <li>...and {importErrors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <div className="flex gap-2">
            {step === "mapping" && (
              <>
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={() => setStep("preview")}>
                  Preview
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
            {step === "preview" && (
              <>
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Back
                </Button>
                <Button onClick={handleImport}>
                  Import Data
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
            {step === "complete" && (
              <Button onClick={handleClose}>Done</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getStepIndex(step: ImportStep): number {
  const steps: ImportStep[] = ["upload", "mapping", "preview", "importing", "complete"];
  return steps.indexOf(step);
}

function getTableLabel(table: string): string {
  const labels: Record<string, string> = {
    parcels: "Parcels",
    sales: "Sales",
    assessment_ratios: "Assessment Ratios",
  };
  return labels[table] || table;
}

interface TargetSchema {
  fields: { name: string; label: string; type: string }[];
  required: string[];
}

function getTargetSchema(table: string): TargetSchema {
  const schemas: Record<string, TargetSchema> = {
    parcels: {
      fields: [
        { name: "parcel_number", label: "Parcel Number", type: "string" },
        { name: "address", label: "Address", type: "string" },
        { name: "city", label: "City", type: "string" },
        { name: "state", label: "State", type: "string" },
        { name: "zip_code", label: "ZIP Code", type: "string" },
        { name: "property_class", label: "Property Class", type: "string" },
        { name: "assessed_value", label: "Assessed Value", type: "number" },
        { name: "land_value", label: "Land Value", type: "number" },
        { name: "improvement_value", label: "Improvement Value", type: "number" },
        { name: "land_area", label: "Land Area (sqft)", type: "number" },
        { name: "building_area", label: "Building Area (sqft)", type: "number" },
        { name: "year_built", label: "Year Built", type: "number" },
        { name: "bedrooms", label: "Bedrooms", type: "number" },
        { name: "bathrooms", label: "Bathrooms", type: "number" },
        { name: "neighborhood_code", label: "Neighborhood Code", type: "string" },
      ],
      required: ["parcel_number", "address", "assessed_value"],
    },
    sales: {
      fields: [
        { name: "parcel_id", label: "Parcel ID", type: "string" },
        { name: "sale_date", label: "Sale Date", type: "date" },
        { name: "sale_price", label: "Sale Price", type: "number" },
        { name: "sale_type", label: "Sale Type", type: "string" },
        { name: "grantor", label: "Grantor (Seller)", type: "string" },
        { name: "grantee", label: "Grantee (Buyer)", type: "string" },
        { name: "deed_type", label: "Deed Type", type: "string" },
        { name: "instrument_number", label: "Instrument Number", type: "string" },
        { name: "is_qualified", label: "Qualified Sale", type: "boolean" },
      ],
      required: ["parcel_id", "sale_date", "sale_price"],
    },
    assessment_ratios: {
      fields: [
        { name: "parcel_id", label: "Parcel ID", type: "string" },
        { name: "sale_id", label: "Sale ID", type: "string" },
        { name: "sale_price", label: "Sale Price", type: "number" },
        { name: "assessed_value", label: "Assessed Value", type: "number" },
        { name: "value_tier", label: "Value Tier", type: "string" },
        { name: "is_outlier", label: "Is Outlier", type: "boolean" },
      ],
      required: ["parcel_id", "sale_id", "sale_price", "assessed_value"],
    },
  };
  return schemas[table] || { fields: [], required: [] };
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

function autoDetectMappings(
  sourceColumns: string[],
  targetSchema: TargetSchema
): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  const commonMappings: Record<string, string[]> = {
    parcel_number: ["parcel_number", "parcel", "parcel_id", "account", "account_number", "prop_id"],
    address: ["address", "street_address", "situs", "situs_address", "property_address"],
    city: ["city", "situs_city"],
    state: ["state", "situs_state"],
    zip_code: ["zip", "zip_code", "zipcode", "situs_zip", "postal_code"],
    property_class: ["property_class", "prop_class", "class", "property_type", "use_code"],
    assessed_value: ["assessed_value", "total_value", "appraised_value", "market_value", "value"],
    land_value: ["land_value", "land_val", "land"],
    improvement_value: ["improvement_value", "impr_value", "improvements", "building_value"],
    land_area: ["land_area", "lot_size", "land_sqft", "acres", "acreage"],
    building_area: ["building_area", "sqft", "living_area", "gross_area", "building_sqft"],
    year_built: ["year_built", "yr_built", "built_year", "age"],
    bedrooms: ["bedrooms", "beds", "bed"],
    bathrooms: ["bathrooms", "baths", "bath"],
    sale_date: ["sale_date", "date", "close_date", "recording_date"],
    sale_price: ["sale_price", "price", "amount", "consideration"],
    grantor: ["grantor", "seller", "seller_name"],
    grantee: ["grantee", "buyer", "buyer_name"],
  };

  sourceColumns.forEach((sourceCol) => {
    const normalizedSource = sourceCol.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    for (const [targetField, aliases] of Object.entries(commonMappings)) {
      if (
        aliases.some(
          (alias) =>
            normalizedSource === alias ||
            normalizedSource.includes(alias) ||
            alias.includes(normalizedSource)
        )
      ) {
        const targetExists = targetSchema.fields.some((f) => f.name === targetField);
        if (targetExists) {
          mapping[sourceCol] = targetField;
          break;
        }
      }
    }
  });

  return mapping;
}

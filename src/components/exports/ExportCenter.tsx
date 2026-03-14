// TerraFusion OS — Export Center
// Unified data export dashboard with dataset selection, filters, and format options

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, FileJson, FileSpreadsheet, Database, Filter,
  CheckCircle2, Loader2, AlertTriangle, Calendar, Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  generateExport,
  downloadBlob,
  DATASET_META,
  type ExportDataset,
  type ExportFormat,
  type ExportResult,
} from "@/services/exportService";

const DATASETS = Object.entries(DATASET_META) as [ExportDataset, typeof DATASET_META[ExportDataset]][];

interface ExportHistoryItem extends ExportResult {
  exportedAt: string;
}

export function ExportCenter() {
  const [selectedDataset, setSelectedDataset] = useState<ExportDataset>("parcels");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [taxYear, setTaxYear] = useState<string>("");
  const [neighborhoodCode, setNeighborhoodCode] = useState("");
  const [propertyClass, setPropertyClass] = useState("");
  const [limit, setLimit] = useState<string>("5000");
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await generateExport({
        dataset: selectedDataset,
        format,
        filters: {
          taxYear: taxYear ? parseInt(taxYear) : undefined,
          neighborhoodCode: neighborhoodCode || undefined,
          propertyClass: propertyClass || undefined,
        },
        limit: parseInt(limit) || 5000,
      });

      downloadBlob(result.blob, result.fileName);

      setHistory((prev) => [
        { ...result, exportedAt: new Date().toISOString() },
        ...prev.slice(0, 9),
      ]);

      toast.success(`Exported ${result.rowCount.toLocaleString()} rows`, {
        description: result.fileName,
      });
    } catch (err: any) {
      toast.error("Export failed", { description: err.message });
    } finally {
      setExporting(false);
    }
  };

  const meta = DATASET_META[selectedDataset];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Download className="w-6 h-6 text-primary" />
          Export Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate CSV or JSON exports from your county data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Select Dataset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DATASETS.map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDataset(key)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedDataset === key
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">{meta.description}</p>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["assessments", "appeals", "exemptions"].includes(selectedDataset) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Tax Year
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2026"
                      value={taxYear}
                      onChange={(e) => setTaxYear(e.target.value)}
                      className="h-9"
                    />
                  </div>
                )}
                {selectedDataset === "parcels" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Neighborhood
                      </Label>
                      <Input
                        placeholder="e.g. N001"
                        value={neighborhoodCode}
                        onChange={(e) => setNeighborhoodCode(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Property Class</Label>
                      <Input
                        placeholder="e.g. residential"
                        value={propertyClass}
                        onChange={(e) => setPropertyClass(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Row Limit</Label>
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1,000</SelectItem>
                      <SelectItem value="5000">5,000</SelectItem>
                      <SelectItem value="10000">10,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Format & Export */}
          <Card className="border-border/60">
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormat("csv")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      format === "csv"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> CSV
                  </button>
                  <button
                    onClick={() => setFormat("json")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      format === "json"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60"
                    }`}
                  >
                    <FileJson className="w-4 h-4" /> JSON
                  </button>
                </div>
                <div className="flex-1" />
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="gap-2"
                  size="lg"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exporting ? "Exporting…" : `Export ${meta.label}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export History */}
        <div>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No exports yet this session
                </p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {history.map((item, i) => (
                      <motion.div
                        key={`${item.fileName}-${i}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.fileName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.rowCount.toLocaleString()} rows · {item.format.toUpperCase()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7"
                          onClick={() => downloadBlob(item.blob, item.fileName)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-border/60 mt-4">
            <CardContent className="pt-5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Export Tips</p>
                  <p>• Exports are scoped to your county via row-level security</p>
                  <p>• Use filters to narrow large datasets</p>
                  <p>• All exports are logged in the audit trail</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

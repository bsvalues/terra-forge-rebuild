/**
 * TerraFusion OS — Phase 124: Multi-Parcel Batch Export
 * Constitutional owner: TerraDais (export)
 *
 * Allows selecting multiple parcels by neighborhood/property class
 * and exporting their assessment data as CSV with configurable columns.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  CheckCircle2,
  Package,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

const EXPORT_COLUMNS = [
  { key: "parcel_number", label: "Parcel Number", default: true },
  { key: "address", label: "Address", default: true },
  { key: "neighborhood_code", label: "Neighborhood", default: true },
  { key: "property_class", label: "Property Class", default: true },
  { key: "assessed_value", label: "Assessed Value", default: true },
  { key: "land_value", label: "Land Value", default: false },
  { key: "improvement_value", label: "Improvement Value", default: false },
  { key: "owner_name", label: "Owner Name", default: false },
  { key: "year_built", label: "Year Built", default: false },
  { key: "square_feet", label: "Square Feet", default: false },
] as const;

function useNeighborhoodList() {
  return useQuery({
    queryKey: ["nbhd-list-for-export"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(1000);
      const codes = new Set((data || []).map((p) => p.neighborhood_code).filter(Boolean));
      return Array.from(codes).sort() as string[];
    },
    staleTime: 60_000,
  });
}

function useExportParcels(neighborhoodFilter: string, propertyClassFilter: string) {
  return useQuery({
    queryKey: ["export-parcels", neighborhoodFilter, propertyClassFilter],
    queryFn: async () => {
      let query = supabase
        .from("parcels")
        .select("id, parcel_number, address, neighborhood_code, property_class, assessed_value, owner_name, year_built, square_feet, land_value, improvement_value")
        .limit(1000);

      if (neighborhoodFilter && neighborhoodFilter !== "all") {
        query = query.eq("neighborhood_code", neighborhoodFilter);
      }
      if (propertyClassFilter && propertyClassFilter !== "all") {
        query = query.eq("property_class", propertyClassFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function MultiParcelBatchExport() {
  const { data: neighborhoods } = useNeighborhoodList();
  const [nbhdFilter, setNbhdFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.filter((c) => c.default).map((c) => c.key))
  );
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  const { data: parcels, isLoading } = useExportParcels(nbhdFilter, classFilter);

  const toggleColumn = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    if (!parcels?.length) return;
    setExporting(true);

    const cols = EXPORT_COLUMNS.filter((c) => selectedCols.has(c.key));

    if (exportFormat === "json") {
      const jsonData = parcels.map((p: any) => {
        const row: Record<string, any> = {};
        for (const c of cols) row[c.key] = p[c.key] ?? null;
        return row;
      });
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parcel-export-${nbhdFilter}-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const header = cols.map((c) => c.label).join(",");
      const rows = parcels.map((p: any) =>
        cols.map((c) => {
        const val = p[c.key];
        if (val === null || val === undefined) return "";
        if (typeof val === "string" && val.includes(",")) return `"${val}"`;
        return String(val);
      }).join(",")
    );

      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parcel-export-${nbhdFilter}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExporting(false);
    toast.success(`Exported ${parcels.length} parcels to ${exportFormat.toUpperCase()}`);
  };

  return (
    <div className="space-y-4">
      {/* Row count warning */}
      {parcels && parcels.length >= 1000 && (
        <Card className="material-bento border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Query returned {parcels.length.toLocaleString()} parcels (limit 1,000). Apply filters to narrow results or contact admin for bulk exports exceeding 10,000 rows.</span>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-suite-dais" />
            Export Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Neighborhood</label>
              <Select value={nbhdFilter} onValueChange={setNbhdFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Neighborhoods</SelectItem>
                  {(neighborhoods || []).map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Property Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="agricultural">Agricultural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Format</label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "json")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Selection */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            Export Columns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {EXPORT_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/20 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Checkbox
                  checked={selectedCols.has(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                <span className="text-xs text-foreground">{col.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Action */}
      <Card className="material-bento border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                  ) : (
                    <>{parcels?.length ?? 0} parcels matched</>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedCols.size} columns selected
                </div>
              </div>
            </div>
            <Button
              onClick={handleExport}
              disabled={!parcels?.length || exporting || selectedCols.size === 0}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export {exportFormat.toUpperCase()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

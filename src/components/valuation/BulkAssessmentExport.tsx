// TerraFusion OS — Phase 107: Bulk Assessment Excel Export
// Export assessment data to formatted Excel workbook using exceljs.

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, FileSpreadsheet, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExcelJS from "exceljs";

interface ExportFilters {
  taxYear: string;
  neighborhoodCode: string;
  propertyClass: string;
}

interface AssessmentParcelJoin {
  parcel_number: string | null;
  situs_address: string | null;
  city: string | null;
  property_class: string | null;
  neighborhood_code: string | null;
}

export function BulkAssessmentExport() {
  const { profile } = useAuthContext();
  const countyId = profile?.county_id;
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    taxYear: new Date().getFullYear().toString(),
    neighborhoodCode: "",
    propertyClass: "",
  });
  const [recordCount, setRecordCount] = useState<number | null>(null);

  const handleExport = async () => {
    if (!countyId) return;
    setExporting(true);

    try {
      // Build query
      let query = supabase
        .from("assessments")
        .select(`
          tax_year, land_value, improvement_value, total_value,
          assessment_date, certified,
          parcels!inner(parcel_number, situs_address, city, property_class, neighborhood_code)
        `)
        .eq("county_id", countyId)
        .order("tax_year", { ascending: false });

      if (filters.taxYear) {
        query = query.eq("tax_year", Number(filters.taxYear));
      }
      if (filters.neighborhoodCode) {
        query = query.eq("parcels.neighborhood_code", filters.neighborhoodCode);
      }
      if (filters.propertyClass) {
        query = query.eq("parcels.property_class", filters.propertyClass);
      }

      const { data, error } = await query.limit(5000);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info("No records found matching filters");
        setExporting(false);
        return;
      }

      setRecordCount(data.length);

      // Build Excel workbook
      const wb = new ExcelJS.Workbook();
      wb.creator = "TerraFusion OS";
      wb.created = new Date();

      const ws = wb.addWorksheet("Assessments", {
        headerFooter: {
          firstHeader: `Assessment Export — ${filters.taxYear || "All Years"}`,
        },
      });

      // Define columns
      ws.columns = [
        { header: "Parcel Number", key: "parcel_number", width: 18 },
        { header: "Address", key: "address", width: 30 },
        { header: "City", key: "city", width: 15 },
        { header: "Class", key: "property_class", width: 12 },
        { header: "Neighborhood", key: "neighborhood", width: 12 },
        { header: "Tax Year", key: "tax_year", width: 10 },
        { header: "Land Value", key: "land_value", width: 14 },
        { header: "Improvement Value", key: "improvement_value", width: 16 },
        { header: "Total Value", key: "total_value", width: 14 },
        { header: "Assessment Date", key: "assessment_date", width: 14 },
        { header: "Certified", key: "certified", width: 10 },
      ];

      // Style header
      ws.getRow(1).font = { bold: true, size: 11 };
      ws.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1a1a2e" },
      };
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

      // Add rows
      for (const row of data) {
        const parcel = row.parcels as AssessmentParcelJoin | null;
        ws.addRow({
          parcel_number: parcel?.parcel_number || "",
          address: parcel?.situs_address || "",
          city: parcel?.city || "",
          property_class: parcel?.property_class || "",
          neighborhood: parcel?.neighborhood_code || "",
          tax_year: row.tax_year,
          land_value: row.land_value,
          improvement_value: row.improvement_value,
          total_value: row.total_value ?? row.land_value + row.improvement_value,
          assessment_date: row.assessment_date || "",
          certified: row.certified ? "Yes" : "No",
        });
      }

      // Format currency columns
      ["G", "H", "I"].forEach((col) => {
        ws.getColumn(col).numFmt = "$#,##0";
      });

      // Generate and download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assessments_${filters.taxYear || "all"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} records`);
    } catch (err: any) {
      toast.error("Export failed", { description: err.message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-chart-5" />
          Bulk Assessment Export
          {recordCount !== null && (
            <Badge variant="outline" className="text-[9px] ml-auto">
              {recordCount.toLocaleString()} records
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tax Year</Label>
            <Input
              value={filters.taxYear}
              onChange={(e) => setFilters((f) => ({ ...f, taxYear: e.target.value }))}
              placeholder="2026"
              className="text-sm h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Neighborhood</Label>
            <Input
              value={filters.neighborhoodCode}
              onChange={(e) => setFilters((f) => ({ ...f, neighborhoodCode: e.target.value }))}
              placeholder="All"
              className="text-sm h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Property Class</Label>
            <Input
              value={filters.propertyClass}
              onChange={(e) => setFilters((f) => ({ ...f, propertyClass: e.target.value }))}
              placeholder="All"
              className="text-sm h-8"
            />
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || !countyId}
          className="w-full gap-1.5"
          size="sm"
        >
          {exporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Export to Excel
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

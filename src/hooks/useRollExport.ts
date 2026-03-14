// TerraFusion OS — Roll Export Hook
// Generates state-format certified roll export (CSV/XLSX)

import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { exportCSV, exportXLSX, type ExportableDataset } from "@/components/export/ExportEngine";
import { toast } from "sonner";

export function useRollExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportRoll = useCallback(async (format: "csv" | "xlsx" = "xlsx") => {
    setIsExporting(true);
    try {
      const currentYear = new Date().getFullYear();

      // Fetch certified assessments with parcel data
      const { data: assessments, error } = await supabase
        .from("assessments")
        .select(`
          parcel_id,
          tax_year,
          land_value,
          improvement_value,
          total_value,
          certified,
          certified_at,
          assessment_reason
        `)
        .eq("tax_year", currentYear)
        .eq("certified", true)
        .order("parcel_id");

      if (error) throw error;
      if (!assessments || assessments.length === 0) {
        toast.warning("No certified assessments found for the current tax year");
        return;
      }

      // Fetch parcel details for the certified parcels
      const parcelIds = assessments.map(a => a.parcel_id);
      const batchSize = 500;
      const allParcels: Record<string, any> = {};

      for (let i = 0; i < parcelIds.length; i += batchSize) {
        const batch = parcelIds.slice(i, i + batchSize);
        const { data: parcels } = await supabase
          .from("parcels")
          .select("id, parcel_number, address, city, property_class, neighborhood_code, county_id")
          .in("id", batch);

        for (const p of parcels || []) {
          allParcels[p.id] = p;
        }
      }

      const dataset: ExportableDataset = {
        title: `Certified Roll TY${currentYear}`,
        metadata: {
          "Report": "State Certified Assessment Roll",
          "Tax Year": String(currentYear),
          "Total Records": String(assessments.length),
          "Generated": new Date().toISOString(),
          "System": "TerraFusion OS",
          "Status": "CERTIFIED",
        },
        sheets: [
          {
            name: "Certified Roll",
            headers: [
              "Parcel Number",
              "Situs Address",
              "City",
              "Property Class",
              "Neighborhood",
              "Land Value",
              "Improvement Value",
              "Total Value",
              "Tax Year",
              "Certified At",
              "Assessment Reason",
            ],
            rows: assessments.map(a => {
              const p = allParcels[a.parcel_id] || {};
              return [
                p.parcel_number || "",
                p.address || "",
                p.city || "",
                p.property_class || "",
                p.neighborhood_code || "",
                a.land_value ?? 0,
                a.improvement_value ?? 0,
                a.total_value ?? 0,
                p.acres ?? "",
                a.tax_year,
                a.certified_at ? new Date(a.certified_at).toLocaleDateString() : "",
                a.assessment_reason || "",
              ];
            }),
          },
          {
            name: "Summary by Class",
            headers: ["Property Class", "Parcel Count", "Total Land Value", "Total Improvement Value", "Total Assessed Value"],
            rows: (() => {
              const byClass = new Map<string, { count: number; land: number; imp: number; total: number }>();
              for (const a of assessments) {
                const cls = allParcels[a.parcel_id]?.property_class || "Unknown";
                const entry = byClass.get(cls) || { count: 0, land: 0, imp: 0, total: 0 };
                entry.count++;
                entry.land += a.land_value ?? 0;
                entry.imp += a.improvement_value ?? 0;
                entry.total += a.total_value ?? 0;
                byClass.set(cls, entry);
              }
              return Array.from(byClass.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .map(([cls, d]) => [cls, d.count, d.land, d.imp, d.total]);
            })(),
          },
        ],
      };

      if (format === "csv") {
        exportCSV(dataset);
      } else {
        await exportXLSX(dataset);
      }
    } catch (err: any) {
      toast.error("Export failed", { description: err.message });
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportRoll, isExporting };
}

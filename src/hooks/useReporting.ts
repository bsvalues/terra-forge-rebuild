// TerraFusion OS — Reporting hooks
// Governed CRUD for report templates and report run history

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEventAsync } from "@/services/terraTrace";

// ── Types ──────────────────────────────────────────────────────────

export interface ReportTemplate {
  id: string;
  county_id: string | null;
  name: string;
  description: string | null;
  report_type: string;
  template_config: Record<string, any>;
  dataset: string;
  is_system: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportRun {
  id: string;
  template_id: string | null;
  county_id: string | null;
  report_name: string;
  report_type: string;
  parameters: Record<string, any>;
  result_summary: Record<string, any> | null;
  row_count: number;
  status: string;
  executed_by: string;
  executed_at: string;
  created_at: string;
}

// ── Report type metadata ───────────────────────────────────────────

export const REPORT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  roll_summary: { label: "Roll Summary", icon: "BarChart3", color: "text-primary" },
  neighborhood_comparison: { label: "Neighborhood Comparison", icon: "Map", color: "text-chart-3" },
  ratio_study: { label: "Ratio Study", icon: "TrendingUp", color: "text-chart-5" },
  appeals_activity: { label: "Appeals Activity", icon: "Scale", color: "text-chart-4" },
  exemption_summary: { label: "Exemption Summary", icon: "ShieldCheck", color: "text-chart-2" },
  sales_analysis: { label: "Sales Analysis", icon: "DollarSign", color: "text-chart-1" },
  summary: { label: "Custom Summary", icon: "FileText", color: "text-muted-foreground" },
};

// ── Hooks ──────────────────────────────────────────────────────────

export function useReportTemplates() {
  return useQuery({
    queryKey: ["report-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as ReportTemplate[];
    },
  });
}

export function useReportRuns(limit = 20) {
  return useQuery({
    queryKey: ["report-runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_runs")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ReportRun[];
    },
  });
}

export function useCreateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      report_type: string;
      dataset: string;
      template_config: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from("report_templates")
        .insert([input])
        .select()
        .single();
      if (error) throw error;
      return data as ReportTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-templates"] }),
  });
}

export function useDeleteReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-templates"] }),
  });
}

export function useRunReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      template: ReportTemplate;
      parameters?: Record<string, any>;
    }) => {
      const { template, parameters = {} } = input;

      // Execute the report query based on dataset
      const result = await executeReportQuery(template.dataset, template.template_config, parameters);

      // Record the run
      const { data, error } = await supabase
        .from("report_runs")
        .insert([{
          template_id: template.id,
          report_name: template.name,
          report_type: template.report_type,
          parameters,
          result_summary: result.summary,
          row_count: result.rowCount,
          status: "completed",
        }])
        .select()
        .single();
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "data_exported",
        eventData: {
          action: "report_run",
          reportType: template.report_type,
          reportName: template.name,
          rowCount: result.rowCount,
        },
      });

      return { run: data as ReportRun, result };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-runs"] }),
  });
}

// ── Report execution engine ────────────────────────────────────────

interface ReportResult {
  summary: Record<string, any>;
  rows: Record<string, any>[];
  rowCount: number;
}

async function executeReportQuery(
  dataset: string,
  config: Record<string, any>,
  params: Record<string, any>
): Promise<ReportResult> {
  const groupBy = config.groupBy as string | undefined;

  switch (dataset) {
    case "parcels": {
      let query = supabase.from("parcels").select("id, property_class, neighborhood_code, assessed_value, city");
      if (params.propertyClass) query = query.eq("property_class", params.propertyClass);
      if (params.neighborhoodCode) query = query.eq("neighborhood_code", params.neighborhoodCode);
      const { data, error } = await query.limit(1000);
      if (error) throw error;
      const rows = data ?? [];
      return { rows, rowCount: rows.length, summary: aggregateRows(rows, groupBy, "assessed_value") };
    }
    case "assessments": {
      let query = supabase.from("assessments").select("id, tax_year, total_value, land_value, improvement_value, parcel_id");
      if (params.taxYear) query = query.eq("tax_year", params.taxYear);
      const { data, error } = await query.limit(1000);
      if (error) throw error;
      const rows = data ?? [];
      return { rows, rowCount: rows.length, summary: aggregateRows(rows, "tax_year", "total_value") };
    }
    case "appeals": {
      const { data, error } = await supabase.from("appeals").select("id, status, original_value, final_value, appeal_date").limit(1000);
      if (error) throw error;
      const rows = data ?? [];
      return { rows, rowCount: rows.length, summary: aggregateRows(rows, "status", "original_value") };
    }
    case "exemptions": {
      const { data, error } = await supabase.from("exemptions").select("id, exemption_type, status, exemption_amount, tax_year").limit(1000);
      if (error) throw error;
      const rows = data ?? [];
      return { rows, rowCount: rows.length, summary: aggregateRows(rows, "exemption_type", "exemption_amount") };
    }
    case "sales": {
      const { data, error } = await supabase.from("sales").select("*").limit(1000);
      if (error) {
        // sales table may not exist — return empty
        return { rows: [], rowCount: 0, summary: { groups: [], totalRows: 0 } };
      }
      const rows = (data ?? []) as any[];
      return { rows, rowCount: rows.length, summary: aggregateRows(rows, groupBy, "sale_price") };
    }
    case "assessment_ratios": {
      const { data, error } = await supabase.from("assessment_ratios").select("id, value_tier, ratio, assessed_value, sale_price, is_outlier").limit(1000);
      if (error) throw error;
      const rows = data ?? [];
      return { rows, rowCount: rows.length, summary: aggregateRows(rows, "value_tier", "ratio") };
    }
    default:
      return { rows: [], rowCount: 0, summary: { groups: [], totalRows: 0 } };
  }
}

function aggregateRows(
  rows: Record<string, any>[],
  groupByField: string | undefined,
  valueField: string
): Record<string, any> {
  if (!groupByField || rows.length === 0) {
    const values = rows.map((r) => Number(r[valueField]) || 0);
    return {
      totalRows: rows.length,
      totalValue: values.reduce((a, b) => a + b, 0),
      avgValue: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      groups: [],
    };
  }

  const groups: Record<string, number[]> = {};
  for (const row of rows) {
    const key = String(row[groupByField] ?? "Unknown");
    if (!groups[key]) groups[key] = [];
    groups[key].push(Number(row[valueField]) || 0);
  }

  const groupSummaries = Object.entries(groups).map(([label, values]) => ({
    label,
    count: values.length,
    total: values.reduce((a, b) => a + b, 0),
    avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    min: Math.min(...values),
    max: Math.max(...values),
  })).sort((a, b) => b.count - a.count);

  return {
    totalRows: rows.length,
    totalValue: rows.map((r) => Number(r[valueField]) || 0).reduce((a, b) => a + b, 0),
    groups: groupSummaries,
  };
}

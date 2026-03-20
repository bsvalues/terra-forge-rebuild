// TerraFusion OS — Phase 51: Data Validation Rules Engine
// Governed CRUD + execution engine for configurable validation rules

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEventAsync } from "@/services/terraTrace";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

// ── Types ──────────────────────────────────────────────────────

export type RuleSeverity = "info" | "warning" | "error" | "critical";
export type RuleOperator =
  | "not_null"
  | "greater_than"
  | "less_than"
  | "between"
  | "equals"
  | "not_equals"
  | "regex_match"
  | "in_list";

export interface ValidationRule {
  id: string;
  county_id: string;
  name: string;
  description: string | null;
  target_field: string;
  operator: string;
  threshold_value: string | null;
  severity: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_pass_count: number;
  last_run_fail_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  severity: string;
  field: string;
  totalChecked: number;
  passed: number;
  failed: number;
  passRate: number;
  failedParcels: Array<{ id: string; parcel_number: string; value: unknown }>;
}

// ── Metadata ───────────────────────────────────────────────────

export const OPERATOR_META: Record<RuleOperator, { label: string; needsValue: boolean }> = {
  not_null: { label: "Is Not Null", needsValue: false },
  greater_than: { label: "Greater Than", needsValue: true },
  less_than: { label: "Less Than", needsValue: true },
  between: { label: "Between (min,max)", needsValue: true },
  equals: { label: "Equals", needsValue: true },
  not_equals: { label: "Not Equals", needsValue: true },
  regex_match: { label: "Matches Pattern", needsValue: true },
  in_list: { label: "In List (comma-sep)", needsValue: true },
};

export const SEVERITY_META: Record<RuleSeverity, { label: string; color: string }> = {
  info: { label: "Info", color: "text-primary" },
  warning: { label: "Warning", color: "text-amber-400" },
  error: { label: "Error", color: "text-destructive" },
  critical: { label: "Critical", color: "text-red-500" },
};

export const VALIDATABLE_FIELDS = [
  { value: "assessed_value", label: "Assessed Value", type: "number" },
  { value: "land_value", label: "Land Value", type: "number" },
  { value: "improvement_value", label: "Improvement Value", type: "number" },
  { value: "building_area", label: "Building Area (sqft)", type: "number" },
  { value: "land_area", label: "Land Area", type: "number" },
  { value: "year_built", label: "Year Built", type: "number" },
  { value: "bedrooms", label: "Bedrooms", type: "number" },
  { value: "bathrooms", label: "Bathrooms", type: "number" },
  { value: "neighborhood_code", label: "Neighborhood Code", type: "string" },
  { value: "property_class", label: "Property Class", type: "string" },
  { value: "address", label: "Address", type: "string" },
  { value: "latitude", label: "Latitude", type: "number" },
  { value: "longitude", label: "Longitude", type: "number" },
] as const;

// ── Hooks ──────────────────────────────────────────────────────

export function useValidationRules() {
  return useQuery({
    queryKey: ["validation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_rules")
        .select("*")
        .order("severity", { ascending: true })
        .order("is_active", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ValidationRule[];
    },
  });
}

export function useCreateValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      target_field: string;
      operator: RuleOperator;
      threshold_value?: string;
      severity: RuleSeverity;
    }) => {
      const { data, error } = await supabase
        .from("validation_rules")
        .insert([input])
        .select()
        .single();
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "batch_adjustment_applied",
        eventData: { action: "create_validation_rule", ruleName: input.name, field: input.target_field },
      });

      return data as ValidationRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["validation-rules"] }),
  });
}

export function useToggleValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("validation_rules")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["validation-rules"] }),
  });
}

export function useDeleteValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("validation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["validation-rules"] }),
  });
}

// ── Validation Execution Engine ────────────────────────────────

function evaluateRule(value: unknown, operator: string, threshold: string | null): boolean {
  if (operator === "not_null") {
    return value !== null && value !== undefined && value !== "";
  }

  const numVal = typeof value === "number" ? value : Number(value);
  const strVal = String(value ?? "");

  switch (operator) {
    case "greater_than":
      return !isNaN(numVal) && numVal > Number(threshold);
    case "less_than":
      return !isNaN(numVal) && numVal < Number(threshold);
    case "between": {
      const [min, max] = (threshold ?? "").split(",").map(Number);
      return !isNaN(numVal) && numVal >= min && numVal <= max;
    }
    case "equals":
      return strVal === threshold;
    case "not_equals":
      return strVal !== threshold;
    case "regex_match":
      try { return new RegExp(threshold ?? "").test(strVal); } catch { return false; }
    case "in_list":
      return (threshold ?? "").split(",").map(s => s.trim()).includes(strVal);
    default:
      return true;
  }
}

export function useRunValidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rules: ValidationRule[]): Promise<ValidationResult[]> => {
      // Fetch parcels for validation (limit 1000)
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, assessed_value, land_value, improvement_value, building_area, land_area, year_built, bedrooms, bathrooms, neighborhood_code, property_class, address, latitude, longitude")
        .limit(1000);

      if (error) throw error;
      if (!parcels || parcels.length === 0) return [];

      const results: ValidationResult[] = [];

      for (const rule of rules) {
        if (!rule.is_active) continue;

        const field = rule.target_field as keyof (typeof parcels)[0];
        const failedParcels: ValidationResult["failedParcels"] = [];
        let passed = 0;

        for (const p of parcels) {
          const val = p[field];
          if (evaluateRule(val, rule.operator, rule.threshold_value)) {
            passed++;
          } else {
            if (failedParcels.length < 20) {
              failedParcels.push({ id: p.id, parcel_number: p.parcel_number, value: val });
            }
          }
        }

        const failed = parcels.length - passed;
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          field: rule.target_field,
          totalChecked: parcels.length,
          passed,
          failed,
          passRate: parcels.length > 0 ? Math.round((passed / parcels.length) * 100) : 0,
          failedParcels,
        });

        // Update rule with run stats
        await supabase
          .from("validation_rules")
          .update({
            last_run_at: new Date().toISOString(),
            last_run_pass_count: passed,
            last_run_fail_count: failed,
            updated_at: new Date().toISOString(),
          })
          .eq("id", rule.id);
      }

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "batch_adjustment_applied",
        eventData: {
          action: "run_validation",
          rulesCount: rules.filter(r => r.is_active).length,
          totalParcels: parcels.length,
        },
      });

      qc.invalidateQueries({ queryKey: ["validation-rules"] });
      return results;
    },
  });
}

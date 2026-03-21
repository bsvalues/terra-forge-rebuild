import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────
export interface FilterCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in" | "is_null" | "is_not_null";
  value: string | number | boolean | string[] | null;
}

export interface FilterConfig {
  conditions: FilterCondition[];
  sort_field?: string;
  sort_direction?: "asc" | "desc";
  limit?: number;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  county_id: string;
  name: string;
  description: string | null;
  target_dataset: string;
  filter_config: FilterConfig;
  is_pinned: boolean;
  alert_on_change: boolean;
  is_shared: boolean;
  last_used_at: string | null;
  result_count: number | null;
  created_at: string;
  updated_at: string;
}

export type SavedFilterInsert = {
  name: string;
  description?: string | null;
  target_dataset?: string;
  filter_config: FilterConfig;
  is_pinned?: boolean;
  alert_on_change?: boolean;
  is_shared?: boolean;
};

export type SavedFilterUpdate = Partial<SavedFilterInsert> & { id: string };

// ── Available filter fields per dataset ──────────────────────────
export const FILTER_FIELDS: Record<string, { field: string; label: string; type: "text" | "number" | "select" }[]> = {
  parcels: [
    { field: "property_class", label: "Property Class", type: "text" },
    { field: "neighborhood_code", label: "Neighborhood", type: "text" },
    { field: "city", label: "City", type: "text" },
    { field: "zip_code", label: "Zip Code", type: "text" },
    { field: "assessed_value", label: "Assessed Value", type: "number" },
    { field: "land_value", label: "Land Value", type: "number" },
    { field: "improvement_value", label: "Improvement Value", type: "number" },
    { field: "year_built", label: "Year Built", type: "number" },
    { field: "building_area", label: "Building Area (sqft)", type: "number" },
    { field: "bedrooms", label: "Bedrooms", type: "number" },
    { field: "bathrooms", label: "Bathrooms", type: "number" },
  ],
  sales: [
    { field: "sale_price", label: "Sale Price", type: "number" },
    { field: "ratio", label: "Ratio", type: "number" },
    { field: "is_outlier", label: "Is Outlier", type: "select" },
    { field: "value_tier", label: "Value Tier", type: "text" },
  ],
  appeals: [
    { field: "status", label: "Status", type: "text" },
    { field: "original_value", label: "Original Value", type: "number" },
    { field: "requested_value", label: "Requested Value", type: "number" },
    { field: "resolution_type", label: "Resolution Type", type: "text" },
  ],
};

export const OPERATOR_LABELS: Record<FilterCondition["operator"], string> = {
  eq: "equals",
  neq: "not equal",
  gt: "greater than",
  gte: "≥",
  lt: "less than",
  lte: "≤",
  like: "contains",
  in: "in list",
  is_null: "is empty",
  is_not_null: "is not empty",
};

// ── Hooks ────────────────────────────────────────────────────────

const QUERY_KEY = ["saved-filters"];

export function useSavedFilters() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<SavedFilter[]> => {
      const { data, error } = await supabase
        .from("saved_filters")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((d) => ({
        ...d,
        filter_config: d.filter_config as unknown as FilterConfig,
      }));
    },
  });
}

export function useCreateFilter() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SavedFilterInsert) => {
      const row = {
        name: input.name,
        description: input.description ?? null,
        target_dataset: input.target_dataset ?? "parcels",
        filter_config: JSON.parse(JSON.stringify(input.filter_config)),
        is_pinned: input.is_pinned ?? false,
        alert_on_change: input.alert_on_change ?? false,
        is_shared: input.is_shared ?? false,
      };
      const { data, error } = await supabase
        .from("saved_filters")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Filter saved", description: "Your smart view has been created." });
    },
    onError: (e: Error) => {
      toast({ title: "Error saving filter", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateFilter() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SavedFilterUpdate) => {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.target_dataset !== undefined) payload.target_dataset = updates.target_dataset;
      if (updates.filter_config !== undefined) payload.filter_config = JSON.parse(JSON.stringify(updates.filter_config));
      if (updates.is_pinned !== undefined) payload.is_pinned = updates.is_pinned;
      if (updates.alert_on_change !== undefined) payload.alert_on_change = updates.alert_on_change;
      if (updates.is_shared !== undefined) payload.is_shared = updates.is_shared;

      const { error } = await supabase.from("saved_filters").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Filter updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error updating filter", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteFilter() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_filters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Filter deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error deleting filter", description: e.message, variant: "destructive" });
    },
  });
}

export function useMarkFilterUsed() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resultCount }: { id: string; resultCount?: number }) => {
      const payload: Record<string, unknown> = {
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (resultCount !== undefined) payload.result_count = resultCount;
      const { error } = await supabase.from("saved_filters").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// ── Dataset → Table mapping ──────────────────────────────────────
const DATASET_TABLE: Record<string, string> = {
  parcels: "parcels",
  sales: "sales",
  appeals: "appeals",
};

// ── Operator → Supabase filter method mapping ────────────────────
function applyCondition(
  query: ReturnType<typeof supabase.from>,
  cond: FilterCondition,
) {
  const { field, operator, value } = cond;
  switch (operator) {
    case "eq":       return query.eq(field, value as string);
    case "neq":      return query.neq(field, value as string);
    case "gt":       return query.gt(field, value as number);
    case "gte":      return query.gte(field, value as number);
    case "lt":       return query.lt(field, value as number);
    case "lte":      return query.lte(field, value as number);
    case "like":     return query.ilike(field, `%${value}%`);
    case "in":       return query.in(field, Array.isArray(value) ? value : [value]);
    case "is_null":  return query.is(field, null);
    case "is_not_null": return query.not(field, "is", null);
    default:         return query;
  }
}

/** Debounced live count preview for filter conditions */
export function useFilterPreview(dataset: string, conditions: FilterCondition[]) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const tableName = DATASET_TABLE[dataset];
    if (!tableName || conditions.length === 0) {
      setCount(null);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        let q = supabase.from(tableName).select("*", { count: "exact", head: true }) as ReturnType<typeof supabase.from>;
        for (const cond of conditions) {
          if (cond.field && cond.value !== "" && cond.value !== null) {
            q = applyCondition(q, cond);
          }
        }
        const { count: c } = await q;
        setCount(c ?? 0);
      } catch {
        setCount(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [dataset, JSON.stringify(conditions)]);

  return { count, loading };
}

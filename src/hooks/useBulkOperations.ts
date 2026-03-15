// TerraFusion OS — Bulk Parcel Operations Hook
// Multi-select state management + batch DB actions

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEventAsync } from "@/services/terraTrace";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────

export interface BulkParcelRow {
  id: string;
  parcel_number: string;
  address: string;
  city: string | null;
  property_class: string | null;
  neighborhood_code: string | null;
  assessed_value: number;
  year_built: number | null;
  building_area: number | null;
}

export type BulkAction = 
  | "assign_neighborhood"
  | "update_property_class"
  | "flag_for_review"
  | "export_selected"
  | "add_to_watchlist";

export interface BulkActionConfig {
  id: BulkAction;
  label: string;
  description: string;
  requiresInput: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

export const BULK_ACTIONS: BulkActionConfig[] = [
  {
    id: "assign_neighborhood",
    label: "Assign Neighborhood",
    description: "Set neighborhood code for selected parcels",
    requiresInput: true,
    inputLabel: "Neighborhood Code",
    inputPlaceholder: "e.g. N-101",
  },
  {
    id: "update_property_class",
    label: "Update Property Class",
    description: "Change property classification for selected parcels",
    requiresInput: true,
    inputLabel: "Property Class",
    inputPlaceholder: "e.g. Residential",
  },
  {
    id: "flag_for_review",
    label: "Flag for Review",
    description: "Add selected parcels to your watchlist as high priority",
    requiresInput: false,
  },
  {
    id: "add_to_watchlist",
    label: "Add to Watchlist",
    description: "Bookmark selected parcels for follow-up",
    requiresInput: false,
  },
  {
    id: "export_selected",
    label: "Export Selected",
    description: "Download selected parcels as CSV",
    requiresInput: false,
  },
];

// ── Selection State ────────────────────────────────────────────────

export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
  };
}

// ── Parcel Search Query ────────────────────────────────────────────

export function useBulkParcelSearch(search: string, filters: {
  propertyClass?: string;
  neighborhoodCode?: string;
}) {
  return useQuery({
    queryKey: ["bulk-parcels", search, filters],
    queryFn: async () => {
      let query = supabase
        .from("parcels")
        .select("id, parcel_number, address, city, property_class, neighborhood_code, assessed_value, year_built, building_area")
        .order("parcel_number", { ascending: true })
        .limit(200);

      if (search.trim()) {
        query = query.or(`parcel_number.ilike.%${search}%,address.ilike.%${search}%`);
      }
      if (filters.propertyClass) {
        query = query.eq("property_class", filters.propertyClass);
      }
      if (filters.neighborhoodCode) {
        query = query.eq("neighborhood_code", filters.neighborhoodCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BulkParcelRow[];
    },
    staleTime: 30_000,
  });
}

// ── Batch Mutations ────────────────────────────────────────────────

export function useBulkAssignNeighborhood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parcelIds, neighborhoodCode }: { parcelIds: string[]; neighborhoodCode: string }) => {
      const { error } = await supabase
        .from("parcels")
        .update({ neighborhood_code: neighborhoodCode })
        .in("id", parcelIds);
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "batch_adjustment_applied",
        eventData: { action: "assign_neighborhood", neighborhoodCode, count: parcelIds.length, parcelIds },
      });
      return parcelIds.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["bulk-parcels"] });
      toast.success(`Neighborhood assigned to ${count} parcels`);
    },
    onError: (err: any) => toast.error("Batch update failed", { description: err.message }),
  });
}

export function useBulkUpdatePropertyClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parcelIds, propertyClass }: { parcelIds: string[]; propertyClass: string }) => {
      const { error } = await supabase
        .from("parcels")
        .update({ property_class: propertyClass })
        .in("id", parcelIds);
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "forge",
        eventType: "batch_adjustment_applied",
        eventData: { action: "update_property_class", propertyClass, count: parcelIds.length, parcelIds },
      });
      return parcelIds.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["bulk-parcels"] });
      toast.success(`Property class updated on ${count} parcels`);
    },
    onError: (err: any) => toast.error("Batch update failed", { description: err.message }),
  });
}

export function useBulkAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parcelIds, priority }: { parcelIds: string[]; priority: string }) => {
      // Upsert into watchlist — skip conflicts
      const rows = parcelIds.map(pid => ({
        parcel_id: pid,
        priority,
        note: `Added via bulk operation (${new Date().toLocaleDateString()})`,
      }));

      const { error } = await supabase
        .from("parcel_watchlist")
        .upsert(rows, { onConflict: "user_id,parcel_id", ignoreDuplicates: true });
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "watchlist_updated",
        eventData: { action: "bulk_add", priority, count: parcelIds.length },
      });
      return parcelIds.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["parcel-watchlist"] });
      toast.success(`${count} parcels added to watchlist`);
    },
    onError: (err: any) => toast.error("Watchlist update failed", { description: err.message }),
  });
}

// ── CSV Export Helper ──────────────────────────────────────────────

export function exportParcelsCsv(parcels: BulkParcelRow[]) {
  const headers = ["Parcel Number", "Address", "City", "Property Class", "Neighborhood", "Assessed Value", "Year Built", "Building Area"];
  const rows = parcels.map(p => [
    p.parcel_number,
    p.address,
    p.city || "",
    p.property_class || "",
    p.neighborhood_code || "",
    p.assessed_value,
    p.year_built || "",
    p.building_area || "",
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `parcels-bulk-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  emitTraceEventAsync({
    sourceModule: "os",
    eventType: "data_exported",
    eventData: { action: "bulk_csv_export", count: parcels.length },
  });

  toast.success(`Exported ${parcels.length} parcels to CSV`);
}

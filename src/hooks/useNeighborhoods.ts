// TerraFusion OS — Neighborhood Directory Hooks
// Read-contract: neighborhoods table | Write-lane: OS Core (neighborhood definitions)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { emitTraceEventAsync } from "@/services/terraTrace";

export interface NeighborhoodRow {
  id: string;
  county_id: string;
  hood_cd: string;
  hood_name: string | null;
  year: number;
  geometry: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface NeighborhoodStats {
  hood_cd: string;
  hood_name: string | null;
  parcel_count: number;
  median_value: number;
  total_value: number;
  avg_building_area: number | null;
  avg_year_built: number | null;
}

/** Fetch all neighborhoods for the current year */
export function useNeighborhoods(year?: number) {
  return useQuery({
    queryKey: ["neighborhoods", year],
    queryFn: async () => {
      let query = supabase
        .from("neighborhoods")
        .select("*")
        .order("hood_cd", { ascending: true });
      if (year) query = query.eq("year", year);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NeighborhoodRow[];
    },
    staleTime: 120_000,
  });
}

/** Aggregate parcel stats per neighborhood */
export function useNeighborhoodStats() {
  return useQuery({
    queryKey: ["neighborhood-stats"],
    queryFn: async () => {
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("neighborhood_code, assessed_value, building_area, year_built")
        .not("neighborhood_code", "is", null);
      if (error) throw error;

      const map = new Map<string, {
        values: number[];
        areas: number[];
        years: number[];
      }>();

      for (const p of parcels || []) {
        const code = p.neighborhood_code!;
        if (!map.has(code)) map.set(code, { values: [], areas: [], years: [] });
        const entry = map.get(code)!;
        if (p.assessed_value) entry.values.push(p.assessed_value);
        if (p.building_area) entry.areas.push(p.building_area);
        if (p.year_built) entry.years.push(p.year_built);
      }

      const stats: NeighborhoodStats[] = [];
      for (const [code, entry] of map) {
        const sorted = [...entry.values].sort((a, b) => a - b);
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
        const total = sorted.reduce((s, v) => s + v, 0);
        const avgArea = entry.areas.length > 0
          ? Math.round(entry.areas.reduce((s, v) => s + v, 0) / entry.areas.length)
          : null;
        const avgYear = entry.years.length > 0
          ? Math.round(entry.years.reduce((s, v) => s + v, 0) / entry.years.length)
          : null;

        stats.push({
          hood_cd: code,
          hood_name: null, // Will be enriched from neighborhoods table
          parcel_count: sorted.length,
          median_value: median,
          total_value: total,
          avg_building_area: avgArea,
          avg_year_built: avgYear,
        });
      }

      return stats.sort((a, b) => b.parcel_count - a.parcel_count);
    },
    staleTime: 120_000,
  });
}

/** Create a new neighborhood */
export function useCreateNeighborhood() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      hood_cd: string;
      hood_name?: string;
      year: number;
    }) => {
      const { data, error } = await supabase
        .from("neighborhoods")
        .insert({
          hood_cd: input.hood_cd,
          hood_name: input.hood_name || null,
          year: input.year,
          county_id: "benton-county",
        })
        .select()
        .single();
      if (error) throw error;
      await emitTraceEventAsync({
        sourceModule: "atlas",
        eventType: "neighborhood_created",
        eventData: { hood_cd: input.hood_cd, hood_name: input.hood_name, year: input.year },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neighborhoods"] });
      toast({ title: "Neighborhood created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

/** Update a neighborhood */
export function useUpdateNeighborhood() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      hood_name?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.hood_name !== undefined) updates.hood_name = input.hood_name;
      if (input.metadata !== undefined) updates.metadata = input.metadata;

      const { data, error } = await supabase
        .from("neighborhoods")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neighborhoods"] });
      toast({ title: "Neighborhood updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

/** Delete a neighborhood */
export function useDeleteNeighborhood() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("neighborhoods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neighborhoods"] });
      toast({ title: "Neighborhood deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

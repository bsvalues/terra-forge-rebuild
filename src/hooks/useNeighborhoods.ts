// TerraFusion OS — Neighborhood Directory Hooks (Phase 70)
// Read-contract: neighborhoods table | Write-lane: OS Core (neighborhood definitions)
// "The neighborhoods told me their secrets. They're mostly rectangles." — Ralph Wiggum

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { emitTraceEventAsync } from "@/services/terraTrace";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface NeighborhoodRow {
  id: string;
  county_id: string;
  hood_cd: string;
  hood_name: string | null;
  year: number;
  geometry: unknown;
  metadata: Record<string, unknown> | null;
  model_type: string | null;
  property_classes: string[] | null;
  description: string | null;
  status: string | null;
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

export interface DiscoveredNeighborhood {
  hood_cd: string;
  parcel_count: number;
  avg_value: number;
  avg_building_area: number | null;
  avg_year_built: number | null;
  with_coords: number;
  class_count: number;
  property_classes: string[] | null;
  is_registered: boolean;
  latest_r_squared: number | null;
}

const QUERY_KEY = ["neighborhoods"];

/** Fetch all neighborhoods for the current year */
export function useNeighborhoods(year?: number) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: [...QUERY_KEY, countyId, year],
    queryFn: async () => {
      let query = supabase
        .from("neighborhoods")
        .select("*")
        .eq("county_id", countyId!)
        .order("hood_cd", { ascending: true });
      if (year) query = query.eq("year", year);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NeighborhoodRow[];
    },
    enabled: !!countyId,
    staleTime: 120_000,
  });
}

/** Aggregate parcel stats per neighborhood */
export function useNeighborhoodStats() {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["neighborhood-stats", countyId],
    queryFn: async () => {
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("neighborhood_code, assessed_value, building_area, year_built")
        .eq("county_id", countyId!)
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
          hood_name: null,
          parcel_count: sorted.length,
          median_value: median,
          total_value: total,
          avg_building_area: avgArea,
          avg_year_built: avgYear,
        });
      }

      return stats.sort((a, b) => b.parcel_count - a.parcel_count);
    },
    enabled: !!countyId,
    staleTime: 120_000,
  });
}

/** Discover all neighborhood codes from parcels with registration status */
export function useDiscoverNeighborhoods() {
  return useQuery<DiscoveredNeighborhood[]>({
    queryKey: ["neighborhood-discovery"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("discover_unregistered_neighborhoods" as any);
      if (error) throw error;
      return (data as unknown as DiscoveredNeighborhood[]) || [];
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
      model_type?: string;
      property_classes?: string[];
      description?: string;
    }) => {
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      const countyId = profile?.county_id ?? "";
      const { data, error } = await supabase
        .from("neighborhoods")
        .insert({
          hood_cd: input.hood_cd,
          hood_name: input.hood_name || null,
          year: input.year,
          county_id: countyId,
          model_type: input.model_type || "linear",
          property_classes: input.property_classes || [],
          description: input.description || null,
          status: "registered",
        } as any)
        .select()
        .single();
      if (error) throw error;
      await emitTraceEventAsync({
        sourceModule: "atlas",
        eventType: "neighborhood_certified",
        eventData: { action: "created", hood_cd: input.hood_cd, hood_name: input.hood_name, year: input.year },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["neighborhood-discovery"] });
      qc.invalidateQueries({ queryKey: ["county-vitals"] });
      toast({ title: "Neighborhood registered" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

/** Bulk register multiple neighborhoods */
export function useBulkRegisterNeighborhoods() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (codes: string[]) => {
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      const countyId = profile?.county_id ?? "";
      const year = new Date().getFullYear();
      const rows = codes.map(code => ({
        hood_cd: code,
        year,
        county_id: countyId,
        status: "registered",
      }));
      const { data, error } = await supabase
        .from("neighborhoods")
        .upsert(rows as any, { onConflict: "county_id,hood_cd,year" })
        .select();
      if (error) throw error;
      await emitTraceEventAsync({
        sourceModule: "atlas",
        eventType: "neighborhood_certified",
        eventData: { action: "bulk_registered", count: codes.length, codes },
      });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["neighborhood-discovery"] });
      qc.invalidateQueries({ queryKey: ["county-vitals"] });
      toast({ title: `${data?.length || 0} neighborhoods registered` });
    },
    onError: (err: Error) => {
      toast({ title: "Bulk register failed", description: err.message, variant: "destructive" });
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
      model_type?: string;
      property_classes?: string[];
      description?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.hood_name !== undefined) updates.hood_name = input.hood_name;
      if (input.model_type !== undefined) updates.model_type = input.model_type;
      if (input.property_classes !== undefined) updates.property_classes = input.property_classes;
      if (input.description !== undefined) updates.description = input.description;
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
      qc.invalidateQueries({ queryKey: QUERY_KEY });
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
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["neighborhood-discovery"] });
      toast({ title: "Neighborhood deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

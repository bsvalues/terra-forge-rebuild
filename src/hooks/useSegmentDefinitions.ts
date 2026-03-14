// TerraFusion OS — Phase 26: Segment Definitions CRUD Hook

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SegmentDefinitionRow {
  id: string;
  county_id: string;
  name: string;
  description: string | null;
  factor: string;
  ranges: { label: string; min: number | null; max: number | null }[];
  importance: number;
  is_active: boolean;
  source: string;
  cluster_id: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  factor: string;
  ranges: { label: string; min: number | null; max: number | null }[];
  importance?: number;
  source?: string;
  cluster_id?: number;
}

export function useSegmentDefinitions() {
  return useQuery({
    queryKey: ["segment-definitions"],
    queryFn: async (): Promise<SegmentDefinitionRow[]> => {
      const { data, error } = await supabase
        .from("segment_definitions")
        .select("*")
        .order("importance", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        ranges: Array.isArray(d.ranges) ? d.ranges : JSON.parse(d.ranges || "[]"),
      }));
    },
    staleTime: 60_000,
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSegmentInput) => {
      // Get county_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("county_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .single();

      const { data, error } = await supabase
        .from("segment_definitions")
        .insert({
          county_id: profile?.county_id ?? "",
          name: input.name,
          description: input.description ?? null,
          factor: input.factor,
          ranges: JSON.stringify(input.ranges),
          importance: input.importance ?? 0,
          source: input.source ?? "manual",
          cluster_id: input.cluster_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["segment-definitions"] });
      toast.success("Segment created");
    },
    onError: (err: Error) => toast.error(`Failed to create segment: ${err.message}`),
  });
}

export function useToggleSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("segment_definitions")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["segment-definitions"] }),
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("segment_definitions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["segment-definitions"] });
      toast.success("Segment deleted");
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });
}

// Compute per-segment equity metrics from parcels
export function useSegmentEquityMetrics(segments: SegmentDefinitionRow[]) {
  return useQuery({
    queryKey: ["segment-equity-metrics", segments.map((s) => s.id).join(",")],
    queryFn: async () => {
      if (segments.length === 0) return [];

      // Get parcels with sales for ratio computation
      const { data: parcels, error: pErr } = await supabase
        .from("parcels")
        .select("id, assessed_value, building_area, year_built, neighborhood_code, property_class")
        .gt("assessed_value", 0)
        .limit(1000);
      if (pErr) throw pErr;

      const { data: sales, error: sErr } = await supabase
        .from("sales")
        .select("parcel_id, sale_price")
        .eq("is_qualified", true)
        .gt("sale_price", 0)
        .limit(1000);
      if (sErr) throw sErr;

      // Build sale price lookup
      const saleLookup = new Map<string, number>();
      for (const s of sales ?? []) {
        saleLookup.set(s.parcel_id, s.sale_price);
      }

      // For each active segment, classify parcels and compute ratio stats
      return segments.filter((s) => s.is_active).map((seg) => {
        const rangeResults = seg.ranges.map((range) => {
          const matching = (parcels ?? []).filter((p) => {
            const val = getParcelFactorValue(p, seg.factor);
            if (val === null) return false;
            if (typeof val === "string") return val === range.label;
            const num = val as number;
            if (range.min !== null && num < range.min) return false;
            if (range.max !== null && num > range.max) return false;
            return true;
          });

          // Compute ratios for matching parcels that have sales
          const ratios = matching
            .map((p) => {
              const sp = saleLookup.get(p.id);
              if (!sp) return null;
              return p.assessed_value / sp;
            })
            .filter((r): r is number => r !== null);

          const sorted = [...ratios].sort((a, b) => a - b);
          const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null;
          const mean = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;

          // COD
          let cod = null;
          if (median && ratios.length > 1) {
            const absDevs = ratios.map((r) => Math.abs(r - median));
            const avgAbsDev = absDevs.reduce((a, b) => a + b, 0) / absDevs.length;
            cod = (avgAbsDev / median) * 100;
          }

          return {
            rangeLabel: range.label,
            parcelCount: matching.length,
            salesCount: ratios.length,
            medianRatio: median,
            meanRatio: mean,
            cod,
          };
        });

        return {
          segmentId: seg.id,
          segmentName: seg.name,
          factor: seg.factor,
          ranges: rangeResults,
        };
      });
    },
    enabled: segments.length > 0,
    staleTime: 120_000,
  });
}

function getParcelFactorValue(parcel: any, factor: string): string | number | null {
  switch (factor) {
    case "building_area": return parcel.building_area;
    case "year_built": return parcel.year_built ? new Date().getFullYear() - parcel.year_built : null;
    case "neighborhood_code": return parcel.neighborhood_code;
    case "property_class": return parcel.property_class;
    default: return null;
  }
}

// TerraFusion OS — Phase 201: Parcel Annotations Hook
// Replaces inline mockAnnotations array in ParcelAnnotations.tsx

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Annotation {
  id: string;
  content: string;
  category: "general" | "valuation" | "legal" | "inspection" | "flag";
  priority: "low" | "medium" | "high";
  pinned: boolean;
  createdAt: string;
  createdBy: string;
  tags: string[];
}

function queryKey(parcelId: string | null) {
  return ["parcel-annotations", parcelId];
}

export function useParcelAnnotations(parcelId: string | null) {
  return useQuery({
    queryKey: queryKey(parcelId),
    enabled: !!parcelId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("parcel_annotations")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        content: row.content,
        category: row.category,
        priority: row.priority,
        pinned: row.pinned ?? false,
        createdAt: row.created_at,
        createdBy: row.created_by ?? "Unknown",
        tags: row.tags ?? [],
      })) as Annotation[];
    },
  });
}

export function useAddAnnotation(parcelId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      content: string;
      category: Annotation["category"];
      priority: Annotation["priority"];
      tags?: string[];
    }) => {
      const { data, error } = await (supabase.from as any)("parcel_annotations")
        .insert({
          parcel_id: parcelId,
          content: payload.content,
          category: payload.category,
          priority: payload.priority,
          pinned: false,
          created_by: "Current User",
          tags: payload.tags ?? [],
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(parcelId) });
    },
  });
}

export function useTogglePinAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await (supabase.from as any)("parcel_annotations")
        .update({ pinned })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcel-annotations"] });
    },
  });
}

export function useDeleteAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("parcel_annotations")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcel-annotations"] });
    },
  });
}

// TerraFusion OS — Parcel Watchlist Hook
// Constitutional: all DB access through this governed hook

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEvent } from "@/services/terraTrace";

export type WatchlistPriority = "low" | "normal" | "high" | "critical";

export interface WatchlistItem {
  id: string;
  user_id: string;
  parcel_id: string;
  county_id: string;
  note: string | null;
  priority: WatchlistPriority;
  created_at: string;
  updated_at: string;
  // Joined parcel fields
  parcel_number?: string;
  address?: string;
  assessed_value?: number;
  neighborhood_code?: string | null;
  property_class?: string | null;
}

const WATCHLIST_KEY = ["parcel-watchlist"];

/** Fetch user's full watchlist with joined parcel data */
export function useWatchlist() {
  return useQuery({
    queryKey: WATCHLIST_KEY,
    queryFn: async (): Promise<WatchlistItem[]> => {
      const { data, error } = await supabase
        .from("parcel_watchlist" as any)
        .select(`
          id, user_id, parcel_id, county_id, note, priority, created_at, updated_at,
          parcels:parcel_id (parcel_number, address, assessed_value, neighborhood_code, property_class)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        parcel_id: row.parcel_id,
        county_id: row.county_id,
        note: row.note,
        priority: row.priority as WatchlistPriority,
        created_at: row.created_at,
        updated_at: row.updated_at,
        parcel_number: row.parcels?.parcel_number,
        address: row.parcels?.address,
        assessed_value: row.parcels?.assessed_value,
        neighborhood_code: row.parcels?.neighborhood_code,
        property_class: row.parcels?.property_class,
      }));
    },
  });
}

/** Check if a specific parcel is in the watchlist */
export function useIsWatched(parcelId: string | null) {
  const { data: watchlist } = useWatchlist();
  if (!parcelId || !watchlist) return { isWatched: false, watchItem: null };
  const item = watchlist.find((w) => w.parcel_id === parcelId);
  return { isWatched: !!item, watchItem: item ?? null };
}

/** Add parcel to watchlist */
export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { parcelId: string; note?: string; priority?: WatchlistPriority }) => {
      const { data, error } = await supabase
        .from("parcel_watchlist" as any)
        .insert({
          parcel_id: params.parcelId,
          note: params.note || null,
          priority: params.priority || "normal",
        })
        .select()
        .single();

      if (error) throw error;

      await emitTraceEvent({
        parcelId: params.parcelId,
        sourceModule: "os",
        eventType: "parcel_updated",
        eventData: { action: "watchlist_added", priority: params.priority || "normal" },
      });

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCHLIST_KEY }),
  });
}

/** Remove parcel from watchlist */
export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { watchlistId: string; parcelId: string }) => {
      const { error } = await supabase
        .from("parcel_watchlist" as any)
        .delete()
        .eq("id", params.watchlistId);

      if (error) throw error;

      await emitTraceEvent({
        parcelId: params.parcelId,
        sourceModule: "os",
        eventType: "parcel_updated",
        eventData: { action: "watchlist_removed" },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCHLIST_KEY }),
  });
}

/** Update watchlist item (note or priority) */
export function useUpdateWatchlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; note?: string; priority?: WatchlistPriority }) => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (params.note !== undefined) updates.note = params.note;
      if (params.priority !== undefined) updates.priority = params.priority;

      const { error } = await supabase
        .from("parcel_watchlist" as any)
        .update(updates)
        .eq("id", params.id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCHLIST_KEY }),
  });
}

/** Toggle watchlist: add if not watched, remove if watched */
export function useToggleWatchlist() {
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  return {
    toggle: async (parcelId: string, currentItem: WatchlistItem | null) => {
      if (currentItem) {
        await removeMutation.mutateAsync({ watchlistId: currentItem.id, parcelId });
      } else {
        await addMutation.mutateAsync({ parcelId });
      }
    },
    isPending: addMutation.isPending || removeMutation.isPending,
  };
}

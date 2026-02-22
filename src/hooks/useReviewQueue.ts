import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useCallback, useMemo } from "react";

export interface ReviewQueue {
  id: string;
  name: string;
  description: string | null;
  county_id: string;
  created_by: string;
  status: string;
  filter_criteria: Record<string, any>;
  created_at: string;
}

export interface ReviewQueueItem {
  id: string;
  queue_id: string;
  parcel_id: string;
  position: number;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  parcels?: {
    id: string;
    parcel_number: string;
    address: string;
    assessed_value: number;
    city: string | null;
    property_class: string | null;
    neighborhood_code: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export function useReviewQueues() {
  return useQuery({
    queryKey: ["review-queues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_queues")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReviewQueue[];
    },
  });
}

export function useReviewQueueItems(queueId: string | null) {
  return useQuery({
    queryKey: ["review-queue-items", queueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_queue_items")
        .select("*, parcels(id, parcel_number, address, assessed_value, city, property_class, neighborhood_code, latitude, longitude)")
        .eq("queue_id", queueId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as ReviewQueueItem[];
    },
    enabled: !!queueId,
  });
}

export function useCreateReviewQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      neighborhoodCode?: string;
      propertyClass?: string;
      limit?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's county
      const { data: profile } = await supabase
        .from("profiles")
        .select("county_id")
        .eq("user_id", user.id)
        .single();

      const countyId = profile?.county_id;
      if (!countyId) throw new Error("No county assigned to your profile");

      // Create the queue
      const { data: queue, error: queueError } = await supabase
        .from("review_queues")
        .insert({
          name: params.name,
          description: params.description || null,
          county_id: countyId,
          created_by: user.id,
          filter_criteria: {
            neighborhood_code: params.neighborhoodCode || null,
            property_class: params.propertyClass || null,
          },
        })
        .select()
        .single();

      if (queueError) throw queueError;

      // Build parcel query
      let parcelQuery = supabase
        .from("parcels")
        .select("id")
        .eq("county_id", countyId);

      if (params.neighborhoodCode) {
        parcelQuery = parcelQuery.eq("neighborhood_code", params.neighborhoodCode);
      }
      if (params.propertyClass) {
        parcelQuery = parcelQuery.eq("property_class", params.propertyClass);
      }

      parcelQuery = parcelQuery
        .order("parcel_number", { ascending: true })
        .limit(params.limit || 50);

      const { data: parcels, error: parcelError } = await parcelQuery;
      if (parcelError) throw parcelError;

      if (!parcels || parcels.length === 0) {
        throw new Error("No parcels found matching criteria");
      }

      // Insert queue items
      const items = parcels.map((p, idx) => ({
        queue_id: queue.id,
        parcel_id: p.id,
        position: idx + 1,
        status: "pending",
      }));

      const { error: itemsError } = await supabase
        .from("review_queue_items")
        .insert(items);

      if (itemsError) throw itemsError;

      return { queue, itemCount: items.length };
    },
    onSuccess: ({ queue, itemCount }) => {
      toast.success(`Queue "${queue.name}" created with ${itemCount} parcels`);
      queryClient.invalidateQueries({ queryKey: ["review-queues"] });
    },
    onError: (error: any) => {
      toast.error("Failed to create queue", { description: error.message });
    },
  });
}

export function useMarkReviewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("review_queue_items")
        .update({
          status: "reviewed",
          reviewed_by: user?.id || null,
          reviewed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["review-queue-items", data.queue_id] });
    },
    onError: (error: any) => {
      toast.error("Failed to mark as reviewed", { description: error.message });
    },
  });
}

export function useSkipItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("review_queue_items")
        .update({
          status: "skipped",
          notes: notes || null,
        })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["review-queue-items", data.queue_id] });
    },
  });
}

/** Manages navigation state for the active queue */
export function useQueueNavigation(items: ReviewQueueItem[] | undefined) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = useMemo(() => items?.[currentIndex] ?? null, [items, currentIndex]);
  const total = items?.length ?? 0;
  const reviewed = useMemo(() => items?.filter(i => i.status === "reviewed").length ?? 0, [items]);
  const skipped = useMemo(() => items?.filter(i => i.status === "skipped").length ?? 0, [items]);
  const progress = total > 0 ? Math.round(((reviewed + skipped) / total) * 100) : 0;

  const goNext = useCallback(() => {
    if (items && currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [items, currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const goTo = useCallback((index: number) => {
    if (items && index >= 0 && index < items.length) {
      setCurrentIndex(index);
    }
  }, [items]);

  const jumpToNextPending = useCallback(() => {
    if (!items) return;
    // Find next pending item after current
    for (let i = currentIndex + 1; i < items.length; i++) {
      if (items[i].status === "pending") {
        setCurrentIndex(i);
        return;
      }
    }
    // Wrap around
    for (let i = 0; i < currentIndex; i++) {
      if (items[i].status === "pending") {
        setCurrentIndex(i);
        return;
      }
    }
    toast.info("All parcels have been reviewed!");
  }, [items, currentIndex]);

  return {
    currentItem,
    currentIndex,
    total,
    reviewed,
    skipped,
    progress,
    goNext,
    goPrev,
    goTo,
    jumpToNextPending,
    hasNext: currentIndex < total - 1,
    hasPrev: currentIndex > 0,
  };
}

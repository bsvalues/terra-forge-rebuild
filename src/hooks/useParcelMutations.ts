import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParcelUpdatePayload {
  address?: string;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  property_class?: string | null;
  neighborhood_code?: string | null;
  year_built?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  building_area?: number | null;
  land_area?: number | null;
  land_value?: number | null;
  improvement_value?: number | null;
  assessed_value?: number;
  latitude?: number | null;
  longitude?: number | null;
}

export function useParcelFullDetails(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-details", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("id", parcelId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
    staleTime: 30000,
  });
}

export function useUpdateParcel(parcelId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ParcelUpdatePayload) => {
      if (!parcelId) throw new Error("No parcel selected");

      const { data, error } = await supabase
        .from("parcels")
        .update(updates)
        .eq("id", parcelId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Parcel updated successfully");
      queryClient.invalidateQueries({ queryKey: ["parcel-search"] });
      queryClient.invalidateQueries({ queryKey: ["parcel-details", parcelId] });
    },
    onError: (error: any) => {
      toast.error("Failed to update parcel", {
        description: error.message,
      });
    },
  });
}

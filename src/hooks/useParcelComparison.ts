// TerraFusion OS — Parcel Comparison Hook
// Fetches full parcel details for side-by-side comparison

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ComparisonParcel {
  id: string;
  parcel_number: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  property_class: string | null;
  neighborhood_code: string | null;
  year_built: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  building_area: number | null;
  land_area: number | null;
  assessed_value: number;
  land_value: number | null;
  improvement_value: number | null;
  latitude: number | null;
  longitude: number | null;
}

const COMPARISON_FIELDS = [
  { key: "assessed_value", label: "Assessed Value", format: "currency" },
  { key: "land_value", label: "Land Value", format: "currency" },
  { key: "improvement_value", label: "Improvement Value", format: "currency" },
  { key: "building_area", label: "Building Area", format: "sqft" },
  { key: "land_area", label: "Land Area", format: "sqft" },
  { key: "year_built", label: "Year Built", format: "number" },
  { key: "bedrooms", label: "Bedrooms", format: "number" },
  { key: "bathrooms", label: "Bathrooms", format: "number" },
  { key: "property_class", label: "Property Class", format: "text" },
  { key: "neighborhood_code", label: "Neighborhood", format: "text" },
] as const;

export { COMPARISON_FIELDS };

export function useParcelComparison() {
  const [parcels, setParcels] = useState<ComparisonParcel[]>([]);
  const [loading, setLoading] = useState(false);

  const addParcel = useCallback(async (parcelId: string) => {
    // Don't add duplicates
    if (parcels.some((p) => p.id === parcelId)) return;
    if (parcels.length >= 4) return; // max 4

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, city, state, zip_code, property_class, neighborhood_code, year_built, bedrooms, bathrooms, building_area, land_area, assessed_value, land_value, improvement_value, latitude, longitude")
        .eq("id", parcelId)
        .single();

      if (error || !data) return;
      setParcels((prev) => [...prev, data as ComparisonParcel]);
    } finally {
      setLoading(false);
    }
  }, [parcels]);

  const removeParcel = useCallback((parcelId: string) => {
    setParcels((prev) => prev.filter((p) => p.id !== parcelId));
  }, []);

  const clearAll = useCallback(() => {
    setParcels([]);
  }, []);

  return { parcels, loading, addParcel, removeParcel, clearAll };
}

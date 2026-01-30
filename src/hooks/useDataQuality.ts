import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FieldCompleteness {
  field: string;
  label: string;
  total: number;
  complete: number;
  percentage: number;
  quality: "good" | "fair" | "poor";
}

export interface CityMetrics {
  city: string;
  parcelCount: number;
  avgCompleteness: number;
  quality: "good" | "fair" | "poor";
  fields: {
    assessed_value: number;
    building_area: number;
    year_built: number;
    bedrooms: number;
    bathrooms: number;
    coordinates: number;
    land_area: number;
    property_class: number;
    neighborhood_code: number;
  };
}

export interface DataQualityMetrics {
  totalParcels: number;
  totalSales: number;
  fieldCompleteness: FieldCompleteness[];
  overallCompleteness: number;
  overallQuality: "good" | "fair" | "poor";
  cityMetrics: CityMetrics[];
  recentUpdates: number;
}

function getQuality(percentage: number): "good" | "fair" | "poor" {
  if (percentage >= 80) return "good";
  if (percentage >= 50) return "fair";
  return "poor";
}

export function useDataQuality() {
  return useQuery({
    queryKey: ["data-quality-metrics"],
    queryFn: async (): Promise<DataQualityMetrics> => {
      // Fetch all parcels with relevant fields
      const { data: parcels, error: parcelsError } = await supabase
        .from("parcels")
        .select("id, city, assessed_value, building_area, year_built, bedrooms, bathrooms, latitude, longitude, land_area, property_class, neighborhood_code, updated_at");

      if (parcelsError) throw parcelsError;

      // Fetch sales count
      const { count: salesCount, error: salesError } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true });

      if (salesError) throw salesError;

      const total = parcels?.length || 0;
      
      // Calculate field completeness
      const fieldStats = {
        assessed_value: 0,
        building_area: 0,
        year_built: 0,
        bedrooms: 0,
        bathrooms: 0,
        coordinates: 0,
        land_area: 0,
        property_class: 0,
        neighborhood_code: 0,
      };

      // Count recent updates (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      let recentUpdates = 0;

      // Group by city
      const cityMap = new Map<string, {
        count: number;
        fields: typeof fieldStats;
      }>();

      parcels?.forEach((parcel) => {
        // Field completeness
        if (parcel.assessed_value != null) fieldStats.assessed_value++;
        if (parcel.building_area != null) fieldStats.building_area++;
        if (parcel.year_built != null) fieldStats.year_built++;
        if (parcel.bedrooms != null) fieldStats.bedrooms++;
        if (parcel.bathrooms != null) fieldStats.bathrooms++;
        if (parcel.latitude != null && parcel.longitude != null) fieldStats.coordinates++;
        if (parcel.land_area != null) fieldStats.land_area++;
        if (parcel.property_class != null) fieldStats.property_class++;
        if (parcel.neighborhood_code != null) fieldStats.neighborhood_code++;

        // Recent updates
        if (parcel.updated_at && new Date(parcel.updated_at) > weekAgo) {
          recentUpdates++;
        }

        // City grouping
        const city = parcel.city || "Unknown";
        if (!cityMap.has(city)) {
          cityMap.set(city, {
            count: 0,
            fields: {
              assessed_value: 0,
              building_area: 0,
              year_built: 0,
              bedrooms: 0,
              bathrooms: 0,
              coordinates: 0,
              land_area: 0,
              property_class: 0,
              neighborhood_code: 0,
            },
          });
        }

        const cityData = cityMap.get(city)!;
        cityData.count++;
        if (parcel.assessed_value != null) cityData.fields.assessed_value++;
        if (parcel.building_area != null) cityData.fields.building_area++;
        if (parcel.year_built != null) cityData.fields.year_built++;
        if (parcel.bedrooms != null) cityData.fields.bedrooms++;
        if (parcel.bathrooms != null) cityData.fields.bathrooms++;
        if (parcel.latitude != null && parcel.longitude != null) cityData.fields.coordinates++;
        if (parcel.land_area != null) cityData.fields.land_area++;
        if (parcel.property_class != null) cityData.fields.property_class++;
        if (parcel.neighborhood_code != null) cityData.fields.neighborhood_code++;
      });

      // Build field completeness array
      const fieldLabels: Record<string, string> = {
        assessed_value: "Assessed Value",
        building_area: "Building Area",
        year_built: "Year Built",
        bedrooms: "Bedrooms",
        bathrooms: "Bathrooms",
        coordinates: "Coordinates",
        land_area: "Land Area",
        property_class: "Property Class",
        neighborhood_code: "Neighborhood",
      };

      const fieldCompleteness: FieldCompleteness[] = Object.entries(fieldStats).map(
        ([field, complete]) => {
          const percentage = total > 0 ? Math.round((complete / total) * 100) : 0;
          return {
            field,
            label: fieldLabels[field] || field,
            total,
            complete,
            percentage,
            quality: getQuality(percentage),
          };
        }
      );

      // Calculate overall completeness (average of all fields)
      const overallCompleteness =
        fieldCompleteness.length > 0
          ? Math.round(
              fieldCompleteness.reduce((sum, f) => sum + f.percentage, 0) /
                fieldCompleteness.length
            )
          : 0;

      // Build city metrics
      const cityMetrics: CityMetrics[] = Array.from(cityMap.entries())
        .map(([city, data]) => {
          const count = data.count;
          const fieldPercentages = {
            assessed_value: count > 0 ? Math.round((data.fields.assessed_value / count) * 100) : 0,
            building_area: count > 0 ? Math.round((data.fields.building_area / count) * 100) : 0,
            year_built: count > 0 ? Math.round((data.fields.year_built / count) * 100) : 0,
            bedrooms: count > 0 ? Math.round((data.fields.bedrooms / count) * 100) : 0,
            bathrooms: count > 0 ? Math.round((data.fields.bathrooms / count) * 100) : 0,
            coordinates: count > 0 ? Math.round((data.fields.coordinates / count) * 100) : 0,
            land_area: count > 0 ? Math.round((data.fields.land_area / count) * 100) : 0,
            property_class: count > 0 ? Math.round((data.fields.property_class / count) * 100) : 0,
            neighborhood_code: count > 0 ? Math.round((data.fields.neighborhood_code / count) * 100) : 0,
          };

          const avgCompleteness = Math.round(
            Object.values(fieldPercentages).reduce((a, b) => a + b, 0) / 9
          );

          return {
            city,
            parcelCount: count,
            avgCompleteness,
            quality: getQuality(avgCompleteness),
            fields: fieldPercentages,
          };
        })
        .sort((a, b) => b.parcelCount - a.parcelCount);

      return {
        totalParcels: total,
        totalSales: salesCount || 0,
        fieldCompleteness,
        overallCompleteness,
        overallQuality: getQuality(overallCompleteness),
        cityMetrics,
        recentUpdates,
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

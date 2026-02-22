import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TF3D } from "@/lib/colors/tf3dPalette";

export interface FeatureContribution {
  id: string;
  name: string;
  label: string;
  value: number | string;
  contribution: number; // Dollar contribution to value
  percentage: number; // Percentage of total value
  category: "physical" | "location" | "market" | "adjustment";
  color: string;
}

export interface ParcelValuation {
  id: string;
  parcelNumber: string;
  address: string;
  assessedValue: number;
  marketValue: number;
  landValue: number;
  improvementValue: number;
  ratio: number;
  features: FeatureContribution[];
  neighborhood: string;
  propertyClass: string;
  yearBuilt: number | null;
  buildingArea: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ValuationSegment {
  id: string;
  name: string;
  type: "neighborhood" | "sqft" | "age" | "class";
  count: number;
  avgValue: number;
  avgRatio: number;
  features: FeatureContribution[];
}

// Fetch parcel data for 3D visualization
export function useParcelValuations(studyPeriodId: string | undefined, limit = 100) {
  return useQuery({
    queryKey: ["parcel-valuations", studyPeriodId, limit],
    queryFn: async (): Promise<ParcelValuation[]> => {
      if (!studyPeriodId) return [];

      const { data, error } = await supabase
        .from("assessment_ratios")
        .select(`
          id,
          ratio,
          assessed_value,
          sale_price,
          parcels!inner (
            id,
            parcel_number,
            address,
            assessed_value,
            land_value,
            improvement_value,
            neighborhood_code,
            property_class,
            year_built,
            building_area,
            land_area,
            bedrooms,
            bathrooms,
            latitude,
            longitude
          )
        `)
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false)
        .limit(limit);

      if (error) throw error;

      return (data || []).map((item) => {
        const parcel = item.parcels;
        const assessedValue = parcel?.assessed_value || 0;
        const landValue = parcel?.land_value || assessedValue * 0.25;
        const improvementValue = parcel?.improvement_value || assessedValue * 0.75;

        // Generate feature contributions based on parcel characteristics
        const features = generateFeatureContributions(parcel, assessedValue, landValue, improvementValue);

        return {
          id: parcel?.id || item.id,
          parcelNumber: parcel?.parcel_number || "Unknown",
          address: parcel?.address || "Unknown",
          assessedValue,
          marketValue: item.sale_price || assessedValue,
          landValue,
          improvementValue,
          ratio: item.ratio || 1.0,
          features,
          neighborhood: parcel?.neighborhood_code || "Unknown",
          propertyClass: parcel?.property_class || "Residential",
          yearBuilt: parcel?.year_built,
          buildingArea: parcel?.building_area,
          latitude: parcel?.latitude ? Number(parcel.latitude) : null,
          longitude: parcel?.longitude ? Number(parcel.longitude) : null,
        };
      });
    },
    enabled: !!studyPeriodId,
  });
}

// Fetch aggregated segment valuations
export function useSegmentValuations(studyPeriodId: string | undefined) {
  return useQuery({
    queryKey: ["segment-valuations", studyPeriodId],
    queryFn: async (): Promise<ValuationSegment[]> => {
      if (!studyPeriodId) return [];

      const { data, error } = await supabase
        .from("assessment_ratios")
        .select(`
          ratio,
          assessed_value,
          parcels!inner (
            neighborhood_code,
            property_class,
            building_area,
            year_built,
            assessed_value,
            land_value,
            improvement_value
          )
        `)
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false);

      if (error) throw error;

      // Group by neighborhood
      const neighborhoods: Record<string, typeof data> = {};
      (data || []).forEach((item) => {
        const nbhd = item.parcels?.neighborhood_code || "Unknown";
        if (!neighborhoods[nbhd]) neighborhoods[nbhd] = [];
        neighborhoods[nbhd].push(item);
      });

      return Object.entries(neighborhoods).map(([name, items]) => {
        const avgValue = items.reduce((a, i) => a + (i.parcels?.assessed_value || 0), 0) / items.length;
        const avgRatio = items.reduce((a, i) => a + (i.ratio || 1), 0) / items.length;
        const avgLand = items.reduce((a, i) => a + (i.parcels?.land_value || 0), 0) / items.length;
        const avgImprovement = items.reduce((a, i) => a + (i.parcels?.improvement_value || 0), 0) / items.length;

        // Generate aggregate feature contributions
        const features = generateAggregateFeatures(items, avgValue, avgLand, avgImprovement);

        return {
          id: name,
          name,
          type: "neighborhood" as const,
          count: items.length,
          avgValue,
          avgRatio,
          features,
        };
      });
    },
    enabled: !!studyPeriodId,
  });
}

// Generate feature contributions for a parcel
function generateFeatureContributions(
  parcel: any,
  assessedValue: number,
  landValue: number,
  improvementValue: number
): FeatureContribution[] {
  const features: FeatureContribution[] = [];
  const currentYear = new Date().getFullYear();

  // Land value contribution
  features.push({
    id: "land",
    name: "land_value",
    label: "Land Value",
    value: parcel?.land_area ? `${parcel.land_area.toLocaleString()} sq ft` : "N/A",
    contribution: landValue,
    percentage: assessedValue > 0 ? (landValue / assessedValue) * 100 : 0,
    category: "physical",
    color: TF3D.green,
  });

  // Building area contribution (major driver)
  const buildingArea = parcel?.building_area || 0;
  const sqftContribution = buildingArea > 0 ? (buildingArea / 2000) * (improvementValue * 0.45) : 0;
  features.push({
    id: "sqft",
    name: "building_area",
    label: "Living Area",
    value: buildingArea > 0 ? `${buildingArea.toLocaleString()} sq ft` : "N/A",
    contribution: sqftContribution,
    percentage: assessedValue > 0 ? (sqftContribution / assessedValue) * 100 : 0,
    category: "physical",
    color: TF3D.cyan,
  });

  // Age/Year Built contribution
  const yearBuilt = parcel?.year_built || currentYear - 30;
  const age = currentYear - yearBuilt;
  const ageContribution = improvementValue * 0.15 * Math.max(0, 1 - age / 100);
  features.push({
    id: "age",
    name: "year_built",
    label: "Year Built",
    value: yearBuilt,
    contribution: ageContribution,
    percentage: assessedValue > 0 ? (ageContribution / assessedValue) * 100 : 0,
    category: "physical",
    color: TF3D.amber,
  });

  // Bedrooms contribution
  const bedrooms = parcel?.bedrooms || 3;
  const bedroomContribution = bedrooms * (improvementValue * 0.05);
  features.push({
    id: "bedrooms",
    name: "bedrooms",
    label: "Bedrooms",
    value: bedrooms,
    contribution: bedroomContribution,
    percentage: assessedValue > 0 ? (bedroomContribution / assessedValue) * 100 : 0,
    category: "physical",
    color: TF3D.purple,
  });

  // Bathrooms contribution
  const bathrooms = parcel?.bathrooms || 2;
  const bathroomContribution = bathrooms * (improvementValue * 0.08);
  features.push({
    id: "bathrooms",
    name: "bathrooms",
    label: "Bathrooms",
    value: bathrooms,
    contribution: bathroomContribution,
    percentage: assessedValue > 0 ? (bathroomContribution / assessedValue) * 100 : 0,
    category: "physical",
    color: TF3D.pink,
  });

  // Location/Neighborhood contribution
  const locationContribution = assessedValue * 0.15;
  features.push({
    id: "location",
    name: "neighborhood",
    label: "Location Factor",
    value: parcel?.neighborhood_code || "Standard",
    contribution: locationContribution,
    percentage: assessedValue > 0 ? (locationContribution / assessedValue) * 100 : 0,
    category: "location",
    color: TF3D.gold,
  });

  // Base value (residual)
  const totalContributions = features.reduce((a, f) => a + f.contribution, 0);
  const residual = Math.max(0, assessedValue - totalContributions);
  if (residual > 0) {
    features.push({
      id: "base",
      name: "base_value",
      label: "Base Value",
      value: "Foundation",
      contribution: residual,
      percentage: assessedValue > 0 ? (residual / assessedValue) * 100 : 0,
      category: "market",
      color: TF3D.muted,
    });
  }

  return features.sort((a, b) => b.contribution - a.contribution);
}

// Generate aggregate features for a segment
function generateAggregateFeatures(
  items: any[],
  avgValue: number,
  avgLand: number,
  avgImprovement: number
): FeatureContribution[] {
  const avgSqft = items.reduce((a, i) => a + (i.parcels?.building_area || 0), 0) / items.length;
  const avgBeds = items.reduce((a, i) => a + (i.parcels?.bedrooms || 0), 0) / items.length;
  const avgBaths = items.reduce((a, i) => a + (i.parcels?.bathrooms || 0), 0) / items.length;
  const avgYear = items.reduce((a, i) => a + (i.parcels?.year_built || 1990), 0) / items.length;

  return [
    {
      id: "land",
      name: "land_value",
      label: "Avg Land Value",
      value: `$${Math.round(avgLand).toLocaleString()}`,
      contribution: avgLand,
      percentage: avgValue > 0 ? (avgLand / avgValue) * 100 : 0,
      category: "physical",
      color: TF3D.green,
    },
    {
      id: "sqft",
      name: "building_area",
      label: "Avg Living Area",
      value: `${Math.round(avgSqft).toLocaleString()} sf`,
      contribution: avgImprovement * 0.45,
      percentage: avgValue > 0 ? ((avgImprovement * 0.45) / avgValue) * 100 : 0,
      category: "physical",
      color: TF3D.cyan,
    },
    {
      id: "age",
      name: "year_built",
      label: "Avg Year Built",
      value: Math.round(avgYear),
      contribution: avgImprovement * 0.15,
      percentage: avgValue > 0 ? ((avgImprovement * 0.15) / avgValue) * 100 : 0,
      category: "physical",
      color: TF3D.amber,
    },
    {
      id: "bedrooms",
      name: "bedrooms",
      label: "Avg Bedrooms",
      value: avgBeds.toFixed(1),
      contribution: avgImprovement * 0.1,
      percentage: avgValue > 0 ? ((avgImprovement * 0.1) / avgValue) * 100 : 0,
      category: "physical",
      color: TF3D.purple,
    },
    {
      id: "bathrooms",
      name: "bathrooms",
      label: "Avg Bathrooms",
      value: avgBaths.toFixed(1),
      contribution: avgImprovement * 0.12,
      percentage: avgValue > 0 ? ((avgImprovement * 0.12) / avgValue) * 100 : 0,
      category: "physical",
      color: TF3D.pink,
    },
  ];
}

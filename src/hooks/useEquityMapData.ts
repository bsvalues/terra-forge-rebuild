import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import proj4 from "proj4";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

proj4.defs("EPSG:2286", "+proj=lcc +lat_0=45.3333333333333 +lon_0=-120.5 +lat_1=47.3333333333333 +lat_2=45.8333333333333 +x_0=500000.0001016001 +y_0=0 +datum=NAD83 +units=us-ft +no_defs");

function toWgs84(latCol: number, lngCol: number): [number, number] {
  if (Math.abs(latCol) > 1000 || Math.abs(lngCol) > 1000) {
    const result = proj4("EPSG:2286", "WGS84", [lngCol, latCol]);
    const [lng, lat] = result;
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
    const [lng2, lat2] = proj4("EPSG:2286", "WGS84", [latCol, lngCol]);
    console.log("proj4 swap attempt:", { latCol, lngCol, lat2, lng2 });
    return [lat2, lng2];
  }
  return [latCol, lngCol];
}

export interface ParcelPin {
  id: string;
  parcelNumber: string;
  address: string;
  lat: number;
  lng: number;
  assessedValue: number;
  ratio: number | null;
  neighborhoodCode: string | null;
  propertyClass: string | null;
}

export interface NeighborhoodOverlay {
  code: string;
  parcelCount: number;
  avgRatio: number;
  medianRatio: number;
  cod: number;
  prd: number;
  centerLat: number;
  centerLng: number;
  deviation: number;
  boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

export function useParcelPins(studyPeriodId?: string, limit = 1000) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["parcel-pins", countyId, studyPeriodId, limit],
    queryFn: async (): Promise<ParcelPin[]> => {
      if (!countyId) return [];

      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value, latitude, longitude, neighborhood_code, property_class")
        .eq("county_id", countyId)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(limit);

      if (error) throw error;
      if (!parcels?.length) return [];

      const parcelIds = parcels.map((p) => p.id);
      const BATCH = 100;
      const allSales: { parcel_id: string; sale_price: number }[] = [];
      for (let i = 0; i < parcelIds.length; i += BATCH) {
        const batch = parcelIds.slice(i, i + BATCH);
        const { data: sales } = await supabase
          .from("sales")
          .select("parcel_id, sale_price")
          .eq("is_qualified", true)
          .eq("county_id", countyId)
          .in("parcel_id", batch)
          .gt("sale_price", 0);
        if (sales) allSales.push(...sales);
      }

      const ratioMap = new Map<string, number>();
      const parcelValueMap = new Map(parcels.map((p) => [p.id, p.assessed_value]));
      for (const s of allSales) {
        const av = parcelValueMap.get(s.parcel_id);
        if (av && s.sale_price > 0) {
          ratioMap.set(s.parcel_id, av / s.sale_price);
        }
      }

      return parcels.map((p) => {
        const [lat, lng] = toWgs84(p.latitude!, p.longitude!);
        return {
          id: p.id,
          parcelNumber: p.parcel_number,
          address: p.address,
          lat,
          lng,
          assessedValue: p.assessed_value,
          ratio: ratioMap.get(p.id) ?? null,
          neighborhoodCode: p.neighborhood_code,
          propertyClass: p.property_class,
        };
      });
    },
    enabled: !!countyId,
    staleTime: 120000,
  });
}

export function useNeighborhoodOverlays(studyPeriodId?: string) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["neighborhood-overlays", countyId, studyPeriodId],
    queryFn: async (): Promise<NeighborhoodOverlay[]> => {
      if (!countyId) return [];

      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, assessed_value, neighborhood_code, latitude, longitude")
        .eq("county_id", countyId)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .not("neighborhood_code", "is", null);

      if (error) throw error;
      if (!parcels?.length) return [];

      const parcelIds = parcels.map((p) => p.id);
      const BATCH = 100;
      const allSales: { parcel_id: string; sale_price: number }[] = [];
      for (let i = 0; i < parcelIds.length; i += BATCH) {
        const batch = parcelIds.slice(i, i + BATCH);
        const { data: sales } = await supabase
          .from("sales")
          .select("parcel_id, sale_price")
          .eq("is_qualified", true)
          .eq("county_id", countyId)
          .in("parcel_id", batch)
          .gt("sale_price", 0);
        if (sales) allSales.push(...sales);
      }

      const ratioByParcel = new Map<string, number>();
      const parcelValueMap = new Map(parcels.map((p) => [p.id, p.assessed_value]));
      for (const s of allSales) {
        const av = parcelValueMap.get(s.parcel_id);
        if (av && s.sale_price > 0) {
          ratioByParcel.set(s.parcel_id, av / s.sale_price);
        }
      }

      const groups: Record<string, { ratios: number[]; lats: number[]; lngs: number[]; totalParcels: number }> = {};
      for (const p of parcels) {
        const code = p.neighborhood_code!;
        if (!groups[code]) groups[code] = { ratios: [], lats: [], lngs: [], totalParcels: 0 };
        groups[code].totalParcels++;
        const [lat, lng] = toWgs84(p.latitude!, p.longitude!);
        groups[code].lats.push(lat);
        groups[code].lngs.push(lng);
        const ratio = ratioByParcel.get(p.id);
        if (ratio !== undefined && ratio > 0.3 && ratio < 2.5) {
          groups[code].ratios.push(ratio);
        }
      }

      return Object.entries(groups)
        .filter(([, g]) => g.ratios.length >= 2)
        .map(([code, g]) => {
          const sorted = [...g.ratios].sort((a, b) => a - b);
          const medianRatio = sorted[Math.floor(sorted.length / 2)];
          const avgRatio = g.ratios.reduce((a, b) => a + b, 0) / g.ratios.length;
          const avgDev = g.ratios.reduce((a, r) => a + Math.abs(r - medianRatio), 0) / g.ratios.length;
          const cod = (avgDev / medianRatio) * 100;
          const prd = avgRatio / medianRatio;

          return {
            code,
            parcelCount: g.totalParcels,
            avgRatio,
            medianRatio,
            cod: Math.round(cod * 10) / 10,
            prd: Math.round(prd * 1000) / 1000,
            centerLat: g.lats.reduce((a, b) => a + b, 0) / g.lats.length,
            centerLng: g.lngs.reduce((a, b) => a + b, 0) / g.lngs.length,
            deviation: avgRatio - 1.0,
            boundingBox: {
              minLat: Math.min(...g.lats),
              maxLat: Math.max(...g.lats),
              minLng: Math.min(...g.lngs),
              maxLng: Math.max(...g.lngs),
            },
          };
        });
    },
    enabled: !!countyId,
    staleTime: 120000,
  });
}

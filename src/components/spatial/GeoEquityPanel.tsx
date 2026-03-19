// TerraFusion OS — Phase 88: GeoEquity Spatial Panel
// Renders a Leaflet map showing parcel assessment ratios colored by equity tier.

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map, Layers, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import "leaflet/dist/leaflet.css";

interface ParcelEquityPoint {
  id: string;
  parcel_number: string;
  latitude: number;
  longitude: number;
  assessed_value: number;
  ratio: number | null;
  neighborhood_code: string | null;
}

const EQUITY_COLORS: Record<string, string> = {
  under: "#ef4444",    // Red — under-assessed
  fair: "#22c55e",     // Green — fair
  over: "#3b82f6",     // Blue — over-assessed
  unknown: "#6b7280",  // Gray
};

function getEquityTier(ratio: number | null): string {
  if (ratio == null) return "unknown";
  if (ratio < 0.90) return "under";
  if (ratio > 1.10) return "over";
  return "fair";
}

function useParcelEquityData(countyId?: string) {
  return useQuery<ParcelEquityPoint[]>({
    queryKey: ["geo-equity-parcels", countyId],
    queryFn: async () => {
      // Join parcels with their latest assessment ratio
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, latitude, longitude, assessed_value, neighborhood_code")
        .eq("county_id", countyId!)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(500);

      if (error) throw error;
      if (!parcels?.length) return [];

      const parcelIds = parcels.map((p) => p.id);
      const { data: ratios } = await supabase
        .from("assessment_ratios")
        .select("parcel_id, ratio")
        .in("parcel_id", parcelIds);

      const ratioMap = new Map<string, number>();
      ratios?.forEach((r) => { if (r.ratio != null) ratioMap.set(r.parcel_id, r.ratio); });

      return parcels.map((p) => ({
        id: p.id,
        parcel_number: p.parcel_number,
        latitude: p.latitude!,
        longitude: p.longitude!,
        assessed_value: p.assessed_value ?? 0,
        ratio: ratioMap.get(p.id) ?? null,
        neighborhood_code: p.neighborhood_code,
      }));
    },
    enabled: !!countyId,
    staleTime: 60_000,
  });
}

function FitBounds({ points }: { points: ParcelEquityPoint[] }) {
  const map = useMap();
  useMemo(() => {
    if (points.length > 0) {
      const bounds = points.map((p) => [p.latitude, p.longitude] as [number, number]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points, map]);
  return null;
}

export function GeoEquityPanel() {
  const { profile } = useAuthContext();
  const { data: points = [], isLoading } = useParcelEquityData(profile?.county_id ?? undefined);
  const [showLegend, setShowLegend] = useState(true);

  const center: [number, number] = points.length > 0
    ? [points[0].latitude, points[0].longitude]
    : [40.76, -111.89]; // Default Salt Lake City

  const summary = useMemo(() => {
    const counts = { under: 0, fair: 0, over: 0, unknown: 0 };
    points.forEach((p) => { counts[getEquityTier(p.ratio)]++; });
    return counts;
  }, [points]);

  if (isLoading) {
    return (
      <Card className="bg-card/80 border-border/40">
        <CardContent className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        {(["under", "fair", "over", "unknown"] as const).map((tier) => (
          <Card key={tier} className="bg-card/80 border-border/40">
            <CardContent className="p-3 text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: EQUITY_COLORS[tier] }} />
              <div className="text-lg font-semibold text-foreground">{summary[tier]}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{tier === "unknown" ? "No Ratio" : tier}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map */}
      <Card className="bg-card/80 border-border/40 overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Map className="w-4 h-4 text-chart-3" />
            GeoEquity Atlas
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs gap-1"
            onClick={() => setShowLegend(!showLegend)}
          >
            <Layers className="w-3.5 h-3.5" />
            Legend
          </Button>
        </CardHeader>
        <CardContent className="p-0 relative">
          <div className="h-[400px]">
            <MapContainer
              center={center}
              zoom={12}
              className="h-full w-full"
              style={{ background: "hsl(var(--background))" }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              />
              <FitBounds points={points} />
              {points.map((p) => {
                const tier = getEquityTier(p.ratio);
                return (
                  <CircleMarker
                    key={p.id}
                    center={[p.latitude, p.longitude]}
                    radius={5}
                    pathOptions={{
                      fillColor: EQUITY_COLORS[tier],
                      fillOpacity: 0.7,
                      color: EQUITY_COLORS[tier],
                      weight: 1,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <div className="font-semibold">{p.parcel_number}</div>
                        <div>Value: ${p.assessed_value.toLocaleString()}</div>
                        <div>Ratio: {p.ratio?.toFixed(4) ?? "N/A"}</div>
                        <div>Nbhd: {p.neighborhood_code ?? "—"}</div>
                        <Badge className="text-[10px]" style={{ backgroundColor: EQUITY_COLORS[tier] }}>
                          {tier.toUpperCase()}
                        </Badge>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Legend overlay */}
          {showLegend && (
            <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm border border-border/40 rounded-lg p-3 z-[1000]">
              <div className="text-[10px] font-medium text-foreground mb-2">Assessment Equity</div>
              {Object.entries(EQUITY_COLORS).filter(([k]) => k !== "unknown").map(([tier, color]) => (
                <div key={tier} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="capitalize">{tier}</span>
                  <span className="text-muted-foreground/60">
                    {tier === "under" ? "<0.90" : tier === "over" ? ">1.10" : "0.90–1.10"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

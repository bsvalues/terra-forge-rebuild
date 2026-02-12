import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Rectangle, Tooltip as LTooltip, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ParcelPin, NeighborhoodOverlay, useParcelPins, useNeighborhoodOverlays } from "@/hooks/useEquityMapData";

interface EquityHeatmapProps {
  studyPeriodId?: string;
  onParcelSelect?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

/** Color a ratio pin: green at 1.0, yellow ±5%, red ±10%+ */
function ratioColor(ratio: number | null): string {
  if (ratio === null) return "#6b7280"; // gray for no ratio
  const dev = Math.abs(ratio - 1.0);
  if (dev < 0.03) return "#10b981"; // green
  if (dev < 0.07) return "#f59e0b"; // amber
  if (dev < 0.12) return "#f97316"; // orange
  return "#ef4444"; // red
}

/** Color a neighborhood overlay by COD */
function codColor(cod: number): string {
  if (cod <= 10) return "rgba(16, 185, 129, 0.25)";   // green
  if (cod <= 15) return "rgba(245, 158, 11, 0.25)";   // amber
  if (cod <= 20) return "rgba(249, 115, 22, 0.25)";   // orange
  return "rgba(239, 68, 68, 0.25)";                     // red
}

function codBorderColor(cod: number): string {
  if (cod <= 10) return "#10b981";
  if (cod <= 15) return "#f59e0b";
  if (cod <= 20) return "#f97316";
  return "#ef4444";
}

function FitBounds({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [map, bounds]);
  return null;
}

function NeighborhoodLabel({ overlay }: { overlay: NeighborhoodOverlay }) {
  const trendIcon = overlay.deviation > 0.02
    ? <TrendingUp className="w-3 h-3 inline" />
    : overlay.deviation < -0.02
    ? <TrendingDown className="w-3 h-3 inline" />
    : <Minus className="w-3 h-3 inline" />;

  return (
    <div className="text-xs space-y-0.5 min-w-[140px]">
      <div className="font-semibold text-sm">{overlay.code}</div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Parcels:</span>
        <span className="font-medium">{overlay.parcelCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Median Ratio:</span>
        <span className="font-medium">{overlay.medianRatio.toFixed(3)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">COD:</span>
        <span className="font-medium" style={{ color: codBorderColor(overlay.cod) }}>
          {overlay.cod.toFixed(1)}%
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">PRD:</span>
        <span className="font-medium">{overlay.prd.toFixed(3)}</span>
      </div>
      <div className="flex items-center gap-1 pt-0.5">
        {trendIcon}
        <span>{overlay.deviation > 0 ? "+" : ""}{(overlay.deviation * 100).toFixed(1)}% from target</span>
      </div>
    </div>
  );
}

export function EquityHeatmap({ studyPeriodId, onParcelSelect }: EquityHeatmapProps) {
  const { data: pins = [], isLoading: pinsLoading } = useParcelPins(studyPeriodId);
  const { data: overlays = [], isLoading: overlaysLoading } = useNeighborhoodOverlays(studyPeriodId);
  const [showPins, setShowPins] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
  const [selectedNbhd, setSelectedNbhd] = useState<string | null>(null);

  const isLoading = pinsLoading || overlaysLoading;

  // Calculate bounds from all points
  const bounds = useMemo(() => {
    const allLats = pins.map((p) => p.lat).concat(overlays.map((o) => o.centerLat));
    const allLngs = pins.map((p) => p.lng).concat(overlays.map((o) => o.centerLng));
    if (allLats.length === 0) return null;
    return new LatLngBounds(
      [Math.min(...allLats) - 0.01, Math.min(...allLngs) - 0.01],
      [Math.max(...allLats) + 0.01, Math.max(...allLngs) + 0.01]
    );
  }, [pins, overlays]);

  // Stats summary
  const summary = useMemo(() => {
    const withRatio = pins.filter((p) => p.ratio !== null);
    const compliant = overlays.filter((o) => o.cod <= 15);
    return {
      totalPins: pins.length,
      withRatio: withRatio.length,
      neighborhoods: overlays.length,
      compliant: compliant.length,
      nonCompliant: overlays.length - compliant.length,
    };
  }, [pins, overlays]);

  const selectedOverlay = overlays.find((o) => o.code === selectedNbhd);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-tf-substrate">
        <div className="text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-3 text-tf-cyan animate-spin" />
          <p className="text-sm text-muted-foreground">Loading equity map data...</p>
        </div>
      </div>
    );
  }

  if (pins.length === 0 && overlays.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-tf-substrate">
        <div className="text-center">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No parcels with coordinates found</p>
          <p className="text-xs text-muted-foreground mt-1">Import parcels with lat/lng to visualize equity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={bounds ? bounds.getCenter() : [46.28, -119.28]}
          zoom={12}
          className="w-full h-full z-0"
          style={{ background: "#0a0f14" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds bounds={bounds} />

          {/* Neighborhood bounding box overlays */}
          {showOverlays && overlays.map((o) => (
            <Rectangle
              key={o.code}
              bounds={[
                [o.boundingBox.minLat, o.boundingBox.minLng],
                [o.boundingBox.maxLat, o.boundingBox.maxLng],
              ]}
              pathOptions={{
                color: codBorderColor(o.cod),
                weight: selectedNbhd === o.code ? 3 : 1.5,
                fillColor: codColor(o.cod),
                fillOpacity: selectedNbhd === o.code ? 0.4 : 0.15,
                dashArray: selectedNbhd === o.code ? undefined : "4 4",
              }}
              eventHandlers={{
                click: () => setSelectedNbhd(o.code === selectedNbhd ? null : o.code),
              }}
            >
              <LTooltip sticky>
                <NeighborhoodLabel overlay={o} />
              </LTooltip>
            </Rectangle>
          ))}

          {/* Parcel pins */}
          {showPins && pins.map((pin) => (
            <CircleMarker
              key={pin.id}
              center={[pin.lat, pin.lng]}
              radius={5}
              pathOptions={{
                color: ratioColor(pin.ratio),
                fillColor: ratioColor(pin.ratio),
                fillOpacity: 0.8,
                weight: 1,
              }}
              eventHandlers={{
                click: () => onParcelSelect?.({
                  id: pin.id,
                  parcelNumber: pin.parcelNumber,
                  address: pin.address,
                  assessedValue: pin.assessedValue,
                }),
              }}
            >
              <LTooltip>
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold">{pin.parcelNumber}</div>
                  <div>{pin.address}</div>
                  <div>${pin.assessedValue.toLocaleString()}</div>
                  {pin.ratio !== null && (
                    <div>Ratio: <strong>{pin.ratio.toFixed(3)}</strong></div>
                  )}
                </div>
              </LTooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Map Controls Overlay */}
        <div className="absolute top-3 right-3 z-[1000] glass-card p-3 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Switch id="pins" checked={showPins} onCheckedChange={setShowPins} />
            <Label htmlFor="pins" className="text-xs cursor-pointer">Parcel Pins</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="overlays" checked={showOverlays} onCheckedChange={setShowOverlays} />
            <Label htmlFor="overlays" className="text-xs cursor-pointer">Neighborhoods</Label>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] glass-card p-3 rounded-lg text-xs space-y-1.5">
          <div className="font-medium text-foreground mb-1">Ratio Legend</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10b981" }} />
            <span>±3% (On Target)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
            <span>3-7% (Caution)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f97316" }} />
            <span>7-12% (Warning)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
            <span>&gt;12% (Critical)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#6b7280" }} />
            <span>No Sale Data</span>
          </div>
          <div className="border-t border-border/50 mt-2 pt-2 font-medium">COD Overlay</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border" style={{ backgroundColor: "rgba(16,185,129,0.25)", borderColor: "#10b981" }} />
            <span>≤10% (Excellent)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border" style={{ backgroundColor: "rgba(245,158,11,0.25)", borderColor: "#f59e0b" }} />
            <span>10-15% (Acceptable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border" style={{ backgroundColor: "rgba(239,68,68,0.25)", borderColor: "#ef4444" }} />
            <span>&gt;15% (Non-Compliant)</span>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <div className="w-72 border-l border-tf-border p-4 overflow-y-auto space-y-4 bg-tf-substrate/50">
        <h3 className="font-medium text-foreground flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-tf-cyan" />
          Equity Summary
        </h3>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-card p-3 rounded-lg text-center">
            <div className="text-lg font-light text-tf-cyan">{summary.totalPins}</div>
            <div className="text-xs text-muted-foreground">Parcels</div>
          </div>
          <div className="glass-card p-3 rounded-lg text-center">
            <div className="text-lg font-light text-tf-sacred-gold">{summary.withRatio}</div>
            <div className="text-xs text-muted-foreground">With Ratios</div>
          </div>
          <div className="glass-card p-3 rounded-lg text-center">
            <div className="text-lg font-light text-tf-optimized-green">{summary.compliant}</div>
            <div className="text-xs text-muted-foreground">Compliant</div>
          </div>
          <div className="glass-card p-3 rounded-lg text-center">
            <div className="text-lg font-light text-destructive">{summary.nonCompliant}</div>
            <div className="text-xs text-muted-foreground">Non-Compliant</div>
          </div>
        </div>

        {/* Selected Neighborhood */}
        {selectedOverlay ? (
          <div className="glass-card p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-lg">{selectedOverlay.code}</h4>
              <Badge variant={selectedOverlay.cod <= 15 ? "secondary" : "destructive"} className="text-xs">
                {selectedOverlay.cod <= 15 ? "Compliant" : "Action Needed"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Parcels</div>
                <div className="font-medium">{selectedOverlay.parcelCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Median Ratio</div>
                <div className="font-medium">{selectedOverlay.medianRatio.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">COD</div>
                <div className="font-medium" style={{ color: codBorderColor(selectedOverlay.cod) }}>
                  {selectedOverlay.cod.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">PRD</div>
                <div className="font-medium">{selectedOverlay.prd.toFixed(3)}</div>
              </div>
            </div>
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Deviation from Target</div>
              <div className="text-sm font-medium" style={{ color: codBorderColor(Math.abs(selectedOverlay.deviation) * 100) }}>
                {selectedOverlay.deviation > 0 ? "+" : ""}{(selectedOverlay.deviation * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Click a neighborhood overlay to view COD/PRD details</p>
          </div>
        )}

        {/* Neighborhood List */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">All Neighborhoods</h4>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {overlays
              .sort((a, b) => b.cod - a.cod)
              .map((o) => (
                <button
                  key={o.code}
                  onClick={() => setSelectedNbhd(o.code === selectedNbhd ? null : o.code)}
                  className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between transition-colors ${
                    selectedNbhd === o.code
                      ? "bg-tf-cyan/20 text-tf-cyan"
                      : "hover:bg-tf-elevated text-foreground"
                  }`}
                >
                  <span className="font-medium">{o.code}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{o.parcelCount}p</span>
                    <span style={{ color: codBorderColor(o.cod) }}>{o.cod.toFixed(1)}%</span>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Click hint */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Click a parcel pin to open in Workbench
        </p>
      </div>
    </div>
  );
}

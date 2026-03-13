import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useParcelPins } from "@/hooks/useEquityMapData";
import { useEquityOverlays, type EquityOverlay } from "@/hooks/useEquityOverlays";

interface EquityHeatmapProps {
  studyPeriodId?: string;
  onParcelSelect?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
  neighborhoodFilter?: string;
  onNeighborhoodSelect?: (code: string | null) => void;
}

function ratioColor(ratio: number | null): string {
  if (ratio === null) return "hsl(var(--muted-foreground))";
  const dev = Math.abs(ratio - 1.0);
  if (dev < 0.03) return "hsl(var(--tf-optimized-green))";
  if (dev < 0.07) return "hsl(var(--tf-sacred-gold))";
  if (dev < 0.12) return "hsl(var(--tf-anomaly-amber))";
  return "hsl(var(--destructive))";
}

function codFill(cod: number): string {
  if (cod <= 10) return "hsl(var(--tf-optimized-green) / 0.25)";
  if (cod <= 15) return "hsl(var(--tf-sacred-gold) / 0.25)";
  if (cod <= 20) return "hsl(var(--tf-anomaly-amber) / 0.25)";
  return "hsl(var(--destructive) / 0.25)";
}

function codStroke(cod: number): string {
  if (cod <= 10) return "hsl(var(--tf-optimized-green))";
  if (cod <= 15) return "hsl(var(--tf-sacred-gold))";
  if (cod <= 20) return "hsl(var(--tf-anomaly-amber))";
  return "hsl(var(--destructive))";
}

export function EquityHeatmap({ studyPeriodId, onParcelSelect, neighborhoodFilter, onNeighborhoodSelect }: EquityHeatmapProps) {
  const { data: pins = [], isLoading: pinsLoading } = useParcelPins(studyPeriodId);
  const { data: serverOverlays = [], isLoading: overlaysLoading } = useEquityOverlays(studyPeriodId);
  const [showPins, setShowPins] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
  const [selectedNbhd, setSelectedNbhd] = useState<string | null>(neighborhoodFilter ?? null);

  // Map server overlays to the shape used by rendering
  const overlays = useMemo(() => serverOverlays.map((o) => ({
    code: o.neighborhood_code,
    parcelCount: Number(o.parcel_count),
    avgRatio: Number(o.avg_ratio),
    medianRatio: Number(o.median_ratio),
    cod: Number(o.cod),
    prd: Number(o.prd),
    centerLat: Number(o.center_lat),
    centerLng: Number(o.center_lng),
    deviation: Number(o.avg_ratio) - 1.0,
    boundingBox: { minLat: Number(o.min_lat), maxLat: Number(o.max_lat), minLng: Number(o.min_lng), maxLng: Number(o.max_lng) },
  })), [serverOverlays]);

  useEffect(() => {
    if (neighborhoodFilter) setSelectedNbhd(neighborhoodFilter);
  }, [neighborhoodFilter]);

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const overlayLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  const isLoading = pinsLoading || overlaysLoading;

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [46.28, -119.28], zoom: 12 });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    }).addTo(map);
    pinLayerRef.current.addTo(map);
    overlayLayerRef.current.addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const handleNbhdSelect = useCallback((code: string | null) => {
    setSelectedNbhd(code);
    onNeighborhoodSelect?.(code);
    if (!code || !mapRef.current) return;
    const o = overlays.find((n) => n.code === code);
    if (!o) return;
    const bounds = L.latLngBounds([o.boundingBox.minLat, o.boundingBox.minLng], [o.boundingBox.maxLat, o.boundingBox.maxLng]);
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [overlays, onNeighborhoodSelect]);

  // Draw overlays
  useEffect(() => {
    const layer = overlayLayerRef.current;
    layer.clearLayers();
    if (!showOverlays) return;
    overlays.forEach((o) => {
      const rect = L.rectangle(
        [[o.boundingBox.minLat, o.boundingBox.minLng], [o.boundingBox.maxLat, o.boundingBox.maxLng]],
        { color: codStroke(o.cod), weight: selectedNbhd === o.code ? 3 : 1.5, fillColor: codFill(o.cod), fillOpacity: selectedNbhd === o.code ? 0.4 : 0.15, dashArray: selectedNbhd === o.code ? undefined : "4 4" }
      );
      rect.bindTooltip(`<div style="font-size:12px"><strong>${o.code}</strong><br/>Parcels: ${o.parcelCount}<br/>Median: ${o.medianRatio.toFixed(3)}<br/>COD: <span style="color:${codStroke(o.cod)}">${o.cod.toFixed(1)}%</span><br/>PRD: ${o.prd.toFixed(3)}</div>`, { sticky: true });
      rect.on("click", () => handleNbhdSelect(o.code === selectedNbhd ? null : o.code));
      rect.addTo(layer);
    });
  }, [overlays, showOverlays, selectedNbhd, handleNbhdSelect]);

  // Draw pins
  useEffect(() => {
    const layer = pinLayerRef.current;
    layer.clearLayers();
    if (!showPins) return;
    pins.forEach((pin) => {
      const marker = L.circleMarker([pin.lat, pin.lng], { radius: 5, color: ratioColor(pin.ratio), fillColor: ratioColor(pin.ratio), fillOpacity: 0.8, weight: 1 });
      marker.bindTooltip(`<div style="font-size:11px"><strong>${pin.parcelNumber}</strong><br/>${pin.address}<br/>$${pin.assessedValue.toLocaleString()}${pin.ratio !== null ? `<br/>Ratio: <strong>${pin.ratio.toFixed(3)}</strong>` : ""}</div>`);
      marker.on("click", () => onParcelSelect?.({ id: pin.id, parcelNumber: pin.parcelNumber, address: pin.address, assessedValue: pin.assessedValue }));
      marker.addTo(layer);
    });
  }, [pins, showPins, onParcelSelect]);

  // Fit bounds
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.invalidateSize();
    const allLats = pins.map((p) => p.lat).concat(overlays.map((o) => o.centerLat));
    const allLngs = pins.map((p) => p.lng).concat(overlays.map((o) => o.centerLng));
    if (allLats.length === 0) return;
    const bounds = L.latLngBounds([Math.min(...allLats) - 0.01, Math.min(...allLngs) - 0.01], [Math.max(...allLats) + 0.01, Math.max(...allLngs) + 0.01]);
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [pins, overlays]);

  const summary = useMemo(() => {
    const withRatio = pins.filter((p) => p.ratio !== null);
    const compliant = overlays.filter((o) => o.cod <= 15);
    return { totalPins: pins.length, withRatio: withRatio.length, compliant: compliant.length, nonCompliant: overlays.length - compliant.length };
  }, [pins, overlays]);

  const selectedOverlay = overlays.find((o) => o.code === selectedNbhd);
  const isEmpty = !isLoading && pins.length === 0 && overlays.length === 0;

  return (
    <div className="w-full h-full flex">
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full z-0 bg-tf-substrate" />
        {isLoading && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center bg-tf-substrate/80">
            <div className="text-center"><Loader2 className="w-10 h-10 mx-auto mb-3 text-tf-cyan animate-spin" /><p className="text-sm text-muted-foreground">Loading equity map data...</p></div>
          </div>
        )}
        {isEmpty && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center bg-tf-substrate/80">
            <div className="text-center"><MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground" /><p className="text-sm text-muted-foreground">No parcels with coordinates found</p></div>
          </div>
        )}
        {/* Controls */}
        <div className="absolute top-3 right-3 z-[1000] material-bento p-3 rounded-lg space-y-3 min-w-[200px]">
          <div className="flex items-center gap-2"><Filter className="w-3.5 h-3.5 text-tf-cyan" /><Label className="text-xs font-medium">Neighborhood</Label></div>
          <Select value={selectedNbhd ?? "all"} onValueChange={(v) => handleNbhdSelect(v === "all" ? null : v)}>
            <SelectTrigger className="h-8 text-xs bg-background border-tf-border"><SelectValue placeholder="All Neighborhoods" /></SelectTrigger>
            <SelectContent className="z-[1100] bg-background border-tf-border">
              <SelectItem value="all" className="text-xs">All Neighborhoods</SelectItem>
              {overlays.sort((a, b) => a.code.localeCompare(b.code)).map((o) => (
                <SelectItem key={o.code} value={o.code} className="text-xs">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: codStroke(o.cod) }} />{o.code} — COD {o.cod.toFixed(1)}%</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2"><Switch id="pins" checked={showPins} onCheckedChange={setShowPins} /><Label htmlFor="pins" className="text-xs cursor-pointer">Parcel Pins</Label></div>
          <div className="flex items-center gap-2"><Switch id="overlays" checked={showOverlays} onCheckedChange={setShowOverlays} /><Label htmlFor="overlays" className="text-xs cursor-pointer">Neighborhoods</Label></div>
        </div>
        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] material-bento p-3 rounded-lg text-xs space-y-1.5">
          <div className="font-medium text-foreground mb-1">Ratio Legend</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-tf-green" /><span>±3% (On Target)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-tf-gold" /><span>3-7% (Caution)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-tf-amber" /><span>7-12% (Warning)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive" /><span>&gt;12% (Critical)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-muted-foreground" /><span>No Sale Data</span></div>
          <div className="border-t border-border/50 mt-2 pt-2 font-medium">COD Overlay</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border border-tf-green" style={{ backgroundColor: "hsl(var(--tf-optimized-green) / 0.25)" }} /><span>≤10% (Excellent)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border border-tf-gold" style={{ backgroundColor: "hsl(var(--tf-sacred-gold) / 0.25)" }} /><span>10-15% (Acceptable)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border border-destructive" style={{ backgroundColor: "hsl(var(--destructive) / 0.25)" }} /><span>&gt;15% (Non-Compliant)</span></div>
        </div>
      </div>

      {/* Details Panel */}
      <div className="w-72 border-l border-tf-border p-4 overflow-y-auto space-y-4 bg-tf-substrate/50">
        <h3 className="font-medium text-foreground flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-tf-cyan" />Equity Summary</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="material-bento p-3 rounded-lg text-center"><div className="text-lg font-light text-tf-cyan">{summary.totalPins}</div><div className="text-xs text-muted-foreground">Parcels</div></div>
          <div className="material-bento p-3 rounded-lg text-center"><div className="text-lg font-light text-tf-sacred-gold">{summary.withRatio}</div><div className="text-xs text-muted-foreground">With Ratios</div></div>
          <div className="material-bento p-3 rounded-lg text-center"><div className="text-lg font-light text-tf-optimized-green">{summary.compliant}</div><div className="text-xs text-muted-foreground">Compliant</div></div>
          <div className="material-bento p-3 rounded-lg text-center"><div className="text-lg font-light text-destructive">{summary.nonCompliant}</div><div className="text-xs text-muted-foreground">Non-Compliant</div></div>
        </div>

        {selectedOverlay ? (
          <div className="material-bento p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-lg">{selectedOverlay.code}</h4>
              <Badge variant={selectedOverlay.cod <= 15 ? "secondary" : "destructive"} className="text-xs">{selectedOverlay.cod <= 15 ? "Compliant" : "Action Needed"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><div className="text-xs text-muted-foreground">Parcels</div><div className="font-medium">{selectedOverlay.parcelCount}</div></div>
              <div><div className="text-xs text-muted-foreground">Median Ratio</div><div className="font-medium">{selectedOverlay.medianRatio.toFixed(3)}</div></div>
              <div><div className="text-xs text-muted-foreground">COD</div><div className="font-medium" style={{ color: codStroke(selectedOverlay.cod) }}>{selectedOverlay.cod.toFixed(1)}%</div></div>
              <div><div className="text-xs text-muted-foreground">PRD</div><div className="font-medium">{selectedOverlay.prd.toFixed(3)}</div></div>
            </div>
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Deviation from Target</div>
              <div className="text-sm font-medium" style={{ color: codStroke(Math.abs(selectedOverlay.deviation) * 100) }}>
                {selectedOverlay.deviation > 0 ? "+" : ""}{(selectedOverlay.deviation * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground"><MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" /><p className="text-xs">Click a neighborhood overlay to view COD/PRD details</p></div>
        )}

        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">All Neighborhoods</h4>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {overlays.sort((a, b) => b.cod - a.cod).map((o) => (
              <button key={o.code} onClick={() => handleNbhdSelect(o.code === selectedNbhd ? null : o.code)}
                className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between transition-colors ${selectedNbhd === o.code ? "bg-tf-cyan/20 text-tf-cyan" : "hover:bg-tf-elevated text-foreground"}`}>
                <span className="font-medium">{o.code}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{o.parcelCount}p</span>
                  <span style={{ color: codStroke(o.cod) }}>{o.cod.toFixed(1)}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center pt-2">Click a parcel pin to open in Workbench</p>
      </div>
    </div>
  );
}

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, AlertTriangle, CheckCircle, Navigation, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NeighborhoodStat {
  code: string;
  count: number;
  avgRatio: number;
  median: number;
  cod: number;
  centerLat: number;
  centerLng: number;
  deviation: number;
}

interface SelectedParcel {
  id: string;
  parcelNumber: string;
  address: string;
  latitude: number;
  longitude: number;
  assessedValue: number | null;
}

interface GeoEquityMapProps {
  studyPeriodId?: string;
  neighborhoodStats: NeighborhoodStat[];
  isLoading: boolean;
  selectedParcel?: SelectedParcel;
}

export function GeoEquityMap({ studyPeriodId, neighborhoodStats, isLoading, selectedParcel }: GeoEquityMapProps) {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);

  // Calculate bounds and normalize positions
  const mapData = useMemo(() => {
    // Include selected parcel in bounds calculation if available
    const allLats = [
      ...neighborhoodStats.map((n) => n.centerLat).filter(Boolean),
      ...(selectedParcel?.latitude ? [selectedParcel.latitude] : []),
    ];
    const allLngs = [
      ...neighborhoodStats.map((n) => n.centerLng).filter(Boolean),
      ...(selectedParcel?.longitude ? [selectedParcel.longitude] : []),
    ];

    if (allLats.length === 0 || allLngs.length === 0) {
      // Fallback to grid layout if no coordinates
      return {
        neighborhoods: neighborhoodStats.map((n, i) => ({
          ...n,
          x: (i % 5) * 20 + 10,
          y: Math.floor(i / 5) * 20 + 10,
        })),
        bounds: null,
        parcelPosition: selectedParcel ? { x: 50, y: 50 } : null,
      };
    }

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    // Calculate parcel position if selected
    const parcelPosition = selectedParcel ? {
      x: ((selectedParcel.longitude - minLng) / lngRange) * 80 + 10,
      y: (1 - (selectedParcel.latitude - minLat) / latRange) * 80 + 10,
    } : null;

    return {
      neighborhoods: neighborhoodStats.map((n) => ({
        ...n,
        // Normalize to 0-100 range with padding
        x: n.centerLng ? ((n.centerLng - minLng) / lngRange) * 80 + 10 : 50,
        y: n.centerLat ? (1 - (n.centerLat - minLat) / latRange) * 80 + 10 : 50,
      })),
      bounds: { minLat, maxLat, minLng, maxLng },
      parcelPosition,
    };
  }, [neighborhoodStats, selectedParcel]);

  // Get color based on ratio deviation
  const getDeviationColor = (deviation: number) => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation < 0.02) return "hsl(var(--tf-optimized-green))"; // Within 2%
    if (absDeviation < 0.05) return "hsl(var(--tf-sacred-gold))"; // Within 5%
    if (deviation > 0) return "hsl(var(--tf-transcend-cyan))"; // Over-assessed
    return "hsl(var(--destructive))"; // Under-assessed
  };

  // Get status icon
  const getStatusIcon = (cod: number, deviation: number) => {
    if (cod > 15 || Math.abs(deviation) > 0.05) {
      return <AlertTriangle className="w-3 h-3 text-destructive" />;
    }
    return <CheckCircle className="w-3 h-3 text-tf-optimized-green" />;
  };

  const selectedStats = mapData.neighborhoods.find((n) => n.code === selectedNeighborhood);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-tf-substrate">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-tf-cyan animate-spin" />
          <p className="text-sm text-muted-foreground">Loading geographic data...</p>
        </div>
      </div>
    );
  }

  // Show empty state only if no neighborhoods AND no selected parcel with coordinates
  if (neighborhoodStats.length === 0 && !selectedParcel) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-tf-substrate">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No geographic data available</p>
          <p className="text-xs text-muted-foreground mt-2">
            Import GIS files or connect to ArcGIS to visualize neighborhoods
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="w-full h-full flex">
      {/* Map Area */}
      <div className="flex-1 relative bg-tf-substrate overflow-hidden">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--tf-transcend-cyan)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--tf-transcend-cyan)) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />

        {/* Neighborhood markers */}
        <TooltipProvider>
          {mapData.neighborhoods.map((nbhd, index) => (
            <Tooltip key={nbhd.code}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                    selectedNeighborhood === nbhd.code ? "z-20 scale-125" : "z-10 hover:scale-110"
                  }`}
                  style={{
                    left: `${nbhd.x}%`,
                    top: `${nbhd.y}%`,
                  }}
                  onClick={() => setSelectedNeighborhood(nbhd.code === selectedNeighborhood ? null : nbhd.code)}
                >
                  {/* Marker */}
                  <div
                    className={`rounded-full border-2 flex items-center justify-center font-mono text-xs transition-all ${
                      selectedNeighborhood === nbhd.code
                        ? "border-white shadow-lg"
                        : "border-white/30"
                    }`}
                    style={{
                      width: Math.max(30, Math.min(60, nbhd.count / 2)),
                      height: Math.max(30, Math.min(60, nbhd.count / 2)),
                      backgroundColor: getDeviationColor(nbhd.deviation),
                      boxShadow: `0 0 ${Math.abs(nbhd.deviation) * 200}px ${getDeviationColor(nbhd.deviation)}`,
                    }}
                  >
                    {nbhd.count}
                  </div>

                  {/* Label */}
                  <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs bg-background/80 px-1 rounded">
                      {nbhd.code}
                    </span>
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-tf-elevated border-tf-border">
                <div className="text-sm">
                  <div className="font-medium">{nbhd.code}</div>
                  <div className="text-muted-foreground text-xs">
                    {nbhd.count} parcels • Ratio: {nbhd.avgRatio.toFixed(3)}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

        {/* Selected Parcel Marker */}
        <AnimatePresence>
          {selectedParcel && mapData.parcelPosition && (
            <motion.div
              key={selectedParcel.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${mapData.parcelPosition.x}%`,
                top: `${mapData.parcelPosition.y}%`,
              }}
            >
              {/* Pulse ring */}
              <div className="absolute inset-0 -m-4">
                <div className="w-16 h-16 rounded-full border-2 border-suite-atlas animate-ping opacity-30" />
              </div>
              
              {/* Marker */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative cursor-pointer group">
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 -m-2 rounded-full blur-md opacity-50"
                      style={{ backgroundColor: "hsl(var(--suite-atlas))" }}
                    />
                    
                    {/* Pin */}
                    <div className="relative w-10 h-10 rounded-full bg-suite-atlas border-2 border-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Navigation className="w-5 h-5 text-white" />
                    </div>
                    
                    {/* Label */}
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <div className="glass-card px-2 py-1 rounded text-xs font-medium text-suite-atlas">
                        {selectedParcel.parcelNumber}
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-tf-elevated border-suite-atlas/30 max-w-xs">
                  <div className="text-sm space-y-1">
                    <div className="font-medium text-suite-atlas flex items-center gap-2">
                      <Navigation className="w-3 h-3" />
                      Selected Parcel
                    </div>
                    <div className="text-foreground font-medium">{selectedParcel.address}</div>
                    <div className="text-muted-foreground text-xs font-mono">{selectedParcel.parcelNumber}</div>
                    {selectedParcel.assessedValue && (
                      <div className="text-tf-green text-xs flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(selectedParcel.assessedValue)}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 glass-card p-3 rounded-lg text-xs space-y-2">
          <div className="font-medium text-foreground mb-2">Ratio Deviation</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--tf-optimized-green))" }} />
            <span>Within 2% of target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--tf-sacred-gold))" }} />
            <span>2-5% deviation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--tf-transcend-cyan))" }} />
            <span>Over-assessed (&gt;5%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--destructive))" }} />
            <span>Under-assessed (&gt;5%)</span>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-80 border-l border-tf-border p-4 overflow-y-auto"
      >
        <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-tf-cyan" />
          Neighborhood Details
        </h3>

        {selectedStats ? (
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium">{selectedStats.code}</h4>
                {getStatusIcon(selectedStats.cod, selectedStats.deviation)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Parcels</div>
                  <div className="font-medium">{selectedStats.count}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Avg Ratio</div>
                  <div className="font-medium">{selectedStats.avgRatio.toFixed(3)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Median Ratio</div>
                  <div className="font-medium">{selectedStats.median.toFixed(3)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">COD</div>
                  <div className={`font-medium ${selectedStats.cod > 15 ? "text-destructive" : "text-tf-optimized-green"}`}>
                    {selectedStats.cod.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-tf-border">
                <div className="text-muted-foreground text-xs mb-1">Deviation from Target</div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full flex-1"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--destructive)), hsl(var(--tf-optimized-green)), hsl(var(--tf-transcend-cyan)))`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>-10%</span>
                  <span
                    className="font-medium"
                    style={{ color: getDeviationColor(selectedStats.deviation) }}
                  >
                    {selectedStats.deviation > 0 ? "+" : ""}
                    {(selectedStats.deviation * 100).toFixed(1)}%
                  </span>
                  <span>+10%</span>
                </div>
              </div>
            </div>

            <Badge
              variant={Math.abs(selectedStats.deviation) > 0.05 ? "destructive" : "secondary"}
              className="w-full justify-center py-2"
            >
              {Math.abs(selectedStats.deviation) > 0.05
                ? "Requires Attention"
                : "Within Acceptable Range"}
            </Badge>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click a neighborhood to view details</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-tf-border">
          <h4 className="text-sm font-medium text-foreground mb-3">Summary</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Neighborhoods</span>
              <span className="font-medium">{mapData.neighborhoods.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Compliant (COD ≤15)</span>
              <span className="font-medium text-tf-optimized-green">
                {mapData.neighborhoods.filter((n) => n.cod <= 15).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Non-Compliant</span>
              <span className="font-medium text-destructive">
                {mapData.neighborhoods.filter((n) => n.cod > 15).length}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

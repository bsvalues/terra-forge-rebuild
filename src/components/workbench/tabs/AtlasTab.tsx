import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  Layers, 
  Map, 
  MapPin, 
  Compass, 
  Upload, 
  Eye, 
  EyeOff,
  ChevronRight,
  ChevronDown,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings,
  Database,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GeoEquityMap } from "@/components/geoequity/GeoEquityMap";
import { EquityHeatmap } from "@/components/geoequity/EquityHeatmap";
import { GISLayersPanel } from "@/components/geoequity/GISLayersPanel";
import { ParcelSearchPanel } from "@/components/geoequity/ParcelSearchPanel";
import { GeoEquityPanel } from "@/components/spatial/GeoEquityPanel";
import { 
  useGISLayers, 
  useNeighborhoodGeoStats,
  useParcelsWithGeometry 
} from "@/hooks/useGISData";
import { cn } from "@/lib/utils";

type AtlasView = "map" | "heatmap" | "layers" | "search" | "geoequity";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export function AtlasTab() {
  const { studyPeriod, parcel } = useWorkbench();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<AtlasView>("map");
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [showNeighborhoods, setShowNeighborhoods] = useState(true);
  const [showParcels, setShowParcels] = useState(true);
  const [mapZoom, setMapZoom] = useState(1);

  // Fetch GIS data
  const { data: layers = [], isLoading: isLoadingLayers } = useGISLayers();
  const { data: neighborhoodStats = [], isLoading: isLoadingStats } = useNeighborhoodGeoStats(
    studyPeriod.id ?? undefined
  );
  const { data: parcelsWithGeo = [], isLoading: isLoadingParcels } = useParcelsWithGeometry(
    studyPeriod.id ?? undefined,
    200
  );

  // Stats for the header
  const totalFeatures = useMemo(() => 
    layers.reduce((sum, layer) => sum + layer.feature_count, 0),
    [layers]
  );

  const hasActiveParcel = parcel.id !== null;

  return (
    <div className="h-full flex flex-col">
      {/* Atlas Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4 border-b border-border/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-suite-atlas/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-suite-atlas" />
            </div>
            <div>
              <h2 className="text-xl font-light text-foreground">TerraAtlas</h2>
              <p className="text-xs text-muted-foreground">
                See the county — {layers.length} layers, {totalFeatures.toLocaleString()} features
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/geoequity")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              Open GeoEquity
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* View Tabs */}
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as AtlasView)}>
              <TabsList className="bg-tf-surface/50">
                <TabsTrigger value="map" className="text-xs gap-1.5">
                  <Map className="w-3.5 h-3.5" />
                  Equity Map
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="text-xs gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Heatmap
                </TabsTrigger>
                <TabsTrigger value="layers" className="text-xs gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Layers
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="geoequity" className="text-xs gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  GeoEquity
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex"
            >
              {/* Layer Control Sidebar */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={cn(
                  "border-r border-border/30 bg-tf-elevated/50 transition-all duration-300",
                  layerPanelOpen ? "w-72" : "w-12"
                )}
              >
                <div className="p-3 border-b border-border/30 flex items-center justify-between">
                  {layerPanelOpen && (
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-suite-atlas" />
                      Layer Controls
                    </h3>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setLayerPanelOpen(!layerPanelOpen)}
                  >
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      layerPanelOpen && "rotate-180"
                    )} />
                  </Button>
                </div>

                {layerPanelOpen && (
                  <ScrollArea className="h-[calc(100%-52px)]">
                    <div className="p-3 space-y-4">
                      {/* Quick Toggles */}
                      <div className="space-y-3">
                        <LayerToggle
                          label="Neighborhoods"
                          description="Equity choropleth"
                          enabled={showNeighborhoods}
                          onToggle={setShowNeighborhoods}
                          color="bg-suite-atlas"
                        />
                        <LayerToggle
                          label="Parcels"
                          description="Individual properties"
                          enabled={showParcels}
                          onToggle={setShowParcels}
                          color="bg-tf-cyan"
                        />
                      </div>

                      {/* Study Period Context */}
                      {studyPeriod.id && (
                        <div className="material-bento rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">Study Period</div>
                          <div className="text-sm font-medium text-foreground">
                            {studyPeriod.name || "Active Period"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {neighborhoodStats.length} neighborhoods analyzed
                          </div>
                        </div>
                      )}

                      {/* GIS Layers */}
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-suite-atlas transition-colors">
                          <span className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            GIS Layers
                          </span>
                          <ChevronDown className="w-4 h-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-2">
                          {isLoadingLayers ? (
                            <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading layers...
                            </div>
                          ) : layers.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-2">
                              No GIS layers imported
                            </div>
                          ) : (
                            layers.slice(0, 5).map((layer) => (
                              <div
                                key={layer.id}
                                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-suite-atlas" />
                                  <span className="text-xs truncate max-w-[140px]">
                                    {layer.name}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-[10px] px-1.5">
                                  {layer.feature_count}
                                </Badge>
                              </div>
                            ))
                          )}
                          {layers.length > 5 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full text-xs"
                              onClick={() => setActiveView("layers")}
                            >
                              View all {layers.length} layers
                            </Button>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Active Parcel */}
                      {hasActiveParcel && (
                        <div className="material-bento rounded-lg p-3 border-suite-atlas/30 border">
                          <div className="text-xs text-suite-atlas mb-1 font-medium flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            Active Parcel
                          </div>
                          <div className="text-sm font-medium text-foreground truncate">
                            {parcel.parcelNumber}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {parcel.address}
                          </div>
                          {parcel.latitude && parcel.longitude ? (
                            <div className="text-xs text-tf-green mt-2 flex items-center gap-1">
                              <Compass className="w-3 h-3" />
                              <span className="font-mono">
                                {parcel.latitude.toFixed(4)}, {parcel.longitude.toFixed(4)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground/60 mt-2">
                              No coordinates available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </motion.div>

              {/* Map Area */}
              <div className="flex-1 relative">
                {/* Map Controls */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <div className="material-bento rounded-lg p-1 flex flex-col">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setMapZoom(z => Math.min(z + 0.2, 2))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setMapZoom(z => Math.max(z - 0.2, 0.5))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <div className="h-px bg-border my-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* The Map */}
                <div 
                  className="h-full"
                  style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center center' }}
                >
                  <GeoEquityMap
                    studyPeriodId={studyPeriod.id ?? undefined}
                    neighborhoodStats={showNeighborhoods ? neighborhoodStats : []}
                    isLoading={isLoadingStats}
                    selectedParcel={hasActiveParcel && parcel.latitude && parcel.longitude ? {
                      id: parcel.id!,
                      parcelNumber: parcel.parcelNumber!,
                      address: parcel.address!,
                      latitude: parcel.latitude,
                      longitude: parcel.longitude,
                      assessedValue: parcel.assessedValue,
                    } : undefined}
                  />
                </div>

                {/* Map Stats Overlay */}
                <div className="absolute bottom-4 right-4 z-10">
                  <div className="material-bento rounded-lg px-3 py-2 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Neighborhoods</span>
                      <span className="font-medium">{neighborhoodStats.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Parcels w/ coords</span>
                      <span className="font-medium">{parcelsWithGeo.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === "heatmap" && (
            <motion.div
              key="heatmap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <div className="h-full relative">
                {/* Dual-mode indicator */}
                {hasActiveParcel && parcel.neighborhoodCode && (
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-suite-atlas/90 text-white border-0 gap-1.5">
                      <MapPin className="w-3 h-3" />
                      Scoped to {parcel.neighborhoodCode}
                    </Badge>
                  </div>
                )}
                <EquityHeatmap
                  studyPeriodId={studyPeriod.id ?? undefined}
                  onParcelSelect={(p) => {
                    // Could wire to workbench parcel context in the future
                  }}
                  neighborhoodFilter={hasActiveParcel ? parcel.neighborhoodCode ?? undefined : undefined}
                />
              </div>
            </motion.div>
          )}

          {activeView === "layers" && (
            <motion.div
              key="layers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 h-full overflow-auto"
            >
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">GIS Layers</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage imported spatial data layers
                    </p>
                  </div>
                  <Button className="gap-2 bg-suite-atlas hover:bg-suite-atlas/90">
                    <Upload className="w-4 h-4" />
                    Import Layer
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <GISLayersPanel layers={layers} isLoading={isLoadingLayers} />
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {activeView === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 h-full overflow-auto"
            >
              <ParcelSearchPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface LayerToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  color: string;
}

function LayerToggle({ label, description, enabled, onToggle, color }: LayerToggleProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn("w-3 h-3 rounded-full", color, !enabled && "opacity-30")} />
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-suite-atlas"
      />
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Globe, Map, Search, BarChart3, MapPin, Database, CheckCircle2, TrendingUp,
} from "lucide-react";
import { StudyPeriodSelector } from "@/components/vei/StudyPeriodSelector";
import { useStudyPeriods } from "@/hooks/useVEIData";
import { GeoEquityMap } from "./GeoEquityMap";
import { EquityHeatmap } from "./EquityHeatmap";
import { NotificationBell } from "./NotificationBell";
import { ParcelSearchPanel } from "./ParcelSearchPanel";
import { CountyDataQualityReport } from "./CountyDataQualityReport";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { useScrapeJobNotifications } from "@/hooks/useScrapeJobNotifications";
import { useGISDataSources, useGISLayers, useNeighborhoodGeoStats } from "@/hooks/useGISData";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { formatVital, knownVital } from "@/lib/countyMetric";
import { DataSourcesPanel } from "./DataSourcesPanel";
import { GISLayersPanel } from "./GISLayersPanel";
import { IngestControlPanel } from "./IngestControlPanel";
import { ArcGISImportDialog } from "./ArcGISImportDialog";
import { GISImportDialog } from "./GISImportDialog";
import { VerticalEquityPanel } from "./VerticalEquityPanel";

interface GeoEquityDashboardProps {
  onNavigateToWorkbench?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

export function GeoEquityDashboard({ onNavigateToWorkbench }: GeoEquityDashboardProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"heatmap" | "map" | "search" | "quality" | "ops" | "vertical">("heatmap");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [arcgisDialogOpen, setArcgisDialogOpen] = useState(false);
  const [fileImportOpen, setFileImportOpen] = useState(false);
  const { data: studyPeriods, isLoading: isLoadingPeriods } = useStudyPeriods();
  const { data: neighborhoodStats = [], isLoading: isLoadingStats } = useNeighborhoodGeoStats(selectedPeriodId);
  const { data: vitals } = useCountyVitals();
  const { data: dataSources = [], isLoading: isLoadingSources } = useGISDataSources();
  const { data: layers = [], isLoading: isLoadingLayers } = useGISLayers();

  useScrapeJobNotifications();

  useEffect(() => {
    if (studyPeriods && studyPeriods.length > 0 && !selectedPeriodId) {
      const activePeriod = studyPeriods.find((p) => p.status === "active");
      setSelectedPeriodId(activePeriod?.id || studyPeriods[0].id);
    }
  }, [studyPeriods, selectedPeriodId]);

  const handleParcelSelect = useCallback((parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => {
    onNavigateToWorkbench?.(parcel);
  }, [onNavigateToWorkbench]);

  const handleNeighborhoodSelect = useCallback((code: string | null) => {
    setSelectedNeighborhood(code);
  }, []);


  const isLoading = isLoadingPeriods || isLoadingStats;

  // Stats derived from county vitals
  const avail = vitals?.metricAvailability;
  const totalParcels = knownVital(avail, "parcels", vitals?.parcels.total);
  const geocodedPct = knownVital(avail, "quality", vitals?.quality.coords);
  const neighborhoodCount = neighborhoodStats.length;
  const dataCompleteness = knownVital(avail, "quality", vitals?.quality.overall);

  return (
    <div className="module-page space-y-4">
      <ModuleHeader title="GeoEquity" icon={Globe} description="Geographic equity · Spatial analysis"
        actions={<>
          {studyPeriods && studyPeriods.length > 0 && (
            <StudyPeriodSelector periods={studyPeriods} selectedId={selectedPeriodId} onSelect={setSelectedPeriodId} />
          )}
          <SyncStatusBadge />
          <Button variant="outline" size="sm" onClick={() => setArcgisDialogOpen(true)}><MapPin className="w-4 h-4" />ArcGIS Sync</Button>
          <Button variant="outline" size="sm" onClick={() => setFileImportOpen(true)}><Database className="w-4 h-4" />Import Layer</Button>
          <NotificationBell />
        </>}
      />

      {/* Stats Row — Assessor-relevant metrics only */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="module-metrics">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Database className="w-4 h-4" />Total Parcels</div>
          <div className="text-2xl font-light text-foreground">{formatVital(totalParcels)}</div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><MapPin className="w-4 h-4" />Geocoded</div>
          <div className="text-2xl font-light text-tf-cyan">{formatVital(geocodedPct, "%")}</div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Map className="w-4 h-4" />Neighborhoods</div>
          <div className="text-2xl font-light text-tf-optimized-green">{neighborhoodCount}</div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle2 className="w-4 h-4" />Data Completeness</div>
          <div className="text-2xl font-light text-tf-sacred-gold">{formatVital(dataCompleteness, "%")}</div>
        </div>
      </motion.div>

      {/* Main Content — 4 assessor tabs only */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-tf-elevated/50">
          <TabsTrigger value="heatmap" className="gap-2 data-[state=active]:bg-tf-cyan/20"><Globe className="w-4 h-4" />Equity Heatmap</TabsTrigger>
          <TabsTrigger value="map" className="gap-2 data-[state=active]:bg-tf-cyan/20"><Map className="w-4 h-4" />Legacy Map</TabsTrigger>
          <TabsTrigger value="search" className="gap-2 data-[state=active]:bg-tf-optimized-green/20"><Search className="w-4 h-4" />Parcel Search</TabsTrigger>
          <TabsTrigger value="quality" className="gap-2 data-[state=active]:bg-tf-sacred-gold/20"><BarChart3 className="w-4 h-4" />Data Quality</TabsTrigger>
          <TabsTrigger value="vertical" className="gap-2 data-[state=active]:bg-tf-sacred-gold/20"><TrendingUp className="w-4 h-4" />Vertical Equity</TabsTrigger>
          <TabsTrigger value="ops" className="gap-2 data-[state=active]:bg-tf-cyan/20"><Database className="w-4 h-4" />GIS Ops</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="module-map-stage overflow-hidden border border-border rounded-lg">
            <EquityHeatmap studyPeriodId={selectedPeriodId} onParcelSelect={handleParcelSelect} onNeighborhoodSelect={handleNeighborhoodSelect} />
          </motion.div>
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="module-map-stage overflow-hidden border border-border rounded-lg">
            <GeoEquityMap studyPeriodId={selectedPeriodId} neighborhoodStats={neighborhoodStats} isLoading={isLoading} />
          </motion.div>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <ParcelSearchPanel initialNeighborhood={selectedNeighborhood} />
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <CountyDataQualityReport />
        </TabsContent>

        <TabsContent value="vertical" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <VerticalEquityPanel />
          </motion.div>
        </TabsContent>

        <TabsContent value="ops" className="mt-4 space-y-4">
          <IngestControlPanel dataSources={dataSources} />
          <DataSourcesPanel dataSources={dataSources} isLoading={isLoadingSources} />
          <GISLayersPanel layers={layers} isLoading={isLoadingLayers} />
        </TabsContent>
      </Tabs>

      <ArcGISImportDialog open={arcgisDialogOpen} onOpenChange={setArcgisDialogOpen} dataSources={dataSources} />
      <GISImportDialog open={fileImportOpen} onOpenChange={setFileImportOpen} />
    </div>
  );
}

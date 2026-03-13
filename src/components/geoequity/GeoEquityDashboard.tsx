import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Globe, Map, Layers, Database, Download, Upload,
  Server, MapPin, Search, Zap, Plus, BarChart3,
} from "lucide-react";
import { StudyPeriodSelector } from "@/components/vei/StudyPeriodSelector";
import { useStudyPeriods } from "@/hooks/useVEIData";
import { GeoEquityMap } from "./GeoEquityMap";
import { EquityHeatmap } from "./EquityHeatmap";
import { DataSourcesPanel } from "./DataSourcesPanel";
import { GISLayersPanel } from "./GISLayersPanel";
import { GISImportDialog } from "./GISImportDialog";
import { ArcGISImportDialog } from "./ArcGISImportDialog";
import { AssessorScrapeDialog } from "./AssessorScrapeDialog";
import { ScrapeJobsDashboard } from "./ScrapeJobsDashboard";
import { NotificationBell } from "./NotificationBell";
import { ParcelImportWizard } from "./ParcelImportWizard";
import { ParcelSearchPanel } from "./ParcelSearchPanel";
import { IngestControlPanel } from "./IngestControlPanel";
import { CountyDataQualityReport } from "./CountyDataQualityReport";
import { useScrapeJobNotifications } from "@/hooks/useScrapeJobNotifications";
import { useGISDataSources, useGISLayers, useNeighborhoodGeoStats } from "@/hooks/useGISData";

interface GeoEquityDashboardProps {
  onNavigateToWorkbench?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

export function GeoEquityDashboard({ onNavigateToWorkbench }: GeoEquityDashboardProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"heatmap" | "map" | "sources" | "layers" | "jobs" | "search" | "ingest" | "quality">("heatmap");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [arcgisImportOpen, setArcgisImportOpen] = useState(false);
  const [assessorScrapeOpen, setAssessorScrapeOpen] = useState(false);
  const [parcelImportOpen, setParcelImportOpen] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const { data: studyPeriods, isLoading: isLoadingPeriods } = useStudyPeriods();
  const { data: dataSources = [], isLoading: isLoadingSources } = useGISDataSources();
  const { data: layers = [], isLoading: isLoadingLayers } = useGISLayers();
  const { data: neighborhoodStats = [], isLoading: isLoadingStats } = useNeighborhoodGeoStats(selectedPeriodId);

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

  // Cross-filter: when a neighborhood is selected on heatmap, switch to search filtered by that neighborhood
  const handleNeighborhoodSelect = useCallback((code: string | null) => {
    setSelectedNeighborhood(code);
  }, []);

  const handleDrillToSearch = useCallback((code: string) => {
    setSelectedNeighborhood(code);
    setActiveTab("search");
  }, []);

  const isLoading = isLoadingPeriods || isLoadingSources || isLoadingLayers || isLoadingStats;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-light text-gradient-sovereign flex items-center gap-3">
            <Globe className="w-7 h-7 text-tf-cyan" />GeoEquity
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Geographic Equity Analysis • Spatial Visualization • Multi-Source Data Integration</p>
        </div>
        <div className="flex items-center gap-3">
          {studyPeriods && studyPeriods.length > 0 && (
            <StudyPeriodSelector periods={studyPeriods} selectedId={selectedPeriodId} onSelect={setSelectedPeriodId} />
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportDialogOpen(true)}><Upload className="w-4 h-4" />Import GIS</Button>
          <Button variant="outline" size="sm" className="gap-2 border-tf-cyan/50 text-tf-cyan hover:bg-tf-cyan/10" onClick={() => setArcgisImportOpen(true)}><MapPin className="w-4 h-4" />Sync Coords</Button>
          <Button variant="outline" size="sm" className="gap-2 border-tf-sacred-gold/50 text-tf-sacred-gold hover:bg-tf-sacred-gold/10" onClick={() => setAssessorScrapeOpen(true)}><Search className="w-4 h-4" />Scrape Assessor</Button>
          <Button size="sm" className="gap-2 bg-tf-optimized-green hover:bg-tf-optimized-green/90" onClick={() => setParcelImportOpen(true)}><Plus className="w-4 h-4" />Import Parcels</Button>
          <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />Export</Button>
          <NotificationBell />
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="material-bento p-4 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Database className="w-4 h-4" />Data Sources</div>
          <div className="text-2xl font-light text-tf-cyan">{dataSources.length}</div>
        </div>
        <div className="material-bento p-4 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Layers className="w-4 h-4" />GIS Layers</div>
          <div className="text-2xl font-light text-tf-sacred-gold">{layers.length}</div>
        </div>
        <div className="material-bento p-4 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Map className="w-4 h-4" />Neighborhoods</div>
          <div className="text-2xl font-light text-tf-optimized-green">{neighborhoodStats.length}</div>
        </div>
        <div className="material-bento p-4 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Server className="w-4 h-4" />Sync Status</div>
          <div className="text-2xl font-light text-foreground">{dataSources.filter((s) => s.sync_status === "success").length}/{dataSources.length}</div>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-tf-elevated/50">
          <TabsTrigger value="heatmap" className="gap-2 data-[state=active]:bg-tf-cyan/20"><Globe className="w-4 h-4" />Equity Heatmap</TabsTrigger>
          <TabsTrigger value="map" className="gap-2 data-[state=active]:bg-tf-cyan/20"><Map className="w-4 h-4" />Legacy Map</TabsTrigger>
          <TabsTrigger value="search" className="gap-2 data-[state=active]:bg-tf-optimized-green/20"><Search className="w-4 h-4" />Parcel Search</TabsTrigger>
          <TabsTrigger value="quality" className="gap-2 data-[state=active]:bg-tf-sacred-gold/20"><BarChart3 className="w-4 h-4" />Data Quality</TabsTrigger>
          <TabsTrigger value="sources" className="gap-2 data-[state=active]:bg-tf-cyan/20"><Database className="w-4 h-4" />Data Sources</TabsTrigger>
          <TabsTrigger value="layers" className="gap-2 data-[state=active]:bg-tf-cyan/20"><Layers className="w-4 h-4" />Layers</TabsTrigger>
          <TabsTrigger value="ingest" className="gap-2 data-[state=active]:bg-primary/20"><Database className="w-4 h-4" />Polygon Ingest</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2 data-[state=active]:bg-tf-sacred-gold/20"><Zap className="w-4 h-4" />Statewide Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="material-bento rounded-lg overflow-hidden" style={{ height: "650px" }}>
            <EquityHeatmap studyPeriodId={selectedPeriodId} onParcelSelect={handleParcelSelect} onNeighborhoodSelect={handleNeighborhoodSelect} />
          </motion.div>
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="material-bento rounded-lg overflow-hidden" style={{ height: "600px" }}>
            <GeoEquityMap studyPeriodId={selectedPeriodId} neighborhoodStats={neighborhoodStats} isLoading={isLoading} />
          </motion.div>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <ParcelSearchPanel initialNeighborhood={selectedNeighborhood} />
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <CountyDataQualityReport />
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <DataSourcesPanel dataSources={dataSources} isLoading={isLoadingSources} />
        </TabsContent>

        <TabsContent value="layers" className="mt-4">
          <GISLayersPanel layers={layers} isLoading={isLoadingLayers} />
        </TabsContent>

        <TabsContent value="ingest" className="mt-4">
          <IngestControlPanel />
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <ScrapeJobsDashboard />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GISImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <ArcGISImportDialog open={arcgisImportOpen} onOpenChange={setArcgisImportOpen} dataSources={dataSources} />
      <AssessorScrapeDialog open={assessorScrapeOpen} onOpenChange={setAssessorScrapeOpen} />
      <ParcelImportWizard open={parcelImportOpen} onOpenChange={setParcelImportOpen} />
    </div>
  );
}

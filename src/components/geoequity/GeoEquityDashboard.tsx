import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Globe,
  Map,
  Layers,
  Database,
  Download,
  Upload,
  Server,
  MapPin,
  Search,
  Zap,
} from "lucide-react";
import { StudyPeriodSelector } from "@/components/vei/StudyPeriodSelector";
import { useStudyPeriods } from "@/hooks/useVEIData";
import { GeoEquityMap } from "./GeoEquityMap";
import { DataSourcesPanel } from "./DataSourcesPanel";
import { GISLayersPanel } from "./GISLayersPanel";
import { GISImportDialog } from "./GISImportDialog";
import { ArcGISImportDialog } from "./ArcGISImportDialog";
import { AssessorScrapeDialog } from "./AssessorScrapeDialog";
import { ScrapeJobsDashboard } from "./ScrapeJobsDashboard";
import { useGISDataSources, useGISLayers, useNeighborhoodGeoStats } from "@/hooks/useGISData";

export function GeoEquityDashboard() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"map" | "sources" | "layers" | "jobs">("map");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [arcgisImportOpen, setArcgisImportOpen] = useState(false);
  const [assessorScrapeOpen, setAssessorScrapeOpen] = useState(false);

  const { data: studyPeriods, isLoading: isLoadingPeriods } = useStudyPeriods();
  const { data: dataSources = [], isLoading: isLoadingSources } = useGISDataSources();
  const { data: layers = [], isLoading: isLoadingLayers } = useGISLayers();
  const { data: neighborhoodStats = [], isLoading: isLoadingStats } = useNeighborhoodGeoStats(selectedPeriodId);

  // Auto-select active period
  useEffect(() => {
    if (studyPeriods && studyPeriods.length > 0 && !selectedPeriodId) {
      const activePeriod = studyPeriods.find((p) => p.status === "active");
      setSelectedPeriodId(activePeriod?.id || studyPeriods[0].id);
    }
  }, [studyPeriods, selectedPeriodId]);

  const isLoading = isLoadingPeriods || isLoadingSources || isLoadingLayers || isLoadingStats;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-2xl font-light text-gradient-sovereign flex items-center gap-3">
            <Globe className="w-7 h-7 text-tf-cyan" />
            GeoEquity
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Geographic Equity Analysis • Spatial Visualization • Multi-Source Data Integration
          </p>
        </div>
        <div className="flex items-center gap-3">
          {studyPeriods && studyPeriods.length > 0 && (
            <StudyPeriodSelector
              periods={studyPeriods}
              selectedId={selectedPeriodId}
              onSelect={setSelectedPeriodId}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Import GIS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-tf-cyan/50 text-tf-cyan hover:bg-tf-cyan/10"
            onClick={() => setArcgisImportOpen(true)}
          >
            <MapPin className="w-4 h-4" />
            Sync Coords
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-tf-sacred-gold/50 text-tf-sacred-gold hover:bg-tf-sacred-gold/10"
            onClick={() => setAssessorScrapeOpen(true)}
          >
            <Search className="w-4 h-4" />
            Scrape Assessor
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Database className="w-4 h-4" />
            Data Sources
          </div>
          <div className="text-2xl font-light text-tf-cyan">{dataSources.length}</div>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Layers className="w-4 h-4" />
            GIS Layers
          </div>
          <div className="text-2xl font-light text-tf-sacred-gold">{layers.length}</div>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Map className="w-4 h-4" />
            Neighborhoods
          </div>
          <div className="text-2xl font-light text-tf-optimized-green">{neighborhoodStats.length}</div>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Server className="w-4 h-4" />
            Sync Status
          </div>
          <div className="text-2xl font-light text-foreground">
            {dataSources.filter((s) => s.sync_status === "success").length}/{dataSources.length}
          </div>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-tf-elevated/50">
          <TabsTrigger value="map" className="gap-2 data-[state=active]:bg-tf-cyan/20">
            <Map className="w-4 h-4" />
            Equity Map
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2 data-[state=active]:bg-tf-cyan/20">
            <Database className="w-4 h-4" />
            Data Sources
          </TabsTrigger>
          <TabsTrigger value="layers" className="gap-2 data-[state=active]:bg-tf-cyan/20">
            <Layers className="w-4 h-4" />
            Layers
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2 data-[state=active]:bg-tf-sacred-gold/20">
            <Zap className="w-4 h-4" />
            Statewide Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-lg overflow-hidden"
            style={{ height: "600px" }}
          >
            <GeoEquityMap
              studyPeriodId={selectedPeriodId}
              neighborhoodStats={neighborhoodStats}
              isLoading={isLoading}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <DataSourcesPanel
            dataSources={dataSources}
            isLoading={isLoadingSources}
          />
        </TabsContent>

        <TabsContent value="layers" className="mt-4">
          <GISLayersPanel
            layers={layers}
            isLoading={isLoadingLayers}
          />
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <ScrapeJobsDashboard />
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <GISImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* ArcGIS Coordinate Import Dialog */}
      <ArcGISImportDialog
        open={arcgisImportOpen}
        onOpenChange={setArcgisImportOpen}
        dataSources={dataSources}
      />

      {/* Assessor Website Scrape Dialog */}
      <AssessorScrapeDialog
        open={assessorScrapeOpen}
        onOpenChange={setAssessorScrapeOpen}
      />
    </div>
  );
}

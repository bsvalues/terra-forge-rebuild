import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Atom,
  Layers,
  MapPin,
  RefreshCw,
  Download,
  Grid3X3,
  Box,
  Globe,
} from "lucide-react";
import { StudyPeriodSelector } from "@/components/vei/StudyPeriodSelector";
import { ValuationCanvas3D } from "./ValuationCanvas3D";
import { ValuationDetailsPanel } from "./ValuationDetailsPanel";
import { useStudyPeriods } from "@/hooks/useVEIData";
import { useParcelValuations, useSegmentValuations, ParcelValuation, ValuationSegment } from "@/hooks/useValuationAnatomy";

export function ValuationAnatomyDashboard() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"parcels" | "segments" | "anatomy" | "geographic">("parcels");
  const [selectedItem, setSelectedItem] = useState<ParcelValuation | ValuationSegment | null>(null);

  const { data: studyPeriods, isLoading: isLoadingPeriods } = useStudyPeriods();
  const { data: parcels = [], isLoading: isLoadingParcels } = useParcelValuations(selectedPeriodId, 200);
  const { data: segments = [], isLoading: isLoadingSegments } = useSegmentValuations(selectedPeriodId);

  // Auto-select active period
  useEffect(() => {
    if (studyPeriods && studyPeriods.length > 0 && !selectedPeriodId) {
      const activePeriod = studyPeriods.find((p) => p.status === "active");
      setSelectedPeriodId(activePeriod?.id || studyPeriods[0].id);
    }
  }, [studyPeriods, selectedPeriodId]);

  const handleDrillDown = () => {
    if (selectedItem) {
      setViewMode("anatomy");
    }
  };

  const handleSelectItem = (item: ParcelValuation | ValuationSegment | null) => {
    setSelectedItem(item);
    // If switching to anatomy view, stay there; otherwise reset to appropriate view
    if (item && viewMode === "anatomy") {
      // Stay in anatomy view with new item
    } else if (!item && viewMode === "anatomy") {
      // Go back to previous view
      setViewMode("parcels");
    }
  };

  const isLoading = isLoadingPeriods || isLoadingParcels || isLoadingSegments;

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
            <Atom className="w-7 h-7 text-tf-cyan" />
            Valuation Anatomy
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            3D Visualization of Property Value Drivers • Feature Contribution Analysis
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
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* View Mode Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList className="bg-tf-elevated/50">
            <TabsTrigger value="parcels" className="gap-2 data-[state=active]:bg-tf-cyan/20">
              <Grid3X3 className="w-4 h-4" />
              Parcels
            </TabsTrigger>
            <TabsTrigger value="geographic" className="gap-2 data-[state=active]:bg-tf-cyan/20">
              <Globe className="w-4 h-4" />
              Geographic
            </TabsTrigger>
            <TabsTrigger value="segments" className="gap-2 data-[state=active]:bg-tf-cyan/20">
              <MapPin className="w-4 h-4" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="anatomy" className="gap-2 data-[state=active]:bg-tf-cyan/20" disabled={!selectedItem}>
              <Box className="w-4 h-4" />
              Anatomy
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            {parcels.length} Parcels
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {segments.length} Segments
          </span>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Visualization */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 material-bento rounded-lg overflow-hidden"
          style={{ height: "550px" }}
        >
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-tf-substrate">
              <div className="text-center">
                <Atom className="w-12 h-12 mx-auto mb-4 text-tf-cyan animate-spin" />
                <p className="text-sm text-muted-foreground">Loading valuation data...</p>
              </div>
            </div>
          ) : (
            <ValuationCanvas3D
              parcels={parcels}
              segments={segments}
              viewMode={viewMode}
              selectedItem={selectedItem}
              onSelectItem={handleSelectItem}
            />
          )}
        </motion.div>

        {/* Details Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{ height: "550px" }}
        >
          <ValuationDetailsPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDrillDown={handleDrillDown}
          />
        </motion.div>
      </div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="material-bento rounded-lg p-4 text-sm text-muted-foreground"
      >
        <h4 className="font-medium text-foreground mb-2">Interaction Guide</h4>
        <ul className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <li className="flex items-start gap-2">
            <span className="text-tf-cyan">•</span>
            <span><strong>Parcels View:</strong> Each sphere represents a parcel. Size = value, color = ratio deviation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-tf-optimized-green">•</span>
            <span><strong>Geographic View:</strong> Parcels plotted by location. Bar height = assessed value</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-tf-sacred-gold">•</span>
            <span><strong>Segments View:</strong> Stacked blocks show feature contributions by neighborhood</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span><strong>Anatomy View:</strong> Exploded view shows all value drivers orbiting the core</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

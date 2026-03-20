// TerraFusion OS — Admin-Only Data Operations Panel
// Consolidates all ingestion/sync tooling behind admin gate.
// "The pipes are behind the wall now. The assessor sees a faucet." — Ralph Wiggum
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Database, Layers, Zap, MapPin, DollarSign } from "lucide-react";
import { IngestControlPanel } from "@/components/geoequity/IngestControlPanel";
import { ScrapeJobsDashboard } from "@/components/geoequity/ScrapeJobsDashboard";
import { DataSourcesPanel } from "@/components/geoequity/DataSourcesPanel";
import { GISLayersPanel } from "@/components/geoequity/GISLayersPanel";
import { RedfinSalesIngest } from "@/components/admin/RedfinSalesIngest";
import { useGISDataSources, useGISLayers } from "@/hooks/useGISData";

export function DataOpsPanel() {
  const [tab, setTab] = useState("ingest");
  const { data: dataSources = [], isLoading: isLoadingSources } = useGISDataSources();
  const { data: layers = [], isLoading: isLoadingLayers } = useGISLayers();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Data Operations</h3>
        <p className="text-sm text-muted-foreground">
          Admin-only ingestion controls, sync management, and data source configuration.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ingest" className="gap-1.5">
            <MapPin className="w-3.5 h-3.5" />Polygon Ingest
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" />Statewide Jobs
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-1.5">
            <Database className="w-3.5 h-3.5" />Data Sources
          </TabsTrigger>
          <TabsTrigger value="layers" className="gap-1.5">
            <Layers className="w-3.5 h-3.5" />GIS Layers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingest" className="mt-4">
          <IngestControlPanel />
        </TabsContent>
        <TabsContent value="jobs" className="mt-4">
          <ScrapeJobsDashboard />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <DataSourcesPanel dataSources={dataSources} isLoading={isLoadingSources} />
        </TabsContent>
        <TabsContent value="layers" className="mt-4">
          <GISLayersPanel layers={layers} isLoading={isLoadingLayers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

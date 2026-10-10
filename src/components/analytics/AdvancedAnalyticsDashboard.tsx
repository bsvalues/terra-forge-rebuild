// TerraFusion OS — Phase 25: Advanced Analytics Dashboard
// Trend sparklines, time-series forecasting, outlier detection, neighborhood clustering

import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, AlertTriangle, Layers,
  ArrowUpRight,
} from "lucide-react";
import { RatioTrendSparklines } from "./RatioTrendSparklines";
import { ForecastPanel } from "./ForecastPanel";
import { OutlierDetectionPanel } from "./OutlierDetectionPanel";
import { ClusteringPanel } from "./ClusteringPanel";

export function AdvancedAnalyticsDashboard() {
  return (
    <div className="module-page space-y-4">
      <ModuleHeader title="Advanced Analytics" />

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList aria-label="Advanced analytics views">
          <TabsTrigger value="trends" className="text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Ratio Trends
          </TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="outliers" className="text-xs gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Outlier Detection
          </TabsTrigger>
          <TabsTrigger value="clustering" className="text-xs gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Clustering
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <RatioTrendSparklines />
        </TabsContent>

        <TabsContent value="forecast">
          <ForecastPanel />
        </TabsContent>

        <TabsContent value="outliers">
          <OutlierDetectionPanel />
        </TabsContent>

        <TabsContent value="clustering">
          <ClusteringPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

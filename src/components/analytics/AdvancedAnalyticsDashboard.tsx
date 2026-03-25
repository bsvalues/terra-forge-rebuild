// TerraFusion OS — Phase 25: Advanced Analytics Dashboard
// Trend sparklines, time-series forecasting, outlier detection, neighborhood clustering

import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceNumber, ProvenanceBadge } from "@/components/trust";
import {
  TrendingUp, AlertTriangle, Layers, Radar,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { RatioTrendSparklines } from "./RatioTrendSparklines";
import { ForecastPanel } from "./ForecastPanel";
import { OutlierDetectionPanel } from "./OutlierDetectionPanel";
import { ClusteringPanel } from "./ClusteringPanel";

export function AdvancedAnalyticsDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-[hsl(var(--tf-transcend-cyan))] tracking-tight">
          Advanced Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trend analysis, forecasting, outlier detection &amp; neighborhood clustering
        </p>
      </motion.div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="bg-[hsl(var(--tf-elevated)/0.5)]">
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

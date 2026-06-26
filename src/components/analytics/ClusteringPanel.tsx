// TerraFusion OS — Neighborhood Clustering Panel (Phase 25.4)

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceNumber } from "@/components/trust";
import { Target } from "lucide-react";
import { useNeighborhoodClustering } from "@/hooks/useAdvancedAnalytics";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

const CLUSTER_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--tf-sacred-gold))",
  "hsl(var(--tf-optimized-green))",
  "hsl(var(--tf-warning-red))",
];

export function ClusteringPanel() {
  const { data, isLoading } = useNeighborhoodClustering();

  if (isLoading) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (!data || data.clusters.length === 0) {
    return (
      <div className="material-bento rounded-2xl p-12 text-center">
        <p className="text-muted-foreground text-sm">Insufficient neighborhood data for clustering (need ≥3 neighborhoods with data).</p>
      </div>
    );
  }

  const { clusters, centroids } = data;

  return (
    <div className="space-y-6">
      {/* Cluster summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {centroids.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="material-bento rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
              />
              <h3 className="text-sm font-medium text-foreground">{c.label}</h3>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {c.count} neighborhoods
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <p className="text-[9px] text-muted-foreground">Avg Value</p>
                <ProvenanceNumber source="clustering" cachePolicy="cached 300s">
                  <span className="text-sm font-mono text-foreground">
                    ${(c.avgValue / 1000).toFixed(0)}k
                  </span>
                </ProvenanceNumber>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">Avg Sqft</p>
                <ProvenanceNumber source="clustering" cachePolicy="cached 300s">
                  <span className="text-sm font-mono text-foreground">
                    {c.avgSqft.toLocaleString()}
                  </span>
                </ProvenanceNumber>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">Avg Age</p>
                <ProvenanceNumber source="clustering" cachePolicy="cached 300s">
                  <span className="text-sm font-mono text-foreground">
                    {c.avgAge}yr
                  </span>
                </ProvenanceNumber>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Scatter plot: Value vs Sqft colored by cluster */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Cluster Scatter: Value vs. Square Footage</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">K-Means (k={centroids.length})</Badge>
        </div>

        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="avgSqft"
                name="Avg Sqft"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: "Avg Square Footage", position: "bottom", fill: "hsl(var(--muted-foreground))", fontSize: 10, offset: -5 }}
              />
              <YAxis
                dataKey="avgValue"
                name="Avg Value"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                label={{ value: "Avg Assessed Value", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 11,
                }}
                formatter={(v: number, name: string) => [
                  name === "Avg Value" ? `$${v.toLocaleString()}` : v.toLocaleString(),
                  name,
                ]}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload;
                  return item ? `${item.code} (${item.clusterLabel})` : "";
                }}
              />
              <Scatter data={clusters} name="Neighborhoods">
                {clusters.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={CLUSTER_COLORS[entry.clusterId % CLUSTER_COLORS.length]}
                    fillOpacity={0.8}
                    r={Math.max(4, Math.min(10, entry.parcelCount / 5))}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          {centroids.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
              />
              {c.label} ({c.count})
            </span>
          ))}
        </div>
      </motion.div>

      {/* Neighborhood assignment table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-3">Neighborhood Cluster Assignments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Neighborhood</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Cluster</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Parcels</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Avg Value</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Avg Sqft</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Avg Age</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Distance</th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((c) => (
                <tr key={c.code} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="py-2 px-2 font-mono text-foreground">{c.code}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: CLUSTER_COLORS[c.clusterId % CLUSTER_COLORS.length] }}
                      />
                      <span className="text-foreground">{c.clusterLabel}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{c.parcelCount}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">
                    ${c.avgValue.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                    {c.avgSqft.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                    {c.avgAge}yr
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className={c.distance > 0.5 ? "text-[hsl(var(--tf-sacred-gold))]" : "text-muted-foreground"}>
                      {c.distance.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

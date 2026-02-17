// TerraFusion OS — Advanced Analytics Engine (Swarm D)
// Time-series trending, neighborhood clustering, predictive equity scoring

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, Legend, Area, AreaChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, MapPin, BarChart3, Activity, Target,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

// ── Hooks ──────────────────────────────────────────────────────

function useNeighborhoodClusters() {
  return useQuery({
    queryKey: ["analytics-neighborhood-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("neighborhood_code, assessed_value, land_area, building_area, year_built")
        .not("neighborhood_code", "is", null)
        .not("assessed_value", "is", null)
        .limit(1000);

      if (error) throw error;

      // Aggregate by neighborhood
      const map = new Map<string, { count: number; totalValue: number; avgAge: number; totalArea: number }>();
      for (const p of data ?? []) {
        const code = p.neighborhood_code!;
        const entry = map.get(code) ?? { count: 0, totalValue: 0, avgAge: 0, totalArea: 0 };
        entry.count++;
        entry.totalValue += p.assessed_value ?? 0;
        entry.avgAge += (new Date().getFullYear() - (p.year_built ?? 2000));
        entry.totalArea += p.building_area ?? 0;
        map.set(code, entry);
      }

      return Array.from(map.entries()).map(([code, v]) => ({
        code,
        count: v.count,
        avgValue: Math.round(v.totalValue / v.count),
        avgAge: Math.round(v.avgAge / v.count),
        avgArea: Math.round(v.totalArea / v.count),
        totalValue: v.totalValue,
      })).sort((a, b) => b.count - a.count);
    },
    staleTime: 120_000,
  });
}

function useAssessmentTrends() {
  return useQuery({
    queryKey: ["analytics-assessment-trends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("tax_year, total_value, land_value, improvement_value")
        .order("tax_year")
        .limit(1000);

      if (error) throw error;

      // Group by year
      const map = new Map<number, { count: number; total: number; land: number; improvement: number }>();
      for (const a of data ?? []) {
        const entry = map.get(a.tax_year) ?? { count: 0, total: 0, land: 0, improvement: 0 };
        entry.count++;
        entry.total += a.total_value ?? 0;
        entry.land += a.land_value ?? 0;
        entry.improvement += a.improvement_value ?? 0;
        map.set(a.tax_year, entry);
      }

      return Array.from(map.entries())
        .map(([year, v]) => ({
          year,
          avgTotal: Math.round(v.total / v.count),
          avgLand: Math.round(v.land / v.count),
          avgImprovement: Math.round(v.improvement / v.count),
          count: v.count,
        }))
        .sort((a, b) => a.year - b.year);
    },
    staleTime: 120_000,
  });
}

function useSalesVelocity() {
  return useQuery({
    queryKey: ["analytics-sales-velocity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("sale_date, sale_price, is_qualified")
        .order("sale_date")
        .limit(1000);

      if (error) throw error;

      // Group by month
      const map = new Map<string, { count: number; qualified: number; totalPrice: number }>();
      for (const s of data ?? []) {
        const month = s.sale_date.slice(0, 7); // YYYY-MM
        const entry = map.get(month) ?? { count: 0, qualified: 0, totalPrice: 0 };
        entry.count++;
        if (s.is_qualified) entry.qualified++;
        entry.totalPrice += s.sale_price ?? 0;
        map.set(month, entry);
      }

      return Array.from(map.entries())
        .map(([month, v]) => ({
          month,
          totalSales: v.count,
          qualifiedSales: v.qualified,
          avgPrice: Math.round(v.totalPrice / v.count),
          qualificationRate: Math.round((v.qualified / v.count) * 100),
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-24); // Last 24 months
    },
    staleTime: 120_000,
  });
}

// ── Component ──────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const clusters = useNeighborhoodClusters();
  const trends = useAssessmentTrends();
  const velocity = useSalesVelocity();

  const isLoading = clusters.isLoading || trends.isLoading || velocity.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  // Quick stats
  const totalNeighborhoods = clusters.data?.length ?? 0;
  const totalAssessmentYears = trends.data?.length ?? 0;
  const recentSalesMonths = velocity.data?.length ?? 0;
  const latestAvgValue = trends.data?.[trends.data.length - 1]?.avgTotal ?? 0;
  const previousAvgValue = trends.data?.[trends.data.length - 2]?.avgTotal ?? 0;
  const valueTrend = previousAvgValue > 0 ? ((latestAvgValue - previousAvgValue) / previousAvgValue) * 100 : 0;

  const trendIcon = valueTrend > 1 ? ArrowUpRight : valueTrend < -1 ? ArrowDownRight : Minus;
  const trendColor = valueTrend > 1 ? "text-[hsl(var(--tf-optimized-green))]" : valueTrend < -1 ? "text-[hsl(var(--tf-warning-red))]" : "text-muted-foreground";

  const TrendIcon = trendIcon;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-gradient-sovereign tracking-tight">
          Analytics Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Time-series trends, neighborhood clustering, sales velocity
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard icon={MapPin} label="Neighborhoods" value={totalNeighborhoods.toString()} color="text-tf-cyan" />
        <StatCard icon={BarChart3} label="Assessment Years" value={totalAssessmentYears.toString()} color="text-tf-green" />
        <StatCard icon={Activity} label="Sales Months" value={recentSalesMonths.toString()} color="text-tf-gold" />
        <div className="material-bento rounded-xl p-4 flex items-center gap-3">
          <TrendIcon className={`w-5 h-5 ${trendColor}`} />
          <div>
            <div className={`text-lg font-medium ${trendColor}`}>
              {valueTrend > 0 ? "+" : ""}{valueTrend.toFixed(1)}%
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Value Trend</div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="bg-[hsl(var(--tf-elevated)/0.5)]">
          <TabsTrigger value="trends" className="text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Value Trends
          </TabsTrigger>
          <TabsTrigger value="velocity" className="text-xs gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Sales Velocity
          </TabsTrigger>
          <TabsTrigger value="clusters" className="text-xs gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Neighborhood Clusters
          </TabsTrigger>
        </TabsList>

        {/* Assessment Trends */}
        <TabsContent value="trends">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Average Assessment Values by Tax Year</h3>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={trends.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]}
                />
                <Legend />
                <Area type="monotone" dataKey="avgLand" name="Avg Land" stackId="1" stroke="hsl(var(--tf-optimized-green))" fill="hsl(var(--tf-optimized-green))" fillOpacity={0.3} />
                <Area type="monotone" dataKey="avgImprovement" name="Avg Improvement" stackId="1" stroke="hsl(var(--tf-transcend-cyan))" fill="hsl(var(--tf-transcend-cyan))" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </TabsContent>

        {/* Sales Velocity */}
        <TabsContent value="velocity">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Monthly Sales Volume & Qualification Rate</h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={velocity.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                <Legend />
                <Bar yAxisId="left" dataKey="totalSales" name="Total Sales" fill="hsl(var(--tf-transcend-cyan))" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Bar yAxisId="left" dataKey="qualifiedSales" name="Qualified" fill="hsl(var(--tf-optimized-green))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="qualificationRate" name="Qual Rate %" stroke="hsl(var(--tf-sacred-gold))" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </TabsContent>

        {/* Neighborhood Clusters */}
        <TabsContent value="clusters">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Neighborhood Profile — Avg Value vs Avg Age</h3>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="avgAge" name="Avg Age" stroke="hsl(var(--muted-foreground))" fontSize={11} label={{ value: "Avg Building Age (yrs)", position: "bottom", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="avgValue" name="Avg Value" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v: number, name: string) => [name === "avgValue" ? `$${v.toLocaleString()}` : `${v} yrs`, name === "avgValue" ? "Avg Value" : "Avg Age"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.code ?? ""}
                />
                <Scatter data={clusters.data?.slice(0, 50)} fill="hsl(var(--tf-transcend-cyan))">
                  {clusters.data?.slice(0, 50).map((entry, i) => (
                    <Cell key={i} fill={entry.count > 50 ? "hsl(var(--tf-transcend-cyan))" : entry.count > 20 ? "hsl(var(--tf-optimized-green))" : "hsl(var(--tf-sacred-gold))"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>

            {/* Top neighborhoods table */}
            <div className="mt-6 space-y-1">
              <div className="flex items-center gap-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <span className="w-20">Code</span>
                <span className="w-16 text-right">Parcels</span>
                <span className="w-24 text-right">Avg Value</span>
                <span className="w-16 text-right">Avg Age</span>
                <span className="flex-1 text-right">Total Value</span>
              </div>
              {clusters.data?.slice(0, 15).map((n, i) => (
                <motion.div
                  key={n.code}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 py-2 border-b border-border/20 text-sm"
                >
                  <span className="w-20 font-mono text-xs text-foreground">{n.code}</span>
                  <span className="w-16 text-right text-muted-foreground">{n.count}</span>
                  <span className="w-24 text-right text-foreground">${n.avgValue.toLocaleString()}</span>
                  <span className="w-16 text-right text-muted-foreground">{n.avgAge}y</span>
                  <span className="flex-1 text-right text-tf-cyan font-medium">${(n.totalValue / 1_000_000).toFixed(1)}M</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="material-bento rounded-xl p-4 flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <div className={`text-lg font-medium ${color}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

// TerraFusion OS — Analytics Engine (Restructured)
// Lane A: Annual reval accuracy (IAAO ratio studies)
// Lane B: Always-on data quality + readiness + pipeline health

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, Legend, Area, AreaChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  MapPin, BarChart3, Activity, Target, Shield, Layers,
  AlertTriangle, CheckCircle2, XCircle, HelpCircle, TrendingUp,
} from "lucide-react";
import { useReadinessScore, getFieldLabel, getComboLabel, type FieldCoverage } from "@/hooks/useReadinessScore";

// ── Hooks (kept for Lane A + context) ─────────────────────────

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
      const map = new Map<string, { count: number; qualified: number; totalPrice: number }>();
      for (const s of data ?? []) {
        const month = s.sale_date.slice(0, 7);
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
        .slice(-24);
    },
    staleTime: 120_000,
  });
}

// ── Helpers ───────────────────────────────────────────────────

function gradeFromIndex(index: number): { label: string; color: string; icon: React.ElementType } {
  if (index >= 80) return { label: "Ready", color: "text-[hsl(var(--tf-optimized-green))]", icon: CheckCircle2 };
  if (index >= 50) return { label: "Partial", color: "text-[hsl(var(--tf-sacred-gold))]", icon: AlertTriangle };
  return { label: "At Risk", color: "text-[hsl(var(--tf-warning-red))]", icon: XCircle };
}

const FIELD_WEIGHTS: Record<keyof FieldCoverage, number> = {
  effective_coords: 3,
  building_area: 2,
  year_built: 2,
  property_class: 1,
  land_area: 2,
  situs_address: 1,
  assessed_value: 2,
  bedrooms: 1,
  bathrooms: 1,
  neighborhood: 1,
};

// ── Component ─────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const readiness = useReadinessScore();
  const trends = useAssessmentTrends();
  const velocity = useSalesVelocity();

  if (readiness.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const data = readiness.data;
  const summary = data?.summary;
  const coverage = data?.field_coverage;
  const neighborhoods = data?.neighborhoods ?? [];
  const combos = data?.missing_combos ?? [];
  const grade = gradeFromIndex(summary?.readiness_index ?? 0);
  const GradeIcon = grade.icon;

  // Sort fields by coverage ascending (worst first)
  const sortedFields = coverage
    ? (Object.entries(coverage) as [keyof FieldCoverage, number][])
        .sort((a, b) => a[1] - b[1])
    : [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-gradient-sovereign tracking-tight">
          Analytics Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Data readiness, feature completeness, pipeline health — always-on quality metrics
        </p>
      </motion.div>

      {/* Top-level Readiness Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <div className="material-bento rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <GradeIcon className={`w-5 h-5 ${grade.color}`} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Readiness</span>
          </div>
          <div className={`text-3xl font-medium ${grade.color}`}>
            {summary?.readiness_index ?? 0}%
          </div>
          <Badge variant="outline" className="mt-1 text-[10px]">{grade.label}</Badge>
        </div>
        <StatCard icon={Target} label="Total Parcels" value={(summary?.total_parcels ?? 0).toLocaleString()} color="text-foreground" />
        <StatCard icon={CheckCircle2} label="Ready (≥80%)" value={(summary?.parcels_ready ?? 0).toLocaleString()} color="text-[hsl(var(--tf-optimized-green))]" />
        <StatCard icon={AlertTriangle} label="Partial" value={(summary?.parcels_partial ?? 0).toLocaleString()} color="text-[hsl(var(--tf-sacred-gold))]" />
        <StatCard icon={XCircle} label="At Risk (<50%)" value={(summary?.parcels_at_risk ?? 0).toLocaleString()} color="text-[hsl(var(--tf-warning-red))]" />
      </motion.div>

      {/* 3-Panel Tabs */}
      <Tabs defaultValue="model-readiness" className="space-y-4">
        <TabsList className="bg-[hsl(var(--tf-elevated)/0.5)]">
          <TabsTrigger value="model-readiness" className="text-xs gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Model Readiness
          </TabsTrigger>
          <TabsTrigger value="map-readiness" className="text-xs gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Map Readiness
          </TabsTrigger>
          <TabsTrigger value="annual-accuracy" className="text-xs gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Annual Accuracy
          </TabsTrigger>
        </TabsList>

        {/* ═══ Panel 1: Model Readiness (Feature Completeness) ═══ */}
        <TabsContent value="model-readiness">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Field Coverage Bars */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-1">Feature Coverage</h3>
              <p className="text-[11px] text-muted-foreground mb-4">
                Weighted by importance to valuation modeling
              </p>
              <div className="space-y-3">
                {sortedFields.map(([field, pct]) => {
                  const weight = FIELD_WEIGHTS[field];
                  const barColor = pct >= 90 ? "bg-[hsl(var(--tf-optimized-green))]"
                    : pct >= 60 ? "bg-[hsl(var(--tf-sacred-gold))]"
                    : "bg-[hsl(var(--tf-warning-red))]";
                  return (
                    <div key={field} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {getFieldLabel(field)}
                          <span className="text-[10px] ml-1 opacity-60">w:{weight}</span>
                        </span>
                        <span className={pct >= 90 ? "text-[hsl(var(--tf-optimized-green))]" : pct >= 60 ? "text-[hsl(var(--tf-sacred-gold))]" : "text-[hsl(var(--tf-warning-red))]"}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Missing Combos + Neighborhood Hotspots */}
            <div className="space-y-6">
              {/* Co-occurrence Patterns */}
              {combos.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-foreground mb-1">Missing Feature Patterns</h3>
                  <p className="text-[11px] text-muted-foreground mb-4">
                    Co-occurring gaps in parcels below 80% readiness
                  </p>
                  <div className="space-y-2">
                    {combos.map((c) => (
                      <div key={c.pattern} className="flex items-center justify-between py-2 border-b border-border/20">
                        <span className="text-xs text-foreground">{getComboLabel(c.pattern)}</span>
                        <Badge variant="outline" className="text-[10px]">{c.count} parcels</Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Neighborhood Hotspots */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
                <h3 className="text-sm font-medium text-foreground mb-1">Neighborhood Hotspots</h3>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Lowest readiness neighborhoods — fix these first
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                    <span className="w-24">Code</span>
                    <span className="w-14 text-right">Parcels</span>
                    <span className="flex-1">Readiness</span>
                    <span className="w-14 text-right">At Risk</span>
                  </div>
                  {neighborhoods.slice(0, 10).map((n, i) => {
                    const ng = gradeFromIndex(n.readiness_index);
                    return (
                      <motion.div
                        key={n.code}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 py-2 border-b border-border/20"
                      >
                        <span className="w-24 font-mono text-xs text-foreground">{n.code}</span>
                        <span className="w-14 text-right text-xs text-muted-foreground">{n.parcel_count}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
                            <div className={`h-full rounded-full ${ng.color.replace('text-', 'bg-')}`} style={{ width: `${n.readiness_index}%` }} />
                          </div>
                          <span className={`text-xs font-medium ${ng.color}`}>{n.readiness_index}%</span>
                        </div>
                        <span className="w-14 text-right text-xs text-[hsl(var(--tf-warning-red))]">{n.parcels_at_risk}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </TabsContent>

        {/* ═══ Panel 2: Map Readiness ═══ */}
        <TabsContent value="map-readiness">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-1">Coordinate & Spatial Quality</h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              From the Geometry Health Dashboard — use the dedicated view for full diagnostics
            </p>
            {coverage && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MapMetric label="Effective WGS84" value={`${coverage.effective_coords}%`} good={coverage.effective_coords >= 80} />
                <MapMetric label="Situs Address" value={`${coverage.situs_address}%`} good={coverage.situs_address >= 80} />
                <MapMetric label="Neighborhood" value={`${coverage.neighborhood}%`} good={coverage.neighborhood >= 80} />
                <MapMetric label="Land Area" value={`${coverage.land_area}%`} good={coverage.land_area >= 80} />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-4 italic">
              For detailed coordinate diagnostics (SRID detection, backfill progress, duplicate groups), see the Geometry Health panel.
            </p>
          </motion.div>
        </TabsContent>

        {/* ═══ Panel 3: Annual Accuracy (Reval Window) ═══ */}
        <TabsContent value="annual-accuracy">
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-tf-cyan" />
                <h3 className="text-sm font-medium text-foreground">IAAO Ratio Study Summary</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Annual reval accuracy metrics belong here — use the TerraForge Equity (VEI) dashboard for live ratio studies with full stratification.
                These metrics should only be evaluated during or after a revaluation cycle.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Navigate to <strong>Property Workbench → Forge → Equity (VEI)</strong> for median ratio, COD, PRD, PRB with neighborhood stratification and tier analysis.
                </span>
              </div>
            </motion.div>

            {/* Assessment value trends (context, not accuracy) */}
            {trends.data && trends.data.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
                <h3 className="text-sm font-medium text-foreground mb-4">Assessment Value Context by Tax Year</h3>
                <ResponsiveContainer width="100%" height={300}>
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
            )}

            {/* Sales velocity (context) */}
            {velocity.data && velocity.data.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-6">
                <h3 className="text-sm font-medium text-foreground mb-4">Sales Volume & Qualification Rate (last 24 months)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={velocity.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-45} textAnchor="end" height={60} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalSales" name="Total Sales" fill="hsl(var(--tf-transcend-cyan))" radius={[4, 4, 0, 0]} opacity={0.7} />
                    <Bar yAxisId="left" dataKey="qualifiedSales" name="Qualified" fill="hsl(var(--tf-optimized-green))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

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

function MapMetric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="material-bento rounded-xl p-4 text-center">
      <div className={`text-2xl font-medium ${good ? "text-[hsl(var(--tf-optimized-green))]" : "text-[hsl(var(--tf-sacred-gold))]"}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

// TerraFusion OS — Phase 78: Comparative Dashboard
// Multi-cycle overlay with YoY delta analysis, trend charts, and snapshot management

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Trash2,
  Loader2, Layers, ArrowUpRight, ArrowDownRight,
  GitCompare, Camera, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, RadarChart,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  useComparisonSnapshots,
  useGenerateSnapshot,
  useDeleteSnapshot,
  computeDeltas,
  type ComparisonSnapshot,
  type YoYDelta,
} from "@/hooks/useComparativeDashboard";

// ── Format helpers ─────────────────────────────────────────────────
const fmtCurrency = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}K`
      : `$${n.toFixed(0)}`;

const fmtNum = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

// ── Delta Direction Icon ───────────────────────────────────────────
function DeltaIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "up") return <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />;
  if (dir === "down") return <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

// ── Snapshot Generator Form ────────────────────────────────────────
function SnapshotGenerator() {
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString());
  const [label, setLabel] = useState("");
  const [nbhd, setNbhd] = useState("");
  const [propClass, setPropClass] = useState("");
  const generate = useGenerateSnapshot();

  // Use a known county or leave blank for the RPC to figure out
  const handleGenerate = () => {
    generate.mutate({
      countyId: "00000000-0000-0000-0000-000000000000", // will be scoped by RLS
      taxYear: parseInt(taxYear),
      label: label || undefined,
      neighborhoodCode: nbhd || undefined,
      propertyClass: propClass || undefined,
    });
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          Capture Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px]">Tax Year</Label>
            <Input
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Label (optional)</Label>
            <Input
              placeholder="e.g. Pre-Reval 2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Neighborhood</Label>
            <Input
              placeholder="All"
              value={nbhd}
              onChange={(e) => setNbhd(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Property Class</Label>
            <Input
              placeholder="All"
              value={propClass}
              onChange={(e) => setPropClass(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleGenerate}
          disabled={generate.isPending}
        >
          {generate.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Camera className="w-3.5 h-3.5" />
          )}
          Generate Snapshot
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Delta Cards Row ────────────────────────────────────────────────
function DeltaCards({ deltas }: { deltas: YoYDelta[] }) {
  const valueDelta = deltas.filter((d) =>
    ["avg_assessed_value", "median_assessed_value", "total_assessed_value", "total_parcels"].includes(d.metric)
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {valueDelta.map((d) => (
        <motion.div
          key={d.metric}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {d.label}
                </span>
                <DeltaIcon dir={d.direction} />
              </div>
              <div className="text-lg font-bold font-mono">
                {d.metric.includes("value") ? fmtCurrency(d.current) : fmtNum(d.current)}
              </div>
              <div className={`text-xs font-mono mt-0.5 ${
                d.direction === "up" ? "text-emerald-400" :
                d.direction === "down" ? "text-red-400" :
                "text-muted-foreground"
              }`}>
                {fmtPct(d.deltaPct)} from prior
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ── Overlay Bar Chart ──────────────────────────────────────────────
function OverlayBarChart({ snapshots }: { snapshots: ComparisonSnapshot[] }) {
  const chartData = snapshots
    .sort((a, b) => a.tax_year - b.tax_year)
    .map((s) => ({
      name: s.snapshot_label,
      year: s.tax_year,
      "Avg Assessed": Math.round(s.avg_assessed_value),
      "Avg Land": Math.round(s.avg_land_value),
      "Avg Improvement": Math.round(s.avg_improvement_value),
    }));

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Multi-Cycle Value Overlay
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={(v) => fmtCurrency(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              formatter={(v: number) => fmtCurrency(v)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Avg Assessed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Avg Land" fill="hsl(var(--primary)/0.5)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Avg Improvement" fill="hsl(var(--primary)/0.25)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Trend Line Chart ───────────────────────────────────────────────
function TrendLineChart({ snapshots }: { snapshots: ComparisonSnapshot[] }) {
  const chartData = snapshots
    .sort((a, b) => a.tax_year - b.tax_year)
    .map((s) => ({
      name: `TY ${s.tax_year}`,
      parcels: s.total_parcels,
      sales: s.total_sales,
      appeals: s.appeal_count,
      exemptions: s.exemption_count,
    }));

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Activity Trends Across Cycles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="parcels" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="appeals" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="exemptions" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Full Delta Table ───────────────────────────────────────────────
function DeltaTable({ deltas }: { deltas: YoYDelta[] }) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" />
          Year-over-Year Delta Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Metric</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Prior</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Current</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Change</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">% Change</th>
              </tr>
            </thead>
            <tbody>
              {deltas.map((d) => (
                <tr key={d.metric} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-medium">{d.label}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                    {d.metric.includes("value") || d.metric.includes("price") ? fmtCurrency(d.prior) : fmtNum(d.prior)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {d.metric.includes("value") || d.metric.includes("price") ? fmtCurrency(d.current) : fmtNum(d.current)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center gap-1 font-mono ${
                      d.direction === "up" ? "text-emerald-400" :
                      d.direction === "down" ? "text-red-400" :
                      "text-muted-foreground"
                    }`}>
                      <DeltaIcon dir={d.direction} />
                      {d.metric.includes("value") || d.metric.includes("price")
                        ? fmtCurrency(Math.abs(d.delta))
                        : fmtNum(Math.abs(d.delta))}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono ${
                        d.direction === "up" ? "border-emerald-500/30 text-emerald-400" :
                        d.direction === "down" ? "border-red-500/30 text-red-400" :
                        ""
                      }`}
                    >
                      {fmtPct(d.deltaPct)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Snapshot History ────────────────────────────────────────────────
function SnapshotHistory({
  snapshots,
  selectedIds,
  onToggle,
}: {
  snapshots: ComparisonSnapshot[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const deleteMut = useDeleteSnapshot();

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Snapshots
          <Badge variant="outline" className="text-[9px] ml-auto">{snapshots.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No snapshots yet. Capture one above.
          </div>
        ) : (
          snapshots.map((s) => {
            const selected = selectedIds.has(s.id);
            return (
              <motion.div
                key={s.id}
                layout
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  selected
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted/10 border-border/20 hover:bg-muted/20"
                }`}
                onClick={() => onToggle(s.id)}
              >
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors ${
                  selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{s.snapshot_label}</p>
                  <p className="text-[9px] text-muted-foreground">
                    TY {s.tax_year} · {s.total_parcels.toLocaleString()} parcels
                    {s.neighborhood_code ? ` · ${s.neighborhood_code}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMut.mutate(s.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </motion.div>
            );
          })
        )}
        {selectedIds.size >= 2 && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/20 mt-2">
            <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-[10px] text-primary">
              {selectedIds.size} snapshots selected — comparing oldest vs newest
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export function ComparativeDashboard() {
  const { data: snapshots = [], isLoading } = useComparisonSnapshots();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSnapshot = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter to selected snapshots (or use all if < 2 selected)
  const activeSnapshots = useMemo(() => {
    if (selectedIds.size >= 2) {
      return snapshots.filter((s) => selectedIds.has(s.id));
    }
    return snapshots;
  }, [snapshots, selectedIds]);

  // Compute deltas between first and last selected
  const deltas = useMemo(() => {
    if (activeSnapshots.length < 2) return null;
    const sorted = [...activeSnapshots].sort((a, b) => a.tax_year - b.tax_year);
    return computeDeltas(sorted[0], sorted[sorted.length - 1]);
  }, [activeSnapshots]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-[hsl(var(--tf-transcend-cyan))] tracking-tight flex items-center gap-3">
          <GitCompare className="w-7 h-7 text-primary" />
          Comparative Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-cycle overlay — compare assessment snapshots across tax years
        </p>
      </motion.div>

      {/* Snapshot Generator */}
      <SnapshotGenerator />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Snapshot Sidebar */}
        <div className="lg:col-span-1">
          {isLoading ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground mt-2">Loading snapshots…</p>
              </CardContent>
            </Card>
          ) : (
            <SnapshotHistory
              snapshots={snapshots}
              selectedIds={selectedIds}
              onToggle={toggleSnapshot}
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeSnapshots.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-12 text-center">
                <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="text-sm font-semibold">No Snapshots Available</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Generate your first comparison snapshot using the form above.
                  <br />
                  Select 2+ snapshots to see YoY delta analysis.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="overlay" className="space-y-4">
              <TabsList className="bg-muted/30">
                <TabsTrigger value="overlay" className="text-xs gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Value Overlay
                </TabsTrigger>
                <TabsTrigger value="trends" className="text-xs gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Activity Trends
                </TabsTrigger>
                {deltas && (
                  <TabsTrigger value="deltas" className="text-xs gap-1.5">
                    <GitCompare className="w-3.5 h-3.5" />
                    Delta Analysis
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Delta summary cards */}
              {deltas && <DeltaCards deltas={deltas} />}

              <TabsContent value="overlay">
                <OverlayBarChart snapshots={activeSnapshots} />
              </TabsContent>

              <TabsContent value="trends">
                <TrendLineChart snapshots={activeSnapshots} />
              </TabsContent>

              {deltas && (
                <TabsContent value="deltas">
                  <DeltaTable deltas={deltas} />
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

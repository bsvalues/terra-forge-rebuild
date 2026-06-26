import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  BarChart3, 
  TrendingUp,
  Download,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useRatioDistribution } from "@/hooks/useRatioDistribution";

interface CODDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    current: number;
    trend: number[];
    years: number[];
    target: number;
    upperLimit: number;
  };
  taxYear?: number;
  salesStartDate?: string;
  salesEndDate?: string;
  outlierMethod?: string;
}

export function CODDrilldownDialog({ open, onOpenChange, data, taxYear, salesStartDate, salesEndDate, outlierMethod }: CODDrilldownDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch real distribution data
  const { data: realDistribution } = useRatioDistribution(
    taxYear || new Date().getFullYear(),
    salesStartDate || new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    salesEndDate || new Date().toISOString().split('T')[0],
    outlierMethod || "bounds",
    open
  );

  // Transform trend data
  const trendData = data.years.map((year, index) => ({
    year,
    cod: data.trend[index] || 0,
    target: data.target,
    limit: data.upperLimit,
  }));

  // Use real distribution data or empty
  const distributionData = (realDistribution || []).map(d => ({
    range: d.range_label,
    count: d.parcel_count,
    percentage: Number(d.percentage),
  }));

  // Compute summary from real data
  const withinTarget = distributionData.filter(d => {
    const start = parseFloat(d.range);
    return !isNaN(start) && start <= 10;
  }).reduce((s, d) => s + d.percentage, 0);

  const acceptable = distributionData.filter(d => {
    const start = parseFloat(d.range);
    return !isNaN(start) && start > 10 && start <= 15;
  }).reduce((s, d) => s + d.percentage, 0);

  const needsReview = distributionData.filter(d => {
    const start = parseFloat(d.range);
    return !isNaN(start) ? start > 15 : d.range.startsWith(">");
  }).reduce((s, d) => s + d.percentage, 0);

  const getCODStatus = (cod: number) => {
    if (cod <= 10) return { label: "Excellent", color: "vei-excellent" };
    if (cod <= 15) return { label: "Good", color: "vei-good" };
    if (cod <= 20) return { label: "Caution", color: "vei-caution" };
    return { label: "Concern", color: "vei-concern" };
  };

  const status = getCODStatus(data.current);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto material-bento">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                COD Analysis — Coefficient of Dispersion
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Measures uniformity of assessment ratios. Target: ≤{data.target}% (IAAO Standard)
              </p>
            </div>
            <Badge className={`text-sm px-3 py-1 bg-${status.color}/20 text-${status.color}`}>
              Current: {data.current.toFixed(1)}%
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="trend" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trend
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-2">
              <Activity className="w-4 h-4" />
              Distribution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className={`p-3 rounded-lg border bg-${status.color}/10 border-${status.color}/30`}>
                <p className="text-xs text-muted-foreground">Current COD</p>
                <p className={`text-xl font-light mt-1 text-${status.color}`}>
                  {data.current.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30 border-border/50">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-xl font-light mt-1">≤{data.target}%</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30 border-border/50">
                <p className="text-xs text-muted-foreground">Upper Limit</p>
                <p className="text-xl font-light mt-1">{data.upperLimit}%</p>
              </div>
              <div className={`p-3 rounded-lg border bg-${status.color}/10 border-${status.color}/30`}>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`text-xl font-light mt-1 text-${status.color}`}>
                  {status.label}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">COD Performance</span>
                <span className="text-sm text-muted-foreground">{data.current.toFixed(1)}% / {data.upperLimit}%</span>
              </div>
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${
                    data.current <= 10 ? 'from-vei-excellent to-vei-excellent/70' :
                    data.current <= 15 ? 'from-vei-good to-vei-good/70' :
                    data.current <= 20 ? 'from-vei-caution to-vei-caution/70' :
                    'from-vei-concern to-vei-concern/70'
                  }`}
                  style={{ width: `${Math.min(100, (data.current / data.upperLimit) * 100)}%` }}
                />
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-primary"
                  style={{ left: `${(data.target / data.upperLimit) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0%</span>
                <span className="text-primary">Target: {data.target}%</span>
                <span>{data.upperLimit}%</span>
              </div>
            </div>

            {/* Interpretation */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
              <h4 className="text-sm font-medium mb-3">IAAO Standards for COD</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-vei-excellent" />
                    <span className="text-sm">≤10%: Excellent uniformity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-vei-good" />
                    <span className="text-sm">10-15%: Good (single-family)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-vei-caution" />
                    <span className="text-sm">15-20%: Needs improvement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-vei-concern" />
                    <span className="text-sm">&gt;20%: Poor uniformity</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trend" className="mt-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="year" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    domain={[0, 25]} 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'COD']}
                  />
                  <ReferenceLine y={data.target} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: 'Target', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <ReferenceLine y={data.upperLimit} stroke="hsl(var(--vei-concern))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Line 
                    type="monotone" 
                    dataKey="cod" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="mt-6 space-y-6">
            {distributionData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="range" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'percentage' ? `${value}%` : value,
                          name === 'percentage' ? 'Percentage' : 'Count'
                        ]}
                      />
                      <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                        {distributionData.map((entry, index) => {
                          const rangeStart = parseFloat(entry.range);
                          const color = !isNaN(rangeStart) 
                            ? rangeStart <= 10 ? "hsl(var(--vei-excellent))" :
                              rangeStart <= 15 ? "hsl(var(--vei-good))" :
                              rangeStart <= 20 ? "hsl(var(--vei-caution))" :
                              "hsl(var(--vei-concern))"
                            : "hsl(var(--vei-concern))";
                          return <Cell key={index} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                  <h4 className="text-sm font-medium mb-3">Distribution Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Within Target (≤10%)</span>
                      <p className="text-lg font-light text-vei-excellent">{withinTarget.toFixed(0)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Acceptable (10-15%)</span>
                      <p className="text-lg font-light text-vei-good">{acceptable.toFixed(0)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Needs Review (&gt;15%)</span>
                      <p className="text-lg font-light text-vei-caution">{needsReview.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No distribution data available. Run a ratio study with qualified sales to see results.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4 pt-4 border-t border-border/50">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export Analysis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

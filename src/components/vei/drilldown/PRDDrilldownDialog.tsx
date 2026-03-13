import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  BarChart3, 
  ArrowRight,
  Download,
  Loader2
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
import { useNeighborhoodRatioComparison } from "@/hooks/useRatioAnalysis";

interface PRDDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    current: number;
    trend: number[];
    years: number[];
    target: number;
    tolerance: number;
  };
  taxYear?: number;
  salesStartDate?: string;
  salesEndDate?: string;
}

export function PRDDrilldownDialog({ open, onOpenChange, data, taxYear, salesStartDate, salesEndDate }: PRDDrilldownDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const currentYear = taxYear || new Date().getFullYear();
  const startDate = salesStartDate || new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = salesEndDate || new Date().toISOString().split('T')[0];

  // Fetch real neighborhood comparison data
  const { data: nbhdData, isLoading: nbhdLoading } = useNeighborhoodRatioComparison(
    currentYear, startDate, endDate
  );

  // Transform trend data for chart
  const trendData = data.years.map((year, index) => ({
    year,
    prd: data.trend[index] || 1.0,
    target: data.target,
    upperBound: data.target + data.tolerance,
    lowerBound: data.target - data.tolerance,
  }));

  // Transform real neighborhood data
  const neighborhoodData = (nbhdData || [])
    .filter((n: any) => n && n.prd != null && n.sample_size >= 3)
    .map((n: any) => ({
      name: n.neighborhood_code || "Unknown",
      prd: n.prd ?? 1.0,
      count: n.sample_size ?? 0,
    }))
    .sort((a: any, b: any) => Math.abs(b.prd - 1) - Math.abs(a.prd - 1));

  const getPRDColor = (prd: number) => {
    const deviation = Math.abs(prd - 1);
    if (deviation <= 0.02) return "hsl(var(--vei-excellent))";
    if (deviation <= 0.05) return "hsl(var(--vei-good))";
    if (deviation <= 0.10) return "hsl(var(--vei-caution))";
    return "hsl(var(--vei-concern))";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto material-bento">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                PRD Analysis — Price-Related Differential
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Measures assessment level relative to property value. Target: 1.00 (±3%)
              </p>
            </div>
            <Badge 
              className={`text-sm px-3 py-1 ${
                Math.abs(data.current - 1) <= 0.03 
                  ? 'bg-vei-excellent/20 text-vei-excellent'
                  : Math.abs(data.current - 1) <= 0.07
                    ? 'bg-vei-caution/20 text-vei-caution'
                    : 'bg-vei-concern/20 text-vei-concern'
              }`}
            >
              Current: {data.current.toFixed(3)}
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
            <TabsTrigger value="neighborhoods" className="gap-2">
              <MapPin className="w-4 h-4" />
              By Neighborhood
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <MetricBox 
                label="Current PRD" 
                value={data.current.toFixed(3)} 
                status={Math.abs(data.current - 1) <= 0.03 ? "good" : "warning"}
              />
              <MetricBox 
                label="Target" 
                value={data.target.toFixed(2)} 
                status="neutral"
              />
              <MetricBox 
                label="Deviation" 
                value={`${((data.current - 1) * 100).toFixed(1)}%`}
                status={Math.abs(data.current - 1) <= 0.03 ? "good" : "warning"}
              />
              <MetricBox 
                label="Tolerance" 
                value={`±${(data.tolerance * 100).toFixed(0)}%`}
                status="neutral"
              />
            </div>

            {/* Interpretation */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
              <h4 className="text-sm font-medium mb-2">Interpretation</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>PRD &gt; 1.00:</strong> Higher-value properties are assessed at relatively lower 
                    ratios than lower-value properties (regressive pattern)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>PRD &lt; 1.00:</strong> Lower-value properties are assessed at relatively lower 
                    ratios than higher-value properties (progressive pattern)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>PRD = 1.00:</strong> Assessment burden is distributed uniformly across all 
                    value levels (vertical equity)
                  </span>
                </li>
              </ul>
            </div>

            {/* Current Status */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
              <h4 className="text-sm font-medium mb-2">Current Assessment</h4>
              {data.current > 1.03 ? (
                <div className="flex items-center gap-2 text-vei-caution">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">
                    Your jurisdiction shows a <strong>regressive</strong> pattern. Higher-value properties 
                    may be under-assessed relative to lower-value properties.
                  </span>
                </div>
              ) : data.current < 0.97 ? (
                <div className="flex items-center gap-2 text-vei-caution">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm">
                    Your jurisdiction shows a <strong>progressive</strong> pattern. Lower-value properties 
                    may be under-assessed relative to higher-value properties.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-vei-excellent">
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-sm">
                    Your jurisdiction shows <strong>excellent vertical equity</strong>. Assessment burden 
                    is distributed uniformly across value levels.
                  </span>
                </div>
              )}
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
                    domain={[0.9, 1.1]} 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => v.toFixed(2)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value.toFixed(3), 'PRD']}
                  />
                  <ReferenceLine y={1} stroke="hsl(var(--primary))" strokeDasharray="5 5" />
                  <ReferenceLine y={1.03} stroke="hsl(var(--vei-caution))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={0.97} stroke="hsl(var(--vei-caution))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Line 
                    type="monotone" 
                    dataKey="prd" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-primary" />
                PRD Values
              </span>
              <span className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-primary opacity-50" />
                Target (1.00)
              </span>
              <span className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-vei-caution opacity-50" />
                Tolerance Bounds
              </span>
            </div>
          </TabsContent>

          <TabsContent value="neighborhoods" className="mt-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Neighborhoods sorted by PRD deviation from target — live data from ratio analysis
              </p>
              
              {nbhdLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Computing neighborhood statistics…
                </div>
              ) : neighborhoodData.length > 0 ? (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={neighborhoodData.slice(0, 12)} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          type="number" 
                          domain={[0.85, 1.15]} 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [value.toFixed(3), 'PRD']}
                        />
                        <ReferenceLine x={1} stroke="hsl(var(--primary))" strokeDasharray="5 5" />
                        <Bar dataKey="prd" radius={[0, 4, 4, 0]}>
                          {neighborhoodData.slice(0, 12).map((entry: any, index: number) => (
                            <Cell key={index} fill={getPRDColor(entry.prd)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Neighborhood table */}
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground sticky top-0 bg-background">
                        <tr>
                          <th className="text-left p-2">Neighborhood</th>
                          <th className="text-right p-2">PRD</th>
                          <th className="text-right p-2">Deviation</th>
                          <th className="text-right p-2">Count</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {neighborhoodData.map((nbhd: any) => {
                          const deviation = ((nbhd.prd - 1) * 100).toFixed(1);
                          const status = Math.abs(nbhd.prd - 1) <= 0.03 ? "excellent" : 
                                         Math.abs(nbhd.prd - 1) <= 0.07 ? "caution" : "concern";
                          return (
                            <tr key={nbhd.name} className="border-t border-border/30 hover:bg-muted/30">
                              <td className="p-2 font-medium">{nbhd.name}</td>
                              <td className="p-2 text-right font-mono">{nbhd.prd.toFixed(3)}</td>
                              <td className="p-2 text-right font-mono">
                                {Number(deviation) > 0 ? '+' : ''}{deviation}%
                              </td>
                              <td className="p-2 text-right">{nbhd.count}</td>
                              <td className="p-2 text-center">
                                <Badge className={`text-[10px] ${
                                  status === "excellent" ? "bg-vei-excellent/20 text-vei-excellent" :
                                  status === "caution" ? "bg-vei-caution/20 text-vei-caution" :
                                  "bg-vei-concern/20 text-vei-concern"
                                }`}>
                                  {status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No neighborhood data available. Ensure parcels have neighborhood codes and qualified sales.</p>
                </div>
              )}
            </div>
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

function MetricBox({ 
  label, 
  value, 
  status 
}: { 
  label: string; 
  value: string; 
  status: "good" | "warning" | "neutral" 
}) {
  return (
    <div className={`p-3 rounded-lg border ${
      status === "good" ? "bg-vei-excellent/10 border-vei-excellent/30" :
      status === "warning" ? "bg-vei-caution/10 border-vei-caution/30" :
      "bg-muted/30 border-border/50"
    }`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-light mt-1 ${
        status === "good" ? "text-vei-excellent" :
        status === "warning" ? "text-vei-caution" :
        "text-foreground"
      }`}>
        {value}
      </p>
    </div>
  );
}

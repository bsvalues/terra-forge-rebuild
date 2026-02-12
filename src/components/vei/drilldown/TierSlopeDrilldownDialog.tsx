import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Download,
  ArrowRight
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface TierSlopeDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    slope: number;
    tierMedians: { tier: string; median: number; count: number; color: string }[];
  };
}

export function TierSlopeDrilldownDialog({ open, onOpenChange, data }: TierSlopeDrilldownDialogProps) {
  const absSlope = Math.abs(data.slope);
  const status = absSlope <= 0.02 ? "excellent" : 
                 absSlope <= 0.05 ? "good" : 
                 absSlope <= 0.10 ? "caution" : "concern";

  const statusLabels = {
    excellent: "Neutral",
    good: "Slight Bias",
    caution: "Regressivity Signal",
    concern: "Strong Regressivity"
  };

  const chartData = data.tierMedians.map((t) => ({
    tier: t.tier,
    median: t.median,
    deviation: ((t.median - 1) * 100).toFixed(1),
    count: t.count,
    color: t.color,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto material-bento">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-tf-cyan" />
                Tier Slope Analysis — Q1 to Q4 Spread
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Measures median ratio difference between lowest and highest value quartiles
              </p>
            </div>
            <Badge className={`text-sm px-3 py-1 ${
              status === "excellent" ? "bg-vei-excellent/20 text-vei-excellent" :
              status === "good" ? "bg-vei-good/20 text-vei-good" :
              status === "caution" ? "bg-vei-caution/20 text-vei-caution" :
              "bg-vei-concern/20 text-vei-concern"
            }`}>
              Slope: {data.slope >= 0 ? '+' : ''}{data.slope.toFixed(3)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className={`p-3 rounded-lg border ${
              status === "excellent" ? "bg-vei-excellent/10 border-vei-excellent/30" :
              status === "good" ? "bg-vei-good/10 border-vei-good/30" :
              status === "caution" ? "bg-vei-caution/10 border-vei-caution/30" :
              "bg-vei-concern/10 border-vei-concern/30"
            }`}>
              <p className="text-xs text-muted-foreground">Tier Slope</p>
              <p className={`text-xl font-light mt-1 ${
                status === "excellent" ? "text-vei-excellent" :
                status === "good" ? "text-vei-good" :
                status === "caution" ? "text-vei-caution" :
                "text-vei-concern"
              }`}>
                {data.slope >= 0 ? '+' : ''}{data.slope.toFixed(3)}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-tf-elevated/50 border-border/50">
              <p className="text-xs text-muted-foreground">Q1 (Low) Median</p>
              <p className="text-xl font-light mt-1">
                {chartData.find(c => c.tier.includes("Q1") || c.tier === "low")?.median.toFixed(3) || "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-tf-elevated/50 border-border/50">
              <p className="text-xs text-muted-foreground">Q4 (High) Median</p>
              <p className="text-xl font-light mt-1">
                {chartData.find(c => c.tier.includes("Q4") || c.tier === "high")?.median.toFixed(3) || "N/A"}
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${
              status === "excellent" ? "bg-vei-excellent/10 border-vei-excellent/30" :
              status === "good" ? "bg-vei-good/10 border-vei-good/30" :
              status === "caution" ? "bg-vei-caution/10 border-vei-caution/30" :
              "bg-vei-concern/10 border-vei-concern/30"
            }`}>
              <p className="text-xs text-muted-foreground">Assessment</p>
              <p className={`text-xl font-light mt-1 ${
                status === "excellent" ? "text-vei-excellent" :
                status === "good" ? "text-vei-good" :
                status === "caution" ? "text-vei-caution" :
                "text-vei-concern"
              }`}>
                {statusLabels[status]}
              </p>
            </div>
          </div>

          {/* Tier Chart */}
          <div className="p-4 rounded-lg bg-tf-elevated/30 border border-border/50">
            <h4 className="text-sm font-medium mb-4">Median Ratios by Value Tier</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="tier" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
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
                    formatter={(value: number) => [value.toFixed(3), 'Median Ratio']}
                  />
                  <ReferenceLine y={1} stroke="hsl(var(--tf-cyan))" strokeDasharray="5 5" />
                  <ReferenceLine y={1.03} stroke="hsl(var(--vei-caution))" strokeDasharray="3 3" strokeOpacity={0.3} />
                  <ReferenceLine y={0.97} stroke="hsl(var(--vei-caution))" strokeDasharray="3 3" strokeOpacity={0.3} />
                  <Bar dataKey="median" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color || "hsl(var(--tf-cyan))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interpretation */}
          <div className="p-4 rounded-lg bg-tf-elevated/30 border border-border/50">
            <h4 className="text-sm font-medium mb-3">Interpretation</h4>
            {data.slope > 0.02 ? (
              <div className="flex items-start gap-3 text-vei-caution">
                <TrendingUp className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Regressive Pattern Detected</p>
                  <p className="text-muted-foreground mt-1">
                    Higher-value properties (Q4) show higher median ratios than lower-value properties (Q1). 
                    This suggests lower-value properties may be relatively under-assessed, shifting 
                    tax burden toward higher-value property owners.
                  </p>
                </div>
              </div>
            ) : data.slope < -0.02 ? (
              <div className="flex items-start gap-3 text-vei-caution">
                <TrendingDown className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Progressive Pattern Detected</p>
                  <p className="text-muted-foreground mt-1">
                    Lower-value properties (Q1) show higher median ratios than higher-value properties (Q4). 
                    This suggests higher-value properties may be relatively under-assessed, shifting 
                    tax burden toward lower-value property owners.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-vei-excellent">
                <ArrowRight className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Neutral / Equitable</p>
                  <p className="text-muted-foreground mt-1">
                    Assessment ratios are relatively consistent across all value tiers. 
                    Tax burden is distributed proportionally regardless of property value.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tier Details Table */}
          <div className="p-4 rounded-lg bg-tf-elevated/30 border border-border/50">
            <h4 className="text-sm font-medium mb-3">Tier Details</h4>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-right p-2">Median Ratio</th>
                  <th className="text-right p-2">Deviation from 1.00</th>
                  <th className="text-right p-2">Sample Size</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((tier) => (
                  <tr key={tier.tier} className="border-t border-border/30">
                    <td className="p-2 font-medium">{tier.tier}</td>
                    <td className="p-2 text-right font-mono">{tier.median.toFixed(3)}</td>
                    <td className="p-2 text-right font-mono">
                      {Number(tier.deviation) > 0 ? '+' : ''}{tier.deviation}%
                    </td>
                    <td className="p-2 text-right">{tier.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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

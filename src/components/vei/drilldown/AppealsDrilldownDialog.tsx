import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Download,
  TrendingUp,
  Users
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface AppealsDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    highTierRate: number;
    byTier: { tier: string; count: number; rate: number }[];
    total?: number;
  };
}

export function AppealsDrilldownDialog({ open, onOpenChange, data }: AppealsDrilldownDialogProps) {
  const status = data.highTierRate <= 3 ? "excellent" : 
                 data.highTierRate <= 5 ? "good" : 
                 data.highTierRate <= 8 ? "caution" : "concern";

  const statusLabels = {
    excellent: "Low Concentration",
    good: "Moderate",
    caution: "High-Value Clustering",
    concern: "Critical Clustering"
  };

  // Prepare chart data
  const tierData = data.byTier.length > 0 ? data.byTier : [
    { tier: "Q1 (Low)", count: 12, rate: 2.1 },
    { tier: "Q2", count: 18, rate: 3.2 },
    { tier: "Q3", count: 25, rate: 4.5 },
    { tier: "Q4 (High)", count: 45, rate: 8.2 },
  ];

  const totalAppeals = tierData.reduce((a, t) => a + t.count, 0);

  const pieData = tierData.map((t) => ({
    name: t.tier,
    value: t.count,
    percentage: ((t.count / totalAppeals) * 100).toFixed(1),
  }));

  const COLORS = [
    "hsl(var(--vei-excellent))",
    "hsl(var(--vei-good))",
    "hsl(var(--vei-caution))",
    "hsl(var(--vei-concern))",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto material-bento">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-tf-cyan" />
                Appeals Analysis — Value Tier Distribution
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Examines appeal concentration across property value quartiles
              </p>
            </div>
            <Badge className={`text-sm px-3 py-1 ${
              status === "excellent" ? "bg-vei-excellent/20 text-vei-excellent" :
              status === "good" ? "bg-vei-good/20 text-vei-good" :
              status === "caution" ? "bg-vei-caution/20 text-vei-caution" :
              "bg-vei-concern/20 text-vei-concern"
            }`}>
              High-Value Rate: {data.highTierRate.toFixed(1)}%
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
              <p className="text-xs text-muted-foreground">Q4 Appeal Rate</p>
              <p className={`text-xl font-light mt-1 ${
                status === "excellent" ? "text-vei-excellent" :
                status === "good" ? "text-vei-good" :
                status === "caution" ? "text-vei-caution" :
                "text-vei-concern"
              }`}>
                {data.highTierRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-tf-elevated/50 border-border/50">
              <p className="text-xs text-muted-foreground">Total Appeals</p>
              <p className="text-xl font-light mt-1">{totalAppeals}</p>
            </div>
            <div className="p-3 rounded-lg border bg-tf-elevated/50 border-border/50">
              <p className="text-xs text-muted-foreground">Target Rate</p>
              <p className="text-xl font-light mt-1">&lt;5%</p>
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

          {/* Charts Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Appeals by Tier Bar Chart */}
            <div className="p-4 rounded-lg bg-tf-elevated/30 border border-border/50">
              <h4 className="text-sm font-medium mb-4">Appeal Rate by Tier</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tierData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="tier" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
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
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Rate']}
                    />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                      {tierData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Appeals Distribution Pie Chart */}
            <div className="p-4 rounded-lg bg-tf-elevated/30 border border-border/50">
              <h4 className="text-sm font-medium mb-4">Appeal Distribution</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, _name: string, props: any) => [
                        `${value} (${props.payload.percentage}%)`,
                        props.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interpretation */}
          <div className="p-4 rounded-lg bg-tf-elevated/30 border border-border/50">
            <h4 className="text-sm font-medium mb-3">Analysis</h4>
            {data.highTierRate > 5 ? (
              <div className="flex items-start gap-3 text-vei-caution">
                <TrendingUp className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">High-Value Property Concentration</p>
                  <p className="text-muted-foreground mt-1">
                    A disproportionate number of appeals are coming from high-value properties (Q4). 
                    This may indicate that higher-value properties feel over-assessed, or that 
                    sophisticated property owners are more likely to appeal. Consider reviewing 
                    assessment practices for the upper value tier.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-vei-excellent">
                <Users className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Balanced Appeal Distribution</p>
                  <p className="text-muted-foreground mt-1">
                    Appeals are distributed relatively evenly across value tiers, suggesting 
                    assessment practices are perceived as fair across all property values.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tier Details Table */}
          <div className="p-4 rounded-lg bg-tf-elevated/30 border border-border/50">
            <h4 className="text-sm font-medium mb-3">Tier Breakdown</h4>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Value Tier</th>
                  <th className="text-right p-2">Appeals</th>
                  <th className="text-right p-2">Appeal Rate</th>
                  <th className="text-right p-2">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {tierData.map((tier, index) => (
                  <tr key={tier.tier} className="border-t border-border/30">
                    <td className="p-2 font-medium flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {tier.tier}
                    </td>
                    <td className="p-2 text-right">{tier.count}</td>
                    <td className="p-2 text-right font-mono">{tier.rate.toFixed(1)}%</td>
                    <td className="p-2 text-right font-mono">
                      {((tier.count / totalAppeals) * 100).toFixed(1)}%
                    </td>
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

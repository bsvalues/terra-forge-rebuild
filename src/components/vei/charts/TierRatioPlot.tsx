import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TierData {
  tier: string;
  median: number;
  count: number;
  color: string;
}

interface TierRatioPlotProps {
  data: TierData[];
}

const tierColors = [
  "hsl(180, 100%, 50%)",  // Q1 - Cyan
  "hsl(160, 70%, 45%)",   // Q2 - Teal
  "hsl(38, 95%, 55%)",    // Q3 - Amber
  "hsl(0, 72%, 51%)",     // Q4 - Red
];

export function TierRatioPlot({ data }: TierRatioPlotProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      const deviation = ((item.median - 1) * 100).toFixed(2);
      
      return (
        <div className="glass-card p-3 rounded-lg border border-border min-w-[200px]">
          <p className="text-sm font-medium text-foreground mb-2">{item.tier}</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Median Ratio:</span>
              <span className="text-sm font-medium text-tf-cyan">{item.median.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Deviation:</span>
              <span className={`text-sm ${parseFloat(deviation) > 0 ? "text-vei-caution" : "text-vei-good"}`}>
                {parseFloat(deviation) > 0 ? "+" : ""}{deviation}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Sample Size:</span>
              <span className="text-sm text-foreground">{item.count.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate tier spread (regressivity indicator)
  const tierSpread = data.length >= 2 
    ? (data[data.length - 1].median - data[0].median).toFixed(3)
    : "0.000";

  return (
    <div className="space-y-4">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              {tierColors.map((color, index) => (
                <linearGradient key={index} id={`tierGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                </linearGradient>
              ))}
            </defs>
            
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="hsl(220, 30%, 18%)"
              vertical={false}
            />
            
            <XAxis
              dataKey="tier"
              tick={{ fill: "hsl(210, 15%, 60%)", fontSize: 12 }}
              axisLine={{ stroke: "hsl(220, 30%, 18%)" }}
              tickLine={false}
            />
            
            <YAxis
              domain={[0.9, 1.1]}
              tick={{ fill: "hsl(210, 15%, 60%)", fontSize: 12 }}
              axisLine={{ stroke: "hsl(220, 30%, 18%)" }}
              tickLine={false}
              tickFormatter={(value) => value.toFixed(2)}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(220, 30%, 15%)", opacity: 0.5 }} />
            
            {/* Target line */}
            <ReferenceLine
              y={1.0}
              stroke="hsl(145, 80%, 45%)"
              strokeWidth={2}
              label={{
                value: "Target 1.00",
                position: "right",
                fill: "hsl(145, 80%, 45%)",
                fontSize: 10,
              }}
            />
            
            {/* Tolerance bands */}
            <ReferenceLine y={1.03} stroke="hsl(38, 95%, 55%)" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine y={0.97} stroke="hsl(38, 95%, 55%)" strokeDasharray="4 4" strokeOpacity={0.5} />
            
            <Bar dataKey="median" radius={[8, 8, 0, 0]} maxBarSize={80}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#tierGradient${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tier Medians Table */}
      <div className="overflow-x-auto">
        <table className="table-sovereign w-full">
          <thead>
            <tr>
              <th>Value Tier</th>
              <th>Median Ratio</th>
              <th>Deviation from 1.00</th>
              <th>Sample Size</th>
              <th>Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {data.map((tier, index) => {
              const deviation = ((tier.median - 1) * 100);
              const isRegressive = deviation > 0;
              
              return (
                <motion.tr
                  key={tier.tier}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <td className="font-medium">{tier.tier}</td>
                  <td>
                    <span className="font-mono" style={{ color: tierColors[index] }}>
                      {tier.median.toFixed(3)}
                    </span>
                  </td>
                  <td>
                    <span className={isRegressive ? "text-vei-caution" : "text-vei-good"}>
                      {isRegressive ? "+" : ""}{deviation.toFixed(2)}%
                    </span>
                  </td>
                  <td>{tier.count.toLocaleString()}</td>
                  <td className="text-xs text-muted-foreground">
                    {tier.median < 0.97 && "Under-assessed relative to sales"}
                    {tier.median >= 0.97 && tier.median <= 1.03 && "Within tolerance"}
                    {tier.median > 1.03 && "Over-assessed relative to sales"}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tier Spread Summary */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-tf-elevated/50 border border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Tier Spread (Q4 - Q1)</p>
          <p className="text-xs text-muted-foreground">Indicator of systematic vertical inequity</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-light ${parseFloat(tierSpread) > 0.05 ? "text-vei-caution" : "text-vei-good"}`}>
            {parseFloat(tierSpread) > 0 ? "+" : ""}{tierSpread}
          </p>
          <p className="text-xs text-muted-foreground">
            {parseFloat(tierSpread) > 0.05 ? "Regressivity detected" : "Within acceptable range"}
          </p>
        </div>
      </div>
    </div>
  );
}

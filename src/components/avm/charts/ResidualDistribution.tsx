import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface BinData {
  bin: string;
  rfCount: number;
  nnCount: number;
}

export function ResidualDistribution() {
  const [data, setData] = useState<BinData[]>([]);

  useEffect(() => {
    // Generate normal-ish distribution for residuals
    const bins = [
      { bin: "-15%", rfCount: 2, nnCount: 3 },
      { bin: "-10%", rfCount: 8, nnCount: 10 },
      { bin: "-5%", rfCount: 22, nnCount: 18 },
      { bin: "0%", rfCount: 38, nnCount: 32 },
      { bin: "+5%", rfCount: 20, nnCount: 22 },
      { bin: "+10%", rfCount: 7, nnCount: 11 },
      { bin: "+15%", rfCount: 3, nnCount: 4 },
    ];
    setData(bins);
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <XAxis
            dataKey="bin"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--tf-surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <ReferenceLine x="0%" stroke="hsl(var(--tf-transcend-cyan))" strokeDasharray="3 3" />
          <Bar
            dataKey="rfCount"
            fill="hsl(var(--tf-optimized-green))"
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
            name="Random Forest"
          />
          <Bar
            dataKey="nnCount"
            fill="hsl(var(--tf-transcend-cyan))"
            fillOpacity={0.5}
            radius={[4, 4, 0, 0]}
            name="Neural Network"
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-tf-optimized-green/70" />
          <span className="text-xs text-muted-foreground">RF Residuals</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-tf-cyan/50" />
          <span className="text-xs text-muted-foreground">NN Residuals</span>
        </div>
      </div>
    </div>
  );
}

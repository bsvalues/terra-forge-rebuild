import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export function ResidualVsFittedPlot() {
  const data = useMemo(() => {
    const points = [];
    for (let i = 0; i < 150; i++) {
      const fitted = 150000 + Math.random() * 400000;
      // Slight heteroscedasticity pattern for realism
      const spread = (fitted / 500000) * 30000;
      const residual = (Math.random() - 0.5) * spread * 2 + (Math.random() - 0.5) * 10000;
      points.push({ fitted, residual, id: i });
    }
    // Add a few outliers
    points.push({ fitted: 350000, residual: 65000, id: 150 });
    points.push({ fitted: 280000, residual: -58000, id: 151 });
    return points;
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
          <XAxis
            dataKey="fitted"
            type="number"
            name="Fitted Values"
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            label={{ value: "Fitted Values", position: "bottom", offset: 0, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <YAxis
            dataKey="residual"
            type="number"
            name="Residuals"
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            label={{ value: "Residuals", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--tf-transcend-cyan))" strokeDasharray="5 5" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--tf-elevated))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              name === "fitted" ? `$${value.toLocaleString()}` : `$${value.toLocaleString()}`,
              name === "fitted" ? "Fitted" : "Residual"
            ]}
          />
          <Scatter
            data={data}
            fill="hsl(var(--tf-transcend-cyan))"
            fillOpacity={0.6}
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

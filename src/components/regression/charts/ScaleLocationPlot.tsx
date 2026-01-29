import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function ScaleLocationPlot() {
  const data = useMemo(() => {
    const points = [];
    for (let i = 0; i < 150; i++) {
      const fitted = 150000 + Math.random() * 400000;
      // Standardized residuals with slight heteroscedasticity
      const baseSpread = 0.8 + (fitted / 600000) * 0.6;
      const stdResidual = Math.abs((Math.random() - 0.5) * 2 * baseSpread + (Math.random() - 0.5) * 0.5);
      const sqrtStdResidual = Math.sqrt(stdResidual);
      points.push({ fitted, sqrtStdResidual, id: i });
    }
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
            dataKey="sqrtStdResidual"
            type="number"
            name="√|Standardized Residuals|"
            domain={[0, 2]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            label={{ value: "√|Std. Residuals|", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--tf-elevated))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              name === "fitted" ? `$${value.toLocaleString()}` : value.toFixed(3),
              name === "fitted" ? "Fitted" : "√|Std. Residual|"
            ]}
          />
          <Scatter
            data={data}
            fill="hsl(var(--tf-caution-amber))"
            fillOpacity={0.6}
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

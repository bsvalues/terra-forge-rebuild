import { useMemo } from "react";
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

export function CooksDistancePlot() {
  const data = useMemo(() => {
    const points = [];
    const n = 50;
    
    for (let i = 0; i < n; i++) {
      // Most observations have low Cook's distance
      let cooksD = Math.abs((Math.random() - 0.5) * 0.15 + Math.random() * 0.05);
      
      // A few influential points
      if (i === 12) cooksD = 0.72;
      if (i === 28) cooksD = 0.58;
      if (i === 41) cooksD = 0.35;
      
      points.push({ 
        observation: i + 1, 
        cooksD,
        label: `Obs ${i + 1}`
      });
    }
    return points;
  }, []);

  const threshold = 0.5;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
          <XAxis
            dataKey="observation"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            interval={4}
            label={{ value: "Observation Index", position: "bottom", offset: 0, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            domain={[0, 1]}
            label={{ value: "Cook's Distance", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <ReferenceLine 
            y={threshold} 
            stroke="hsl(var(--tf-alert-red))" 
            strokeDasharray="5 5"
            label={{ value: "Threshold (0.5)", position: "right", fill: "hsl(var(--tf-alert-red))", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--tf-elevated))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toFixed(4), "Cook's D"]}
            labelFormatter={(label) => `Observation ${label}`}
          />
          <Bar dataKey="cooksD" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.cooksD > threshold
                    ? "hsl(var(--tf-alert-red))"
                    : entry.cooksD > 0.25
                    ? "hsl(var(--tf-caution-amber))"
                    : "hsl(var(--tf-transcend-cyan) / 0.6)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

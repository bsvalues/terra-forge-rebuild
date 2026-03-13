import { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip, ZAxis,
} from "recharts";

interface Prediction {
  actual: number;
  predicted: number;
}

interface PredictionScatterProps {
  predictions: Prediction[];
}

export function PredictionScatter({ predictions }: PredictionScatterProps) {
  const data = useMemo(() => predictions.map((p) => ({ x: p.actual, y: p.predicted })), [predictions]);

  const domain = useMemo(() => {
    if (data.length === 0) return [0, 500000] as [number, number];
    const all = data.flatMap((d) => [d.x, d.y]);
    const min = Math.min(...all) * 0.9;
    const max = Math.max(...all) * 1.1;
    return [min, max] as [number, number];
  }, [data]);

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No prediction data</div>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
          <XAxis type="number" dataKey="x" name="Actual" domain={domain} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={{ stroke: "hsl(var(--border))" }} />
          <YAxis type="number" dataKey="y" name="Predicted" domain={domain} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={{ stroke: "hsl(var(--border))" }} />
          <ZAxis range={[20, 20]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "hsl(var(--tf-surface))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} />
          <ReferenceLine segment={[{ x: domain[0], y: domain[0] }, { x: domain[1], y: domain[1] }]} stroke="hsl(var(--border))" strokeDasharray="5 5" />
          <Scatter name="Predictions" data={data} fill="hsl(var(--tf-optimized-green))" fillOpacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[hsl(var(--tf-optimized-green)/0.6)]" />
          <span className="text-xs text-muted-foreground">Predicted vs Actual</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-border" style={{ borderStyle: "dashed" }} />
          <span className="text-xs text-muted-foreground">Perfect Fit</span>
        </div>
      </div>
    </div>
  );
}

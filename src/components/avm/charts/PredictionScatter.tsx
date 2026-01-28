import { useState, useEffect, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  ZAxis,
} from "recharts";

interface DataPoint {
  actual: number;
  predictedRF: number;
  predictedNN: number;
}

export function PredictionScatter() {
  const [data, setData] = useState<DataPoint[]>([]);

  // Generate scatter data
  useEffect(() => {
    const generateData = () => {
      const points: DataPoint[] = [];
      for (let i = 0; i < 100; i++) {
        const actual = 100000 + Math.random() * 400000;
        const noiseRF = (Math.random() - 0.5) * actual * 0.1;
        const noiseNN = (Math.random() - 0.5) * actual * 0.12;
        points.push({
          actual,
          predictedRF: actual + noiseRF,
          predictedNN: actual + noiseNN,
        });
      }
      return points;
    };
    setData(generateData());
  }, []);

  const rfData = useMemo(
    () => data.map((d) => ({ x: d.actual, y: d.predictedRF })),
    [data]
  );

  const nnData = useMemo(
    () => data.map((d) => ({ x: d.actual, y: d.predictedNN })),
    [data]
  );

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
          <XAxis
            type="number"
            dataKey="x"
            name="Actual"
            domain={[100000, 500000]}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Predicted"
            domain={[100000, 500000]}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <ZAxis range={[20, 20]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              backgroundColor: "hsl(var(--tf-surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
          />
          <ReferenceLine
            segment={[
              { x: 100000, y: 100000 },
              { x: 500000, y: 500000 },
            ]}
            stroke="hsl(var(--border))"
            strokeDasharray="5 5"
          />
          <Scatter
            name="Random Forest"
            data={rfData}
            fill="hsl(var(--tf-optimized-green))"
            fillOpacity={0.6}
          />
          <Scatter
            name="Neural Network"
            data={nnData}
            fill="hsl(var(--tf-transcend-cyan))"
            fillOpacity={0.4}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-tf-optimized-green/60" />
          <span className="text-xs text-muted-foreground">RF</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-tf-cyan/40" />
          <span className="text-xs text-muted-foreground">NN</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-border" style={{ borderStyle: "dashed" }} />
          <span className="text-xs text-muted-foreground">Perfect Fit</span>
        </div>
      </div>
    </div>
  );
}

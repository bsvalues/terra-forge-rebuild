import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { ScatterPoint } from "@/hooks/useCalibration";

interface CalibrationScatterPlotProps {
  data: ScatterPoint[];
}

export function CalibrationScatterPlot({ data }: CalibrationScatterPlotProps) {
  const minVal = Math.min(...data.map((d) => Math.min(d.actual, d.predicted)));
  const maxVal = Math.max(...data.map((d) => Math.max(d.actual, d.predicted)));
  const pad = (maxVal - minVal) * 0.05;

  return (
    <div className="material-bento p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">Predicted vs Actual</h3>
        <p className="text-xs text-muted-foreground">Points along the diagonal indicate good fit</p>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 60 }}>
          <XAxis
            type="number"
            dataKey="actual"
            name="Actual Sale Price"
            domain={[minVal - pad, maxVal + pad]}
            tick={{ fontSize: 10, fill: "hsl(210 15% 55%)" }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            label={{ value: "Actual Sale Price", position: "bottom", offset: 20, fontSize: 11, fill: "hsl(210 15% 55%)" }}
          />
          <YAxis
            type="number"
            dataKey="predicted"
            name="Predicted Value"
            domain={[minVal - pad, maxVal + pad]}
            tick={{ fontSize: 10, fill: "hsl(210 15% 55%)" }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            label={{ value: "Predicted", angle: -90, position: "insideLeft", offset: -45, fontSize: 11, fill: "hsl(210 15% 55%)" }}
          />
          <Tooltip
            formatter={(val: number) => `$${val.toLocaleString()}`}
            contentStyle={{
              background: "hsl(222 47% 6%)",
              border: "1px solid hsl(220 25% 15%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <ReferenceLine
            segment={[
              { x: minVal - pad, y: minVal - pad },
              { x: maxVal + pad, y: maxVal + pad },
            ]}
            stroke="hsl(180 100% 45%)"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
          />
          <Scatter
            data={data}
            fill="hsl(180 100% 45%)"
            fillOpacity={0.6}
            r={4}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface RadarDataPoint {
  dimension: string;
  value: number;
  fullMark: number;
}

export function BalanceRadar() {
  const [data, setData] = useState<RadarDataPoint[]>([
    { dimension: "Foundation (3)", value: 87, fullMark: 100 },
    { dimension: "Integrity", value: 92, fullMark: 100 },
    { dimension: "Harmony (6)", value: 72, fullMark: 100 },
    { dimension: "Coherence", value: 78, fullMark: 100 },
    { dimension: "Transcendence (9)", value: 93, fullMark: 100 },
    { dimension: "Excellence", value: 89, fullMark: 100 },
  ]);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) =>
        prev.map((point) => ({
          ...point,
          value: Math.min(100, Math.max(50, point.value + (Math.random() - 0.5) * 4)),
        }))
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            tickCount={5}
          />
          <Radar
            name="Sacred Balance"
            dataKey="value"
            stroke="hsl(var(--tf-transcend-cyan))"
            fill="hsl(var(--tf-transcend-cyan))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

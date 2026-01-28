import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface FlowDataPoint {
  period: string;
  foundation: number;
  harmony: number;
  transcendence: number;
}

export function SacredFlowChart() {
  const [data, setData] = useState<FlowDataPoint[]>([
    { period: "Q1", foundation: 65, harmony: 45, transcendence: 30 },
    { period: "Q2", foundation: 72, harmony: 58, transcendence: 45 },
    { period: "Q3", foundation: 78, harmony: 65, transcendence: 62 },
    { period: "Q4", foundation: 85, harmony: 72, transcendence: 78 },
    { period: "Q5", foundation: 87, harmony: 72, transcendence: 93 },
  ]);

  // Subtle real-time fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) =>
        prev.map((point) => ({
          ...point,
          foundation: Math.min(100, Math.max(60, point.foundation + (Math.random() - 0.5) * 2)),
          harmony: Math.min(100, Math.max(40, point.harmony + (Math.random() - 0.5) * 2)),
          transcendence: Math.min(100, Math.max(30, point.transcendence + (Math.random() - 0.5) * 2)),
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <defs>
            <linearGradient id="gradientFoundation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--tf-transcend-cyan))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--tf-transcend-cyan))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientHarmony" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--tf-optimized-green))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--tf-optimized-green))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientTranscendence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--tf-bright-cyan))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--tf-bright-cyan))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="period"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
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
          <Area
            type="monotone"
            dataKey="foundation"
            stackId="1"
            stroke="hsl(var(--tf-transcend-cyan))"
            fill="url(#gradientFoundation)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="harmony"
            stackId="2"
            stroke="hsl(var(--tf-optimized-green))"
            fill="url(#gradientHarmony)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="transcendence"
            stackId="3"
            stroke="hsl(var(--tf-bright-cyan))"
            fill="url(#gradientTranscendence)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-tf-cyan/50" />
          <span className="text-xs text-muted-foreground">Foundation</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-tf-green/50" />
          <span className="text-xs text-muted-foreground">Harmony</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-tf-bright-cyan/50" />
          <span className="text-xs text-muted-foreground">Transcendence</span>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface OscillatorPoint {
  time: number;
  wave3: number;
  wave6: number;
  wave9: number;
}

export function QuantumOscillator() {
  const [data, setData] = useState<OscillatorPoint[]>([]);

  // Generate initial wave data
  useEffect(() => {
    const generateWaveData = () => {
      const points: OscillatorPoint[] = [];
      for (let i = 0; i < 50; i++) {
        const t = i * 0.2;
        points.push({
          time: i,
          wave3: 50 + 30 * Math.sin(t * 3 + Math.random() * 0.2),
          wave6: 50 + 25 * Math.sin(t * 6 + 2 + Math.random() * 0.2),
          wave9: 50 + 20 * Math.sin(t * 9 + 4 + Math.random() * 0.2),
        });
      }
      return points;
    };

    setData(generateWaveData());

    // Update waves in real-time
    const interval = setInterval(() => {
      setData((prev) => {
        const newPoint: OscillatorPoint = {
          time: prev.length > 0 ? prev[prev.length - 1].time + 1 : 0,
          wave3: 50 + 30 * Math.sin((prev.length * 0.2) * 3 + Math.random() * 0.3),
          wave6: 50 + 25 * Math.sin((prev.length * 0.2) * 6 + 2 + Math.random() * 0.3),
          wave9: 50 + 20 * Math.sin((prev.length * 0.2) * 9 + 4 + Math.random() * 0.3),
        };
        return [...prev.slice(-49), newPoint];
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} hide />
          <ReferenceLine
            y={50}
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="wave3"
            stroke="hsl(var(--tf-transcend-cyan))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="wave6"
            stroke="hsl(var(--tf-optimized-green))"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="wave9"
            stroke="hsl(var(--tf-bright-cyan))"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-tf-cyan" />
          <span className="text-xs text-muted-foreground">Wave 3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-tf-green" />
          <span className="text-xs text-muted-foreground">Wave 6</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-tf-bright-cyan" />
          <span className="text-xs text-muted-foreground">Wave 9</span>
        </div>
      </div>
    </div>
  );
}

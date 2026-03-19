// TerraFusion OS — Phase 101: Assessment Value Sparkline
// Mini area chart showing assessment value trend inline on Summary tab.

import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";

interface AssessmentSparklineProps {
  history: Array<{
    tax_year: number;
    land_value: number;
    improvement_value: number;
    total_value: number | null;
  }>;
}

export function AssessmentSparkline({ history }: AssessmentSparklineProps) {
  if (history.length < 2) return null;

  const data = [...history]
    .sort((a, b) => a.tax_year - b.tax_year)
    .map((h) => ({
      year: h.tax_year,
      value: h.total_value ?? h.land_value + h.improvement_value,
    }));

  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const padding = (max - min) * 0.1 || 1000;

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg px-2 py-1 text-[10px] shadow-md">
                  <span className="text-muted-foreground">{d.year}:</span>{" "}
                  <span className="font-medium text-foreground">
                    ${d.value.toLocaleString()}
                  </span>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--chart-5))"
            strokeWidth={1.5}
            fill="url(#sparkFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

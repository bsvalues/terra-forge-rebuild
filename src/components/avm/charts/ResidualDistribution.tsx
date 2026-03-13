import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";

interface Prediction {
  residual_pct: number;
}

interface ResidualDistributionProps {
  predictions: Prediction[];
}

export function ResidualDistribution({ predictions }: ResidualDistributionProps) {
  const data = useMemo(() => {
    if (predictions.length === 0) return [];
    const bins: Record<string, number> = {
      "-15%": 0, "-10%": 0, "-5%": 0, "0%": 0, "+5%": 0, "+10%": 0, "+15%": 0,
    };
    for (const p of predictions) {
      const r = p.residual_pct;
      if (r < -12.5) bins["-15%"]++;
      else if (r < -7.5) bins["-10%"]++;
      else if (r < -2.5) bins["-5%"]++;
      else if (r < 2.5) bins["0%"]++;
      else if (r < 7.5) bins["+5%"]++;
      else if (r < 12.5) bins["+10%"]++;
      else bins["+15%"]++;
    }
    return Object.entries(bins).map(([bin, count]) => ({ bin, count }));
  }, [predictions]);

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No residual data</div>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <XAxis dataKey="bin" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--tf-surface))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
          <ReferenceLine x="0%" stroke="hsl(var(--tf-transcend-cyan))" strokeDasharray="3 3" />
          <Bar dataKey="count" fill="hsl(var(--tf-optimized-green))" fillOpacity={0.7} radius={[4, 4, 0, 0]} name="Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

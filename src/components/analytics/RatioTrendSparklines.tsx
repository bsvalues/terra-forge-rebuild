// TerraFusion OS — Ratio Trend Sparklines (Phase 25.1)

import { motion } from "framer-motion";
import { format, subMonths } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceNumber } from "@/components/trust";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useRatioTrendSpark } from "@/hooks/useAdvancedAnalytics";

function trendIcon(values: number[], target: number) {
  if (values.length < 2) return { icon: Minus, label: "Stable", color: "text-muted-foreground" };
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const diff = last - prev;
  const improving = Math.abs(last - target) < Math.abs(prev - target);
  if (improving) return { icon: ArrowUpRight, label: "Improving", color: "text-[hsl(var(--tf-optimized-green))]" };
  if (Math.abs(diff) < 0.5) return { icon: Minus, label: "Stable", color: "text-muted-foreground" };
  return { icon: ArrowDownRight, label: "Declining", color: "text-[hsl(var(--tf-warning-red))]" };
}

export function RatioTrendSparklines() {
  const salesStart = format(subMonths(new Date(), 24), "yyyy-MM-dd");
  const salesEnd = format(new Date(), "yyyy-MM-dd");
  const { data, isLoading } = useRatioTrendSpark(salesStart, salesEnd, 6);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="material-bento rounded-2xl p-12 text-center">
        <p className="text-muted-foreground text-sm">No historical ratio data available for trend analysis.</p>
      </div>
    );
  }

  const medianTrend = trendIcon(data.map((d) => d.medianRatio), 1.0);
  const codTrend = trendIcon(data.map((d) => d.cod), 10);
  const prdTrend = trendIcon(data.map((d) => d.prd), 1.0);
  const latest = data[data.length - 1];

  const charts = [
    {
      title: "Median Ratio",
      dataKey: "medianRatio" as const,
      color: "hsl(var(--primary))",
      target: 1.0,
      format: (v: number) => v.toFixed(3),
      current: latest.medianRatio,
      trend: medianTrend,
      targetLabel: "Target 1.00",
      domain: [0.85, 1.15] as [number, number],
    },
    {
      title: "COD",
      dataKey: "cod" as const,
      color: "hsl(145, 80%, 45%)",
      target: 10,
      format: (v: number) => `${v.toFixed(1)}%`,
      current: latest.cod,
      trend: codTrend,
      targetLabel: "Target 10%",
      domain: [0, 25] as [number, number],
    },
    {
      title: "PRD",
      dataKey: "prd" as const,
      color: "hsl(38, 95%, 55%)",
      target: 1.0,
      format: (v: number) => v.toFixed(3),
      current: latest.prd,
      trend: prdTrend,
      targetLabel: "Target 1.00",
      domain: [0.9, 1.15] as [number, number],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {charts.map((chart) => {
        const TrendIcon = chart.trend.icon;
        return (
          <motion.div
            key={chart.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="material-bento rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-foreground">{chart.title}</h3>
              <div className={`flex items-center gap-1 text-[10px] ${chart.trend.color}`}>
                <TrendIcon className="w-3 h-3" />
                {chart.trend.label}
              </div>
            </div>
            <ProvenanceNumber source="ratio-trend" cachePolicy="cached 300s">
              <span className="text-2xl font-light text-foreground">
                {chart.format(chart.current)}
              </span>
            </ProvenanceNumber>
            <div className="h-[180px] mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={chart.domain}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 11,
                    }}
                    formatter={(v: number) => [chart.format(v), chart.title]}
                  />
                  <ReferenceLine
                    y={chart.target}
                    stroke="hsl(var(--tf-optimized-green))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey={chart.dataKey}
                    stroke={chart.color}
                    strokeWidth={2.5}
                    dot={{ fill: chart.color, r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {data.length} years • {latest.sampleSize} sales in latest period
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

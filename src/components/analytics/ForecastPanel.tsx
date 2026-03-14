// TerraFusion OS — Assessment Forecast Panel (Phase 25.2)

import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Line,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceNumber } from "@/components/trust";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { useAssessmentForecast } from "@/hooks/useAdvancedAnalytics";

export function ForecastPanel() {
  const { data, isLoading } = useAssessmentForecast(3);

  if (isLoading) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="material-bento rounded-2xl p-12 text-center">
        <p className="text-muted-foreground text-sm">Insufficient assessment data for forecasting.</p>
      </div>
    );
  }

  const historical = data.filter((d) => !d.isForecast);
  const forecast = data.filter((d) => d.isForecast);
  const latest = historical[historical.length - 1];
  const lastForecast = forecast[forecast.length - 1];

  const growthPct = latest && lastForecast
    ? (((lastForecast.avgValue - latest.avgValue) / latest.avgValue) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Current Avg Value"
          value={`$${(latest?.avgValue ?? 0).toLocaleString()}`}
          sub={`${latest?.year} • ${latest?.count} parcels`}
        />
        <SummaryCard
          label={`${lastForecast?.year} Forecast`}
          value={`$${(lastForecast?.avgValue ?? 0).toLocaleString()}`}
          sub={`±$${((lastForecast?.upper ?? 0) - (lastForecast?.avgValue ?? 0)).toLocaleString()}`}
        />
        <SummaryCard
          label="Projected Growth"
          value={`${growthPct}%`}
          sub={`Over ${forecast.length} years`}
          highlight
        />
        <SummaryCard
          label="Historical Years"
          value={historical.length.toString()}
          sub="Data points for trend"
        />
      </div>

      {/* Forecast chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="material-bento rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Assessment Value Forecast</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">Linear Regression + 95% CI</Badge>
        </div>

        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="historicalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--tf-transcend-cyan))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--tf-transcend-cyan))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [
                  `$${v.toLocaleString()}`,
                  name === "avgValue" ? "Avg Value" : name === "upper" ? "Upper CI" : "Lower CI",
                ]}
              />
              {/* Confidence band */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#forecastBand)"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="transparent"
              />
              {/* Historical area */}
              <Area
                type="monotone"
                dataKey="avgValue"
                stroke="none"
                fill="url(#historicalFill)"
              />
              {/* Main line */}
              <Line
                type="monotone"
                dataKey="avgValue"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={payload.isForecast ? 5 : 4}
                      fill={payload.isForecast ? "hsl(var(--tf-sacred-gold))" : "hsl(var(--primary))"}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }}
              />
              {/* Forecast boundary */}
              {latest && (
                <ReferenceLine
                  x={latest.year}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: "Forecast →",
                    position: "top",
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-primary inline-block rounded" /> Historical
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--tf-sacred-gold))] inline-block" /> Forecast
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-primary/15 inline-block rounded" /> 95% Confidence
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className="material-bento rounded-xl p-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <ProvenanceNumber source="assessment-forecast" cachePolicy="cached 300s">
        <span className={`text-xl font-light ${highlight ? "text-[hsl(var(--tf-optimized-green))]" : "text-foreground"}`}>
          {value}
        </span>
      </ProvenanceNumber>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

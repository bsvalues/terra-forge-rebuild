// TerraFusion OS — Full Value History Timeline
// Renders the unified Ascend (pre-2015, purple) + PACS (2015+, green) value chart
// with a source-bridge dashed line at the 2014/2015 boundary.

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, Database, Loader2, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useFullValueHistory, type ValueHistoryPoint } from "@/hooks/useFullValueHistory";
import { cn } from "@/lib/utils";

interface FullValueHistoryTimelineProps {
  parcelId: string | null;
  className?: string;
}

const fmt = (v: number | null) =>
  v != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumSignificantDigits: 4 }).format(v)
    : "—";

const fmtFull = (v: number | null) =>
  v != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
    : "—";

type LineKey = "total_value" | "land_value" | "impr_value" | "taxable_value";

const LINE_CONFIG: { key: LineKey; label: string; color: string }[] = [
  { key: "total_value",    label: "Total",       color: "#10B981" },
  { key: "land_value",     label: "Land",        color: "#F59E0B" },
  { key: "impr_value",     label: "Improvement", color: "#3B82F6" },
  { key: "taxable_value",  label: "Taxable",     color: "#8B5CF6" },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ValueHistoryPoint;
  return (
    <div className="bg-popover border border-border/50 rounded-lg p-3 shadow-xl text-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-foreground">{label}</span>
        <Badge
          variant="outline"
          className={cn("text-[10px]", point.source_system === "ascend" ? "text-violet-400 border-violet-400/40" : "text-emerald-400 border-emerald-400/40")}
        >
          {point.source_system === "ascend" ? "Ascend" : "PACS"}
        </Badge>
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }} className="capitalize">{p.name}:</span>
          <span className="font-medium text-foreground">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function FullValueHistoryTimeline({ parcelId, className }: FullValueHistoryTimelineProps) {
  const { data = [], isLoading, error } = useFullValueHistory(parcelId);
  const [visibleLines, setVisibleLines] = useState<Set<LineKey>>(new Set(["total_value"]));

  const toggle = (key: LineKey) => {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const stats = useMemo(() => {
    if (!data.length) return null;
    const totals = data.map((d) => d.total_value).filter((v): v is number => v != null);
    return {
      min: Math.min(...totals),
      max: Math.max(...totals),
      latest: data[data.length - 1],
      ascendYears: data.filter((d) => d.source_system === "ascend").length,
      pacsYears: data.filter((d) => d.source_system === "pacs").length,
    };
  }, [data]);

  if (!parcelId) {
    return (
      <div className={cn("bg-card border border-border/50 rounded-xl p-6 text-center", className)}>
        <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Select a parcel to view value history</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("bg-card border border-border/50 rounded-xl p-6 space-y-3", className)}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[180px] w-full rounded-lg" />
      </div>
    );
  }

  if (error || !data.length) {
    return (
      <div className={cn("bg-card border border-border/50 rounded-xl p-6 text-center", className)}>
        <Database className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No value history available for this parcel</p>
        <p className="text-xs text-muted-foreground mt-1">Run the Ascend seeder to load pre-2015 data</p>
      </div>
    );
  }

  const bridgeYear = data.find((d) => d.source_system === "pacs")?.roll_year ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-card border border-border/50 rounded-xl p-5", className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-foreground">Value History</span>
          <span className="text-xs text-muted-foreground">
            {data[0]?.roll_year}–{data[data.length - 1]?.roll_year}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
            <span className="text-muted-foreground">Ascend ({stats?.ascendYears}yr)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="text-muted-foreground">PACS ({stats?.pacsYears}yr)</span>
          </span>
        </div>
      </div>

      {/* Line toggles */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {LINE_CONFIG.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={cn(
              "inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 border transition-opacity",
              visibleLines.has(key) ? "opacity-100" : "opacity-30"
            )}
            style={{ borderColor: color, color }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
          <XAxis
            dataKey="roll_year"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmt(v)}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          {bridgeYear && (
            <ReferenceLine
              x={bridgeYear}
              stroke="hsl(var(--border))"
              strokeDasharray="6 3"
              label={{ value: "Ascend → PACS", position: "top", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            />
          )}
          {LINE_CONFIG.map(({ key, color }) =>
            visibleLines.has(key) ? (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                dot={(props: any) => {
                  const src = props.payload?.source_system;
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx}
                      cy={props.cy}
                      r={3}
                      fill={src === "ascend" ? "#8B5CF6" : color}
                      strokeWidth={0}
                    />
                  );
                }}
                connectNulls
              />
            ) : null
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Mini stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/30">
          <div>
            <div className="text-[10px] text-muted-foreground">Latest Total</div>
            <div className="text-sm font-medium text-foreground">{fmtFull(stats.latest.total_value)}</div>
            <div className="text-[10px] text-muted-foreground">{stats.latest.roll_year}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Range</div>
            <div className="text-sm font-medium text-foreground">{fmt(stats.min)} – {fmt(stats.max)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Years on Record</div>
            <div className="text-sm font-medium text-foreground">{data.length}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

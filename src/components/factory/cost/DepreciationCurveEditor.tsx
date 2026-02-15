import { useCostSchedules, useDepreciationRows } from "@/hooks/useCostSchedule";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";

export function DepreciationCurveEditor() {
  const { data: schedules = [] } = useCostSchedules();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: rows = [] } = useDepreciationRows(selectedId);

  // Build curve data for visualization
  const curveData = rows.length > 0
    ? rows.map((r) => ({
        age: `${r.age_from}–${r.age_to}`,
        midAge: (r.age_from + r.age_to) / 2,
        depreciation: r.depreciation_pct,
        remaining: 100 - r.depreciation_pct,
      }))
    : Array.from({ length: 10 }, (_, i) => ({
        age: `${i * 10}–${(i + 1) * 10}`,
        midAge: i * 10 + 5,
        depreciation: Math.min(i * 8 + 5, 80),
        remaining: Math.max(100 - (i * 8 + 5), 20),
      }));

  return (
    <div className="material-bento p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Depreciation Curves</h3>
          <p className="text-xs text-muted-foreground">Remaining value by effective age</p>
        </div>
        {rows.length === 0 && selectedId && (
          <Badge variant="outline" className="text-xs text-muted-foreground">Using default curve</Badge>
        )}
      </div>

      <Select value={selectedId ?? ""} onValueChange={(v) => setSelectedId(v || null)}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select a cost schedule…" />
        </SelectTrigger>
        <SelectContent>
          {schedules.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.property_class} — {s.quality_grade} (${s.base_cost_per_sqft}/sqft)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={curveData} margin={{ top: 5, right: 10, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 25% 15%)" />
          <XAxis
            dataKey="midAge"
            tick={{ fontSize: 10, fill: "hsl(210 15% 55%)" }}
            label={{ value: "Effective Age (years)", position: "bottom", offset: 15, fontSize: 11, fill: "hsl(210 15% 55%)" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(210 15% 55%)" }}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222 47% 6%)",
              border: "1px solid hsl(220 25% 15%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(val: number, name: string) =>
              name === "remaining" ? [`${val.toFixed(1)}%`, "Remaining Value"] : [`${val.toFixed(1)}%`, "Depreciation"]
            }
          />
          <Area
            type="monotone"
            dataKey="remaining"
            stroke="hsl(180 100% 45%)"
            fill="hsl(180 100% 45%)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="depreciation"
            stroke="hsl(350 80% 55%)"
            fill="hsl(350 80% 55%)"
            fillOpacity={0.08}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

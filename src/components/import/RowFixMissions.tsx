// TerraFusion OS — Row Fix Missions
// Post-mapping column profiling + guided cleanup missions.
// Constitutional: no DB writes; applies transforms to preview only.

import { useMemo, useState } from "react";
import {
  CheckCircle2, AlertTriangle, Sparkles, Scissors, Calendar, Hash, Type, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RowFixMissionsProps {
  rows: Record<string, string | number | null>[];
  mapping: Record<string, string>;
  onTransformsApplied?: (transforms: Record<string, string[]>) => void;
}

interface Mission {
  id: string;
  column: string;
  targetField: string;
  issue: string;
  description: string;
  icon: typeof Scissors;
  transform: string;
  affectedCount: number;
  totalCount: number;
  severity: "warning" | "info";
  sampleBefore: string;
  sampleAfter: string;
}

function profileColumn(
  rows: Record<string, string | number | null>[],
  sourceCol: string,
  targetField: string
): Mission[] {
  const missions: Mission[] = [];
  const values = rows.map((r) => String(r[sourceCol] ?? ""));
  const nonEmpty = values.filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return missions;

  // Whitespace detection
  const withWhitespace = nonEmpty.filter((v) => v !== v.trim());
  if (withWhitespace.length > 0) {
    missions.push({
      id: `trim-${sourceCol}`,
      column: sourceCol,
      targetField,
      issue: "Leading/trailing whitespace",
      description: "Some values have extra spaces that could cause matching issues.",
      icon: Scissors,
      transform: "trim",
      affectedCount: withWhitespace.length,
      totalCount: nonEmpty.length,
      severity: "warning",
      sampleBefore: withWhitespace[0],
      sampleAfter: withWhitespace[0].trim(),
    });
  }

  // Currency symbols in numeric fields
  if (["sale_price", "assessed_value", "land_value", "improvement_value", "estimated_value"].includes(targetField)) {
    const withCurrency = nonEmpty.filter((v) => /[$,]/.test(v));
    if (withCurrency.length > 0) {
      missions.push({
        id: `currency-${sourceCol}`,
        column: sourceCol,
        targetField,
        issue: "Currency symbols in price field",
        description: "Values contain $ or commas that need removal for numeric import.",
        icon: Hash,
        transform: "strip_currency",
        affectedCount: withCurrency.length,
        totalCount: nonEmpty.length,
        severity: "warning",
        sampleBefore: withCurrency[0],
        sampleAfter: withCurrency[0].replace(/[$,]/g, ""),
      });
    }
  }

  // Date format detection
  if (["sale_date", "application_date", "appeal_date", "assessment_date"].includes(targetField)) {
    const mdyPattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;
    const withMDY = nonEmpty.filter((v) => mdyPattern.test(v));
    if (withMDY.length > 0) {
      const sample = withMDY[0];
      const m = sample.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      const after = m ? `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : sample;
      missions.push({
        id: `date-${sourceCol}`,
        column: sourceCol,
        targetField,
        issue: "US date format detected",
        description: "Dates in MM/DD/YYYY format will be converted to ISO (YYYY-MM-DD).",
        icon: Calendar,
        transform: "date_mdy",
        affectedCount: withMDY.length,
        totalCount: nonEmpty.length,
        severity: "info",
        sampleBefore: sample,
        sampleAfter: after,
      });
    }
  }

  // Dashes in parcel/APN fields
  if (["parcel_number", "parcel_id", "instrument_number"].includes(targetField)) {
    const withDashes = nonEmpty.filter((v) => /-/.test(v));
    if (withDashes.length > 0) {
      missions.push({
        id: `dashes-${sourceCol}`,
        column: sourceCol,
        targetField,
        issue: "Inconsistent formatting (dashes)",
        description: "IDs contain dashes that may cause matching issues.",
        icon: Hash,
        transform: "strip_dashes",
        affectedCount: withDashes.length,
        totalCount: nonEmpty.length,
        severity: "info",
        sampleBefore: withDashes[0],
        sampleAfter: withDashes[0].replace(/-/g, ""),
      });
    }
  }

  // Inconsistent casing
  if (["property_class", "neighborhood_code", "deed_type", "sale_type"].includes(targetField)) {
    const hasLower = nonEmpty.some((v) => v !== v.toUpperCase() && /[a-z]/.test(v));
    const hasUpper = nonEmpty.some((v) => /[A-Z]/.test(v));
    if (hasLower && hasUpper) {
      missions.push({
        id: `case-${sourceCol}`,
        column: sourceCol,
        targetField,
        issue: "Mixed case values",
        description: "Standardizing to uppercase for consistency.",
        icon: Type,
        transform: "uppercase",
        affectedCount: nonEmpty.filter((v) => v !== v.toUpperCase()).length,
        totalCount: nonEmpty.length,
        severity: "info",
        sampleBefore: nonEmpty.find((v) => v !== v.toUpperCase()) ?? "",
        sampleAfter: (nonEmpty.find((v) => v !== v.toUpperCase()) ?? "").toUpperCase(),
      });
    }
  }

  return missions;
}

export function RowFixMissions({ rows, mapping, onTransformsApplied }: RowFixMissionsProps) {
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const missions = useMemo(() => {
    const all: Mission[] = [];
    for (const [sourceCol, targetField] of Object.entries(mapping)) {
      if (!targetField || targetField === "__skip__") continue;
      all.push(...profileColumn(rows, sourceCol, targetField));
    }
    return all;
  }, [rows, mapping]);

  if (missions.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-optimized-green)/0.06)] border border-[hsl(var(--tf-optimized-green)/0.2)]">
        <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--tf-optimized-green))]" />
        <p className="text-xs text-foreground/80">
          <span className="font-semibold text-[hsl(var(--tf-optimized-green))]">All clean!</span>
          {" "}No data cleanup issues detected.
        </p>
      </div>
    );
  }

  const handleApply = (mission: Mission) => {
    setApplied((prev) => new Set(prev).add(mission.id));
    // Bubble up transform to parent
    onTransformsApplied?.({ [mission.column]: [mission.transform] });
  };

  const appliedCount = applied.size;
  const totalMissions = missions.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Data Cleanup Missions
          </h4>
          <Badge variant="outline" className="text-[9px]">
            {totalMissions - appliedCount} remaining
          </Badge>
        </div>
        {appliedCount > 0 && (
          <p className="text-[10px] text-[hsl(var(--tf-optimized-green))]">
            ✅ {appliedCount} fix{appliedCount !== 1 ? "es" : ""} applied
          </p>
        )}
      </div>

      {/* Mission cards */}
      <div className="space-y-2">
        {missions.map((mission) => {
          const isApplied = applied.has(mission.id);
          return (
            <div
              key={mission.id}
              className={cn(
                "rounded-lg border px-3 py-2.5 transition-all",
                isApplied
                  ? "border-[hsl(var(--tf-optimized-green)/0.3)] bg-[hsl(var(--tf-optimized-green)/0.04)]"
                  : mission.severity === "warning"
                  ? "border-[hsl(var(--tf-sacred-gold)/0.3)] bg-[hsl(var(--tf-sacred-gold)/0.03)]"
                  : "border-border/50 bg-muted/10"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {isApplied ? (
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--tf-optimized-green))]" />
                  ) : mission.severity === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />
                  ) : (
                    <mission.icon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">{mission.issue}</p>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {mission.affectedCount}/{mission.totalCount} rows
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{mission.description}</p>

                  {/* Preview */}
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-muted-foreground/60 truncate max-w-32">{mission.sampleBefore}</span>
                    <span className="text-muted-foreground/30">→</span>
                    <span className="text-tf-cyan truncate max-w-32">{mission.sampleAfter}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {!isApplied ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => handleApply(mission)}
                    >
                      <Zap className="w-3 h-3" />
                      Fix
                    </Button>
                  ) : (
                    <span className="text-[10px] text-[hsl(var(--tf-optimized-green))] font-medium">Fixed ✓</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

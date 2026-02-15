import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCostSchedules, useDepreciationRows, computeCostApproach } from "@/hooks/useCostSchedule";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";

export function CostApproachCalculator() {
  const { data: schedules = [] } = useCostSchedules();
  const [inputs, setInputs] = useState({
    buildingArea: 1800,
    qualityGrade: "Average",
    propertyClass: "",
    yearBuilt: 2000,
    condition: 1.0,
    landValue: 50000,
  });

  // Find matching schedule for depreciation rows
  const matchedSchedule = schedules.find(
    (s) => s.property_class === inputs.propertyClass && s.quality_grade === inputs.qualityGrade
  );
  const { data: depRows = [] } = useDepreciationRows(matchedSchedule?.id ?? null);

  const result = useMemo(() => {
    if (!inputs.propertyClass) return null;
    return computeCostApproach(inputs, schedules, depRows);
  }, [inputs, schedules, depRows]);

  const uniqueClasses = [...new Set(schedules.map((s) => s.property_class))];
  const uniqueGrades = [...new Set(schedules.map((s) => s.quality_grade))];

  return (
    <div className="material-bento p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-[hsl(var(--tf-transcend-cyan))]" />
        <h3 className="text-sm font-medium text-foreground">Cost Approach Calculator</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Property Class</Label>
          <Select value={inputs.propertyClass} onValueChange={(v) => setInputs((p) => ({ ...p, propertyClass: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {uniqueClasses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Quality Grade</Label>
          <Select value={inputs.qualityGrade} onValueChange={(v) => setInputs((p) => ({ ...p, qualityGrade: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {uniqueGrades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Building Area (sqft)</Label>
          <Input type="number" value={inputs.buildingArea} onChange={(e) => setInputs((p) => ({ ...p, buildingArea: +e.target.value }))} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Year Built</Label>
          <Input type="number" value={inputs.yearBuilt} onChange={(e) => setInputs((p) => ({ ...p, yearBuilt: +e.target.value }))} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Condition (0–1)</Label>
          <Input type="number" step="0.1" min="0" max="1" value={inputs.condition} onChange={(e) => setInputs((p) => ({ ...p, condition: +e.target.value }))} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Land Value ($)</Label>
          <Input type="number" value={inputs.landValue} onChange={(e) => setInputs((p) => ({ ...p, landValue: +e.target.value }))} className="h-8 text-sm" />
        </div>
      </div>

      {/* Result */}
      {result ? (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <ResultCard label="RCN (New)" value={`$${result.rcnew.toLocaleString()}`} />
          <ResultCard label="Depreciation" value={`${result.depreciationPct.toFixed(1)}%`} muted />
          <ResultCard label="Depreciated Improvement" value={`$${result.depreciatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <ResultCard label="Land Value" value={`$${result.landValue.toLocaleString()}`} muted />
          <div className="col-span-2 bg-[hsl(var(--tf-elevated))] rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Indicated Value</p>
            <p className="text-xl font-mono font-medium text-[hsl(var(--tf-transcend-cyan))]">
              ${result.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <Badge variant="outline" className="text-[10px] mt-1">Effective age: {result.effectiveAge} yrs</Badge>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          {!inputs.propertyClass ? "Select a property class to calculate" : "No matching cost schedule found"}
        </p>
      )}
    </div>
  );
}

function ResultCard({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="text-center p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

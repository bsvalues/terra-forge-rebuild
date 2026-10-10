import { useState } from "react";
import { useCostSchedules, useCostScheduleMutations } from "@/hooks/useCostSchedule";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CostScheduleEditor() {
  const { data: schedules = [], isLoading } = useCostSchedules();
  const { upsertSchedule, deleteSchedule } = useCostScheduleMutations();
  const [newRow, setNewRow] = useState({ property_class: "", quality_grade: "Average", base_cost_per_sqft: 0, effective_year: new Date().getFullYear() });

  const handleAdd = () => {
    if (!newRow.property_class || newRow.base_cost_per_sqft <= 0) return;
    upsertSchedule.mutate({
      county_id: "",
      property_class: newRow.property_class,
      quality_grade: newRow.quality_grade,
      base_cost_per_sqft: newRow.base_cost_per_sqft,
      effective_year: newRow.effective_year,
    });
    setNewRow({ property_class: "", quality_grade: "Average", base_cost_per_sqft: 0, effective_year: new Date().getFullYear() });
  };

  return (
    <div className="module-section space-y-4">
      <div className="module-toolbar">
        <div>
          <h3 className="text-sm font-medium text-foreground">Cost Schedules</h3>
          <p className="text-xs text-muted-foreground">Base cost per sqft by property class & quality grade</p>
        </div>
        <Badge variant="outline" className="text-xs">{isLoading ? "Loading…" : `${schedules.length} loaded schedules`}</Badge>
      </div>

      <div className="module-records" role="region" aria-label="Cost schedules" tabIndex={0}>
      <Table className="min-w-[620px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">Property Class</TableHead>
            <TableHead className="text-xs">Quality Grade</TableHead>
            <TableHead className="text-xs text-right">Base $/sqft</TableHead>
            <TableHead className="text-xs text-right">Year</TableHead>
            <TableHead className="text-xs w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
          )}
          {schedules.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-sm">{s.property_class}</TableCell>
              <TableCell className="text-sm">{s.quality_grade}</TableCell>
              <TableCell className="text-right font-mono text-sm">${s.base_cost_per_sqft.toFixed(2)}</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">{s.effective_year}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" aria-label={`Delete ${s.property_class} ${s.quality_grade} schedule`} title="Delete schedule" onClick={() => deleteSchedule.mutate(s.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {/* Add row */}
          <TableRow className="bg-muted/30">
            <TableCell>
              <Input aria-label="Property class"
                placeholder="e.g. Residential"
                value={newRow.property_class}
                onChange={(e) => setNewRow((p) => ({ ...p, property_class: e.target.value }))}
                className="h-7 text-sm"
              />
            </TableCell>
            <TableCell>
              <Input aria-label="Quality grade"
                placeholder="Average"
                value={newRow.quality_grade}
                onChange={(e) => setNewRow((p) => ({ ...p, quality_grade: e.target.value }))}
                className="h-7 text-sm"
              />
            </TableCell>
            <TableCell>
              <Input aria-label="Base cost per square foot"
                type="number"
                step="0.01"
                value={newRow.base_cost_per_sqft || ""}
                onChange={(e) => setNewRow((p) => ({ ...p, base_cost_per_sqft: parseFloat(e.target.value) || 0 }))}
                className="h-7 text-sm text-right"
              />
            </TableCell>
            <TableCell>
              <Input aria-label="Effective year"
                type="number"
                value={newRow.effective_year}
                onChange={(e) => setNewRow((p) => ({ ...p, effective_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                className="h-7 text-sm text-right"
              />
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" aria-label="Add record" title="Add record" onClick={handleAdd} className="text-primary">
                <Plus className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    </div>
  );
}

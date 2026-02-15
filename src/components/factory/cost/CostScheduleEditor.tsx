import { useState } from "react";
import { useCostSchedules, useCostScheduleMutations, type CostSchedule } from "@/hooks/useCostSchedule";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Plus, Trash2, Save } from "lucide-react";
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
    <div className="material-bento overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Cost Schedules</h3>
          <p className="text-xs text-muted-foreground">Base cost per sqft by property class & quality grade</p>
        </div>
        <Badge variant="outline" className="text-xs">{schedules.length} schedules</Badge>
      </div>

      <Table>
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
                <button onClick={() => deleteSchedule.mutate(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </TableCell>
            </TableRow>
          ))}
          {/* Add row */}
          <TableRow className="bg-[hsl(var(--tf-elevated)/0.3)]">
            <TableCell>
              <Input
                placeholder="e.g. Residential"
                value={newRow.property_class}
                onChange={(e) => setNewRow((p) => ({ ...p, property_class: e.target.value }))}
                className="h-7 text-sm"
              />
            </TableCell>
            <TableCell>
              <Input
                placeholder="Average"
                value={newRow.quality_grade}
                onChange={(e) => setNewRow((p) => ({ ...p, quality_grade: e.target.value }))}
                className="h-7 text-sm"
              />
            </TableCell>
            <TableCell>
              <Input
                type="number"
                step="0.01"
                value={newRow.base_cost_per_sqft || ""}
                onChange={(e) => setNewRow((p) => ({ ...p, base_cost_per_sqft: parseFloat(e.target.value) || 0 }))}
                className="h-7 text-sm text-right"
              />
            </TableCell>
            <TableCell>
              <Input
                type="number"
                value={newRow.effective_year}
                onChange={(e) => setNewRow((p) => ({ ...p, effective_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                className="h-7 text-sm text-right"
              />
            </TableCell>
            <TableCell>
              <button onClick={handleAdd} className="text-[hsl(var(--tf-transcend-cyan))] hover:text-foreground transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

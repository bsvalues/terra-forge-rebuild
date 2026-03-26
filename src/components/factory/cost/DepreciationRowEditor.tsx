// TerraFusion OS — Phase 27: Depreciation Row CRUD Editor

import { useState } from "react";
import { useCostSchedules, useDepreciationRows } from "@/hooks/useCostSchedule";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Ruler } from "lucide-react";
import { toast } from "sonner";

export function DepreciationRowEditor() {
  const { data: schedules = [] } = useCostSchedules();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: rows = [], isLoading } = useDepreciationRows(selectedId);
  const qc = useQueryClient();

  const [newRow, setNewRow] = useState({
    age_from: 0,
    age_to: 10,
    depreciation_pct: 5,
    condition_modifier: 1.0,
  });

  const addRow = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const { error } = await supabase.from("cost_depreciation").insert({
        schedule_id: selectedId,
        age_from: newRow.age_from,
        age_to: newRow.age_to,
        depreciation_pct: newRow.depreciation_pct,
        condition_modifier: newRow.condition_modifier,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Depreciation row added");
      qc.invalidateQueries({ queryKey: ["cost-depreciation", selectedId] });
      setNewRow({ age_from: newRow.age_to, age_to: newRow.age_to + 10, depreciation_pct: newRow.depreciation_pct + 8, condition_modifier: 1.0 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_depreciation").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Row deleted");
      qc.invalidateQueries({ queryKey: ["cost-depreciation", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="material-bento overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-[hsl(var(--tf-transcend-cyan))]" />
          <div>
            <h3 className="text-sm font-medium text-foreground">Depreciation Table Editor</h3>
            <p className="text-xs text-muted-foreground">Define age-based depreciation rows per schedule</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{rows.length} rows</Badge>
      </div>

      <div className="p-4">
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
      </div>

      {selectedId && (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Age From</TableHead>
              <TableHead className="text-xs">Age To</TableHead>
              <TableHead className="text-xs text-right">Depr. %</TableHead>
              <TableHead className="text-xs text-right">Condition Mod</TableHead>
              <TableHead className="text-xs w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.age_from}</TableCell>
                <TableCell className="font-mono text-sm">{r.age_to}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.depreciation_pct}%</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">×{r.condition_modifier.toFixed(2)}</TableCell>
                <TableCell>
                  <button onClick={() => deleteRow.mutate(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {/* Add row */}
            <TableRow className="bg-[hsl(var(--tf-elevated)/0.3)]">
              <TableCell>
                <Input type="number" value={newRow.age_from} onChange={(e) => setNewRow((p) => ({ ...p, age_from: +e.target.value }))} className="h-7 text-sm w-16" />
              </TableCell>
              <TableCell>
                <Input type="number" value={newRow.age_to} onChange={(e) => setNewRow((p) => ({ ...p, age_to: +e.target.value }))} className="h-7 text-sm w-16" />
              </TableCell>
              <TableCell>
                <Input type="number" step="0.5" value={newRow.depreciation_pct} onChange={(e) => setNewRow((p) => ({ ...p, depreciation_pct: +e.target.value }))} className="h-7 text-sm w-20 text-right" />
              </TableCell>
              <TableCell>
                <Input type="number" step="0.05" value={newRow.condition_modifier} onChange={(e) => setNewRow((p) => ({ ...p, condition_modifier: +e.target.value }))} className="h-7 text-sm w-20 text-right" />
              </TableCell>
              <TableCell>
                <button onClick={() => addRow.mutate()} className="text-[hsl(var(--tf-transcend-cyan))] hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {!selectedId && (
        <p className="text-xs text-muted-foreground text-center py-8">Select a cost schedule to manage depreciation rows</p>
      )}
    </div>
  );
}

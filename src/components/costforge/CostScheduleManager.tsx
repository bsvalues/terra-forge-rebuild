// TerraFusion OS — Phase 87.1: Cost Schedule Manager
// CRUD for cost schedules (base_cost_per_sqft by property_class × quality_grade)
// with live RCN preview and depreciation table editing.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Trash2, Save, Calculator } from "lucide-react";

const PROPERTY_CLASSES = ["R1", "R2", "R3", "C1", "C2", "I1", "AG"] as const;
const QUALITY_GRADES = ["A", "B", "C", "D", "E"] as const;

interface CostSchedule {
  id: string;
  county_id: string;
  property_class: string;
  quality_grade: string;
  base_cost_per_sqft: number;
  effective_year: number;
  notes: string | null;
  created_at: string;
}

interface CostDepreciation {
  id: string;
  county_id: string;
  age_from: number;
  age_to: number;
  depreciation_pct: number;
  condition_modifier: number;
  condition_code: string | null;
  created_at: string;
}

// ── RCN Preview Calculator ────────────────────────────────────────────────────
function RCNPreview() {
  const [sqft, setSqft] = useState(1500);
  const [propClass, setPropClass] = useState<string>("R1");
  const [quality, setQuality] = useState<string>("C");
  const [age, setAge] = useState(20);

  const { data: schedules } = useQuery({
    queryKey: ["cost-schedules"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("cost_schedules").select("*");
      return (data ?? []) as CostSchedule[];
    },
  });

  const { data: depreciation } = useQuery({
    queryKey: ["cost-depreciation"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("cost_depreciation").select("*").order("age_from");
      return (data ?? []) as CostDepreciation[];
    },
  });

  const schedule = schedules?.find(
    (s) => s.property_class === propClass && s.quality_grade === quality
  );

  const deprRow = depreciation?.find(
    (d) => age >= d.age_from && age <= d.age_to
  ) ?? null;

  const baseCost = schedule ? schedule.base_cost_per_sqft * sqft : null;
  const deprPct = deprRow ? deprRow.depreciation_pct + (deprRow.condition_modifier ?? 0) : 0;
  const rcn = baseCost !== null ? baseCost * (1 - deprPct / 100) : null;

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          Live RCN Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Sq Ft</Label>
            <Input
              type="number"
              value={sqft}
              onChange={(e) => setSqft(Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Age (years)</Label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Class</Label>
            <Select value={propClass} onValueChange={setPropClass}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quality</Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md bg-muted/40 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base cost/sqft</span>
            <span>{schedule ? `$${schedule.base_cost_per_sqft.toFixed(2)}` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">RCN (no depreciation)</span>
            <span>{baseCost !== null ? `$${baseCost.toLocaleString()}` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Depreciation ({deprPct.toFixed(1)}%)</span>
            <span>{baseCost !== null ? `-$${((baseCost * deprPct) / 100).toLocaleString()}` : "—"}</span>
          </div>
          <div className="flex justify-between border-t border-border/40 pt-1.5 font-medium">
            <span>Net RCN</span>
            <span className="text-emerald-400">
              {rcn !== null ? `$${Math.round(rcn).toLocaleString()}` : "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Cost Schedules Table ──────────────────────────────────────────────────────
function CostSchedulesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isAnalyst } = useUserRole();
  const canEdit = isAdmin || isAnalyst;

  const [newRow, setNewRow] = useState({
    property_class: "R1",
    quality_grade: "C",
    base_cost_per_sqft: "",
    effective_year: new Date().getFullYear().toString(),
    notes: "",
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["cost-schedules"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cost_schedules")
        .select("*")
        .order("property_class")
        .order("quality_grade");
      return (data ?? []) as CostSchedule[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (row: typeof newRow) => {
      const { error } = await (supabase as any).from("cost_schedules").insert({
        property_class: row.property_class,
        quality_grade: row.quality_grade,
        base_cost_per_sqft: parseFloat(row.base_cost_per_sqft),
        effective_year: parseInt(row.effective_year),
        notes: row.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-schedules"] });
      setNewRow({ property_class: "R1", quality_grade: "C", base_cost_per_sqft: "", effective_year: new Date().getFullYear().toString(), notes: "" });
      toast({ title: "Schedule added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("cost_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-schedules"] });
      toast({ title: "Schedule removed" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Class</TableHead>
              <TableHead className="text-xs">Quality</TableHead>
              <TableHead className="text-xs">$/sqft</TableHead>
              <TableHead className="text-xs">Year</TableHead>
              <TableHead className="text-xs">Notes</TableHead>
              {canEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                  Loading...
                </TableCell>
              </TableRow>
            ) : schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                  No cost schedules defined yet.
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><Badge variant="outline" className="text-xs">{s.property_class}</Badge></TableCell>
                  <TableCell className="text-sm">{s.quality_grade}</TableCell>
                  <TableCell className="text-sm tabular-nums">${s.base_cost_per_sqft.toFixed(2)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{s.effective_year}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.notes ?? "—"}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(s.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
            {canEdit && (
              <TableRow className="bg-muted/20">
                <TableCell>
                  <Select value={newRow.property_class} onValueChange={(v) => setNewRow((r) => ({ ...r, property_class: v }))}>
                    <SelectTrigger className="h-7 text-xs w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_CLASSES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={newRow.quality_grade} onValueChange={(v) => setNewRow((r) => ({ ...r, quality_grade: v }))}>
                    <SelectTrigger className="h-7 text-xs w-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_GRADES.map((g) => <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newRow.base_cost_per_sqft}
                    onChange={(e) => setNewRow((r) => ({ ...r, base_cost_per_sqft: e.target.value }))}
                    className="h-7 text-xs w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newRow.effective_year}
                    onChange={(e) => setNewRow((r) => ({ ...r, effective_year: e.target.value }))}
                    className="h-7 text-xs w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Optional note"
                    value={newRow.notes}
                    onChange={(e) => setNewRow((r) => ({ ...r, notes: e.target.value }))}
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!newRow.base_cost_per_sqft || addMutation.isPending}
                    onClick={() => addMutation.mutate(newRow)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Depreciation Table ────────────────────────────────────────────────────────
function DepreciationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isAnalyst } = useUserRole();
  const canEdit = isAdmin || isAnalyst;

  const [newRow, setNewRow] = useState({
    age_from: "",
    age_to: "",
    depreciation_pct: "",
    condition_modifier: "0",
    condition_code: "",
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cost-depreciation"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cost_depreciation")
        .select("*")
        .order("age_from");
      return (data ?? []) as CostDepreciation[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (row: typeof newRow) => {
      const { error } = await (supabase as any).from("cost_depreciation").insert({
        age_from: parseInt(row.age_from),
        age_to: parseInt(row.age_to),
        depreciation_pct: parseFloat(row.depreciation_pct),
        condition_modifier: parseFloat(row.condition_modifier),
        condition_code: row.condition_code || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-depreciation"] });
      setNewRow({ age_from: "", age_to: "", depreciation_pct: "", condition_modifier: "0", condition_code: "" });
      toast({ title: "Depreciation row added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("cost_depreciation").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-depreciation"] });
      toast({ title: "Row removed" });
    },
  });

  return (
    <div className="rounded-md border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Age From</TableHead>
            <TableHead className="text-xs">Age To</TableHead>
            <TableHead className="text-xs">Depreciation%</TableHead>
            <TableHead className="text-xs">Condition Modifier%</TableHead>
            <TableHead className="text-xs">Condition Code</TableHead>
            {canEdit && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">Loading...</TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                No depreciation table defined yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm tabular-nums">{r.age_from}</TableCell>
                <TableCell className="text-sm tabular-nums">{r.age_to}</TableCell>
                <TableCell className="text-sm tabular-nums">{r.depreciation_pct.toFixed(1)}%</TableCell>
                <TableCell className="text-sm tabular-nums">{r.condition_modifier.toFixed(1)}%</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.condition_code ?? "—"}</TableCell>
                {canEdit && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(r.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
          {canEdit && (
            <TableRow className="bg-muted/20">
              {(["age_from", "age_to", "depreciation_pct", "condition_modifier", "condition_code"] as const).map((field) => (
                <TableCell key={field}>
                  <Input
                    type={field === "condition_code" ? "text" : "number"}
                    placeholder={field === "condition_code" ? "AVG" : "0"}
                    value={newRow[field]}
                    onChange={(e) => setNewRow((r) => ({ ...r, [field]: e.target.value }))}
                    className="h-7 text-xs w-20"
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!newRow.age_from || !newRow.age_to || !newRow.depreciation_pct || addMutation.isPending}
                  onClick={() => addMutation.mutate(newRow)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function CostScheduleManager() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cost Approach Schedules</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage base cost tables and depreciation schedules for RCN calculations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Tabs defaultValue="schedules">
            <TabsList className="mb-4">
              <TabsTrigger value="schedules" className="text-xs">Cost Schedules</TabsTrigger>
              <TabsTrigger value="depreciation" className="text-xs">Depreciation Table</TabsTrigger>
            </TabsList>
            <TabsContent value="schedules">
              <CostSchedulesTab />
            </TabsContent>
            <TabsContent value="depreciation">
              <DepreciationTab />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <RCNPreview />
        </div>
      </div>
    </div>
  );
}

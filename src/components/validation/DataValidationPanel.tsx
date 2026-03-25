// TerraFusion OS — Phase 51: Data Validation Rules Panel

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  BarChart3,
  Target,
} from "lucide-react";
import {
  useValidationRules,
  useCreateValidationRule,
  useToggleValidationRule,
  useDeleteValidationRule,
  useRunValidation,
  OPERATOR_META,
  SEVERITY_META,
  VALIDATABLE_FIELDS,
  type RuleOperator,
  type RuleSeverity,
  type ValidationResult,
} from "@/hooks/useValidationRules";
import { cn } from "@/lib/utils";

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "critical": return <XCircle className="w-4 h-4 text-red-500" />;
    case "error": return <AlertTriangle className="w-4 h-4 text-destructive" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    default: return <Info className="w-4 h-4 text-primary" />;
  }
}

export function DataValidationPanel() {
  const { data: rules = [], isLoading } = useValidationRules();
  const createRule = useCreateValidationRule();
  const toggleRule = useToggleValidationRule();
  const deleteRule = useDeleteValidationRule();
  const runValidation = useRunValidation();

  const [createOpen, setCreateOpen] = useState(false);
  const [results, setResults] = useState<ValidationResult[] | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetField, setTargetField] = useState("");
  const [operator, setOperator] = useState<RuleOperator>("not_null");
  const [thresholdValue, setThresholdValue] = useState("");
  const [severity, setSeverity] = useState<RuleSeverity>("warning");

  const activeRules = rules.filter((r) => r.is_active);
  const totalPass = results?.reduce((s, r) => s + r.passed, 0) ?? 0;
  const totalFail = results?.reduce((s, r) => s + r.failed, 0) ?? 0;

  const handleCreate = async () => {
    if (!name.trim() || !targetField) return;
    await createRule.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      target_field: targetField,
      operator,
      threshold_value: OPERATOR_META[operator].needsValue ? thresholdValue : undefined,
      severity,
    });
    setName("");
    setDescription("");
    setTargetField("");
    setOperator("not_null");
    setThresholdValue("");
    setSeverity("warning");
    setCreateOpen(false);
  };

  const handleRunAll = async () => {
    const res = await runValidation.mutateAsync(rules);
    setResults(res);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-[hsl(var(--tf-transcend-cyan))] tracking-tight">
          Data Validation Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define rules, validate parcels, and track data quality compliance
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Rules", value: rules.length, icon: ShieldCheck, color: "text-primary" },
          { label: "Active", value: activeRules.length, icon: Target, color: "text-tf-green" },
          { label: "Last Run Pass", value: results ? totalPass : "—", icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Last Run Fail", value: results ? totalFail : "—", icon: XCircle, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="bg-[hsl(var(--tf-elevated)/0.5)] border-border/30">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={cn("w-5 h-5", s.color)} />
              <div>
                <div className="text-xl font-semibold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Validation Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Rule Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Assessed value must be positive" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description (optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why this rule matters" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Field</Label>
                  <Select value={targetField} onValueChange={setTargetField}>
                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>
                      {VALIDATABLE_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Operator</Label>
                  <Select value={operator} onValueChange={(v) => setOperator(v as RuleOperator)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPERATOR_META).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {OPERATOR_META[operator].needsValue && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Threshold Value</Label>
                  <Input value={thresholdValue} onChange={(e) => setThresholdValue(e.target.value)} placeholder={operator === "between" ? "min,max" : "value"} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Severity</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as RuleSeverity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!name.trim() || !targetField || createRule.isPending} className="w-full">
                {createRule.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={handleRunAll}
          disabled={activeRules.length === 0 || runValidation.isPending}
        >
          {runValidation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run All ({activeRules.length})
        </Button>
      </div>

      {/* Main content */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="bg-[hsl(var(--tf-elevated)/0.5)]">
          <TabsTrigger value="rules" className="text-xs gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Results
            {results && (
              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">{results.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Rules Tab ────────────────────────────────────────── */}
        <TabsContent value="rules">
          <Card className="bg-[hsl(var(--tf-elevated)/0.3)] border-border/30">
            <CardContent className="p-0">
              <ScrollArea className="h-[55vh]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">No validation rules defined</p>
                    <p className="text-xs mt-1 opacity-60">Create your first rule to start validating parcel data</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {rules.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                        <SeverityIcon severity={rule.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{rule.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              {VALIDATABLE_FIELDS.find(f => f.value === rule.target_field)?.label ?? rule.target_field}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              {OPERATOR_META[rule.operator as RuleOperator]?.label ?? rule.operator}
                              {rule.threshold_value ? ` ${rule.threshold_value}` : ""}
                            </Badge>
                          </div>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{rule.description}</p>
                          )}
                          {rule.last_run_at && (
                            <span className="text-[10px] text-muted-foreground/60">
                              Last run: {new Date(rule.last_run_at).toLocaleDateString()} — {rule.last_run_pass_count} pass, {rule.last_run_fail_count} fail
                            </span>
                          )}
                        </div>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
                          onClick={() => deleteRule.mutate(rule.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Results Tab ──────────────────────────────────────── */}
        <TabsContent value="results">
          <Card className="bg-[hsl(var(--tf-elevated)/0.3)] border-border/30">
            <CardContent className="p-0">
              <ScrollArea className="h-[55vh]">
                {!results ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">No validation results yet</p>
                    <p className="text-xs mt-1 opacity-60">Run validation to see results</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
                    <p className="text-sm">No active rules to evaluate</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {results.map((r) => (
                      <div key={r.ruleId} className="px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <SeverityIcon severity={r.severity} />
                          <span className="text-sm font-medium text-foreground">{r.ruleName}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4",
                              r.passRate >= 95 ? "border-emerald-500/40 text-emerald-400" :
                              r.passRate >= 80 ? "border-amber-500/40 text-amber-400" :
                              "border-destructive/40 text-destructive"
                            )}
                          >
                            {r.passRate}% pass
                          </Badge>
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                r.passRate >= 95 ? "bg-emerald-500" :
                                r.passRate >= 80 ? "bg-amber-500" :
                                "bg-destructive"
                              )}
                              style={{ width: `${r.passRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-24 text-right">
                            {r.passed}/{r.totalChecked} pass
                          </span>
                        </div>
                        {/* Failed parcels preview */}
                        {r.failedParcels.length > 0 && (
                          <div className="mt-1 pl-6">
                            <p className="text-[10px] text-muted-foreground/60 mb-1">
                              Failed parcels (showing {r.failedParcels.length} of {r.failed}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {r.failedParcels.slice(0, 10).map((fp) => (
                                <Badge key={fp.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  {fp.parcel_number}: {String(fp.value ?? "null")}
                                </Badge>
                              ))}
                              {r.failedParcels.length > 10 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                                  +{r.failedParcels.length - 10} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// TerraFusion OS — Phase 82.3: Workflow Template CRUD
// Template browser/creator: view built-in templates, create custom ones, launch instances.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  useWorkflowTemplates,
  useCreateWorkflowTemplate,
  type WorkflowTemplate,
  type WorkflowStep,
} from "@/hooks/useWorkflowTemplates";
import { BUILT_IN_TEMPLATES } from "@/services/workflowEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Layers, Play, ChevronRight, CheckCircle2,
  Shield, User, Eye, Trash2, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  revaluation:     { label: "Revaluation", color: "text-blue-400" },
  appeal_defense:  { label: "Appeal Defense", color: "text-amber-400" },
  exemption_review:{ label: "Exemption Review", color: "text-purple-400" },
  custom:          { label: "Custom", color: "text-muted-foreground" },
};

const ROLE_ICON: Record<string, typeof Shield> = {
  admin: Shield,
  analyst: User,
  viewer: Eye,
};

// ─── Step card ────────────────────────────────────────────────────────────────

function StepChain({ steps }: { steps: Array<{ step_id?: string; name?: string; required_role?: string; title?: string; description?: string }> }) {
  return (
    <div className="space-y-1.5 mt-3">
      {steps.map((step, i) => {
        const stepId = step.step_id ?? step.name ?? `step-${i}`;
        const title = step.title ?? step.name ?? stepId;
        const role = step.required_role ?? "analyst";
        const RoleIcon = ROLE_ICON[role] ?? User;
        return (
          <div key={stepId} className="flex items-start gap-2">
            <div className="flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center text-[9px] text-muted-foreground font-mono shrink-0">
                {i + 1}
              </div>
              {i < steps.length - 1 && <div className="w-px flex-1 bg-border/30 mt-0.5 h-3" />}
            </div>
            <div className="flex-1 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-foreground">{title}</span>
                <RoleIcon className={cn("w-3 h-3", ROLE_ICON[role] ? "text-muted-foreground" : "text-muted-foreground")} />
              </div>
              {step.description && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Built-in template card ─────────────────────────────────────────────────────

function BuiltInTemplateCard({
  template,
  onLaunch,
}: {
  template: typeof BUILT_IN_TEMPLATES[number];
  onLaunch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CATEGORY_CONFIG[template.workflow_type] ?? CATEGORY_CONFIG.custom;

  return (
    <Card className="border-border/40 bg-card/60">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Layers className={cn("w-4 h-4 shrink-0", cfg.color)} />
              <span className="text-sm font-medium text-foreground">{template.name}</span>
              <Badge variant="outline" className={cn("text-[9px] border-0 bg-transparent", cfg.color)}>
                {cfg.label}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {template.steps.length} steps
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Hide" : "Preview"}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={onLaunch}
            >
              <Play className="w-3 h-3" />
              Launch
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <StepChain steps={template.steps} />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ── DB template card ──────────────────────────────────────────────────────────

function DBTemplateCard({
  template,
  canEdit,
  onLaunch,
  onDelete,
}: {
  template: WorkflowTemplate;
  canEdit: boolean;
  onLaunch: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CATEGORY_CONFIG[template.category] ?? CATEGORY_CONFIG.custom;
  const steps = template.steps as unknown as Array<{ name?: string; step_id?: string; description?: string; required_role?: string }>;

  return (
    <Card className="border-border/40 bg-card/60">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Layers className={cn("w-4 h-4 shrink-0", cfg.color)} />
              <span className="text-sm font-medium text-foreground">{template.name}</span>
              <Badge variant="outline" className={cn("text-[9px] border-0 bg-transparent", cfg.color)}>
                {cfg.label}
              </Badge>
              {!template.is_active && (
                <Badge variant="outline" className="text-[9px] text-muted-foreground">inactive</Badge>
              )}
            </div>
            {template.description && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{template.description}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">{steps.length} steps</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Hide" : "Preview"}
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={onLaunch}>
              <Play className="w-3 h-3" />
              Launch
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <StepChain steps={steps} />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ── Create Template Dialog ────────────────────────────────────────────────────

const EMPTY_STEP = (): WorkflowStep => ({
  id: crypto.randomUUID(),
  name: "",
  type: "action",
  assignee_role: "analyst",
  config: {},
});

function CreateTemplateDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createTemplate = useCreateWorkflowTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [steps, setSteps] = useState<WorkflowStep[]>([EMPTY_STEP()]);

  function addStep() {
    setSteps((s) => [...s, EMPTY_STEP()]);
  }

  function updateStep(id: string, field: keyof WorkflowStep, value: string) {
    setSteps((s) => s.map((step) => step.id === id ? { ...step, [field]: value } : step));
  }

  function removeStep(id: string) {
    setSteps((s) => s.filter((step) => step.id !== id));
  }

  async function handleSubmit() {
    if (!name.trim() || steps.some((s) => !s.name.trim())) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("county_id")
      .eq("user_id", user.id)
      .single();

    createTemplate.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        trigger_type: "manual",
        steps,
        county_id: profile?.county_id ?? "",
      },
      {
        onSuccess: () => {
          toast({ title: "Template created" });
          setOpen(false);
          setName(""); setDescription(""); setCategory("custom"); setSteps([EMPTY_STEP()]);
          onSuccess();
        },
        onError: (err: Error) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 h-8">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Workflow Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Residential Review" className="h-8" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revaluation">Revaluation</SelectItem>
                  <SelectItem value="appeal_defense">Appeal Defense</SelectItem>
                  <SelectItem value="exemption_review">Exemption Review</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Steps ({steps.length})</Label>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addStep}>
                <Plus className="w-3 h-3" /> Add Step
              </Button>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-2 pr-2">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground font-mono w-4 text-right">{i + 1}</span>
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(step.id, "name", e.target.value)}
                      placeholder="Step name *"
                      className="h-7 text-xs flex-1"
                    />
                    <Select
                      value={step.assignee_role ?? "analyst"}
                      onValueChange={(v) => updateStep(step.id, "assignee_role", v)}
                    >
                      <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin" className="text-xs">admin</SelectItem>
                        <SelectItem value="analyst" className="text-xs">analyst</SelectItem>
                        <SelectItem value="viewer" className="text-xs">viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    {steps.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={createTemplate.isPending}>
              {createTemplate.isPending ? "Creating…" : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Launch Instance Dialog ─────────────────────────────────────────────────────

function LaunchInstanceDialog({
  templateName,
  onConfirm,
}: {
  templateName: string;
  onConfirm: (assignedTo: string, notes: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  async function handleLaunch() {
    const { data: { user } } = await supabase.auth.getUser();
    onConfirm(user?.id ?? "", notes);
    setOpen(false);
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span className="sr-only" />
      </DialogTrigger>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function WorkflowTemplateCRUD() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isAnalyst } = useUserRole();
  const canEdit = isAdmin || isAnalyst;

  const { data: dbTemplates = [], isLoading } = useWorkflowTemplates();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("workflow_templates")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({ title: "Template deactivated" });
    },
  });

  const launchMutation = useMutation({
    mutationFn: async ({
      templateId,
      templateName,
    }: {
      templateId: string;
      templateName: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("county_id")
        .eq("user_id", user!.id)
        .single();

      const { error } = await (supabase as any)
        .from("workflow_instances")
        .insert({
          template_id: templateId,
          county_id: profile?.county_id ?? "",
          status: "active",
          current_step: 0,
          context: { name: templateName },
          started_by: user!.id,
          assigned_to: user!.id,
          step_results: [],
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      toast({ title: `Launched: ${vars.templateName}` });
    },
    onError: (err: Error) => {
      toast({ title: "Launch failed", description: err.message, variant: "destructive" });
    },
  });

  // Built-in templates (pseudo-ID based on workflow_type)
  function launchBuiltIn(name: string, workflowType: string) {
    launchMutation.mutate({ templateId: `builtin:${workflowType}`, templateName: name });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Workflow Templates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {BUILT_IN_TEMPLATES.length} built-in · {dbTemplates.length} custom
          </p>
        </div>
        {canEdit && (
          <CreateTemplateDialog onSuccess={() => {}} />
        )}
      </div>

      <Tabs defaultValue="builtin">
        <TabsList className="h-8">
          <TabsTrigger value="builtin" className="text-xs h-7">Built-in ({BUILT_IN_TEMPLATES.length})</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs h-7">
            Custom ({dbTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builtin" className="mt-3">
          <div className="space-y-3">
            {BUILT_IN_TEMPLATES.map((t) => (
              <BuiltInTemplateCard
                key={t.workflow_type}
                template={t}
                onLaunch={() => launchBuiltIn(t.name, t.workflow_type)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-3">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">Loading…</div>
          ) : dbTemplates.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No custom templates yet.</p>
              {canEdit && (
                <p className="text-xs text-muted-foreground mt-1">
                  Create one using the "New Template" button above.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dbTemplates.map((t) => (
                <DBTemplateCard
                  key={t.id}
                  template={t}
                  canEdit={canEdit}
                  onLaunch={() => launchMutation.mutate({ templateId: t.id, templateName: t.name })}
                  onDelete={() => deleteMutation.mutate(t.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// TerraFusion OS — Phase 91: Workflow Template CRUD Panel
// Admin interface for creating, editing, and managing workflow templates.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Loader2, XCircle,
  Save, ChevronDown, ChevronUp, Zap, Users, Bell, GitBranch,
  Settings2, Workflow,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  useWorkflowTemplates,
  useCreateWorkflowTemplate,
  type WorkflowStep,
  type WorkflowTemplate,
} from "@/hooks/useWorkflowTemplates";
import { useAuthContext } from "@/contexts/AuthContext";
import { showChangeReceipt } from "@/lib/changeReceipt";

const STEP_TYPES: { value: WorkflowStep["type"]; label: string; icon: typeof Zap }[] = [
  { value: "action", label: "Action", icon: Zap },
  { value: "approval", label: "Approval", icon: Users },
  { value: "notification", label: "Notification", icon: Bell },
  { value: "condition", label: "Condition", icon: GitBranch },
];

const CATEGORIES = [
  "revaluation", "appeal", "exemption", "permit",
  "certification", "notice", "review", "custom",
];

const TRIGGER_TYPES = [
  "manual", "on_parcel_update", "on_value_change", "on_appeal_filed",
  "on_certification", "scheduled", "on_import",
];

function emptyStep(): WorkflowStep {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "action",
    config: {},
    assignee_role: undefined,
  };
}

interface StepEditorProps {
  step: WorkflowStep;
  index: number;
  onChange: (updated: WorkflowStep) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function StepEditor({ step, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: StepEditorProps) {
  const typeConfig = STEP_TYPES.find(t => t.value === step.type) ?? STEP_TYPES[0];
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border border-border/40 rounded-lg p-3 bg-muted/10"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 rounded hover:bg-muted/50 disabled:opacity-20"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 rounded hover:bg-muted/50 disabled:opacity-20"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
          Step {index + 1}
        </Badge>

        <TypeIcon className="w-3.5 h-3.5 text-primary shrink-0" />

        <Input
          value={step.name}
          onChange={(e) => onChange({ ...step, name: e.target.value })}
          placeholder="Step name…"
          className="h-7 text-xs flex-1"
        />

        <Select
          value={step.type}
          onValueChange={(v) => onChange({ ...step, type: v as WorkflowStep["type"] })}
        >
          <SelectTrigger className="h-7 w-28 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STEP_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={step.assignee_role ?? ""}
          onChange={(e) => onChange({ ...step, assignee_role: e.target.value || undefined })}
          placeholder="Role…"
          className="h-7 text-xs w-24"
        />

        <button onClick={onRemove} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function TemplateForm({ onSaved }: { onSaved: () => void }) {
  const { profile } = useAuthContext();
  const createMutation = useCreateWorkflowTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [triggerType, setTriggerType] = useState("manual");
  const [steps, setSteps] = useState<WorkflowStep[]>([emptyStep()]);

  const canSave = name.trim().length > 0 && steps.every(s => s.name.trim().length > 0);

  const handleSave = async () => {
    if (!profile?.county_id || !canSave) return;
    await createMutation.mutateAsync({
      name,
      description: description || undefined,
      category,
      trigger_type: triggerType,
      steps,
      county_id: profile.county_id,
    });
    showChangeReceipt({
      action: "Workflow Template Created",
      entity: name,
      reason: `${steps.length}-step ${category} workflow`,
    });
    setName("");
    setDescription("");
    setSteps([emptyStep()]);
    onSaved();
  };

  const updateStep = (index: number, updated: WorkflowStep) => {
    setSteps(prev => prev.map((s, i) => i === index ? updated : s));
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const moveStep = (from: number, to: number) => {
    setSteps(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          New Workflow Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Revaluation Pipeline" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the workflow…"
            className="text-sm min-h-[60px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Trigger</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIGGER_TYPES.map(t => (
                <SelectItem key={t} value={t} className="text-xs">{t.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Steps ({steps.length})</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSteps(prev => [...prev, emptyStep()])}
              className="h-6 text-[11px] gap-1"
            >
              <Plus className="w-3 h-3" /> Add Step
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            {steps.map((step, i) => (
              <StepEditor
                key={step.id}
                step={step}
                index={i}
                onChange={updated => updateStep(i, updated)}
                onRemove={() => removeStep(i)}
                onMoveUp={() => i > 0 && moveStep(i, i - 1)}
                onMoveDown={() => i < steps.length - 1 && moveStep(i, i + 1)}
                isFirst={i === 0}
                isLast={i === steps.length - 1}
              />
            ))}
          </AnimatePresence>
        </div>

        <Button
          onClick={handleSave}
          disabled={!canSave || createMutation.isPending}
          className="w-full gap-2"
          size="sm"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Create Template
        </Button>
      </CardContent>
    </Card>
  );
}

function TemplateCard({ template }: { template: WorkflowTemplate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border/30 rounded-lg p-3 bg-card/60 hover:bg-card/80 transition-colors"
    >
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="p-1.5 rounded-md bg-primary/10">
          <Workflow className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{template.name}</span>
            <Badge variant="outline" className="text-[9px] px-1.5 capitalize">{template.category}</Badge>
            {template.is_active && (
              <Badge className="text-[9px] px-1.5 bg-chart-5/20 text-chart-5 border-chart-5/30">Active</Badge>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
            <span>{template.steps?.length ?? 0} steps</span>
            <span>•</span>
            <span className="capitalize">{template.trigger_type?.replace(/_/g, " ")}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2"
          >
            {template.description && (
              <p className="text-xs text-muted-foreground">{template.description}</p>
            )}
            <div className="space-y-1">
              {(template.steps || []).map((step, i) => {
                const StepIcon = STEP_TYPES.find(t => t.value === step.type)?.icon ?? Zap;
                return (
                  <div key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground pl-2 border-l-2 border-border/30">
                    <span className="text-[10px] font-mono text-muted-foreground/60">{i + 1}.</span>
                    <StepIcon className="w-3 h-3 text-primary/60" />
                    <span>{step.name || "Unnamed step"}</span>
                    {step.assignee_role && (
                      <Badge variant="outline" className="text-[9px] px-1">{step.assignee_role}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function WorkflowTemplateCRUD() {
  const [showForm, setShowForm] = useState(false);
  const { data: templates = [], isLoading } = useWorkflowTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Workflow Templates</h3>
            <p className="text-xs text-muted-foreground">{templates.length} templates configured</p>
          </div>
        </div>
        <Button
          variant={showForm ? "secondary" : "default"}
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1.5"
        >
          {showForm ? <XCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Cancel" : "New Template"}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TemplateForm onSaved={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Workflow className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No workflow templates yet</p>
          <p className="text-xs mt-1">Create one to automate county operations</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2 pr-2">
            {templates.map(t => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

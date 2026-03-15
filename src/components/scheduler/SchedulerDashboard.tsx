// TerraFusion OS — Scheduler Dashboard
// Manage recurring automated tasks: reports, quality scans, exports

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock, Play, Pause, Trash2, Plus, Loader2, CheckCircle2,
  XCircle, Clock, Timer, BarChart3, ShieldCheck, Download, RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useScheduledTasks,
  useCreateScheduledTask,
  useToggleScheduledTask,
  useDeleteScheduledTask,
  useExecuteScheduledTask,
  TASK_TYPE_META,
  FREQUENCY_META,
  type TaskType,
  type TaskFrequency,
  type ScheduledTask,
} from "@/hooks/useScheduledTasks";
import { formatDistanceToNow } from "date-fns";

const TASK_ICONS: Record<string, typeof BarChart3> = {
  report: BarChart3,
  quality_scan: ShieldCheck,
  export: Download,
  sync_check: RefreshCw,
};

export function SchedulerDashboard() {
  const { data: tasks = [], isLoading } = useScheduledTasks();
  const createTask = useCreateScheduledTask();
  const toggleTask = useToggleScheduledTask();
  const deleteTask = useDeleteScheduledTask();
  const executeTask = useExecuteScheduledTask();

  const [showCreate, setShowCreate] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<TaskType>("report");
  const [formFrequency, setFormFrequency] = useState<TaskFrequency>("weekly");

  const activeTasks = tasks.filter((t) => t.is_active);
  const pausedTasks = tasks.filter((t) => !t.is_active);
  const totalRuns = tasks.reduce((acc, t) => acc + (t.run_count ?? 0), 0);

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Task name is required");
      return;
    }
    try {
      await createTask.mutateAsync({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        task_type: formType,
        task_config: { taskType: formType },
        frequency: formFrequency,
      });
      toast.success("Scheduled task created");
      setShowCreate(false);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to create task", { description: err.message });
    }
  };

  const handleExecute = async (task: ScheduledTask) => {
    setExecutingId(task.id);
    try {
      await executeTask.mutateAsync(task);
      toast.success(`"${task.name}" executed successfully`);
    } catch (err: any) {
      toast.error("Execution failed", { description: err.message });
    } finally {
      setExecutingId(null);
    }
  };

  const handleToggle = async (task: ScheduledTask) => {
    try {
      await toggleTask.mutateAsync({ id: task.id, is_active: !task.is_active });
      toast.success(task.is_active ? "Task paused" : "Task activated");
    } catch (err: any) {
      toast.error("Failed to toggle task", { description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      toast.success("Task deleted");
    } catch (err: any) {
      toast.error("Failed to delete", { description: err.message });
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormType("report");
    setFormFrequency("weekly");
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-primary" />
            Task Scheduler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automate recurring reports, quality scans, and exports
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{activeTasks.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{pausedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Paused</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalRuns}</p>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {tasks.filter((t) => t.last_run_status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground">Succeeded</p>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <CalendarClock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No scheduled tasks yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create one to automate recurring operations</p>
            <Button variant="outline" className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Create First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {tasks.map((task) => {
              const Icon = TASK_ICONS[task.task_type] ?? BarChart3;
              const freqMeta = FREQUENCY_META[task.frequency as TaskFrequency];
              const isExecuting = executingId === task.id;
              const isOverdue = task.is_active && task.next_run_at && new Date(task.next_run_at) < new Date();

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className={`border-border/50 transition-colors ${
                    !task.is_active ? "opacity-60" : isOverdue ? "border-chart-4/40" : "hover:border-primary/30"
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          task.is_active ? "bg-primary/10" : "bg-muted/50"
                        }`}>
                          <Icon className={`w-5 h-5 ${task.is_active ? "text-primary" : "text-muted-foreground"}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground truncate">{task.name}</p>
                            {isOverdue && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-chart-4/10 text-chart-4 border-chart-4/30">
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Overdue
                              </Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {freqMeta?.label ?? task.frequency}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {TASK_TYPE_META[task.task_type as TaskType]?.label ?? task.task_type}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.run_count} runs
                            </span>
                            {task.last_run_at && (
                              <span>
                                Last: {formatDistanceToNow(new Date(task.last_run_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>

                          {task.next_run_at && task.is_active && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Next run: {new Date(task.next_run_at).toLocaleDateString()} at{" "}
                              {new Date(task.next_run_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}

                          {task.last_run_status && (
                            <div className="flex items-center gap-1 mt-1">
                              {task.last_run_status === "completed" ? (
                                <CheckCircle2 className="w-3 h-3 text-primary" />
                              ) : (
                                <XCircle className="w-3 h-3 text-destructive" />
                              )}
                              <span className="text-[10px] text-muted-foreground capitalize">{task.last_run_status}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExecute(task)}
                            disabled={isExecuting}
                            className="gap-1 h-8"
                          >
                            {isExecuting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            Run
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggle(task)}
                            className="h-8 w-8"
                          >
                            {task.is_active ? (
                              <Pause className="w-3.5 h-3.5 text-chart-4" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-primary" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(task.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              Create Scheduled Task
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Task Name</Label>
              <Input
                placeholder="e.g. Weekly Roll Summary"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                placeholder="What does this task do?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Task Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as TaskType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPE_META).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select value={formFrequency} onValueChange={(v) => setFormFrequency(v as TaskFrequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCY_META).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {TASK_TYPE_META[formType]?.description}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createTask.isPending} className="gap-1.5">
              {createTask.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

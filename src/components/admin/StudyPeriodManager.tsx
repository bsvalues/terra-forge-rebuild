import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Calendar,
  Plus,
  Edit3,
  Trash2,
  Play,
  MoreVertical,
  CheckCircle,
  Archive,
  FileEdit,
  Target,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStudyPeriods, type StudyPeriod } from "@/hooks/useVEIData";
import {
  useCreateStudyPeriod,
  useUpdateStudyPeriod,
  useDeleteStudyPeriod,
  useActivateStudyPeriod,
  type StudyPeriodInput,
} from "@/hooks/useStudyPeriodMutations";
import { StudyPeriodForm, type StudyPeriodFormValues } from "./StudyPeriodForm";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  draft: { icon: FileEdit, color: "text-muted-foreground", bg: "bg-muted/50" },
  active: { icon: Play, color: "text-vei-good", bg: "bg-vei-good/10" },
  completed: { icon: CheckCircle, color: "text-tf-cyan", bg: "bg-tf-cyan/10" },
  archived: { icon: Archive, color: "text-muted-foreground", bg: "bg-muted/30" },
};

export function StudyPeriodManager() {
  const { data: studyPeriods, isLoading } = useStudyPeriods();
  const createMutation = useCreateStudyPeriod();
  const updateMutation = useUpdateStudyPeriod();
  const deleteMutation = useDeleteStudyPeriod();
  const activateMutation = useActivateStudyPeriod();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<StudyPeriod | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<StudyPeriod | null>(null);

  const handleCreate = () => {
    setEditingPeriod(null);
    setFormOpen(true);
  };

  const handleEdit = (period: StudyPeriod) => {
    setEditingPeriod(period);
    setFormOpen(true);
  };

  const handleFormSubmit = (values: StudyPeriodFormValues) => {
    // Cast to StudyPeriodInput since zod schema ensures all fields are present
    const input: StudyPeriodInput = {
      name: values.name,
      description: values.description,
      start_date: values.start_date,
      end_date: values.end_date,
      status: values.status,
      target_cod: values.target_cod,
      target_prd_low: values.target_prd_low,
      target_prd_high: values.target_prd_high,
    };

    if (editingPeriod) {
      updateMutation.mutate(
        { id: editingPeriod.id, ...input },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createMutation.mutate(input, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleDelete = (period: StudyPeriod) => {
    setPeriodToDelete(period);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (periodToDelete) {
      deleteMutation.mutate(periodToDelete.id, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setPeriodToDelete(null);
        },
      });
    }
  };

  const handleActivate = (period: StudyPeriod) => {
    activateMutation.mutate(period.id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[hsl(var(--tf-transcend-cyan))]">Study Period Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure and manage ratio study periods with custom IAAO targets
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Study Period
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        {["draft", "active", "completed", "archived"].map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const count = studyPeriods?.filter((p) => p.status === status).length || 0;

          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("material-bento p-4 rounded-lg", config.bg)}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", config.bg)}>
                  <Icon className={cn("w-5 h-5", config.color)} />
                </div>
                <div>
                  <p className="text-2xl font-light text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{status}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Study Periods List */}
      <div className="material-bento rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-tf-elevated/30">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-tf-cyan" />
            All Study Periods
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-tf-cyan border-t-transparent rounded-full mx-auto"
            />
            <p className="text-sm text-muted-foreground mt-4">Loading study periods...</p>
          </div>
        ) : studyPeriods?.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Study Periods</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first study period to begin ratio analysis
            </p>
            <Button onClick={handleCreate} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Study Period
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {studyPeriods?.map((period, index) => {
              const config = statusConfig[period.status] || statusConfig.draft;
              const StatusIcon = config.icon;

              return (
                <motion.div
                  key={period.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-tf-elevated/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", config.bg)}>
                        <StatusIcon className={cn("w-5 h-5", config.color)} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{period.name}</h3>
                          <Badge variant="outline" className={cn("text-xs", config.color)}>
                            {period.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(period.start_date), "MMM d, yyyy")} —{" "}
                          {format(new Date(period.end_date), "MMM d, yyyy")}
                        </p>
                        {period.description && (
                          <p className="text-xs text-muted-foreground/70 mt-1 max-w-md truncate">
                            {period.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Targets Display */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">COD:</span>
                          <span className="font-mono text-tf-cyan">{period.target_cod}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">PRD:</span>
                          <span className="font-mono text-vei-good">{period.target_prd_low}</span>
                          <span className="text-muted-foreground">–</span>
                          <span className="font-mono text-vei-caution">{period.target_prd_high}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(period)}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {period.status !== "active" && (
                            <DropdownMenuItem onClick={() => handleActivate(period)}>
                              <Play className="w-4 h-4 mr-2" />
                              Set as Active
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(period)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <StudyPeriodForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingPeriod}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Study Period
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{periodToDelete?.name}</strong>? This action
              cannot be undone. All associated metrics and analysis data may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

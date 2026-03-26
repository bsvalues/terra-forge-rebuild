// TerraFusion OS — Neighborhood Review Orchestrator (Phase 76)
// God-tier workflow: state machine + timeline + AI copilot + multi-user coordination
// "I drew a timeline once. It went sideways. Like a sidewalk." — Ralph Wiggum

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CommitmentButton } from "@/components/ui/commitment-button";
import {
  Target, Search, MapPin, BarChart3, Scale, CheckCircle, ChevronRight,
  Loader2, Brain, AlertTriangle, Clock, Users, Plus, ArrowRight,
  Sparkles, Shield, TrendingUp, CircleDot
} from "lucide-react";
import {
  useNeighborhoodReviews, useNeighborhoodReviewDetail, useReviewTasks,
  useReviewContext, useCreateReview, useAdvanceStage, useCompleteReview,
  useUpdateTaskStatus, useReviewAdvisor,
  REVIEW_STAGES, type ReviewStage, type ReviewTask, type AIRecommendation,
} from "@/hooks/useNeighborhoodReview";
import { useDiscoverNeighborhoods } from "@/hooks/useNeighborhoods";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

// ── Stage icon mapping ───────────────────────────────────────────────
const STAGE_ICONS: Record<ReviewStage, React.ElementType> = {
  scoping: Target,
  data_audit: Search,
  spatial_analysis: MapPin,
  calibration: BarChart3,
  equity_review: Scale,
  sign_off: CheckCircle,
};

// ── Main Orchestrator ────────────────────────────────────────────────
export function NeighborhoodReviewOrchestrator() {
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: reviews = [], isLoading } = useNeighborhoodReviews();

  if (selectedReviewId) {
    return (
      <ReviewWorkspace
        reviewId={selectedReviewId}
        onBack={() => setSelectedReviewId(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/15 border border-primary/20">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Neighborhood Review Orchestrator</h1>
            <p className="text-sm text-muted-foreground">
              6-stage workflow with AI copilot, task coordination, and stage gates
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Review
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <CreateReviewForm onClose={() => setShowCreate(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active reviews */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Reviews</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a neighborhood review to orchestrate a focused spatial analysis and equity review workflow.
            </p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create First Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => {
            const stageIdx = REVIEW_STAGES.findIndex((s) => s.id === r.current_stage);
            const progress = Math.round(((stageIdx + (r.status === "completed" ? 1 : 0)) / REVIEW_STAGES.length) * 100);
            const StageIcon = STAGE_ICONS[r.current_stage];
            const daysLeft = r.target_deadline ? differenceInDays(new Date(r.target_deadline), new Date()) : null;

            return (
              <motion.div key={r.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Card
                  className="border-border/50 bg-card/80 hover:bg-card cursor-pointer transition-all hover:border-primary/30"
                  onClick={() => setSelectedReviewId(r.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <StageIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{r.review_name}</h3>
                          <p className="text-[10px] text-muted-foreground font-mono">{r.neighborhood_code}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          r.status === "completed" ? "border-emerald-500/30 text-emerald-400" :
                          r.status === "paused" ? "border-amber-500/30 text-amber-400" :
                          "border-primary/30 text-primary"
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </div>

                    {/* Stage progress mini-timeline */}
                    <div className="flex items-center gap-1 mb-3">
                      {REVIEW_STAGES.map((stage, i) => {
                        const isComplete = i < stageIdx || r.status === "completed";
                        const isCurrent = i === stageIdx && r.status !== "completed";
                        return (
                          <div key={stage.id} className="flex-1 flex items-center gap-1">
                            <div
                              className={`h-2 flex-1 rounded-full transition-colors ${
                                isComplete ? "bg-emerald-500" : isCurrent ? "bg-primary" : "bg-muted/30"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Stage {stageIdx + 1}/6: {REVIEW_STAGES[stageIdx]?.label}</span>
                      <div className="flex items-center gap-2">
                        {daysLeft !== null && (
                          <span className={`flex items-center gap-1 ${daysLeft < 0 ? "text-destructive" : daysLeft < 3 ? "text-amber-400" : ""}`}>
                            <Clock className="h-3 w-3" />
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                          </span>
                        )}
                        <span>{progress}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Create Review Form ───────────────────────────────────────────────
function CreateReviewForm({ onClose }: { onClose: () => void }) {
  const [hoodCode, setHoodCode] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [deadline, setDeadline] = useState("");
  const { data: discovered = [] } = useDiscoverNeighborhoods();
  const createMut = useCreateReview();

  const handleSubmit = async () => {
    if (!hoodCode || !reviewName) {
      toast.error("Please fill in neighborhood code and review name");
      return;
    }
    await createMut.mutateAsync({
      neighborhood_code: hoodCode,
      review_name: reviewName,
      target_deadline: deadline || undefined,
    });
    onClose();
  };

  return (
    <Card className="border-primary/30 bg-card/90">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Launch New Neighborhood Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Neighborhood Code</label>
            <Select value={hoodCode} onValueChange={(v) => { setHoodCode(v); if (!reviewName) setReviewName(`Review: ${v}`); }}>
              <SelectTrigger><SelectValue placeholder="Select neighborhood…" /></SelectTrigger>
              <SelectContent>
                {discovered.map((d) => (
                  <SelectItem key={d.hood_cd} value={d.hood_cd}>
                    {d.hood_cd} ({d.parcel_count} parcels)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Review Name</label>
            <Input value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="e.g., Q1 2026 Equity Review" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Deadline</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <CommitmentButton onClick={handleSubmit} disabled={createMut.isPending} className="gap-2">
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Launch Review (15 tasks)
          </CommitmentButton>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Review Workspace (selected review) ───────────────────────────────
function ReviewWorkspace({ reviewId, onBack }: { reviewId: string; onBack: () => void }) {
  const { data: review } = useNeighborhoodReviewDetail(reviewId);
  const { data: tasks = [] } = useReviewTasks(reviewId);
  const { data: context } = useReviewContext(reviewId);
  const advanceMut = useAdvanceStage();
  const completeMut = useCompleteReview();
  const advisor = useReviewAdvisor();
  const updateTask = useUpdateTaskStatus();

  if (!review) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentStageIdx = REVIEW_STAGES.findIndex((s) => s.id === review.current_stage);
  const isFinalStage = review.current_stage === "sign_off";
  const stageTasks = tasks.filter((t) => t.stage === review.current_stage);
  const stageTasksDone = stageTasks.filter((t) => t.status === "completed").length;
  const stageBlocked = stageTasks.some((t) => t.status === "blocked");
  const canAdvance = stageTasksDone === stageTasks.length && stageTasks.length > 0 && !stageBlocked;

  const handleAdvance = () => {
    if (isFinalStage) {
      completeMut.mutate(reviewId);
    } else {
      advanceMut.mutate({ reviewId, currentStage: review.current_stage });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{review.review_name}</h2>
            <Badge variant="outline" className="text-[10px] font-mono">{review.neighborhood_code}</Badge>
            <Badge variant="outline" className={`text-[9px] ${review.status === "completed" ? "border-emerald-500/30 text-emerald-400" : "border-primary/30 text-primary"}`}>
              {review.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Started {format(new Date(review.started_at), "MMM d, yyyy")}
            {review.target_deadline && ` · Deadline: ${format(new Date(review.target_deadline), "MMM d, yyyy")}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => advisor.mutate(reviewId)} disabled={advisor.isPending} className="gap-2">
          {advisor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          AI Advisor
        </Button>
      </div>

      {/* ── Gantt-Style Timeline ─────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Review Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-stretch gap-1">
            {REVIEW_STAGES.map((stage, i) => {
              const isComplete = i < currentStageIdx || review.status === "completed";
              const isCurrent = i === currentStageIdx && review.status !== "completed";
              const Icon = STAGE_ICONS[stage.id];
              const completedAt = review[`${stage.id}_completed_at` as keyof typeof review] as string | null;

              return (
                <div key={stage.id} className="flex-1 min-w-0">
                  <motion.div
                    className={`p-3 rounded-lg border text-center transition-all ${
                      isComplete ? "bg-emerald-500/10 border-emerald-500/30" :
                      isCurrent ? "bg-primary/10 border-primary/40 shadow-sm shadow-primary/10" :
                      "bg-muted/5 border-border/20"
                    }`}
                    animate={isCurrent ? { borderColor: ["hsl(var(--primary) / 0.4)", "hsl(var(--primary) / 0.7)", "hsl(var(--primary) / 0.4)"] } : {}}
                    transition={isCurrent ? { duration: 2, repeat: Infinity } : {}}
                  >
                    <Icon className={`h-4 w-4 mx-auto mb-1 ${
                      isComplete ? "text-emerald-400" : isCurrent ? "text-primary" : "text-muted-foreground/40"
                    }`} />
                    <div className={`text-[9px] font-semibold truncate ${
                      isComplete ? "text-emerald-400" : isCurrent ? "text-primary" : "text-muted-foreground/50"
                    }`}>
                      {stage.label}
                    </div>
                    {completedAt && (
                      <div className="text-[8px] text-muted-foreground mt-0.5">
                        {format(new Date(completedAt), "M/d")}
                      </div>
                    )}
                    {isCurrent && (
                      <div className="text-[8px] text-primary mt-0.5 font-medium">ACTIVE</div>
                    )}
                  </motion.div>
                  {i < REVIEW_STAGES.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ChevronRight className={`h-3 w-3 ${isComplete ? "text-emerald-400" : "text-muted-foreground/20"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Content: Tasks + AI Advisor ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task list (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Current Stage Header */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => { const Icon = STAGE_ICONS[review.current_stage]; return <Icon className="h-5 w-5 text-primary" />; })()}
                  <div>
                    <h3 className="text-sm font-semibold">
                      Stage {currentStageIdx + 1}: {REVIEW_STAGES[currentStageIdx]?.label}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">{REVIEW_STAGES[currentStageIdx]?.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-mono">{stageTasksDone}/{stageTasks.length}</div>
                    <div className="text-[9px] text-muted-foreground">tasks done</div>
                  </div>
                  {review.status !== "completed" && (
                    <CommitmentButton
                      onClick={handleAdvance}
                      disabled={!canAdvance || advanceMut.isPending || completeMut.isPending}
                      className="gap-2 text-xs h-8 px-3"
                    >
                      {advanceMut.isPending || completeMut.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5" />
                      )}
                      {isFinalStage ? "Complete Review" : "Advance Stage"}
                    </CommitmentButton>
                  )}
                </div>
              </div>
              {!canAdvance && stageTasks.length > 0 && review.status !== "completed" && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  {stageBlocked ? "Blocked tasks must be resolved before advancing" : `Complete all ${stageTasks.length} tasks to unlock the gate`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks grouped by stage */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {REVIEW_STAGES.map((stage, stageI) => {
                const sTasks = tasks.filter((t) => t.stage === stage.id);
                if (sTasks.length === 0) return null;
                const isCurrentStage = stage.id === review.current_stage;
                const isPastStage = stageI < currentStageIdx;

                return (
                  <div key={stage.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <CircleDot className={`h-3 w-3 ${isPastStage ? "text-emerald-400" : isCurrentStage ? "text-primary" : "text-muted-foreground/30"}`} />
                      <span className={`text-xs font-semibold ${isPastStage ? "text-emerald-400" : isCurrentStage ? "text-primary" : "text-muted-foreground/50"}`}>
                        {stage.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {sTasks.filter(t => t.status === "completed").length}/{sTasks.length}
                      </span>
                    </div>
                    <div className="space-y-1.5 ml-5">
                      {sTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          reviewId={reviewId}
                          isActive={isCurrentStage}
                          onToggle={(newStatus) => updateTask.mutate({ taskId: task.id, status: newStatus, reviewId })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* AI Advisor Sidebar */}
        <div className="space-y-4">
          {/* Parcel Stats */}
          {context?.parcel_stats && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Neighborhood Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {[
                  { label: "Total Parcels", value: context.parcel_stats.total.toLocaleString() },
                  { label: "Coordinates", value: `${context.parcel_stats.coord_pct}%` },
                  { label: "Building Data", value: `${context.parcel_stats.building_pct}%` },
                  { label: "Median Value", value: context.parcel_stats.median_value ? `$${Math.round(context.parcel_stats.median_value).toLocaleString()}` : "—" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-mono font-medium">{s.value}</span>
                  </div>
                ))}
                {context.calibration && (
                  <>
                    <Separator className="opacity-30" />
                    <div className="text-[10px] text-muted-foreground">Latest Calibration</div>
                    {[
                      { label: "R²", value: context.calibration.r_squared?.toFixed(3) || "—" },
                      { label: "RMSE", value: context.calibration.rmse ? `$${Math.round(context.calibration.rmse).toLocaleString()}` : "—" },
                      { label: "Sample", value: context.calibration.sample_size?.toString() || "—" },
                    ].map((s) => (
                      <div key={s.label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-mono font-medium">{s.value}</span>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Recommendations */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-primary" />
                AI Advisor
                {advisor.data?.stage_readiness && (
                  <Badge variant="outline" className={`text-[8px] ml-auto ${
                    advisor.data.stage_readiness === "ready_to_advance" ? "border-emerald-500/30 text-emerald-400" :
                    advisor.data.stage_readiness === "blocked" ? "border-destructive/30 text-destructive" :
                    "border-amber-500/30 text-amber-400"
                  }`}>
                    {advisor.data.stage_readiness.replace(/_/g, " ")}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {advisor.isPending ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing neighborhood data…
                </div>
              ) : advisor.data?.recommendations ? (
                <ScrollArea className="h-[320px]">
                  {advisor.data.summary && (
                    <p className="text-[10px] text-muted-foreground mb-3 italic">{advisor.data.summary}</p>
                  )}
                  <div className="space-y-2">
                    {advisor.data.recommendations.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} />
                    ))}
                  </div>
                </ScrollArea>
              ) : review.ai_recommendations && review.ai_recommendations.length > 0 ? (
                <ScrollArea className="h-[320px]">
                  <div className="space-y-2">
                    {review.ai_recommendations.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-6">
                  <Brain className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">
                    Click "AI Advisor" to get stage-specific recommendations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Task Row ─────────────────────────────────────────────────────────
function TaskRow({
  task,
  _reviewId,
  isActive,
  onToggle,
}: {
  task: ReviewTask;
  reviewId: string;
  isActive: boolean;
  onToggle: (status: string) => void;
}) {
  const priorityColors: Record<string, string> = {
    critical: "border-destructive/30 text-destructive",
    high: "border-amber-500/30 text-amber-400",
    medium: "border-primary/20 text-primary",
    low: "border-border text-muted-foreground",
  };

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
      task.status === "completed" ? "bg-emerald-500/5 border-emerald-500/10" :
      task.status === "blocked" ? "bg-destructive/5 border-destructive/10" :
      isActive ? "bg-card border-border/50 hover:border-primary/30" :
      "bg-muted/5 border-border/10"
    }`}>
      <button
        onClick={() => onToggle(task.status === "completed" ? "pending" : "completed")}
        disabled={!isActive}
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.status === "completed" ? "bg-emerald-500 border-emerald-500" :
          isActive ? "border-muted-foreground/30 hover:border-primary" :
          "border-muted-foreground/10"
        }`}
      >
        {task.status === "completed" && <CheckCircle className="h-3 w-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </span>
        {task.assigned_to && (
          <span className="text-[9px] text-muted-foreground ml-2 flex-shrink-0">
            <Users className="h-2.5 w-2.5 inline mr-0.5" />{task.assigned_to}
          </span>
        )}
      </div>
      <Badge variant="outline" className={`text-[8px] ${priorityColors[task.priority] || ""}`}>
        {task.priority}
      </Badge>
      {task.status === "blocked" && (
        <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
      )}
    </div>
  );
}

// ── Recommendation Card ──────────────────────────────────────────────
function RecommendationCard({ rec }: { rec: AIRecommendation }) {
  const catIcons: Record<string, React.ElementType> = {
    quality: Shield,
    risk: AlertTriangle,
    action: ArrowRight,
    gate: CheckCircle,
  };
  const catColors: Record<string, string> = {
    quality: "text-primary",
    risk: "text-amber-400",
    action: "text-emerald-400",
    gate: "text-blue-400",
  };
  const Icon = catIcons[rec.category] || Shield;

  return (
    <div className="p-2.5 rounded-lg bg-muted/10 border border-border/20">
      <div className="flex items-start gap-2">
        <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${catColors[rec.category] || "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] leading-relaxed">{rec.recommendation}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[7px]">{rec.priority}</Badge>
            <Badge variant="outline" className="text-[7px]">{rec.category}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

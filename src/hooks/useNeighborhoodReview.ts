// TerraFusion OS — Neighborhood Review Orchestrator Hooks (Phase 76)
// State machine, task management, and AI advisor integration.
// "I orchestrated a neighborhood once. It was mostly driveways." — Ralph Wiggum

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEventAsync } from "@/services/terraTrace";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────
export type ReviewStage =
  | "scoping"
  | "data_audit"
  | "spatial_analysis"
  | "calibration"
  | "equity_review"
  | "sign_off";

export const REVIEW_STAGES: { id: ReviewStage; label: string; icon: string; desc: string }[] = [
  { id: "scoping", label: "Scoping", icon: "🎯", desc: "Define review scope, select parcels, set timeline" },
  { id: "data_audit", label: "Data Audit", icon: "🔍", desc: "Validate coverage, run DQ checks, identify gaps" },
  { id: "spatial_analysis", label: "Spatial Analysis", icon: "🗺️", desc: "Run spatial joins, verify boundaries, comp grids" },
  { id: "calibration", label: "Calibration", icon: "📐", desc: "Run regression models, review diagnostics" },
  { id: "equity_review", label: "Equity Review", icon: "⚖️", desc: "Check ratio studies, outliers, fairness metrics" },
  { id: "sign_off", label: "Sign-off", icon: "✅", desc: "Final review, approval, and certification" },
];

export interface NeighborhoodReview {
  id: string;
  county_id: string;
  neighborhood_code: string;
  review_name: string;
  current_stage: ReviewStage;
  status: string;
  started_at: string;
  target_deadline: string | null;
  completed_at: string | null;
  created_by: string;
  scoping_completed_at: string | null;
  data_audit_completed_at: string | null;
  spatial_analysis_completed_at: string | null;
  calibration_completed_at: string | null;
  equity_review_completed_at: string | null;
  sign_off_completed_at: string | null;
  stage_gate_results: Record<string, unknown>;
  ai_recommendations: AIRecommendation[];
  metrics_snapshot: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewTask {
  id: string;
  review_id: string;
  stage: ReviewStage;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  result_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AIRecommendation {
  recommendation: string;
  priority: "high" | "medium" | "low";
  category: "quality" | "risk" | "action" | "gate";
}

export interface ReviewContext {
  review: NeighborhoodReview;
  parcel_stats: {
    total: number;
    with_coords: number;
    with_building: number;
    coord_pct: number;
    building_pct: number;
    median_value: number | null;
  };
  calibration: {
    id: string;
    r_squared: number;
    rmse: number;
    sample_size: number;
    status: string;
    created_at: string;
  } | null;
  task_summary: Record<string, { total: number; done: number; blocked: number }>;
}

// ── Query Keys ───────────────────────────────────────────────────────
const REVIEWS_KEY = ["neighborhood-reviews"];
const reviewKey = (id: string) => ["neighborhood-review", id];
const tasksKey = (id: string) => ["neighborhood-review-tasks", id];
const contextKey = (id: string) => ["neighborhood-review-context", id];

// ── Read Hooks ───────────────────────────────────────────────────────

/** Fetch all active reviews */
export function useNeighborhoodReviews() {
  return useQuery({
    queryKey: REVIEWS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neighborhood_reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as NeighborhoodReview[];
    },
    staleTime: 30_000,
  });
}

/** Fetch a single review */
export function useNeighborhoodReviewDetail(reviewId: string | undefined) {
  return useQuery({
    queryKey: reviewKey(reviewId || ""),
    queryFn: async () => {
      if (!reviewId) return null;
      const { data, error } = await supabase
        .from("neighborhood_reviews")
        .select("*")
        .eq("id", reviewId)
        .single();
      if (error) throw error;
      return data as unknown as NeighborhoodReview;
    },
    enabled: !!reviewId,
    staleTime: 15_000,
  });
}

/** Fetch tasks for a review */
export function useReviewTasks(reviewId: string | undefined) {
  return useQuery({
    queryKey: tasksKey(reviewId || ""),
    queryFn: async () => {
      if (!reviewId) return [];
      const { data, error } = await supabase
        .from("neighborhood_review_tasks")
        .select("*")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ReviewTask[];
    },
    enabled: !!reviewId,
    staleTime: 15_000,
  });
}

/** Fetch review context via RPC */
export function useReviewContext(reviewId: string | undefined) {
  return useQuery({
    queryKey: contextKey(reviewId || ""),
    queryFn: async () => {
      if (!reviewId) return null;
      const { data, error } = await (supabase.rpc as Function)("get_neighborhood_review_context", {
      });
      if (error) throw error;
      return data as unknown as ReviewContext;
    },
    enabled: !!reviewId,
    staleTime: 30_000,
  });
}

// ── Write Hooks ──────────────────────────────────────────────────────

/** Create a new neighborhood review */
export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      neighborhood_code: string;
      review_name: string;
      target_deadline?: string;
    }) => {
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      const { data, error } = await supabase
        .from("neighborhood_reviews")
        .insert([{
          county_id: profile?.county_id ?? "",
          neighborhood_code: input.neighborhood_code,
          review_name: input.review_name,
          target_deadline: input.target_deadline || null,
        }])
        .select()
        .single();
      if (error) throw error;

      // Seed default tasks for each stage
      const defaultTasks: Array<{ stage: "scoping" | "data_audit" | "spatial_analysis" | "calibration" | "equity_review" | "sign_off"; title: string; priority: string }> = [
        { stage: "scoping", title: "Define review scope and parcel subset", priority: "high" },
        { stage: "scoping", title: "Set timeline and assign reviewers", priority: "medium" },
        { stage: "data_audit", title: "Run data quality scan", priority: "high" },
        { stage: "data_audit", title: "Verify coordinate coverage", priority: "high" },
        { stage: "data_audit", title: "Check building characteristics completeness", priority: "medium" },
        { stage: "spatial_analysis", title: "Run spatial join for neighborhood boundaries", priority: "high" },
        { stage: "spatial_analysis", title: "Generate comparable sales grid", priority: "medium" },
        { stage: "calibration", title: "Run OLS regression model", priority: "high" },
        { stage: "calibration", title: "Review model diagnostics (R², RMSE, COD)", priority: "high" },
        { stage: "calibration", title: "Identify and review outliers", priority: "medium" },
        { stage: "equity_review", title: "Check ASR ratio distribution", priority: "high" },
        { stage: "equity_review", title: "Verify PRD < 1.03 (no regressivity)", priority: "high" },
        { stage: "equity_review", title: "Review value change distribution", priority: "medium" },
        { stage: "sign_off", title: "Final QA check on all gates", priority: "high" },
        { stage: "sign_off", title: "Supervisor sign-off", priority: "critical" },
      ];

      await supabase.from("neighborhood_review_tasks").insert(
        defaultTasks.map((t) => ({ ...t, review_id: data.id }))
      );

      await emitTraceEventAsync({
        sourceModule: "atlas",
        eventType: "neighborhood_certified",
        eventData: { action: "review_created", review_id: data.id, neighborhood_code: input.neighborhood_code },
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REVIEWS_KEY });
      toast.success("Neighborhood review created with 15 default tasks");
    },
    onError: (err: Error) => {
      toast.error("Failed to create review", { description: err.message });
    },
  });
}

/** Advance review to next stage (with gate check) */
export function useAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, currentStage }: { reviewId: string; currentStage: ReviewStage }) => {
      const stageOrder: ReviewStage[] = ["scoping", "data_audit", "spatial_analysis", "calibration", "equity_review", "sign_off"];
      const currentIdx = stageOrder.indexOf(currentStage);
      if (currentIdx === -1 || currentIdx >= stageOrder.length - 1) {
        throw new Error("Already at final stage or invalid stage");
      }

      const nextStage = stageOrder[currentIdx + 1];
      const completedCol = `${currentStage}_completed_at`;

      const { error } = await supabase
        .from("neighborhood_reviews")
        .update({
          current_stage: nextStage,
          [completedCol]: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Record<string, string>)
        .eq("id", reviewId);

      if (error) throw error;

      await emitTraceEventAsync({
        sourceModule: "atlas",
        eventType: "neighborhood_certified",
        eventData: { action: "stage_advanced", review_id: reviewId, from: currentStage, to: nextStage },
      });

      return nextStage;
    },
    onSuccess: (nextStage, vars) => {
      qc.invalidateQueries({ queryKey: reviewKey(vars.reviewId) });
      qc.invalidateQueries({ queryKey: contextKey(vars.reviewId) });
      toast.success(`Advanced to ${nextStage.replace(/_/g, " ")}`);
    },
    onError: (err: Error) => {
      toast.error("Failed to advance stage", { description: err.message });
    },
  });
}

/** Complete the review (sign-off stage) */
export function useCompleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("neighborhood_reviews")
        .update({
          status: "completed" as const,
          completed_at: new Date().toISOString(),
          sign_off_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      if (error) throw error;

      await emitTraceEventAsync({
        sourceModule: "atlas",
        eventType: "neighborhood_certified",
        eventData: { action: "review_completed", review_id: reviewId },
      });
    },
    onSuccess: (_, reviewId) => {
      qc.invalidateQueries({ queryKey: REVIEWS_KEY });
      qc.invalidateQueries({ queryKey: reviewKey(reviewId) });
      toast.success("Neighborhood review completed and signed off");
    },
    onError: (err: Error) => {
      toast.error("Failed to complete review", { description: err.message });
    },
  });
}

/** Update a task status */
export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status, _reviewId }: { taskId: string; status: string; reviewId: string }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("neighborhood_review_tasks")
        .update(updates as { status: string; updated_at: string; completed_at?: string })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: tasksKey(vars.reviewId) });
      qc.invalidateQueries({ queryKey: contextKey(vars.reviewId) });
    },
  });
}

/** Assign a task */
export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, assignedTo, _reviewId }: { taskId: string; assignedTo: string; reviewId: string }) => {
      const { error } = await supabase
        .from("neighborhood_review_tasks")
        .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: tasksKey(vars.reviewId) });
      toast.success("Task assigned");
    },
  });
}

/** Get AI recommendations */
export function useReviewAdvisor() {
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data, error } = await supabase.functions.invoke("neighborhood-review-advisor", {
        body: { reviewId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        recommendations: AIRecommendation[];
        stage_readiness: string;
        summary: string;
        context: { stats: Record<string, unknown>; calibration: Record<string, unknown> | null };
      };
    },
    onError: (err: Error) => {
      toast.error("AI advisor failed", { description: err.message });
    },
  });
}

// TerraFusion OS — Data Doctor Hook (Phase 66)
// Constitutional: DB access only in hooks. AI is the doctor, PostGIS is the scalpel.
// "I diagnosed the database and it has a case of the Mondays" — Ralph Wiggum, MD

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────

export type DQLane =
  | "spatial_healing"
  | "address_normalization"
  | "orphan_duplicate"
  | "cross_source_reconciliation"
  | "characteristic_inference"
  | "value_anomaly";

export type DQSeverity = "critical" | "high" | "medium" | "low";
export type DQFixTier = "auto_apply" | "review_confirm" | "human_resolve";

export interface DQIssue {
  id: string;
  county_id: string;
  lane: DQLane;
  severity: DQSeverity;
  fix_tier: DQFixTier;
  issue_type: string;
  issue_title: string;
  issue_description: string | null;
  affected_count: number;
  impact_score: number;
  confidence_score: number;
  reversibility_score: number;
  priority_score: number;
  source_trust_level: string | null;
  source_explanation: string | null;
  is_hard_blocker: boolean;
  blocker_reason: string | null;
  status: string;
  created_at: string;
}

export interface LaneSummary {
  total_issues: number;
  hard_blockers: number;
  affected_parcels: number;
  avg_priority: number;
  top_issues: Array<{
    id: string;
    type: string;
    title: string;
    severity: DQSeverity;
    affected_count: number;
    fix_tier: DQFixTier;
    is_hard_blocker: boolean;
  }>;
  policy: {
    autoApplyWhen: string;
    neverAutoFix: string;
    trustHierarchy: string[];
  };
}

export interface DiagnosisRun {
  id: string;
  county_id: string;
  total_issues_found: number;
  hard_blockers_found: number;
  lanes_analyzed: string[];
  quality_snapshot: Record<string, any>;
  treatment_plan: Record<string, any>;
  model_used: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface DataDoctorStatus {
  ok: boolean;
  latest_run: DiagnosisRun | null;
  lanes: Record<DQLane, LaneSummary>;
  all_issues: DQIssue[];
  batches: any[];
  total_issues: number;
  total_hard_blockers: number;
  total_affected_parcels: number;
}

// ── Lane Display Config ────────────────────────────────────────

export const LANE_CONFIG: Record<DQLane, {
  label: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  spatial_healing: {
    label: "Spatial Healing",
    icon: "MapPin",
    description: "Coordinate transforms, SRID corrections, geometry validation",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  address_normalization: {
    label: "Address Normalization",
    icon: "Home",
    description: "Street type standardization, situs assembly, ZIP population",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  orphan_duplicate: {
    label: "Orphan & Duplicate Detection",
    icon: "Copy",
    description: "Duplicate parcel numbers, split/merge ghosts, deactivated records",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  cross_source_reconciliation: {
    label: "Cross-Source Reconciliation",
    icon: "GitCompareArrows",
    description: "Multi-source field conflicts, neighborhood assignment, quorum resolution",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  characteristic_inference: {
    label: "Characteristic Inference",
    icon: "Brain",
    description: "Missing sqft, year built, bedrooms — AI suggests from comps",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  value_anomaly: {
    label: "Value Anomaly Triage",
    icon: "AlertTriangle",
    description: "$0 improvements with buildings, extreme ratios, valuation gaps",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
};

export const LANE_ORDER: DQLane[] = [
  "spatial_healing",
  "address_normalization",
  "orphan_duplicate",
  "cross_source_reconciliation",
  "characteristic_inference",
  "value_anomaly",
];

// ── Hooks ──────────────────────────────────────────────────────

const QUERY_KEY = ["data-doctor-status"];

async function invokeDiagnosis(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("data-quality-diagnosis", { body });
  if (error) throw error;
  if (data?.error && !data?.ok) throw new Error(data.error);
  return data;
}

/** Fetch current diagnosis status and open issues */
export function useDataDoctorStatus(countyId: string | undefined) {
  return useQuery<DataDoctorStatus>({
    queryKey: [...QUERY_KEY, countyId],
    queryFn: async () => {
      if (!countyId) throw new Error("No county");
      return invokeDiagnosis({ action: "get_status", county_id: countyId });
    },
    enabled: !!countyId,
    staleTime: 30_000,
    refetchInterval: 15_000,
  });
}

/** Run a new diagnosis */
export function useRunDiagnosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (countyId: string) =>
      invokeDiagnosis({ action: "run_diagnosis", county_id: countyId }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Diagnosis complete", {
        description: `Found ${data.issues_found} issues (${data.hard_blockers} hard blockers)`,
      });
    },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.error("Diagnosis failed", { description: err.message });
    },
  });
}

/** Helper: get the severity weight for sorting */
export function severityWeight(s: DQSeverity): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s] || 0;
}

/** Helper: format fix tier for display */
export function fixTierLabel(tier: DQFixTier): string {
  return {
    auto_apply: "Auto-Fix",
    review_confirm: "Review & Confirm",
    human_resolve: "Human Review",
  }[tier] || tier;
}

/** Helper: fix tier color */
export function fixTierColor(tier: DQFixTier): string {
  return {
    auto_apply: "text-emerald-400",
    review_confirm: "text-amber-400",
    human_resolve: "text-red-400",
  }[tier] || "text-muted-foreground";
}

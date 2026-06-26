// TerraFusion OS — Sidebar Badge Counts
// Provides counts for each sidebar group to show progress/attention indicators.
// Uses existing data hooks where available, falls back to null (no badge).

import { useCountyVitals } from "@/hooks/useCountyVitals";

export interface GroupBadge {
  /** Number to display. null = no badge shown. */
  count: number | null;
  /** Semantic status for coloring */
  status: "success" | "warning" | "neutral";
}

/**
 * Returns badge data keyed by group ID.
 * Only groups with meaningful real-time data get badges.
 */
export function useSidebarBadges(): Record<string, GroupBadge> {
  const { data: vitals } = useCountyVitals();

  const pendingAppeals = vitals?.workflows?.pendingAppeals ?? 0;
  const totalWorkflows = vitals?.workflows?.total ?? 0;

  return {
    "data-ops": {
      count: null,
      status: "neutral",
    },
    valuation: {
      count: null,
      status: "neutral",
    },
    reval: {
      count: null,
      status: "neutral",
    },
    appeals: {
      count: pendingAppeals > 0 ? pendingAppeals : null,
      status: pendingAppeals > 5 ? "warning" : pendingAppeals > 0 ? "success" : "neutral",
    },
    reports: {
      count: null,
      status: "neutral",
    },
    admin: {
      count: totalWorkflows > 0 ? totalWorkflows : null,
      status: "neutral",
    },
  };
}

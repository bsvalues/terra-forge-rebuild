// TerraFusion OS — Appeal Risk Score Badge
// Inline badge showing HIGH / MEDIUM / LOW risk tier with numeric score.

import { useAppealRiskScore } from "@/hooks/useAppealRiskScore";
import { cn } from "@/lib/utils";

interface RiskScoreBadgeProps {
  parcelId: string | null;
}

export function RiskScoreBadge({ parcelId }: RiskScoreBadgeProps) {
  const { data: riskScore, isLoading } = useAppealRiskScore(parcelId);

  // Don't render anything while loading or if no risk data
  if (isLoading || !riskScore) return null;

  const score = riskScore.riskScore;
  const tier = riskScore.riskTier?.toLowerCase() ?? "";

  let label: string;
  let badgeClasses: string;

  if (score > 70 || tier === "high") {
    label = "HIGH RISK";
    badgeClasses =
      "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25";
  } else if (score >= 40 || tier === "medium") {
    label = "MEDIUM";
    badgeClasses =
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25";
  } else {
    label = "LOW RISK";
    badgeClasses =
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        badgeClasses
      )}
      title={`Appeal risk score: ${score}/100 (${riskScore.riskTier}) — Tax Year ${riskScore.taxYear}`}
    >
      {label} {score}
    </span>
  );
}

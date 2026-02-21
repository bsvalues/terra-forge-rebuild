// TerraFusion OS — Mission Impact Badge (County Impact)
// Shown on mission completion to make corrections feel mission-critical.

import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { IMPACT_LABELS, type MissionImpactCategory } from "@/lib/missionConstitution";
import { cn } from "@/lib/utils";

interface MissionImpactBadgeProps {
  category: MissionImpactCategory;
  className?: string;
}

export function MissionImpactBadge({ category, className }: MissionImpactBadgeProps) {
  const impact = IMPACT_LABELS[category];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border",
        className
      )}
      style={{
        borderColor: `${impact.color}40`,
        backgroundColor: `${impact.color}0A`,
      }}
    >
      <Award className="w-4 h-4" style={{ color: impact.color }} />
      <span className="text-xs font-medium" style={{ color: impact.color }}>
        {impact.label}
      </span>
    </motion.div>
  );
}

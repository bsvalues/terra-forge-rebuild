// TerraFusion OS — Learning Milestones (Weekly Digest)
// Shows "You leveled up" cadence on Home: recognition trend, top headers, zero-review stats.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMappingProfiles, type MappingProfile } from "@/hooks/useMappingProfiles";

interface LearningMilestonesProps {
  className?: string;
}

function computeDigest(profiles: MappingProfile[]) {
  const totalRules = profiles.reduce((s, p) => s + p.rules.length, 0);
  const highConfRules = profiles.reduce(
    (s, p) => s + p.rules.filter((r) => r.confidence_override !== "low").length,
    0
  );
  const recognitionRate = totalRules > 0 ? Math.round((highConfRules / totalRules) * 100) : 0;

  // Top 3 learned headers across all profiles
  const headerCounts = new Map<string, { target: string; count: number }>();
  for (const profile of profiles) {
    for (const rule of profile.rules) {
      const existing = headerCounts.get(rule.source_header);
      if (existing) existing.count++;
      else headerCounts.set(rule.source_header, { target: rule.target_field, count: 1 });
    }
  }
  const topHeaders = [...headerCounts.entries()]
    .map(([header, { target, count }]) => ({ header, target, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Count profiles with all high-confidence rules (zero-review)
  const zeroReviewProfiles = profiles.filter(
    (p) => p.rules.length > 0 && p.rules.every((r) => r.confidence_override !== "low")
  ).length;
  const zeroReviewPct = profiles.length > 0 ? Math.round((zeroReviewProfiles / profiles.length) * 100) : 0;

  // Rough time-saved estimate: ~2 min per learned rule vs manual mapping
  const timeSavedMinutes = highConfRules * 2;

  return { recognitionRate, topHeaders, zeroReviewPct, timeSavedMinutes, totalRules, totalProfiles: profiles.length };
}

export function LearningMilestones({ className }: LearningMilestonesProps) {
  const parcels = useMappingProfiles("parcels");
  const sales = useMappingProfiles("sales");
  const permits = useMappingProfiles("permits");
  const exemptions = useMappingProfiles("exemptions");
  const assessments = useMappingProfiles("assessment_ratios");

  const allProfiles = useMemo(
    () => [
      ...parcels.profiles,
      ...sales.profiles,
      ...permits.profiles,
      ...exemptions.profiles,
      ...assessments.profiles,
    ],
    [parcels.profiles, sales.profiles, permits.profiles, exemptions.profiles, assessments.profiles]
  );

  const digest = useMemo(() => computeDigest(allProfiles), [allProfiles]);
  const isLoading = parcels.isLoading || sales.isLoading;

  if (isLoading || digest.totalProfiles === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-[hsl(var(--tf-transcend-cyan)/0.2)] bg-gradient-to-br from-[hsl(var(--tf-transcend-cyan)/0.04)] to-transparent overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <Trophy className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />
        <h4 className="text-xs font-semibold uppercase tracking-wider">Weekly Learning Digest</h4>
        <Badge variant="outline" className="text-[9px] ml-auto">
          This Week
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-px bg-border/20">
        <div className="bg-background p-3 text-center">
          <p className="text-lg font-light text-[hsl(var(--tf-transcend-cyan))]">{digest.recognitionRate}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recognition</p>
        </div>
        <div className="bg-background p-3 text-center">
          <p className="text-lg font-light text-[hsl(var(--tf-optimized-green))]">{digest.zeroReviewPct}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Zero Review</p>
        </div>
        <div className="bg-background p-3 text-center">
          <p className="text-lg font-light text-foreground">{digest.totalRules}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rules Learned</p>
        </div>
        <div className="bg-background p-3 text-center">
          <p className="text-lg font-light text-[hsl(var(--tf-sacred-gold))]">
            ~{digest.timeSavedMinutes >= 60 ? `${Math.round(digest.timeSavedMinutes / 60)}h` : `${digest.timeSavedMinutes}m`}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time Saved</p>
        </div>
      </div>

      {/* Top 3 headers */}
      {digest.topHeaders.length > 0 && (
        <div className="px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            Top Learned Headers
          </p>
          {digest.topHeaders.map((h) => (
            <div key={h.header} className="flex items-center gap-2 text-xs">
              <Sparkles className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))] shrink-0" />
              <span className="font-mono text-foreground/70 truncate flex-1">{h.header}</span>
              <span className="text-muted-foreground/40">→</span>
              <span className="text-[hsl(var(--tf-transcend-cyan))] font-mono truncate flex-1">{h.target}</span>
            </div>
          ))}
        </div>
      )}

      {/* Identity reinforcement */}
      <div className="px-4 py-2 bg-muted/10 border-t border-border/20">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))]" />
          Your office is becoming data-first. Keep training!
        </p>
      </div>
    </motion.div>
  );
}

// TerraFusion OS — Learning Scoreboard
// Shows mapping recognition stats: "The system is learning because of you."
// Constitutional: reads only from ingest_mapping_profiles/rules (IDS domain).

import { useMemo } from "react";
import {
  Brain, TrendingUp, Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMappingProfiles, type MappingProfile } from "@/hooks/useMappingProfiles";

interface LearningScoreboardProps {
  datasetType?: string;
  className?: string;
}

interface ScoreboardStats {
  totalProfiles: number;
  totalRules: number;
  defaultProfile: MappingProfile | null;
  topHeaders: { header: string; target: string; count: number }[];
  lowConfidenceRules: number;
}

function computeStats(profiles: MappingProfile[]): ScoreboardStats {
  const headerCounts = new Map<string, { target: string; count: number }>();
  let lowConfidence = 0;

  for (const profile of profiles) {
    for (const rule of profile.rules) {
      const key = rule.source_header;
      const existing = headerCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        headerCounts.set(key, { target: rule.target_field, count: 1 });
      }
      if (rule.confidence_override === "low") lowConfidence++;
    }
  }

  const topHeaders = Array.from(headerCounts.entries())
    .map(([header, { target, count }]) => ({ header, target, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalProfiles: profiles.length,
    totalRules: profiles.reduce((sum, p) => sum + p.rules.length, 0),
    defaultProfile: profiles.find((p) => p.is_default) ?? null,
    topHeaders,
    lowConfidenceRules: lowConfidence,
  };
}

export function LearningScoreboard({ datasetType, className }: LearningScoreboardProps) {
  // Load all dataset types if none specified
  const parcels = useMappingProfiles("parcels");
  const sales = useMappingProfiles("sales");
  const permits = useMappingProfiles("permits");
  const exemptions = useMappingProfiles("exemptions");
  const assessments = useMappingProfiles("assessment_ratios");

  const allProfiles = useMemo(() => {
    if (datasetType) {
      const hookMap: Record<string, typeof parcels> = {
        parcels, sales, permits, exemptions, assessment_ratios: assessments,
      };
      return hookMap[datasetType]?.profiles ?? [];
    }
    return [
      ...parcels.profiles,
      ...sales.profiles,
      ...permits.profiles,
      ...exemptions.profiles,
      ...assessments.profiles,
    ];
  }, [datasetType, parcels.profiles, sales.profiles, permits.profiles, exemptions.profiles, assessments.profiles]);

  const stats = useMemo(() => computeStats(allProfiles), [allProfiles]);
  const isLoading = parcels.isLoading || sales.isLoading;

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border/50 p-4 animate-pulse bg-muted/20", className)}>
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (stats.totalProfiles === 0) {
    return (
      <div className={cn("rounded-xl border border-border/50 p-4 bg-muted/10", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="w-4 h-4" />
          <p className="text-xs">No mapping profiles saved yet. Import data to start training the system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/30">
        <Brain className="w-4 h-4 text-tf-cyan" />
        <h4 className="text-xs font-semibold uppercase tracking-wider">Learning Scoreboard</h4>
        {datasetType && (
          <Badge variant="outline" className="text-[9px] ml-auto">{datasetType}</Badge>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px bg-border/20">
        <div className="bg-background p-3 text-center">
          <p className="text-lg font-light text-foreground">{stats.totalProfiles}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Profiles</p>
        </div>
        <div className="bg-background p-3 text-center">
          <p className="text-lg font-light text-[hsl(var(--tf-optimized-green))]">{stats.totalRules}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Learned Rules</p>
        </div>
        <div className="bg-background p-3 text-center">
          <p className={cn(
            "text-lg font-light",
            stats.lowConfidenceRules > 0 ? "text-[hsl(var(--tf-sacred-gold))]" : "text-[hsl(var(--tf-optimized-green))]"
          )}>
            {stats.lowConfidenceRules}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Need Review</p>
        </div>
      </div>

      {/* Top learned headers */}
      {stats.topHeaders.length > 0 && (
        <div className="px-4 py-3 space-y-2 border-t border-border/20">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            Top Learned Headers
          </p>
          <div className="space-y-1">
            {stats.topHeaders.map((h) => (
              <div key={h.header} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-foreground/70 truncate flex-1">{h.header}</span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-tf-cyan font-mono truncate flex-1">{h.target}</span>
                <Badge variant="outline" className="text-[9px] shrink-0">{h.count}×</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default profile */}
      {stats.defaultProfile && (
        <div className="px-4 py-2 border-t border-border/20 bg-muted/10">
          <div className="flex items-center gap-2 text-xs">
            <Star className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))]" />
            <span className="text-muted-foreground">Default:</span>
            <span className="font-medium text-foreground truncate">{stats.defaultProfile.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

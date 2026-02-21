// TerraFusion OS — Data Learning Panel (Registry QA)
// Governance mirror for mapping profiles, rules, and learning receipts.
// Constitutional: reads only from ingest_mapping_profiles/rules (IDS domain).

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, TrendingUp, Star, Filter, BookOpen, Hash, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMappingProfiles, type MappingProfile } from "@/hooks/useMappingProfiles";

type TimeRange = "7d" | "30d" | "all";

const DATASET_TYPES = ["parcels", "sales", "permits", "exemptions", "assessment_ratios"] as const;

interface ProfileStats {
  totalProfiles: number;
  totalRules: number;
  defaultCount: number;
  datasetBreakdown: { type: string; profiles: number; rules: number }[];
  topHeaders: { header: string; target: string; count: number }[];
  recentProfiles: MappingProfile[];
}

function computeStats(allProfiles: MappingProfile[]): ProfileStats {
  const headerCounts = new Map<string, { target: string; count: number }>();
  const datasetMap = new Map<string, { profiles: number; rules: number }>();

  for (const profile of allProfiles) {
    const existing = datasetMap.get(profile.dataset_type) ?? { profiles: 0, rules: 0 };
    existing.profiles++;
    existing.rules += profile.rules.length;
    datasetMap.set(profile.dataset_type, existing);

    for (const rule of profile.rules) {
      const key = rule.source_header;
      const e = headerCounts.get(key);
      if (e) e.count++;
      else headerCounts.set(key, { target: rule.target_field, count: 1 });
    }
  }

  return {
    totalProfiles: allProfiles.length,
    totalRules: allProfiles.reduce((s, p) => s + p.rules.length, 0),
    defaultCount: allProfiles.filter((p) => p.is_default).length,
    datasetBreakdown: Array.from(datasetMap.entries()).map(([type, v]) => ({ type, ...v })),
    topHeaders: Array.from(headerCounts.entries())
      .map(([header, { target, count }]) => ({ header, target, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    recentProfiles: [...allProfiles].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
  };
}

export function DataLearningPanel() {
  const [dsFilter, setDsFilter] = useState<string>("");

  const parcels = useMappingProfiles("parcels");
  const sales = useMappingProfiles("sales");
  const permits = useMappingProfiles("permits");
  const exemptions = useMappingProfiles("exemptions");
  const assessments = useMappingProfiles("assessment_ratios");

  const allProfiles = useMemo(() => {
    const all = [
      ...parcels.profiles,
      ...sales.profiles,
      ...permits.profiles,
      ...exemptions.profiles,
      ...assessments.profiles,
    ];
    if (dsFilter) return all.filter((p) => p.dataset_type === dsFilter);
    return all;
  }, [dsFilter, parcels.profiles, sales.profiles, permits.profiles, exemptions.profiles, assessments.profiles]);

  const stats = useMemo(() => computeStats(allProfiles), [allProfiles]);
  const isLoading = parcels.isLoading || sales.isLoading;

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading learning data…</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3 h-3 text-muted-foreground" />
        <button
          onClick={() => setDsFilter("")}
          className={cn(
            "px-2.5 py-1 rounded-md text-[10px] transition-all",
            !dsFilter ? "bg-primary text-primary-foreground font-medium" : "bg-muted/40 text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {DATASET_TYPES.map((dt) => (
          <button
            key={dt}
            onClick={() => setDsFilter(dt)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[10px] transition-all",
              dsFilter === dt ? "bg-primary text-primary-foreground font-medium" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
          >
            {dt}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Profiles", value: stats.totalProfiles, icon: BookOpen },
          { label: "Learned Rules", value: stats.totalRules, icon: Brain },
          { label: "Default Profiles", value: stats.defaultCount, icon: Star },
          { label: "Dataset Types", value: stats.datasetBreakdown.length, icon: Hash },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-muted/20">
            <s.icon className="w-4 h-4 shrink-0 text-tf-cyan" />
            <div>
              <p className="text-lg font-semibold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dataset breakdown */}
      {stats.datasetBreakdown.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Dataset Type</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Profiles</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rules</th>
              </tr>
            </thead>
            <tbody>
              {stats.datasetBreakdown.map((d) => (
                <tr key={d.type} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium text-foreground">{d.type}</td>
                  <td className="px-3 py-2 text-muted-foreground">{d.profiles}</td>
                  <td className="px-3 py-2 text-muted-foreground">{d.rules}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top learned headers */}
      {stats.topHeaders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            Top Learned Headers
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Source Header</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Target Field</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Times Seen</th>
                </tr>
              </thead>
              <tbody>
                {stats.topHeaders.map((h) => (
                  <tr key={h.header} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-foreground/80">{h.header}</td>
                    <td className="px-3 py-2 font-mono text-tf-cyan">{h.target}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[9px]">{h.count}×</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent profiles */}
      {stats.recentProfiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Profile Changes
          </p>
          <div className="space-y-1">
            {stats.recentProfiles.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
                {p.is_default && <Star className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))]" />}
                <span className="text-xs font-medium text-foreground flex-1 truncate">{p.name}</span>
                <Badge variant="outline" className="text-[9px]">{p.dataset_type}</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalProfiles === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No mapping profiles saved yet</p>
          <p className="text-xs mt-1">Import data to start training the system</p>
        </div>
      )}
    </motion.div>
  );
}

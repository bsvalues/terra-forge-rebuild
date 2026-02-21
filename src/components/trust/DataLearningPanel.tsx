// TerraFusion OS — Data Learning Panel (Registry QA)
// Governance mirror for mapping profiles, rules, and learning receipts.
// Includes hardened "Promote to Default" with Test Mode gate.
// Constitutional: reads only from ingest_mapping_profiles/rules (IDS domain).

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, TrendingUp, Star, Filter, BookOpen, Hash, AlertTriangle, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMappingProfiles, type MappingProfile } from "@/hooks/useMappingProfiles";
import { toast } from "sonner";

const DATASET_TYPES = ["parcels", "sales", "permits", "exemptions", "assessment_ratios"] as const;

// Canonical target fields per dataset type (for Test Mode validation)
const CRITICAL_FIELDS: Record<string, string[]> = {
  parcels: ["parcel_number", "address", "assessed_value"],
  sales: ["parcel_id", "sale_date", "sale_price"],
  permits: ["parcel_id", "permit_number"],
  exemptions: ["parcel_id", "exemption_type"],
  assessment_ratios: ["parcel_id", "sale_id", "assessed_value", "sale_price"],
};

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

/** Run a lightweight "Test Mode" check on a profile before promoting to default */
function testProfile(profile: MappingProfile): { pass: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const criticalFields = CRITICAL_FIELDS[profile.dataset_type] ?? [];
  const mappedTargets = new Set(profile.rules.map((r) => r.target_field));

  for (const field of criticalFields) {
    if (!mappedTargets.has(field)) {
      warnings.push(`Missing critical field: ${field}`);
    }
  }

  const lowConfRules = profile.rules.filter((r) => r.confidence_override === "low");
  if (lowConfRules.length > 0) {
    warnings.push(`${lowConfRules.length} rule(s) have low confidence`);
  }

  if (profile.rules.length === 0) {
    warnings.push("Profile has no mapping rules");
  }

  return { pass: warnings.length === 0, warnings };
}

export function DataLearningPanel() {
  const [dsFilter, setDsFilter] = useState<string>("");
  const [promoteDialog, setPromoteDialog] = useState<{
    profile: MappingProfile;
    testResult: { pass: boolean; warnings: string[] };
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const parcels = useMappingProfiles("parcels");
  const sales = useMappingProfiles("sales");
  const permits = useMappingProfiles("permits");
  const exemptions = useMappingProfiles("exemptions");
  const assessments = useMappingProfiles("assessment_ratios");

  const hookMap: Record<string, typeof parcels> = {
    parcels, sales, permits, exemptions, assessment_ratios: assessments,
  };

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

  const handlePromoteClick = (profile: MappingProfile) => {
    const testResult = testProfile(profile);
    setPromoteDialog({ profile, testResult });
    setOverrideReason("");
  };

  const handleConfirmPromote = () => {
    if (!promoteDialog) return;
    const hook = hookMap[promoteDialog.profile.dataset_type];
    if (hook) {
      hook.setDefault(promoteDialog.profile.id);
      if (!promoteDialog.testResult.pass && overrideReason) {
        toast.info(`Promoted with override: ${overrideReason}`);
      }
    }
    setPromoteDialog(null);
  };

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
            <s.icon className="w-4 h-4 shrink-0 text-[hsl(var(--tf-transcend-cyan))]" />
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
                    <td className="px-3 py-2 font-mono text-[hsl(var(--tf-transcend-cyan))]">{h.target}</td>
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

      {/* Recent profiles with Promote to Default */}
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
                {!p.is_default && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-[hsl(var(--tf-sacred-gold))] hover:text-[hsl(var(--tf-sacred-gold))]"
                    onClick={() => handlePromoteClick(p)}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Promote
                  </Button>
                )}
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

      {/* ── Promote to Default Dialog (Test Mode Gate) ── */}
      <Dialog open={!!promoteDialog} onOpenChange={() => setPromoteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[hsl(var(--tf-transcend-cyan))]" />
              Promote to Default
            </DialogTitle>
            <DialogDescription>
              Test Mode validates the profile before promotion.
            </DialogDescription>
          </DialogHeader>

          {promoteDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <p className="text-sm font-medium">{promoteDialog.profile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {promoteDialog.profile.dataset_type} · {promoteDialog.profile.rules.length} rules
                </p>
              </div>

              {/* Test result */}
              <div className={cn(
                "p-3 rounded-lg border",
                promoteDialog.testResult.pass
                  ? "bg-[hsl(var(--tf-optimized-green)/0.05)] border-[hsl(var(--tf-optimized-green)/0.3)]"
                  : "bg-destructive/5 border-destructive/30"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {promoteDialog.testResult.pass ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[hsl(var(--tf-optimized-green))]" />
                      <span className="text-xs font-semibold text-[hsl(var(--tf-optimized-green))]">All checks passed</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-xs font-semibold text-destructive">
                        {promoteDialog.testResult.warnings.length} warning(s)
                      </span>
                    </>
                  )}
                </div>
                {promoteDialog.testResult.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-muted-foreground ml-6">• {w}</p>
                ))}
              </div>

              {/* Override reason (required if warnings) */}
              {!promoteDialog.testResult.pass && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    You can still promote, but provide a reason (will be logged):
                  </p>
                  <Textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Reason for override..."
                    className="text-xs h-20"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPromoteDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!promoteDialog?.testResult.pass && !overrideReason.trim()}
              onClick={handleConfirmPromote}
              className={cn(
                promoteDialog?.testResult.pass
                  ? "bg-[hsl(var(--tf-optimized-green))] hover:bg-[hsl(var(--tf-optimized-green)/0.85)] text-white"
                  : ""
              )}
            >
              {promoteDialog?.testResult.pass ? "Promote to Default" : "Override & Promote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
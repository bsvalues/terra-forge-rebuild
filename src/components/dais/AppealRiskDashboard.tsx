// TerraFusion OS — Phase 114: Appeal Risk Scoring Dashboard
// Displays parcels ranked by appeal risk with tier breakdown and defense priorities.

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  AlertTriangle,
  Loader2,
  MapPin,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Target,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { useRunRiskScan } from "@/hooks/useAppealRiskScoring";
import { cn } from "@/lib/utils";

interface NeighborhoodRisk {
  code: string;
  count: number;
  avgScore: number;
  criticalCount: number;
}

interface AppealRiskScore {
  id: string;
  parcel_id: string;
  parcel_number: string;
  situs_address: string | null;
  risk_score: number;
  risk_tier: string;
  value_change_pct: number | null;
  prior_value: number;
  new_value: number;
  defense_status: string;
  ai_risk_summary: string | null;
  neighborhood_code: string | null;
}

const TIER_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "text-destructive", bg: "bg-destructive/15", label: "Critical" },
  high: { color: "text-chart-4", bg: "bg-chart-4/15", label: "High" },
  medium: { color: "text-chart-3", bg: "bg-chart-3/15", label: "Medium" },
  low: { color: "text-tf-green", bg: "bg-tf-green/15", label: "Low" },
};

type TierFilter = "all" | "critical" | "high" | "medium" | "low";

export function AppealRiskDashboard() {
  const { setParcel } = useWorkbench();
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [view, setView] = useState<"parcels" | "neighborhoods">("parcels");
  const [sortNeighborhood, setSortNeighborhood] = useState<"avgScore" | "count">("avgScore");
  const riskScan = useRunRiskScan();

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ["appeal-risk-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeal_risk_scores")
        .select("id, parcel_id, parcel_number, situs_address, risk_score, risk_tier, value_change_pct, prior_value, new_value, defense_status, ai_risk_summary, neighborhood_code")
        .order("risk_score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AppealRiskScore[];
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (tierFilter === "all") return scores;
    return scores.filter(s => s.risk_tier === tierFilter);
  }, [scores, tierFilter]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    scores.forEach(s => {
      if (counts[s.risk_tier] !== undefined) counts[s.risk_tier]++;
    });
    return counts;
  }, [scores]);

  /** Aggregate scores by neighborhood_code */
  const neighborhoodRanking = useMemo<NeighborhoodRisk[]>(() => {
    const map = new Map<string, { total: number; count: number; critical: number }>();
    scores.forEach(s => {
      const code = s.neighborhood_code || "Unknown";
      const entry = map.get(code) || { total: 0, count: 0, critical: 0 };
      entry.total += s.risk_score;
      entry.count++;
      if (s.risk_tier === "critical") entry.critical++;
      map.set(code, entry);
    });
    const list: NeighborhoodRisk[] = Array.from(map.entries()).map(([code, v]) => ({
      code,
      count: v.count,
      avgScore: Math.round(v.total / v.count),
      criticalCount: v.critical,
    }));
    list.sort((a, b) => sortNeighborhood === "avgScore" ? b.avgScore - a.avgScore : b.count - a.count);
    return list;
  }, [scores, sortNeighborhood]);

  const handleNavigate = (score: AppealRiskScore) => {
    setParcel({
      id: score.parcel_id,
      parcelNumber: score.parcel_number,
      address: score.situs_address,
      neighborhoodCode: score.neighborhood_code,
    });
  };

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-suite-dais" />
            Appeal Risk Scoring
            <Badge variant="outline" className="text-[9px] ml-1">
              {scores.length} scored
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => setView(view === "parcels" ? "neighborhoods" : "parcels")}
            >
              {view === "parcels" ? "Neighborhoods" : "Parcels"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] px-2 gap-1"
              disabled={riskScan.isPending}
              onClick={() => riskScan.mutate({})}
            >
              {riskScan.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Re-Score
            </Button>
          </div>
        </div>

        {/* Tier summary chips */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setTierFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-medium transition-colors",
              tierFilter === "all"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            All ({scores.length})
          </button>
          {(["critical", "high", "medium", "low"] as const).map(tier => {
            const cfg = TIER_CONFIG[tier];
            return (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-medium transition-colors",
                  tierFilter === tier
                    ? cn(cfg.bg, cfg.color)
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {cfg.label} ({tierCounts[tier]})
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading risk scores…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No risk scores found</p>
          </div>
        ) : view === "neighborhoods" ? (
          /* Neighborhood Risk Ranking Table */
          <ScrollArea className="h-[380px]">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Sort by:</span>
              <button
                onClick={() => setSortNeighborhood("avgScore")}
                className={cn("text-[10px] px-2 py-0.5 rounded", sortNeighborhood === "avgScore" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50")}
              >
                Avg Score
              </button>
              <button
                onClick={() => setSortNeighborhood("count")}
                className={cn("text-[10px] px-2 py-0.5 rounded", sortNeighborhood === "count" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50")}
              >
                Count
              </button>
            </div>
            <div className="space-y-1">
              {neighborhoodRanking.map((n, i) => (
                <motion.div
                  key={n.code}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/20 hover:bg-muted/20 transition-colors"
                >
                  <div className="w-6 text-center text-xs text-muted-foreground font-medium">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground">{n.code}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{n.count} parcels</span>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    n.avgScore >= 70 ? "bg-destructive/15 text-destructive" :
                    n.avgScore >= 50 ? "bg-chart-4/15 text-chart-4" :
                    n.avgScore >= 30 ? "bg-chart-3/15 text-chart-3" :
                    "bg-tf-green/15 text-tf-green"
                  )}>
                    avg {n.avgScore}
                  </Badge>
                  {n.criticalCount > 0 && (
                    <Badge className="bg-destructive/15 text-destructive border-0 text-[9px]">
                      {n.criticalCount} critical
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[380px]">
            <div className="space-y-1.5">
              {filtered.map((score, i) => {
                const cfg = TIER_CONFIG[score.risk_tier] ?? TIER_CONFIG.low;
                return (
                  <motion.button
                    key={score.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => handleNavigate(score)}
                    className="w-full text-left rounded-lg border border-border/20 p-3 hover:bg-muted/20 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.bg.replace("/15", ""))} />
                      <span className="text-xs font-medium text-foreground">
                        {score.parcel_number}
                      </span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5", cfg.bg, cfg.color, "border-0")}>
                        {cfg.label} · {score.risk_score}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 ml-auto",
                          score.defense_status === "prepared" && "bg-tf-green/15 text-tf-green",
                          score.defense_status === "pending" && "bg-chart-3/15 text-chart-3",
                          score.defense_status === "unreviewed" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {score.defense_status}
                      </Badge>
                      <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {score.situs_address ?? "No address"}
                      </span>
                      {score.value_change_pct !== null && (
                        <span className={cn(
                          "flex items-center gap-1",
                          score.value_change_pct > 10 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          <TrendingUp className="w-3 h-3" />
                          {score.value_change_pct > 0 ? "+" : ""}{score.value_change_pct.toFixed(1)}%
                        </span>
                      )}
                      {score.neighborhood_code && (
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {score.neighborhood_code}
                        </span>
                      )}
                    </div>

                    {score.ai_risk_summary && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">
                        {score.ai_risk_summary}
                      </p>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

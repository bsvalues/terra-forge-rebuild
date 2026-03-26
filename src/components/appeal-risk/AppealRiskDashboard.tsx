// TerraFusion OS — Appeal Risk Scoring Dashboard (Phase 77)
// God-tier appeal defense: risk tiers, AI analysis, defense queue management.
// "I defended an appeal once. The judge said 'no.' So I appealed that." — Ralph Wiggum

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle, Shield, Loader2, Brain, TrendingUp,
  ArrowRight, CheckCircle, Clock, Users, Zap, Target,
  BarChart3, FileText, Crosshair, ShieldAlert, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
} from "lucide-react";
import {
  useRiskSummary, useRiskScores, useScoringRuns,
  useRunRiskScan, useAIAnalysis, useUpdateDefenseStatus, useBulkQueueDefense,
  type AppealRiskScore, type RiskTier, type DefenseStatus,
} from "@/hooks/useAppealRiskScoring";
import { useAppealRiskSummary } from "@/hooks/useAppealRiskSummary";
import { format } from "date-fns";

// ── Tier config ──────────────────────────────────────────────────────
const TIER_CONFIG: Record<RiskTier, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  critical: { label: "Critical", color: "text-destructive", bgColor: "bg-destructive/10 border-destructive/30", icon: ShieldAlert },
  high: { label: "High", color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  medium: { label: "Medium", color: "text-primary", bgColor: "bg-primary/10 border-primary/30", icon: Target },
  low: { label: "Low", color: "text-muted-foreground", bgColor: "bg-muted/10 border-border/30", icon: Minus },
};

const STATUS_CONFIG: Record<DefenseStatus, { label: string; color: string }> = {
  unqueued: { label: "Unqueued", color: "border-border text-muted-foreground" },
  queued: { label: "Queued", color: "border-amber-500/30 text-amber-400" },
  in_progress: { label: "In Progress", color: "border-primary/30 text-primary" },
  ready: { label: "Ready", color: "border-emerald-500/30 text-emerald-400" },
  filed: { label: "Filed", color: "border-blue-500/30 text-blue-400" },
};

// ── Main Dashboard ───────────────────────────────────────────────────
export function AppealRiskDashboard() {
  const [activeTier, setActiveTier] = useState<RiskTier | null>(null);
  const [activeStatus, setActiveStatus] = useState<DefenseStatus | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: summary } = useRiskSummary();
  const { data: rpcSummary } = useAppealRiskSummary();
  const { data: scores = [], isLoading } = useRiskScores({
    tier: activeTier || undefined,
    status: activeStatus || undefined,
    limit: 100,
  });
  const { data: runs = [] } = useScoringRuns();
  const scanMut = useRunRiskScan();
  const aiMut = useAIAnalysis();
  const bulkQueue = useBulkQueueDefense();
  const updateStatus = useUpdateDefenseStatus();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === scores.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(scores.map((s) => s.id)));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/20">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Appeal Risk Scoring</h1>
            <p className="text-sm text-muted-foreground">
              Identify high-risk parcels, queue defense prep, and generate AI strategies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => bulkQueue.mutate(Array.from(selectedIds))}
              disabled={bulkQueue.isPending}
            >
              {bulkQueue.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Queue {selectedIds.size} for Defense
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => aiMut.mutate(scores.filter(s => selectedIds.has(s.id)).map(s => s.parcel_id))}
              disabled={aiMut.isPending}
            >
              {aiMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
              AI Analyze ({selectedIds.size})
            </Button>
          )}
          <CommitmentButton
            onClick={() => scanMut.mutate({})}
            disabled={scanMut.isPending}
            className="gap-2"
          >
            {scanMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Run Risk Scan
          </CommitmentButton>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { tier: "critical" as RiskTier, count: summary?.critical || 0 },
          { tier: "high" as RiskTier, count: summary?.high || 0 },
          { tier: "medium" as RiskTier, count: summary?.medium || 0 },
        ]).map(({ tier, count }) => {
          const cfg = TIER_CONFIG[tier];
          const isActive = activeTier === tier;
          return (
            <Card
              key={tier}
              className={`cursor-pointer transition-all border ${isActive ? cfg.bgColor : "border-border/50 bg-card/80 hover:border-border"}`}
              onClick={() => setActiveTier(isActive ? null : tier)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                  <span className={`text-2xl font-bold font-mono ${cfg.color}`}>{count}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{cfg.label} Risk</div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold font-mono text-primary">
                {summary?.avg_value_change_pct?.toFixed(1) || "0"}%
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">Avg Change</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {(summary?.ready || 0) + (summary?.filed || 0)}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">Defense Ready</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Defense Pipeline ──────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Defense Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-2">
            {(["unqueued", "queued", "in_progress", "ready", "filed"] as DefenseStatus[]).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const count = summary?.[status as keyof typeof summary] as number || 0;
              const total = summary?.total_flagged || 1;
              const pct = Math.round((count / total) * 100);
              const isActive = activeStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setActiveStatus(isActive ? null : status)}
                  className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                    isActive ? `${cfg.color} bg-card` : "border-border/30 hover:border-border"
                  }`}
                >
                  <div className={`text-lg font-bold font-mono ${isActive ? "" : "text-foreground"}`}>{count}</div>
                  <div className="text-[9px] text-muted-foreground">{cfg.label}</div>
                  <Progress value={pct} className="h-1 mt-1.5" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Content: Score Table + Details ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-primary" />
                  Risk Queue
                  <Badge variant="outline" className="text-[9px] ml-2">{scores.length} parcels</Badge>
                </CardTitle>
                {scores.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={selectAll}>
                    {selectedIds.size === scores.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : scores.length === 0 ? (
                <div className="p-8 text-center">
                  <ShieldAlert className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  {rpcSummary ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        {rpcSummary.totalParcels.toLocaleString()} parcels analyzed
                      </p>
                      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-4">
                        <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="text-lg font-bold font-mono text-destructive">{rpcSummary.highRiskCount}</div>
                          <div className="text-[9px] text-muted-foreground">High Risk</div>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="text-lg font-bold font-mono text-primary">{rpcSummary.mediumRiskCount}</div>
                          <div className="text-[9px] text-muted-foreground">Medium Risk</div>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/10 border border-border/20">
                          <div className="text-lg font-bold font-mono">{rpcSummary.lowRiskCount}</div>
                          <div className="text-[9px] text-muted-foreground">Low Risk</div>
                        </div>
                      </div>
                      {rpcSummary.topRiskNeighborhoods.length > 0 && (
                        <div className="text-left max-w-sm mx-auto">
                          <div className="text-[10px] text-muted-foreground mb-1 font-semibold">Top Risk Neighborhoods</div>
                          {rpcSummary.topRiskNeighborhoods.slice(0, 3).map((n) => (
                            <div key={n.code} className="flex items-center justify-between text-[10px] py-0.5">
                              <span className="font-mono">{n.code}</span>
                              <span className="text-muted-foreground">
                                {n.count} parcels, avg score {n.avgScore.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-3">Run a risk scan to generate detailed per-parcel scores</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-1">No risk scores found</p>
                      <p className="text-[10px] text-muted-foreground">Run a risk scan to identify parcels with high value changes</p>
                    </>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[520px]">
                  <div className="divide-y divide-border/30">
                    {scores.map((score) => (
                      <RiskScoreRow
                        key={score.id}
                        score={score}
                        selected={selectedIds.has(score.id)}
                        expanded={expandedId === score.id}
                        onSelect={() => toggleSelect(score.id)}
                        onExpand={() => setExpandedId(expandedId === score.id ? null : score.id)}
                        onStatusChange={(status) => updateStatus.mutate({ scoreId: score.id, status })}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Scoring Runs + Stats */}
        <div className="space-y-4">
          {/* Value at Risk */}
          {summary && summary.total_value_at_risk > 0 && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">Total Value at Risk</span>
                </div>
                <div className="text-2xl font-bold font-mono text-destructive">
                  ${Math.round(summary.total_value_at_risk).toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Max single change: {summary.max_value_change_pct}%
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Scoring Runs */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                Recent Scoring Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {runs.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-4">No scoring runs yet</p>
              ) : (
                <div className="space-y-2">
                  {runs.slice(0, 5).map((run) => (
                    <div key={run.id} className="p-2.5 rounded-lg bg-muted/10 border border-border/20">
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[8px] ${
                            run.status === "completed" ? "border-emerald-500/30 text-emerald-400" :
                            run.status === "running" ? "border-primary/30 text-primary" :
                            run.status === "failed" ? "border-destructive/30 text-destructive" :
                            "border-border text-muted-foreground"
                          }`}
                        >
                          {run.status}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">
                          {format(new Date(run.created_at), "M/d HH:mm")}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[9px]">
                        <div>
                          <div className="text-muted-foreground">Scanned</div>
                          <div className="font-mono font-medium">{run.total_parcels_scanned}</div>
                        </div>
                        <div>
                          <div className="text-destructive">Critical</div>
                          <div className="font-mono font-medium text-destructive">{run.critical_count}</div>
                        </div>
                        <div>
                          <div className="text-amber-400">High</div>
                          <div className="font-mono font-medium text-amber-400">{run.high_count}</div>
                        </div>
                        <div>
                          <div className="text-primary">Medium</div>
                          <div className="font-mono font-medium text-primary">{run.medium_count}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Tier Legend */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Risk Tier Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {[
                { tier: "Critical", threshold: "≥ 30% change", color: "text-destructive" },
                { tier: "High", threshold: "15–30% change", color: "text-amber-400" },
                { tier: "Medium", threshold: "8–15% change", color: "text-primary" },
                { tier: "Low", threshold: "< 8% change", color: "text-muted-foreground" },
              ].map((t) => (
                <div key={t.tier} className="flex items-center justify-between text-xs">
                  <span className={t.color}>{t.tier}</span>
                  <span className="text-muted-foreground font-mono">{t.threshold}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Risk Score Row ───────────────────────────────────────────────────
function RiskScoreRow({
  score,
  selected,
  expanded,
  onSelect,
  onExpand,
  onStatusChange,
}: {
  score: AppealRiskScore;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onExpand: () => void;
  onStatusChange: (status: DefenseStatus) => void;
}) {
  const tierCfg = TIER_CONFIG[score.risk_tier];
  const statusCfg = STATUS_CONFIG[score.defense_status];
  const ChangeIcon = score.value_change_pct > 0 ? ArrowUpRight : score.value_change_pct < 0 ? ArrowDownRight : Minus;

  return (
    <div className={`transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/5"}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onExpand}>
        <div onClick={(e) => { e.stopPropagation(); onSelect(); }}>
          <Checkbox checked={selected} />
        </div>
        <div className={`p-1.5 rounded-md ${tierCfg.bgColor}`}>
          <tierCfg.icon className={`h-3.5 w-3.5 ${tierCfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold font-mono">{score.parcel_number}</span>
            {score.ai_risk_summary && <Brain className="h-3 w-3 text-primary" />}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {score.situs_address || score.owner_name || "—"}
          </div>
        </div>
        <div className="text-right mr-2">
          <div className="flex items-center gap-1 justify-end">
            <ChangeIcon className={`h-3 w-3 ${score.value_change_pct > 0 ? "text-destructive" : "text-emerald-400"}`} />
            <span className={`text-xs font-mono font-medium ${score.value_change_pct > 15 ? "text-destructive" : ""}`}>
              {score.value_change_pct > 0 ? "+" : ""}{score.value_change_pct}%
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground font-mono">
            ${Math.round(score.new_value).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[8px] ${statusCfg.color}`}>
            {statusCfg.label}
          </Badge>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tierCfg.bgColor}`}>
            <span className={`text-[9px] font-bold font-mono ${tierCfg.color}`}>{score.risk_score}</span>
          </div>
        </div>
        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 ml-12">
              {/* Value breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/10 border border-border/20">
                  <div className="text-[9px] text-muted-foreground">Prior Value</div>
                  <div className="text-xs font-mono font-medium">${Math.round(score.prior_value).toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/10 border border-border/20">
                  <div className="text-[9px] text-muted-foreground">New Value</div>
                  <div className="text-xs font-mono font-medium">${Math.round(score.new_value).toLocaleString()}</div>
                </div>
                <div className={`p-2.5 rounded-lg border ${tierCfg.bgColor}`}>
                  <div className="text-[9px] text-muted-foreground">Change</div>
                  <div className={`text-xs font-mono font-medium ${tierCfg.color}`}>
                    ${Math.round(Math.abs(score.value_change)).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Risk factors */}
              {score.risk_factors.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">Risk Factors</div>
                  <div className="space-y-1">
                    {score.risk_factors.map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]">
                        <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {score.ai_risk_summary && (
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Brain className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">AI Risk Summary</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">{score.ai_risk_summary}</p>
                </div>
              )}
              {score.ai_defense_strategy && (
                <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-400">Defense Strategy</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">{score.ai_defense_strategy}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {score.defense_status === "unqueued" && (
                  <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => onStatusChange("queued")}>
                    <ArrowRight className="h-3 w-3" /> Queue for Defense
                  </Button>
                )}
                {score.defense_status === "queued" && (
                  <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => onStatusChange("in_progress")}>
                    <Clock className="h-3 w-3" /> Start Defense Prep
                  </Button>
                )}
                {score.defense_status === "in_progress" && (
                  <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => onStatusChange("ready")}>
                    <CheckCircle className="h-3 w-3" /> Mark Ready
                  </Button>
                )}
                {score.defense_status === "ready" && (
                  <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => onStatusChange("filed")}>
                    <FileText className="h-3 w-3" /> Mark Filed
                  </Button>
                )}
                {score.neighborhood_code && (
                  <Badge variant="outline" className="text-[8px]">{score.neighborhood_code}</Badge>
                )}
                {score.assigned_to && (
                  <Badge variant="outline" className="text-[8px]">
                    <Users className="h-2.5 w-2.5 mr-0.5" />{score.assigned_to}
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

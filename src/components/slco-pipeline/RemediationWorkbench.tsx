// TerraFusion OS — Remediation Workbench (Phase 67)
// "I clicked Apply and my computer made a happy sound" — Ralph Wiggum, Fix Applier
//
// Fix review → Batch apply → Rollback → Re-diagnosis loop

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wrench, Zap, CheckCircle2, RotateCcw, Loader2,
  ChevronRight, ArrowLeft, Package,
  Clock, Shield, ShieldCheck, Eye, ThumbsUp, ThumbsDown,
  History, Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useProposedFixes,
  useRemediationBatches,
  useGenerateFixes,
  useApplyBatch,
  useRollbackBatch,
  useReviewFix,
  type ProposedFix,
  type RemediationBatch,
} from "@/hooks/useRemediation";
import {
  useDataDoctorStatus,
  LANE_CONFIG,
  LANE_ORDER,
  type DQLane,
} from "@/hooks/useDataDoctor";

// ── Fix Status Badge ────────────────────────────────────────────
function FixStatusBadge({ status }: { status: string }) {
  const map: Record<string, { class: string; icon: any; label: string }> = {
    pending: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock, label: "Pending" },
    approved: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: ThumbsUp, label: "Approved" },
    applied: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2, label: "Applied" },
    rejected: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: ThumbsDown, label: "Rejected" },
  };
  const c = map[status] || map.pending;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 gap-1 ${c.class}`}>
      <Icon className="h-2.5 w-2.5" />
      {c.label}
    </Badge>
  );
}

// ── Batch Status Badge ──────────────────────────────────────────
function BatchStatusBadge({ status }: { status: string }) {
  const map: Record<string, { class: string; label: string }> = {
    applying: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Applying…" },
    applied: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Applied" },
    failed: { class: "bg-red-500/10 text-red-400 border-red-500/20", label: "Failed" },
    rolled_back: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Rolled Back" },
  };
  const c = map[status] || { class: "bg-muted/20 text-muted-foreground", label: status };
  return <Badge variant="outline" className={`text-[9px] px-1.5 ${c.class}`}>{c.label}</Badge>;
}

// ── Fix Card ────────────────────────────────────────────────────
function FixCard({
  fix,
  onApprove,
  onReject,
  isReviewing,
  selectable,
  selected,
  onToggleSelect,
}: {
  fix: ProposedFix;
  onApprove: () => void;
  onReject: () => void;
  isReviewing: boolean;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      selected ? "border-primary/40 bg-primary/5" : "border-border/30 bg-card/50"
    }`}>
      <div className="flex items-start gap-2">
        {selectable && (
          <button onClick={onToggleSelect} className="mt-0.5">
            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
              selected ? "border-primary bg-primary" : "border-muted-foreground/40"
            }`}>
              {selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
            </div>
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-foreground font-mono">
              {fix.target_column}
            </span>
            <FixStatusBadge status={fix.status} />
            {fix.confidence && (
              <span className="text-[9px] text-muted-foreground">
                {fix.confidence}% conf
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">
              {fix.current_value ?? "NULL"}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-primary font-medium">
              {fix.proposed_value ?? "NULL"}
            </span>
          </div>

          {fix.explanation && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
              {fix.explanation}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground">
            <span>Method: {fix.fix_method}</span>
            {fix.source_trust && <span>Trust: {fix.source_trust}</span>}
            {fix.parcel_id && (
              <span className="font-mono">{fix.parcel_id.slice(0, 8)}…</span>
            )}
          </div>
        </div>

        {fix.status === "pending" && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={onApprove}
              disabled={isReviewing}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={onReject}
              disabled={isReviewing}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Batch History Card ──────────────────────────────────────────
function BatchCard({
  batch,
  onRollback,
  isRollingBack,
}: {
  batch: RemediationBatch;
  onRollback: () => void;
  isRollingBack: boolean;
}) {
  const laneConf = LANE_CONFIG[batch.lane as DQLane];

  return (
    <div className="p-3 rounded-lg border border-border/30 bg-card/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-foreground">{batch.batch_name}</span>
            <BatchStatusBadge status={batch.status} />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {laneConf && (
              <Badge variant="outline" className={`text-[8px] px-1 ${laneConf.bgColor} ${laneConf.color} ${laneConf.borderColor}`}>
                {laneConf.label}
              </Badge>
            )}
            <span>{batch.applied_count}/{batch.total_fixes} applied</span>
            {batch.rejected_count > 0 && <span className="text-red-400">{batch.rejected_count} rejected</span>}
            {batch.applied_at && (
              <span>{new Date(batch.applied_at).toLocaleString()}</span>
            )}
          </div>
        </div>

        {batch.status === "applied" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                onClick={onRollback}
                disabled={isRollingBack}
              >
                {isRollingBack ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rollback this batch</TooltipContent>
          </Tooltip>
        )}

        {batch.status === "rolled_back" && (
          <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/20">
            ↩ {batch.rolled_back_count} reversed
          </Badge>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN WORKBENCH
// ══════════════════════════════════════════════════════════════════

interface RemediationWorkbenchProps {
  onBack?: () => void;
}

export function RemediationWorkbench({ onBack }: RemediationWorkbenchProps) {
  const countyId = "00000000-0000-0000-0000-000000000002";

  const { data: status } = useDataDoctorStatus(countyId);
  const [activeLane, setActiveLane] = useState<DQLane | "all">("all");
  const [selectedFixIds, setSelectedFixIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("fixes");

  // Hooks
  const { data: fixes, isLoading: fixesLoading } = useProposedFixes(countyId, {
    lane: activeLane === "all" ? undefined : activeLane,
  });
  const { data: batches } = useRemediationBatches(countyId);
  const generateFixes = useGenerateFixes();
  const applyBatch = useApplyBatch();
  const rollbackBatch = useRollbackBatch();
  const reviewFix = useReviewFix();

  // Derived state
  const pendingFixes = useMemo(() => (fixes || []).filter((f) => f.status === "pending"), [fixes]);
  const approvedFixes = useMemo(() => (fixes || []).filter((f) => f.status === "approved"), [fixes]);
  const appliedFixes = useMemo(() => (fixes || []).filter((f) => f.status === "applied"), [fixes]);

  // Issues that can have fixes generated
  const autoFixableIssues = useMemo(() => {
    if (!status?.all_issues) return [];
    return status.all_issues.filter(
      (i) =>
        (i.fix_tier === "auto_apply" || i.fix_tier === "review_confirm") &&
        i.status === "open" &&
        (activeLane === "all" || i.lane === activeLane)
    );
  }, [status, activeLane]);

  const toggleSelect = (id: string) => {
    setSelectedFixIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllApproved = () => {
    setSelectedFixIds(new Set(approvedFixes.map((f) => f.id)));
  };

  const handleApplySelected = () => {
    const ids = Array.from(selectedFixIds);
    if (ids.length === 0) return;
    applyBatch.mutate({
      countyId,
      fixIds: ids,
      batchName: `${activeLane === "all" ? "Mixed" : LANE_CONFIG[activeLane]?.label} — ${ids.length} fixes`,
      lane: activeLane === "all" ? undefined : activeLane,
    });
    setSelectedFixIds(new Set());
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
              <Wrench className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Remediation Workbench</h2>
              <p className="text-xs text-muted-foreground">
                Review fixes • Approve batches • Rollback if needed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedFixIds.size > 0 && (
              <Button
                size="sm"
                onClick={handleApplySelected}
                disabled={applyBatch.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {applyBatch.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Apply {selectedFixIds.size} Fix{selectedFixIds.size !== 1 ? "es" : ""}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lane Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          variant={activeLane === "all" ? "default" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => setActiveLane("all")}
        >
          All Lanes
        </Button>
        {LANE_ORDER.map((lane) => {
          const conf = LANE_CONFIG[lane];
          const count = (status?.lanes[lane]?.total_issues || 0);
          if (count === 0) return null;
          return (
            <Button
              key={lane}
              variant={activeLane === lane ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 gap-1.5"
              onClick={() => setActiveLane(lane)}
            >
              {conf.label}
              <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5">{count}</Badge>
            </Button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending Review", value: pendingFixes.length, icon: Clock, color: "text-amber-400" },
          { label: "Approved", value: approvedFixes.length, icon: ThumbsUp, color: "text-blue-400" },
          { label: "Applied", value: appliedFixes.length, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Batches", value: batches?.length || 0, icon: Package, color: "text-muted-foreground" },
        ].map((stat, i) => (
          <div key={i} className="p-3 rounded-xl bg-card/80 border border-border/30 text-center">
            <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
            <div className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/30">
          <TabsTrigger value="fixes" className="gap-1.5 text-xs">
            <Eye className="h-3 w-3" /> Review Fixes
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-1.5 text-xs">
            <Sparkles className="h-3 w-3" /> Generate
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="h-3 w-3" /> Batch History
          </TabsTrigger>
        </TabsList>

        {/* ── Review Fixes Tab ─────────────────────────────────── */}
        <TabsContent value="fixes" className="space-y-3 mt-3">
          {fixesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!fixesLoading && (!fixes || fixes.length === 0) && (
            <div className="text-center py-12 space-y-3">
              <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                No proposed fixes yet. Go to the <strong>Generate</strong> tab to create fixes from diagnosed issues.
              </p>
            </div>
          )}

          {fixes && fixes.length > 0 && (
            <>
              {approvedFixes.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {approvedFixes.length} approved fixes ready to apply
                  </span>
                  <Button size="sm" variant="outline" className="text-xs h-6" onClick={selectAllApproved}>
                    Select all approved
                  </Button>
                </div>
              )}
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {(fixes || []).map((fix) => (
                    <FixCard
                      key={fix.id}
                      fix={fix}
                      onApprove={() => reviewFix.mutate({ countyId, fixId: fix.id, approve: true })}
                      onReject={() => reviewFix.mutate({ countyId, fixId: fix.id, approve: false })}
                      isReviewing={reviewFix.isPending}
                      selectable={fix.status === "approved"}
                      selected={selectedFixIds.has(fix.id)}
                      onToggleSelect={() => toggleSelect(fix.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        {/* ── Generate Tab ─────────────────────────────────────── */}
        <TabsContent value="generate" className="space-y-3 mt-3">
          {autoFixableIssues.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <ShieldCheck className="h-10 w-10 text-emerald-400/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                No auto-fixable or reviewable issues in this lane. Run a new diagnosis or select a different lane.
              </p>
            </div>
          )}

          {autoFixableIssues.map((issue) => (
            <div key={issue.id} className="p-3 rounded-lg border border-border/30 bg-card/50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{issue.issue_title}</p>
                  {issue.issue_description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {issue.issue_description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
                    <span>{issue.affected_count.toLocaleString()} parcels</span>
                    <Badge
                      variant="outline"
                      className={`text-[8px] px-1 ${
                        issue.fix_tier === "auto_apply"
                          ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                          : "text-amber-400 border-amber-500/20 bg-amber-500/10"
                      }`}
                    >
                      {issue.fix_tier === "auto_apply" ? "Auto-Fix" : "Review & Confirm"}
                    </Badge>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => generateFixes.mutate({ countyId, issueId: issue.id })}
                  disabled={generateFixes.isPending}
                >
                  {generateFixes.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Generate Fixes
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── Batch History Tab ─────────────────────────────────── */}
        <TabsContent value="history" className="space-y-3 mt-3">
          {(!batches || batches.length === 0) && (
            <div className="text-center py-12 space-y-3">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                No remediation batches yet. Generate and apply fixes to see batch history here.
              </p>
            </div>
          )}

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {(batches || []).map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  onRollback={() => rollbackBatch.mutate({ countyId, batchId: batch.id })}
                  isRollingBack={rollbackBatch.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

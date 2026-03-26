// TerraFusion OS — Constitutional Traceability Panel (Phase 62)
// Lineage explorer, write-lane violation monitor, appeal audit trail.

import { useState } from "react";
import {
  useValueLineage,
  useWriteLaneViolations,
  useAppealAuditTrail,
} from "@/hooks/useConstitutionalTrace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Shield, ShieldAlert, ShieldCheck, GitBranch,
  AlertTriangle, Search, Scale, Loader2,
  ArrowRight, Lock, Hash, Database,
  Fingerprint, Activity,
} from "lucide-react";

// ── Value Lineage Tab ──────────────────────────────────────────────
function LineageExplorer() {
  const [filter, setFilter] = useState("");
  const { data: lineage, isLoading } = useValueLineage(filter || undefined);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const entries = lineage || [];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by parcel ID..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center">
          <GitBranch className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No lineage records yet.</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Value changes will appear here as they flow through the pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/10 border border-border/20 hover:bg-muted/20 transition-colors"
            >
              <div className="p-1.5 rounded bg-primary/10 mt-0.5">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{entry.event_type.replace(/_/g, " ")}</span>
                  <Badge variant="outline" className="text-[8px] px-1.5">{entry.source_module}</Badge>
                  {entry.pipeline_stage && (
                    <Badge variant="outline" className="text-[8px] px-1.5 border-primary/30 text-primary">
                      {entry.pipeline_stage}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                  {entry.parcel_id}
                </p>
                {entry.reason && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{entry.reason}</p>
                )}
                <div className="flex gap-3 mt-1.5 text-[9px] text-muted-foreground">
                  {entry.delta_amount != null && (
                    <span className={`font-mono ${entry.delta_amount > 0 ? "text-emerald-400" : "text-destructive"}`}>
                      Δ ${entry.delta_amount.toLocaleString()}
                    </span>
                  )}
                  {entry.delta_pct != null && (
                    <span className={`font-mono ${entry.delta_pct > 0 ? "text-emerald-400" : "text-destructive"}`}>
                      {entry.delta_pct > 0 ? "+" : ""}{entry.delta_pct.toFixed(2)}%
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Database className="h-2.5 w-2.5" />
                    {entry.source_system}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Hash className="h-2.5 w-2.5" />
                    v{entry.pipeline_version}
                  </span>
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground flex-shrink-0">
                {new Date(entry.created_at).toLocaleString([], {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Write-Lane Violations Tab ──────────────────────────────────────
function ViolationMonitor() {
  const { data: violations, isLoading } = useWriteLaneViolations();

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const entries = violations || [];

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted/20 text-center">
          <div className="text-lg font-bold font-mono">{entries.length}</div>
          <span className="text-[10px] text-muted-foreground">Total Violations</span>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 text-center">
          <div className="text-lg font-bold font-mono">
            {new Set(entries.map((e) => e.attempted_module)).size}
          </div>
          <span className="text-[10px] text-muted-foreground">Offending Modules</span>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 text-center">
          <div className="text-lg font-bold font-mono">
            {new Set(entries.map((e) => e.target_domain)).size}
          </div>
          <span className="text-[10px] text-muted-foreground">Targeted Domains</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center">
          <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-400">Zero Violations</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Write-lane governance is fully enforced. No cross-lane writes detected.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {entries.map((v) => (
            <div
              key={v.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20"
            >
              <div className="p-1.5 rounded bg-destructive/10 mt-0.5">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[8px]">{v.violation_type}</Badge>
                  <span className="text-xs">
                    <span className="font-semibold text-destructive">{v.attempted_module}</span>
                    <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
                    <span className="font-semibold">{v.target_domain}</span>
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Owner: <span className="font-semibold">{v.expected_owner}</span>
                </p>
              </div>
              <span className="text-[9px] text-muted-foreground flex-shrink-0">
                {new Date(v.created_at).toLocaleString([], {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Appeal Audit Trail Tab ─────────────────────────────────────────
function AppealAuditTrail() {
  const [filter, setFilter] = useState("");
  const { data: trail, isLoading } = useAppealAuditTrail(filter || undefined);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  // De-duplicate by appeal_id for summary
  const entries = trail || [];
  const uniqueAppeals = [...new Map(entries.map((e) => [e.appeal_id, e])).values()];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filter by parcel ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {uniqueAppeals.length === 0 ? (
        <div className="p-8 text-center">
          <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No appeal audit records found.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {uniqueAppeals.map((appeal) => {
            const relatedChanges = entries.filter((e) => e.appeal_id === appeal.appeal_id);
            const statusChanges = relatedChanges.filter((e) => e.status_change_id);
            const adjustments = relatedChanges.filter((e) => e.adjustment_id);

            return (
              <div
                key={appeal.appeal_id}
                className="p-3 rounded-lg bg-muted/10 border border-border/20 space-y-2"
              >
                {/* Appeal header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">
                      Appeal: {appeal.parcel_id?.toString().slice(0, 12)}...
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[8px] ${
                        appeal.appeal_status === "resolved"
                          ? "border-emerald-500/30 text-emerald-400"
                          : appeal.appeal_status === "denied"
                            ? "border-destructive/30 text-destructive"
                            : "border-primary/30 text-primary"
                      }`}
                    >
                      {appeal.appeal_status}
                    </Badge>
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(appeal.appeal_date).toLocaleDateString()}
                  </span>
                </div>

                {/* Value summary */}
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Original</span>
                    <p className="font-mono font-medium">${appeal.original_value?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested</span>
                    <p className="font-mono font-medium">
                      {appeal.requested_value ? `$${appeal.requested_value.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Final</span>
                    <p className="font-mono font-medium">
                      {appeal.final_value ? `$${appeal.final_value.toLocaleString()}` : "—"}
                    </p>
                  </div>
                </div>

                {/* Status change chain */}
                {statusChanges.length > 0 && (
                  <div className="pl-4 border-l-2 border-primary/20 space-y-1">
                    {statusChanges.map((sc, i) => (
                      <div key={`sc-${i}`} className="flex items-center gap-2 text-[9px]">
                        <Activity className="h-2.5 w-2.5 text-primary" />
                        <span className="text-muted-foreground">{sc.previous_status || "—"}</span>
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="font-semibold">{sc.new_status}</span>
                        {sc.change_reason && (
                          <span className="text-muted-foreground truncate max-w-[150px]">{sc.change_reason}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Linked value adjustments */}
                {adjustments.length > 0 && (
                  <div className="pl-4 border-l-2 border-emerald-500/20 space-y-1">
                    {adjustments.map((adj, i) => (
                      <div key={`adj-${i}`} className="flex items-center gap-2 text-[9px]">
                        <Fingerprint className="h-2.5 w-2.5 text-emerald-400" />
                        <Badge variant="outline" className="text-[7px]">{adj.adjustment_type}</Badge>
                        {adj.adj_previous_value != null && adj.adj_new_value != null && (
                          <span className="font-mono">
                            ${adj.adj_previous_value.toLocaleString()} → ${adj.adj_new_value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────
export function ConstitutionalTracePanel() {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Constitutional Traceability — Phase 62
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Immutable lineage, write-lane governance, and appeal audit chains.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Tabs defaultValue="lineage" className="space-y-3">
          <TabsList className="h-8 p-0.5 gap-0.5">
            <TabsTrigger value="lineage" className="text-[10px] h-7 gap-1">
              <GitBranch className="h-3 w-3" />
              Value Lineage
            </TabsTrigger>
            <TabsTrigger value="violations" className="text-[10px] h-7 gap-1">
              <Lock className="h-3 w-3" />
              Write-Lane
            </TabsTrigger>
            <TabsTrigger value="appeals" className="text-[10px] h-7 gap-1">
              <Scale className="h-3 w-3" />
              Appeal Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lineage">
            <LineageExplorer />
          </TabsContent>

          <TabsContent value="violations">
            <ViolationMonitor />
          </TabsContent>

          <TabsContent value="appeals">
            <AppealAuditTrail />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

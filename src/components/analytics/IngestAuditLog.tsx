// TerraFusion OS — Ingest Audit Log (Phase 193)
// Shows every seed run: county, source, rows fetched/upserted, duration, status.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, FlaskConical, Clock, Database } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SeedAuditEntry {
  id: string;
  county_slug: string;
  source: string;
  vendor: string | null;
  layer_name: string | null;
  rows_fetched: number;
  rows_upserted: number;
  rows_skipped: number;
  coverage_pct: number | null;
  dry_run: boolean;
  success: boolean;
  error_msg: string | null;
  duration_ms: number | null;
  created_at: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSeedAuditLog(limit = 50) {
  return useQuery<SeedAuditEntry[]>({
    queryKey: ["seed-audit-log", limit],
    queryFn: async () => {
      // seed_audit_log not yet in generated types
       
      const client = supabase as any;
      const { data, error } = await client
        .from("seed_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as SeedAuditEntry[];
    },
    staleTime: 30_000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ success, dryRun }: { success: boolean; dryRun: boolean }) {
  if (dryRun)
    return <Badge className="text-[9px] px-1.5 bg-sky-500/10 text-sky-400 border-sky-500/20 gap-1"><FlaskConical className="w-2.5 h-2.5" />Dry run</Badge>;
  if (success)
    return <Badge className="text-[9px] px-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1"><CheckCircle2 className="w-2.5 h-2.5" />Success</Badge>;
  return <Badge className="text-[9px] px-1.5 bg-rose-500/10 text-rose-400 border-rose-500/20 gap-1"><XCircle className="w-2.5 h-2.5" />Failed</Badge>;
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Database className="w-10 h-10 text-muted-foreground/20" />
      <p className="text-sm text-muted-foreground">No seed runs logged yet.</p>
      <p className="text-xs text-muted-foreground/60 max-w-xs">
        Seed audit entries appear here after running a county seed script (e.g.{" "}
        <code className="font-mono bg-muted/30 px-1 rounded">py -3.12 scripts/seed_franklin.py</code>).
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function IngestAuditLog() {
  const { data, isLoading } = useSeedAuditLog(100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground">Ingest Audit Trail</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            History of all county seed script runs — rows fetched, upserted, duration
          </p>
        </div>
        {data && data.length > 0 && (
          <Badge variant="outline" className="text-[10px]">{data.length} entries</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="material-bento border-border/50">
          <CardContent className="p-0">
            <EmptyState />
          </CardContent>
        </Card>
      ) : (
        <Card className="material-bento border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    {["County", "Source", "Vendor", "Rows", "Coverage", "Duration", "Status", "Ran at"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/20 hover:bg-muted/15 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-foreground capitalize">{entry.county_slug}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{entry.source}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{entry.vendor ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 tabular-nums">{entry.rows_upserted.toLocaleString()}</span>
                          <span className="text-muted-foreground/50">/</span>
                          <span className="text-muted-foreground tabular-nums">{entry.rows_fetched.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                        {entry.coverage_pct != null ? `${entry.coverage_pct}%` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />
                          {fmtDuration(entry.duration_ms)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge success={entry.success} dryRun={entry.dry_run} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), "MMM d, HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

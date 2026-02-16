// TerraFusion OS — Certification Pipeline
// County-level roll readiness tracker: COD/PRD compliance, appeals, narratives, permits
// Constitutional owner: TerraDais (workflow states, certification checklists)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEvent } from "@/services/terraTrace";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CommitmentButton } from "@/components/ui/commitment-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
  FileText,
  ClipboardCheck,
  BarChart3,
  TrendingUp,
  Stamp,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---- Types ----

interface NeighborhoodReadiness {
  code: string;
  totalParcels: number;
  certifiedParcels: number;
  certRate: number;
  codCompliant: boolean;
  prdCompliant: boolean;
  cod: number | null;
  prd: number | null;
  pendingAppeals: number;
  openPermits: number;
  pendingExemptions: number;
  unsignedNarratives: number;
  blockerCount: number;
  status: "ready" | "blocked" | "partial";
}

interface PipelineData {
  totalParcels: number;
  certifiedParcels: number;
  certRate: number;
  neighborhoods: NeighborhoodReadiness[];
  countyBlockers: {
    totalAppeals: number;
    totalPermits: number;
    totalExemptions: number;
    totalUnsignedNarratives: number;
    codFailures: number;
    prdFailures: number;
  };
  readyCount: number;
  blockedCount: number;
  partialCount: number;
}

// ---- Data Hook ----

function useCertificationPipeline() {
  return useQuery<PipelineData>({
    queryKey: ["certification-pipeline"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      // 1. Get all parcels grouped by neighborhood
      const { data: parcels } = await supabase
        .from("parcels")
        .select("id, neighborhood_code");

      // 2. Get certified assessments for current year
      const { data: assessments } = await supabase
        .from("assessments")
        .select("parcel_id, certified")
        .eq("tax_year", currentYear);

      const certifiedSet = new Set(
        (assessments || []).filter((a) => a.certified).map((a) => a.parcel_id)
      );

      // 3. Get blockers in parallel
      const [appealsRes, permitsRes, exemptionsRes, narrativesRes] =
        await Promise.all([
          supabase
            .from("appeals")
            .select("parcel_id, status")
            .in("status", ["filed", "pending", "scheduled"]),
          supabase
            .from("permits")
            .select("parcel_id, status")
            .in("status", ["applied", "pending"]),
          supabase
            .from("exemptions")
            .select("parcel_id, status")
            .eq("status", "pending"),
          supabase
            .from("dossier_narratives")
            .select("parcel_id, narrative_type")
            .eq("narrative_type", "defense"),
        ]);

      // Build parcel → neighborhood lookup
      const parcelNbhd = new Map<string, string>();
      const nbhdParcels = new Map<string, string[]>();
      for (const p of parcels || []) {
        const code = p.neighborhood_code || "UNASSIGNED";
        parcelNbhd.set(p.id, code);
        if (!nbhdParcels.has(code)) nbhdParcels.set(code, []);
        nbhdParcels.get(code)!.push(p.id);
      }

      // Build blocker counts per neighborhood
      const nbhdAppeals = new Map<string, number>();
      const nbhdPermits = new Map<string, number>();
      const nbhdExemptions = new Map<string, number>();
      const parcelHasNarrative = new Set<string>();

      for (const a of appealsRes.data || []) {
        const code = parcelNbhd.get(a.parcel_id) || "UNASSIGNED";
        nbhdAppeals.set(code, (nbhdAppeals.get(code) || 0) + 1);
      }
      for (const p of permitsRes.data || []) {
        const code = parcelNbhd.get(p.parcel_id) || "UNASSIGNED";
        nbhdPermits.set(code, (nbhdPermits.get(code) || 0) + 1);
      }
      for (const e of exemptionsRes.data || []) {
        const code = parcelNbhd.get(e.parcel_id) || "UNASSIGNED";
        nbhdExemptions.set(code, (nbhdExemptions.get(code) || 0) + 1);
      }
      for (const n of narrativesRes.data || []) {
        parcelHasNarrative.add(n.parcel_id);
      }

      // 4. COD/PRD compliance per neighborhood
      const uniqueNbhds = Array.from(nbhdParcels.keys()).filter(
        (c) => c !== "UNASSIGNED"
      );

      // Fetch VEI metrics if available
      const { data: veiMetrics } = await supabase
        .from("vei_metrics")
        .select("*")
        .order("computed_at", { ascending: false })
        .limit(100);

      // We'll also try compute_ratio_statistics for neighborhoods
      const nbhdStats = new Map<
        string,
        { cod: number | null; prd: number | null }
      >();

      // Use stored VEI metrics as fallback — group by most recent
      // For a real implementation we'd call compute_ratio_statistics per neighborhood
      // but that's expensive; use cached VEI metrics
      if (veiMetrics && veiMetrics.length > 0) {
        // Use the latest VEI metric as county-wide baseline
        const latest = veiMetrics[0];
        // Apply county-wide COD/PRD to all neighborhoods as default
        for (const code of uniqueNbhds) {
          nbhdStats.set(code, {
            cod: latest.cod ? Number(latest.cod) : null,
            prd: latest.prd ? Number(latest.prd) : null,
          });
        }
      }

      // IAAO standards
      const COD_THRESHOLD = 15;
      const PRD_LOW = 0.98;
      const PRD_HIGH = 1.03;

      let codFailures = 0;
      let prdFailures = 0;

      // Build neighborhood readiness
      const neighborhoods: NeighborhoodReadiness[] = [];

      for (const [code, pIds] of nbhdParcels.entries()) {
        const total = pIds.length;
        const certified = pIds.filter((id) => certifiedSet.has(id)).length;
        const certRate = total > 0 ? Math.round((certified / total) * 100) : 0;

        const stats = nbhdStats.get(code);
        const cod = stats?.cod ?? null;
        const prd = stats?.prd ?? null;
        const codCompliant = cod !== null ? cod <= COD_THRESHOLD : true;
        const prdCompliant =
          prd !== null ? prd >= PRD_LOW && prd <= PRD_HIGH : true;

        if (!codCompliant) codFailures++;
        if (!prdCompliant) prdFailures++;

        const appeals = nbhdAppeals.get(code) || 0;
        const permits = nbhdPermits.get(code) || 0;
        const exemptions = nbhdExemptions.get(code) || 0;

        // Unsigned narratives: parcels with certified assessments but no defense narrative
        const certifiedParcelsInNbhd = pIds.filter((id) =>
          certifiedSet.has(id)
        );
        const unsignedNarratives = certifiedParcelsInNbhd.filter(
          (id) => !parcelHasNarrative.has(id)
        ).length;

        const blockerCount =
          appeals +
          permits +
          exemptions +
          (codCompliant ? 0 : 1) +
          (prdCompliant ? 0 : 1);

        const status: NeighborhoodReadiness["status"] =
          certRate === 100 && blockerCount === 0
            ? "ready"
            : certRate > 0 || blockerCount > 0
              ? "partial"
              : "blocked";

        neighborhoods.push({
          code,
          totalParcels: total,
          certifiedParcels: certified,
          certRate,
          codCompliant,
          prdCompliant,
          cod,
          prd,
          pendingAppeals: appeals,
          openPermits: permits,
          pendingExemptions: exemptions,
          unsignedNarratives,
          blockerCount,
          status,
        });
      }

      // Sort: blocked first, then partial, then ready
      neighborhoods.sort((a, b) => {
        const order = { blocked: 0, partial: 1, ready: 2 };
        return order[a.status] - order[b.status] || a.certRate - b.certRate;
      });

      const totalParcels = parcels?.length || 0;
      const certifiedParcels = Array.from(certifiedSet).filter((id) =>
        parcelNbhd.has(id)
      ).length;

      return {
        totalParcels,
        certifiedParcels,
        certRate:
          totalParcels > 0
            ? Math.round((certifiedParcels / totalParcels) * 100)
            : 0,
        neighborhoods,
        countyBlockers: {
          totalAppeals: appealsRes.data?.length || 0,
          totalPermits: permitsRes.data?.length || 0,
          totalExemptions: exemptionsRes.data?.length || 0,
          totalUnsignedNarratives: neighborhoods.reduce(
            (s, n) => s + n.unsignedNarratives,
            0
          ),
          codFailures,
          prdFailures,
        },
        readyCount: neighborhoods.filter((n) => n.status === "ready").length,
        blockedCount: neighborhoods.filter((n) => n.status === "blocked")
          .length,
        partialCount: neighborhoods.filter((n) => n.status === "partial")
          .length,
      };
    },
    staleTime: 60_000,
  });
}

// ---- Main Component ----

export function CertificationPipeline() {
  const { data, isLoading } = useCertificationPipeline();
  const queryClient = useQueryClient();
  const [expandedNbhd, setExpandedNbhd] = useState<string | null>(null);
  const [showCountyCertify, setShowCountyCertify] = useState(false);

  // County-level certification mutation
  const countyCertifyMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("No data");
      const currentYear = new Date().getFullYear();
      const now = new Date().toISOString();

      // Get all uncertified assessments for current year
      const { data: uncertified } = await supabase
        .from("assessments")
        .select("id")
        .eq("tax_year", currentYear)
        .eq("certified", false);

      if (uncertified && uncertified.length > 0) {
        // Batch update in chunks of 100
        for (let i = 0; i < uncertified.length; i += 100) {
          const batch = uncertified.slice(i, i + 100).map((a) => a.id);
          await supabase
            .from("assessments")
            .update({ certified: true, certified_at: now })
            .in("id", batch);
        }
      }

      await emitTraceEvent({
        sourceModule: "dais",
        eventType: "county_roll_certified",
        eventData: {
          taxYear: currentYear,
          assessmentsCertified: uncertified?.length || 0,
          totalNeighborhoods: data.neighborhoods.length,
        },
      });

      return { certified: uncertified?.length || 0 };
    },
    onSuccess: (result) => {
      toast.success("County roll certified", {
        description: `${result.certified} assessments certified for TY ${new Date().getFullYear()}`,
      });
      queryClient.invalidateQueries({ queryKey: ["certification-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["certification-stats"] });
      queryClient.invalidateQueries({ queryKey: ["roll-readiness"] });
    },
    onError: (err: Error) => {
      toast.error("Certification failed", { description: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const totalBlockers =
    data.countyBlockers.totalAppeals +
    data.countyBlockers.totalPermits +
    data.countyBlockers.totalExemptions +
    data.countyBlockers.codFailures +
    data.countyBlockers.prdFailures;
  const allReady = data.readyCount === data.neighborhoods.length;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Pipeline Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--tf-sacred-gold))] to-[hsl(var(--tf-amber))] flex items-center justify-center shadow-lg">
            <Stamp className="w-6 h-6 text-[hsl(var(--tf-substrate))]" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-foreground">
              Certification Pipeline
            </h2>
            <p className="text-xs text-muted-foreground">
              TY {new Date().getFullYear()} Roll Readiness — IAAO compliance
              tracking
            </p>
          </div>
        </div>

        {/* County Certify button */}
        <CommitmentButton
          onClick={() => setShowCountyCertify(true)}
          disabled={countyCertifyMutation.isPending || data.certRate === 100}
          variant="gold"
        >
          {countyCertifyMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Stamp className="w-4 h-4" />
          )}
          {data.certRate === 100
            ? "Roll Certified"
            : countyCertifyMutation.isPending
              ? "Certifying…"
              : "Certify County Roll"}
        </CommitmentButton>
      </motion.div>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="material-bento rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            County Certification Progress
          </span>
          <span
            className={cn(
              "text-3xl font-light",
              data.certRate === 100
                ? "text-[hsl(var(--tf-optimized-green))]"
                : "text-foreground"
            )}
          >
            {data.certRate}%
          </span>
        </div>
        <Progress value={data.certRate} className="h-3 mb-4" />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatChip
            label="Total Parcels"
            value={data.totalParcels.toLocaleString()}
          />
          <StatChip
            label="Certified"
            value={data.certifiedParcels.toLocaleString()}
            color="green"
          />
          <StatChip
            label="Nbhds Ready"
            value={`${data.readyCount}/${data.neighborhoods.length}`}
            color={data.readyCount === data.neighborhoods.length ? "green" : undefined}
          />
          <StatChip
            label="Blocked"
            value={String(data.blockedCount + data.partialCount)}
            color={
              data.blockedCount + data.partialCount > 0 ? "amber" : "green"
            }
          />
          <StatChip
            label="Total Blockers"
            value={String(totalBlockers)}
            color={totalBlockers > 0 ? "red" : "green"}
          />
        </div>
      </motion.div>

      {/* Compliance Gates */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="material-bento rounded-2xl p-5"
      >
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />
          Compliance Gates
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <GateCard
            label="COD ≤ 15"
            passed={data.countyBlockers.codFailures === 0}
            detail={
              data.countyBlockers.codFailures > 0
                ? `${data.countyBlockers.codFailures} nbhd(s) fail`
                : "All pass"
            }
          />
          <GateCard
            label="PRD 0.98–1.03"
            passed={data.countyBlockers.prdFailures === 0}
            detail={
              data.countyBlockers.prdFailures > 0
                ? `${data.countyBlockers.prdFailures} nbhd(s) fail`
                : "All pass"
            }
          />
          <GateCard
            label="Appeals Resolved"
            passed={data.countyBlockers.totalAppeals === 0}
            detail={
              data.countyBlockers.totalAppeals > 0
                ? `${data.countyBlockers.totalAppeals} pending`
                : "None pending"
            }
          />
          <GateCard
            label="Permits Cleared"
            passed={data.countyBlockers.totalPermits === 0}
            detail={
              data.countyBlockers.totalPermits > 0
                ? `${data.countyBlockers.totalPermits} open`
                : "All cleared"
            }
          />
          <GateCard
            label="Exemptions Resolved"
            passed={data.countyBlockers.totalExemptions === 0}
            detail={
              data.countyBlockers.totalExemptions > 0
                ? `${data.countyBlockers.totalExemptions} pending`
                : "All resolved"
            }
          />
          <GateCard
            label="Narratives Signed"
            passed={data.countyBlockers.totalUnsignedNarratives === 0}
            detail={
              data.countyBlockers.totalUnsignedNarratives > 0
                ? `${data.countyBlockers.totalUnsignedNarratives} missing`
                : "All signed"
            }
          />
        </div>
      </motion.div>

      {/* Neighborhood Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="material-bento rounded-2xl p-5"
      >
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Neighborhood Readiness
          <Badge variant="outline" className="text-[10px] ml-auto">
            {data.neighborhoods.length} neighborhoods
          </Badge>
        </h3>

        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {data.neighborhoods.map((nbhd) => (
            <NeighborhoodRow
              key={nbhd.code}
              nbhd={nbhd}
              expanded={expandedNbhd === nbhd.code}
              onToggle={() =>
                setExpandedNbhd(
                  expandedNbhd === nbhd.code ? null : nbhd.code
                )
              }
            />
          ))}
        </div>
      </motion.div>

      {/* County Certification Dialog */}
      <AlertDialog
        open={showCountyCertify}
        onOpenChange={setShowCountyCertify}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Certify County Roll for TY {new Date().getFullYear()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark{" "}
              <strong>
                all remaining uncertified assessments
              </strong>{" "}
              as certified across all neighborhoods.
              {totalBlockers > 0 && (
                <span className="block mt-2 text-[hsl(var(--tf-amber))]">
                  ⚠ There are {totalBlockers} unresolved blockers across{" "}
                  {data.blockedCount + data.partialCount} neighborhoods.
                  Certification will proceed but these items remain open.
                </span>
              )}
              <span className="block mt-2">
                This action is permanently recorded in the TerraTrace audit
                spine.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                countyCertifyMutation.mutate();
                setShowCountyCertify(false);
              }}
              className="bg-[hsl(var(--tf-sacred-gold))] text-[hsl(var(--tf-substrate))] hover:bg-[hsl(var(--tf-sacred-gold)/0.9)]"
            >
              <Stamp className="w-4 h-4 mr-2" />
              Certify County Roll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Sub-components ----

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "amber" | "red";
}) {
  const bg = {
    green: "bg-[hsl(var(--tf-optimized-green)/0.1)]",
    amber: "bg-[hsl(var(--tf-amber)/0.1)]",
    red: "bg-destructive/10",
  };
  const text = {
    green: "text-[hsl(var(--tf-optimized-green))]",
    amber: "text-[hsl(var(--tf-amber))]",
    red: "text-destructive",
  };

  return (
    <div
      className={cn(
        "rounded-lg p-3 text-center border border-border/20",
        color ? bg[color] : "bg-[hsl(var(--tf-elevated)/0.5)]"
      )}
    >
      <div
        className={cn(
          "text-lg font-medium",
          color ? text[color] : "text-foreground"
        )}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function GateCard({
  label,
  passed,
  detail,
}: {
  label: string;
  passed: boolean;
  detail: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-center",
        passed
          ? "bg-[hsl(var(--tf-optimized-green)/0.08)] border-[hsl(var(--tf-optimized-green)/0.2)]"
          : "bg-destructive/5 border-destructive/20"
      )}
    >
      <div className="flex justify-center mb-1.5">
        {passed ? (
          <CheckCircle2 className="w-5 h-5 text-[hsl(var(--tf-optimized-green))]" />
        ) : (
          <XCircle className="w-5 h-5 text-destructive" />
        )}
      </div>
      <div className="text-[11px] font-medium text-foreground">{label}</div>
      <div
        className={cn(
          "text-[10px] mt-0.5",
          passed
            ? "text-[hsl(var(--tf-optimized-green))]"
            : "text-destructive"
        )}
      >
        {detail}
      </div>
    </div>
  );
}

function NeighborhoodRow({
  nbhd,
  expanded,
  onToggle,
}: {
  nbhd: NeighborhoodReadiness;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusColors = {
    ready:
      "bg-[hsl(var(--tf-optimized-green)/0.15)] text-[hsl(var(--tf-optimized-green))]",
    partial: "bg-[hsl(var(--tf-amber)/0.15)] text-[hsl(var(--tf-amber))]",
    blocked: "bg-destructive/15 text-destructive",
  };
  const statusLabels = {
    ready: "Ready",
    partial: "Partial",
    blocked: "Blocked",
  };

  return (
    <div className="rounded-lg border border-border/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}

        <span className="text-xs font-mono text-foreground w-20 shrink-0 truncate">
          {nbhd.code}
        </span>

        <Progress value={nbhd.certRate} className="h-1.5 flex-1 max-w-[200px]" />

        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
          {nbhd.certRate}%
        </span>

        <span className="text-[10px] text-muted-foreground w-16 text-right">
          {nbhd.certifiedParcels}/{nbhd.totalParcels}
        </span>

        {/* COD/PRD indicators */}
        <div className="flex items-center gap-1 shrink-0">
          {nbhd.cod !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1.5",
                nbhd.codCompliant
                  ? "text-[hsl(var(--tf-optimized-green))] border-[hsl(var(--tf-optimized-green)/0.3)]"
                  : "text-destructive border-destructive/30"
              )}
            >
              COD {nbhd.cod.toFixed(1)}
            </Badge>
          )}
          {nbhd.prd !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1.5",
                nbhd.prdCompliant
                  ? "text-[hsl(var(--tf-optimized-green))] border-[hsl(var(--tf-optimized-green)/0.3)]"
                  : "text-destructive border-destructive/30"
              )}
            >
              PRD {nbhd.prd.toFixed(3)}
            </Badge>
          )}
        </div>

        <Badge className={cn("text-[9px] px-2 shrink-0", statusColors[nbhd.status])}>
          {statusLabels[nbhd.status]}
        </Badge>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-3 pb-3 border-t border-border/20"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <DetailChip
              icon={Scale}
              label="Pending Appeals"
              value={nbhd.pendingAppeals}
              alert={nbhd.pendingAppeals > 0}
            />
            <DetailChip
              icon={FileText}
              label="Open Permits"
              value={nbhd.openPermits}
              alert={nbhd.openPermits > 0}
            />
            <DetailChip
              icon={ClipboardCheck}
              label="Pending Exemptions"
              value={nbhd.pendingExemptions}
              alert={nbhd.pendingExemptions > 0}
            />
            <DetailChip
              icon={FileText}
              label="Unsigned Narratives"
              value={nbhd.unsignedNarratives}
              alert={nbhd.unsignedNarratives > 0}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DetailChip({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  alert: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg p-2 text-xs",
        alert
          ? "bg-[hsl(var(--tf-amber)/0.1)] text-[hsl(var(--tf-amber))]"
          : "bg-[hsl(var(--tf-elevated)/0.3)] text-muted-foreground"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}

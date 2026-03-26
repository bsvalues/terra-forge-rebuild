// TerraFusion OS — Certification Pipeline
// County-level roll readiness tracker: COD/PRD compliance, appeals, narratives, permits
// Constitutional owner: TerraDais (workflow states, certification checklists)

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCertificationPipelineData, type NeighborhoodReadiness } from "@/hooks/useCertificationPipeline";
import { certifyCountyRoll, certifyNeighborhood } from "@/services/suites/daisService";
import { invalidateCertification } from "@/lib/queryInvalidation";
import { useRecordCertificationEvent } from "@/hooks/useCertificationEvents";
import { useRollExport } from "@/hooks/useRollExport";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  CheckCircle2,
  XCircle,
  Scale,
  FileText,
  ClipboardCheck,
  BarChart3,
  Stamp,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types imported from useCertificationPipeline hook

// ---- Main Component ----

export function CertificationPipeline() {
  const { data, isLoading } = useCertificationPipelineData();
  const queryClient = useQueryClient();
  const [expandedNbhd, setExpandedNbhd] = useState<string | null>(null);
  const [showCountyCertify, setShowCountyCertify] = useState(false);
  const [certifyingNbhd, setCertifyingNbhd] = useState<string | null>(null);
  const recordCertEvent = useRecordCertificationEvent();
  const { exportRoll, isExporting } = useRollExport();

  // County-level certification mutation — routed through daisService
  const countyCertifyMutation = useMutation({
    mutationFn: () => certifyCountyRoll(),
    onSuccess: (result) => {
      toast.success("County roll certified", {
        description: `${result.certified} assessments certified for TY ${new Date().getFullYear()}`,
      });
      recordCertEvent.mutate({
        event_type: "county_roll_certified",
        parcels_certified: result.certified,
        parcels_created: 0,
        total_parcels: data?.totalParcels || 0,
        notes: `County-wide roll certification for TY ${new Date().getFullYear()}`,
      });
      invalidateCertification(queryClient);
    },
    onError: (err: Error) => {
      toast.error("Certification failed", { description: err.message });
    },
  });

  // Neighborhood-level certification mutation
  const nbhdCertifyMutation = useMutation({
    mutationFn: (code: string) => certifyNeighborhood(code),
    onMutate: (code) => setCertifyingNbhd(code),
    onSuccess: (result, code) => {
      toast.success(`Neighborhood ${code} certified`, {
        description: `${result.certified} updated, ${result.created} created (${result.total} total)`,
      });
      recordCertEvent.mutate({
        event_type: "neighborhood_certified",
        neighborhood_code: code,
        parcels_certified: result.certified,
        parcels_created: result.created,
        total_parcels: result.total,
      });
      invalidateCertification(queryClient);
      setCertifyingNbhd(null);
    },
    onError: (err: Error) => {
      toast.error("Neighborhood certification failed", { description: err.message });
      setCertifyingNbhd(null);
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
  const _allReady = data.readyCount === data.neighborhoods.length;

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

        <div className="flex items-center gap-2">
          {/* Export Roll button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportRoll("xlsx")}
            disabled={isExporting || data.certRate === 0}
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            Export Roll
          </Button>

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
        </div>
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
              onCertify={() => nbhdCertifyMutation.mutate(nbhd.code)}
              isCertifying={certifyingNbhd === nbhd.code}
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
  onCertify,
  isCertifying,
}: {
  nbhd: NeighborhoodReadiness;
  expanded: boolean;
  onToggle: () => void;
  onCertify: () => void;
  isCertifying: boolean;
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

          {/* Certify Neighborhood Action */}
          {nbhd.certRate < 100 && (
            <div className="flex justify-end pt-3">
              <CommitmentButton
                onClick={onCertify}
                disabled={isCertifying}
                variant="gold"
                className="text-xs"
              >
                {isCertifying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Stamp className="w-3.5 h-3.5" />
                )}
                {isCertifying ? "Certifying…" : `Certify ${nbhd.code}`}
              </CommitmentButton>
            </div>
          )}
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

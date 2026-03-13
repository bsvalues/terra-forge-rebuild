// TerraFusion OS — Roll Readiness Panel (Data Constitution compliant)
// All reads via useRollReadinessData hook, writes via daisService

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRollReadinessData } from "@/hooks/useRollReadinessData";
import { certifyNeighborhood } from "@/services/suites/daisService";
import { invalidateCertification } from "@/lib/queryInvalidation";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, ShieldX, AlertTriangle, Scale, ClipboardCheck, Home, Loader2, Stamp } from "lucide-react";

interface RollReadinessPanelProps {
  neighborhoodCode: string | null;
}

export function RollReadinessPanel({ neighborhoodCode }: RollReadinessPanelProps) {
  const queryClient = useQueryClient();
  const [showCertifyConfirm, setShowCertifyConfirm] = useState(false);
  const { data, isLoading } = useRollReadinessData(neighborhoodCode);

  const certifyMutation = useMutation({
    mutationFn: async () => {
      if (!neighborhoodCode) throw new Error("No neighborhood selected");
      return certifyNeighborhood(neighborhoodCode);
    },
    onSuccess: (result) => {
      toast.success(`Neighborhood ${neighborhoodCode} certified`, {
        description: `${result.certified} updated, ${result.created} created — ${result.total} total parcels`,
      });
      invalidateCertification(queryClient);
    },
    onError: (err: Error) => {
      toast.error("Certification failed", { description: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="material-bento p-4 space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const totalBlockers = data.blockers.appeals + data.blockers.permits + data.blockers.exemptions;
  const isReady = data.rate === 100 && totalBlockers === 0;
  const canCertify = neighborhoodCode && data.rate < 100;

  return (
    <>
      <div className="material-bento p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            {isReady ? (
              <ShieldCheck className="w-4 h-4 text-[hsl(var(--tf-optimized-green))]" />
            ) : (
              <ShieldX className="w-4 h-4 text-[hsl(var(--tf-amber))]" />
            )}
            Roll Readiness
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            {neighborhoodCode || "All"}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Certification</span>
            <span className={`font-medium ${data.rate === 100 ? "text-[hsl(var(--tf-optimized-green))]" : "text-foreground"}`}>
              {data.rate}%
            </span>
          </div>
          <Progress value={data.rate} className="h-2" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{data.certifiedParcels} certified</span>
            <span>{data.totalParcels} total</span>
          </div>
        </div>

        {totalBlockers > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-[hsl(var(--tf-amber))]" />
              Blockers
            </p>
            {data.blockers.appeals > 0 && <BlockerRow icon={Scale} label="Pending Appeals" count={data.blockers.appeals} />}
            {data.blockers.permits > 0 && <BlockerRow icon={Home} label="Open Permits" count={data.blockers.permits} />}
            {data.blockers.exemptions > 0 && <BlockerRow icon={ClipboardCheck} label="Pending Exemptions" count={data.blockers.exemptions} />}
          </div>
        )}

        {isReady && (
          <div className="bg-[hsl(var(--tf-optimized-green)/0.1)] rounded-lg p-2 text-center">
            <p className="text-[10px] font-medium text-[hsl(var(--tf-optimized-green))]">
              ✓ Neighborhood ready for certification
            </p>
          </div>
        )}

        {canCertify && (
          <CommitmentButton onClick={() => setShowCertifyConfirm(true)} disabled={certifyMutation.isPending} variant="gold">
            {certifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stamp className="w-4 h-4" />}
            {certifyMutation.isPending ? "Certifying…" : `Certify ${neighborhoodCode}`}
          </CommitmentButton>
        )}
      </div>

      <AlertDialog open={showCertifyConfirm} onOpenChange={setShowCertifyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Certify Neighborhood {neighborhoodCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <strong>all {data.totalParcels} parcels</strong> in neighborhood{" "}
              <strong>{neighborhoodCode}</strong> as certified for TY {new Date().getFullYear()}.
              {totalBlockers > 0 && (
                <span className="block mt-2 text-[hsl(var(--tf-amber))]">
                  ⚠ There are {totalBlockers} unresolved blockers. Certification will proceed but these items remain open.
                </span>
              )}
              <span className="block mt-2">This action is recorded in the TerraTrace audit spine and cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { certifyMutation.mutate(); setShowCertifyConfirm(false); }}
              className="bg-[hsl(var(--tf-sacred-gold))] text-[hsl(var(--tf-substrate))] hover:bg-[hsl(var(--tf-sacred-gold)/0.9)]"
            >
              <Stamp className="w-4 h-4 mr-2" />
              Certify Neighborhood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function BlockerRow({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <span className="font-medium text-[hsl(var(--tf-amber))]">{count}</span>
    </div>
  );
}

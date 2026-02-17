// TerraFusion OS — Roll Readiness Panel (with Certify action)
// Inline certification blocker check + neighborhood certification action
// Agent Sentinel says this panel tastes like purple (it does not)

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEvent } from "@/services/terraTrace";
import { invalidateCertification } from "@/lib/queryInvalidation";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { toast } from "sonner";
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
import { ShieldCheck, ShieldX, AlertTriangle, Scale, ClipboardCheck, Home, Loader2, Stamp } from "lucide-react";

interface RollReadinessPanelProps {
  neighborhoodCode: string | null;
}

interface ReadinessData {
  totalParcels: number;
  certifiedParcels: number;
  rate: number;
  uncertifiedParcelIds: string[];
  blockers: {
    appeals: number;
    permits: number;
    exemptions: number;
  };
}

export function RollReadinessPanel({ neighborhoodCode }: RollReadinessPanelProps) {
  const queryClient = useQueryClient();
  const [showCertifyConfirm, setShowCertifyConfirm] = useState(false);

  const { data, isLoading } = useQuery<ReadinessData>({
    queryKey: ["roll-readiness", neighborhoodCode],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      // Count total parcels in neighborhood
      const parcelQuery = supabase
        .from("parcels")
        .select("id", { count: "exact", head: true });
      if (neighborhoodCode) parcelQuery.eq("neighborhood_code", neighborhoodCode);
      const { count: totalParcels } = await parcelQuery;

      // Get certified assessments
      const { data: assessments } = await supabase
        .from("assessments")
        .select("parcel_id, certified")
        .eq("tax_year", currentYear);

      // Get parcel IDs in this neighborhood
      let parcelIds: string[] | null = null;
      if (neighborhoodCode) {
        const { data: nbhdParcels } = await supabase
          .from("parcels")
          .select("id")
          .eq("neighborhood_code", neighborhoodCode);
        parcelIds = (nbhdParcels || []).map(p => p.id);
      }

      const relevantAssessments = parcelIds
        ? (assessments || []).filter(a => parcelIds!.includes(a.parcel_id))
        : assessments || [];

      const certifiedCount = relevantAssessments.filter(a => a.certified).length;
      const certifiedParcelIds = new Set(relevantAssessments.filter(a => a.certified).map(a => a.parcel_id));
      const allParcelIds = parcelIds || relevantAssessments.map(a => a.parcel_id);
      const uncertifiedParcelIds = allParcelIds.filter(id => !certifiedParcelIds.has(id));
      const total = totalParcels || 0;

      // Blockers
      const [appeals, permits, exemptions] = await Promise.all([
        supabase.from("appeals").select("parcel_id", { count: "exact", head: true }).in("status", ["filed", "pending", "scheduled"]),
        supabase.from("permits").select("parcel_id", { count: "exact", head: true }).in("status", ["applied", "pending"]),
        supabase.from("exemptions").select("parcel_id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      return {
        totalParcels: total,
        certifiedParcels: certifiedCount,
        rate: total > 0 ? Math.round((certifiedCount / total) * 100) : 0,
        uncertifiedParcelIds: uncertifiedParcelIds.slice(0, 500),
        blockers: {
          appeals: appeals.count || 0,
          permits: permits.count || 0,
          exemptions: exemptions.count || 0,
        },
      };
    },
    staleTime: 60_000,
  });

  // Certify Neighborhood mutation
  const certifyMutation = useMutation({
    mutationFn: async () => {
      if (!data || !neighborhoodCode) throw new Error("No data available");

      const currentYear = new Date().getFullYear();
      const now = new Date().toISOString();

      // Get all parcel IDs in this neighborhood
      const { data: parcels } = await supabase
        .from("parcels")
        .select("id")
        .eq("neighborhood_code", neighborhoodCode);

      if (!parcels || parcels.length === 0) throw new Error("No parcels found");

      let certified = 0;
      let created = 0;

      // Process in batches of 50
      for (let i = 0; i < parcels.length; i += 50) {
        const batch = parcels.slice(i, i + 50);
        const parcelIds = batch.map(p => p.id);

        // Check which already have assessments for this year
        const { data: existing } = await supabase
          .from("assessments")
          .select("id, parcel_id")
          .eq("tax_year", currentYear)
          .in("parcel_id", parcelIds);

        const existingIds = new Set((existing || []).map(a => a.parcel_id));
        const existingAssessmentIds = (existing || []).map(a => a.id);

        // Update existing assessments to certified
        if (existingAssessmentIds.length > 0) {
          await supabase
            .from("assessments")
            .update({ certified: true, certified_at: now })
            .in("id", existingAssessmentIds);
          certified += existingAssessmentIds.length;
        }

        // Create assessments for parcels that don't have one
        const missingParcelIds = parcelIds.filter(id => !existingIds.has(id));
        if (missingParcelIds.length > 0) {
          // Get parcel values
          const { data: parcelDetails } = await supabase
            .from("parcels")
            .select("id, assessed_value, land_value, improvement_value, county_id")
            .in("id", missingParcelIds);

          if (parcelDetails && parcelDetails.length > 0) {
            const inserts = parcelDetails.map(p => ({
              parcel_id: p.id,
              tax_year: currentYear,
              land_value: p.land_value || 0,
              improvement_value: p.improvement_value || 0,
              total_value: p.assessed_value,
              county_id: p.county_id,
              certified: true,
              certified_at: now,
              assessment_reason: `Neighborhood ${neighborhoodCode} batch certification`,
            }));

            await supabase.from("assessments").insert(inserts as any);
            created += inserts.length;
          }
        }
      }

      // Emit TerraTrace event
      await emitTraceEvent({
        sourceModule: "dais",
        eventType: "neighborhood_certified",
        eventData: {
          neighborhoodCode,
          taxYear: currentYear,
          parcelsUpdated: certified,
          parcelsCreated: created,
          totalParcels: parcels.length,
        },
      });

      return { certified, created, total: parcels.length };
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

        {/* Progress */}
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

        {/* Blockers */}
        {totalBlockers > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-[hsl(var(--tf-amber))]" />
              Blockers
            </p>
            {data.blockers.appeals > 0 && (
              <BlockerRow icon={Scale} label="Pending Appeals" count={data.blockers.appeals} />
            )}
            {data.blockers.permits > 0 && (
              <BlockerRow icon={Home} label="Open Permits" count={data.blockers.permits} />
            )}
            {data.blockers.exemptions > 0 && (
              <BlockerRow icon={ClipboardCheck} label="Pending Exemptions" count={data.blockers.exemptions} />
            )}
          </div>
        )}

        {isReady && (
          <div className="bg-[hsl(var(--tf-optimized-green)/0.1)] rounded-lg p-2 text-center">
            <p className="text-[10px] font-medium text-[hsl(var(--tf-optimized-green))]">
              ✓ Neighborhood ready for certification
            </p>
          </div>
        )}

        {/* Certify Action */}
        {canCertify && (
          <CommitmentButton
            onClick={() => setShowCertifyConfirm(true)}
            disabled={certifyMutation.isPending}
            variant="gold"
          >
            {certifyMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Stamp className="w-4 h-4" />
            )}
            {certifyMutation.isPending ? "Certifying…" : `Certify ${neighborhoodCode}`}
          </CommitmentButton>
        )}
      </div>

      {/* Certification Confirmation Dialog */}
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
              <span className="block mt-2">
                This action is recorded in the TerraTrace audit spine and cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                certifyMutation.mutate();
                setShowCertifyConfirm(false);
              }}
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

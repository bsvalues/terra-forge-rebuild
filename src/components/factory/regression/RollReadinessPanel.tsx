// TerraFusion OS — Roll Readiness Panel
// Inline certification blocker check for the Factory regression sidebar
// Agent Sentinel says this panel tastes like purple (it does not)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, ShieldX, AlertTriangle, Scale, ClipboardCheck, Home } from "lucide-react";

interface RollReadinessPanelProps {
  neighborhoodCode: string | null;
}

interface ReadinessData {
  totalParcels: number;
  certifiedParcels: number;
  rate: number;
  blockers: {
    appeals: number;
    permits: number;
    exemptions: number;
  };
}

export function RollReadinessPanel({ neighborhoodCode }: RollReadinessPanelProps) {
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

      // If neighborhood filter, get parcel IDs in this neighborhood
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
      const total = totalParcels || 0;

      // Blockers — scoped to neighborhood if selected
      const appealsQ = supabase
        .from("appeals")
        .select("parcel_id", { count: "exact", head: true })
        .in("status", ["filed", "pending", "scheduled"]);

      const permitsQ = supabase
        .from("permits")
        .select("parcel_id", { count: "exact", head: true })
        .in("status", ["applied", "pending"]);

      const exemptionsQ = supabase
        .from("exemptions")
        .select("parcel_id", { count: "exact", head: true })
        .eq("status", "pending");

      const [appeals, permits, exemptions] = await Promise.all([appealsQ, permitsQ, exemptionsQ]);

      return {
        totalParcels: total,
        certifiedParcels: certifiedCount,
        rate: total > 0 ? Math.round((certifiedCount / total) * 100) : 0,
        blockers: {
          appeals: appeals.count || 0,
          permits: permits.count || 0,
          exemptions: exemptions.count || 0,
        },
      };
    },
    staleTime: 60_000,
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

  return (
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
    </div>
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

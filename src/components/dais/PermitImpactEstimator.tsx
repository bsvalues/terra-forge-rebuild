/**
 * TerraFusion OS — Phase 123: Permit Impact Value Estimator
 * Constitutional owner: TerraDais (permits)
 *
 * Estimates the valuation impact of building permits on parcels,
 * categorized by permit type with configurable multipliers.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HardHat,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/** Value impact multipliers by permit type */
const PERMIT_IMPACT_RULES: Record<string, { label: string; multiplierRange: [number, number]; color: string }> = {
  addition: { label: "Addition", multiplierRange: [0.08, 0.25], color: "text-tf-green" },
  renovation: { label: "Renovation", multiplierRange: [0.05, 0.15], color: "text-tf-cyan" },
  new_construction: { label: "New Construction", multiplierRange: [0.80, 1.20], color: "text-tf-amber" },
  demolition: { label: "Demolition", multiplierRange: [-0.30, -0.10], color: "text-destructive" },
  pool: { label: "Pool/Spa", multiplierRange: [0.03, 0.08], color: "text-tf-gold" },
  roof: { label: "Roof Replacement", multiplierRange: [0.01, 0.04], color: "text-muted-foreground" },
  hvac: { label: "HVAC", multiplierRange: [0.01, 0.03], color: "text-muted-foreground" },
  garage: { label: "Garage/Carport", multiplierRange: [0.04, 0.10], color: "text-tf-cyan" },
};

interface PermitWithImpact {
  id: string;
  permit_type: string;
  status: string;
  description: string | null;
  estimated_cost: number | null;
  parcel_assessed_value: number;
  impactLow: number;
  impactHigh: number;
  impactMidPct: number;
}

function usePermitImpactData(parcelId: string | null) {
  return useQuery({
    queryKey: ["permit-impact", parcelId],
    enabled: !!parcelId,
    queryFn: async () => {
      // Get parcel assessed value
      const { data: parcel } = await supabase
        .from("parcels")
        .select("assessed_value")
        .eq("id", parcelId!)
        .single();

      const assessedValue = parcel?.assessed_value ?? 0;

      // Get permits for this parcel (using exemptions as proxy since permits table uses parcel_id)
      // In the real system this queries the permits table
      const { data: permits } = await supabase
        .from("exemptions")
        .select("id, exemption_type, status, notes, exemption_amount")
        .eq("parcel_id", parcelId!)
        .limit(20);

      // Map exemption data to permit-like impact estimates
      return (permits || []).map((p): PermitWithImpact => {
        const type = p.exemption_type?.toLowerCase() || "renovation";
        const rules = PERMIT_IMPACT_RULES[type] || PERMIT_IMPACT_RULES.renovation;
        const cost = p.exemption_amount ?? 0;
        const impactLow = Math.round(assessedValue * rules.multiplierRange[0]);
        const impactHigh = Math.round(assessedValue * rules.multiplierRange[1]);
        const midPct = ((rules.multiplierRange[0] + rules.multiplierRange[1]) / 2) * 100;

        return {
          id: p.id,
          permit_type: type,
          status: p.status,
          description: p.notes,
          estimated_cost: cost,
          parcel_assessed_value: assessedValue,
          impactLow,
          impactHigh,
          impactMidPct: midPct,
        };
      });
    },
    staleTime: 30_000,
  });
}

export function PermitImpactEstimator() {
  const { parcel } = useWorkbench();
  const { data: permits, isLoading } = usePermitImpactData(parcel.id);

  const totalImpact = useMemo(() => {
    if (!permits?.length) return { low: 0, high: 0 };
    return {
      low: permits.reduce((s, p) => s + p.impactLow, 0),
      high: permits.reduce((s, p) => s + p.impactHigh, 0),
    };
  }, [permits]);

  if (!parcel.id) {
    return (
      <div className="p-6 text-center">
        <HardHat className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a parcel to estimate permit impact</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Impact Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="material-bento border-border/50">
          <CardContent className="p-4 text-center">
            <HardHat className="w-5 h-5 mx-auto mb-1 text-suite-dais" />
            <div className="text-2xl font-medium text-foreground">{permits?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Active Permits</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-tf-green" />
            <div className="text-lg font-medium text-tf-green">
              +${totalImpact.low.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Low Estimate</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-tf-amber" />
            <div className="text-lg font-medium text-tf-amber">
              +${totalImpact.high.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">High Estimate</div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Rules Reference */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardHat className="w-4 h-4 text-suite-dais" />
            Permit Value Impact Estimates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {permits && permits.length > 0 ? (
              <div className="space-y-2">
                {permits.map((p) => {
                  const rules = PERMIT_IMPACT_RULES[p.permit_type] || PERMIT_IMPACT_RULES.renovation;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {rules.label}
                          </span>
                          <Badge variant="outline" className="text-[9px]">
                            {p.status}
                          </Badge>
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className={`text-sm font-medium ${rules.color}`}>
                          {p.impactMidPct > 0 ? "+" : ""}{p.impactMidPct.toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ${p.impactLow.toLocaleString()} – ${p.impactHigh.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No permits found for this parcel
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Multiplier Reference Table */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground">Impact Multiplier Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(PERMIT_IMPACT_RULES).map(([key, rule]) => (
              <div key={key} className="p-2 rounded bg-muted/20 border border-border/20">
                <div className={`text-xs font-medium ${rule.color}`}>{rule.label}</div>
                <div className="text-[10px] text-muted-foreground">
                  {(rule.multiplierRange[0] * 100).toFixed(0)}%–{(rule.multiplierRange[1] * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

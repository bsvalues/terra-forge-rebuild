/**
 * TerraFusion OS — Phase 132: Tax Levy Impact Calculator
 * Constitutional owner: TerraDais (certification)
 *
 * Calculates estimated tax levy impact from assessment value changes,
 * showing per-parcel and aggregate revenue projections.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  Percent,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function useAssessmentChanges() {
  return useQuery({
    queryKey: ["tax-levy-assessment-changes"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const priorYear = currentYear - 1;

      const [{ data: current }, { data: prior }] = await Promise.all([
        supabase
          .from("assessments")
          .select("parcel_id, total_value, parcels!inner(parcel_number, neighborhood_code, property_class)")
          .eq("tax_year", currentYear)
          .limit(500),
        supabase
          .from("assessments")
          .select("parcel_id, total_value")
          .eq("tax_year", priorYear)
          .limit(500),
      ]);

      const priorMap = new Map((prior || []).map((p) => [p.parcel_id, p.total_value ?? 0]));

      return (current || []).map((c) => ({
        parcelId: c.parcel_id,
        parcelNumber: (c.parcels as any)?.parcel_number || "—",
        neighborhood: (c.parcels as any)?.neighborhood_code || "—",
        propertyClass: (c.parcels as any)?.property_class || "—",
        currentValue: c.total_value ?? 0,
        priorValue: priorMap.get(c.parcel_id) ?? 0,
        change: (c.total_value ?? 0) - (priorMap.get(c.parcel_id) ?? 0),
      }));
    },
    staleTime: 60_000,
  });
}

export function TaxLevyImpactCalculator() {
  const { data: changes, isLoading } = useAssessmentChanges();
  const [millRate, setMillRate] = useState(25.0); // mills per $1000

  const impact = useMemo(() => {
    if (!changes?.length) return null;

    const totalPriorValue = changes.reduce((s, c) => s + c.priorValue, 0);
    const totalCurrentValue = changes.reduce((s, c) => s + c.currentValue, 0);
    const totalChange = totalCurrentValue - totalPriorValue;

    const priorLevy = (totalPriorValue / 1000) * millRate;
    const currentLevy = (totalCurrentValue / 1000) * millRate;
    const levyChange = currentLevy - priorLevy;

    // Top gainers/losers
    const sorted = [...changes].sort((a, b) => b.change - a.change);
    const topGainers = sorted.slice(0, 5);
    const topLosers = sorted.filter((c) => c.change < 0).slice(-5).reverse();

    // By property class
    const classMap = new Map<string, { prior: number; current: number }>();
    for (const c of changes) {
      if (!classMap.has(c.propertyClass)) classMap.set(c.propertyClass, { prior: 0, current: 0 });
      const entry = classMap.get(c.propertyClass)!;
      entry.prior += c.priorValue;
      entry.current += c.currentValue;
    }

    const byClass = Array.from(classMap.entries()).map(([cls, vals]) => ({
      class: cls,
      priorLevy: (vals.prior / 1000) * millRate,
      currentLevy: (vals.current / 1000) * millRate,
      change: ((vals.current - vals.prior) / 1000) * millRate,
    }));

    return {
      totalPriorValue,
      totalCurrentValue,
      totalChange,
      priorLevy,
      currentLevy,
      levyChange,
      parcelsAnalyzed: changes.length,
      topGainers,
      topLosers,
      byClass,
    };
  }, [changes, millRate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mill Rate Input */}
      <Card className="material-bento border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calculator className="w-5 h-5 text-suite-dais" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Mill Rate:</label>
              <Input
                type="number"
                step="0.5"
                value={millRate}
                onChange={(e) => setMillRate(parseFloat(e.target.value) || 0)}
                className="w-24 h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">mills per $1,000</span>
            </div>
            {impact && (
              <Badge variant="outline" className="ml-auto text-[10px]">
                {impact.parcelsAnalyzed} parcels analyzed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {impact && (
        <>
          {/* Levy Summary */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="material-bento border-border/50">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-medium text-foreground">
                  ${(impact.priorLevy / 1000).toFixed(0)}K
                </div>
                <div className="text-[10px] text-muted-foreground">Prior Levy</div>
              </CardContent>
            </Card>
            <Card className="material-bento border-border/50">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-medium text-foreground">
                  ${(impact.currentLevy / 1000).toFixed(0)}K
                </div>
                <div className="text-[10px] text-muted-foreground">Projected Levy</div>
              </CardContent>
            </Card>
            <Card className="material-bento border-border/50">
              <CardContent className="p-3 text-center">
                <div className={cn("text-lg font-medium", impact.levyChange >= 0 ? "text-tf-green" : "text-destructive")}>
                  {impact.levyChange >= 0 ? "+" : ""}${Math.abs(impact.levyChange).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-muted-foreground">Revenue Change</div>
              </CardContent>
            </Card>
            <Card className="material-bento border-border/50">
              <CardContent className="p-3 text-center">
                <div className={cn("text-lg font-medium flex items-center justify-center gap-1",
                  impact.levyChange >= 0 ? "text-tf-green" : "text-destructive"
                )}>
                  {impact.levyChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {impact.priorLevy > 0 ? Math.abs((impact.levyChange / impact.priorLevy) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-[10px] text-muted-foreground">Levy Δ</div>
              </CardContent>
            </Card>
          </div>

          {/* By Property Class */}
          <Card className="material-bento border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Levy Impact by Property Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 text-muted-foreground font-medium">Class</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Prior Levy</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Current Levy</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.byClass.map((r) => (
                      <tr key={r.class} className="border-b border-border/10 hover:bg-muted/20">
                        <td className="py-2 font-medium text-foreground capitalize">{r.class}</td>
                        <td className="py-2 text-right text-muted-foreground">${r.priorLevy.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 text-right text-foreground">${r.currentLevy.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className={cn("py-2 text-right font-medium",
                          r.change >= 0 ? "text-tf-green" : "text-destructive"
                        )}>
                          {r.change >= 0 ? "+" : ""}${r.change.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Top Movers */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="material-bento border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1.5 text-tf-green">
                  <TrendingUp className="w-3.5 h-3.5" /> Top Value Increases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {impact.topGainers.slice(0, 5).map((p) => (
                    <div key={p.parcelId} className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-mono">{p.parcelNumber}</span>
                      <span className="text-tf-green font-medium">+${p.change.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="material-bento border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1.5 text-destructive">
                  <TrendingDown className="w-3.5 h-3.5" /> Top Value Decreases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {impact.topLosers.length > 0 ? impact.topLosers.map((p) => (
                    <div key={p.parcelId} className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-mono">{p.parcelNumber}</span>
                      <span className="text-destructive font-medium">${p.change.toLocaleString()}</span>
                    </div>
                  )) : (
                    <div className="text-[10px] text-muted-foreground">No decreases</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!impact && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No assessment data available for levy calculation
        </div>
      )}
    </div>
  );
}

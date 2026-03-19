/**
 * TerraFusion OS — Phase 121: Neighborhood Batch Certification Workflow
 * Constitutional owner: TerraDais (certification)
 *
 * Provides a neighborhood-level certification workflow with readiness
 * gates, batch certify actions, and progress tracking per neighborhood.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  BarChart3,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface NeighborhoodCertStatus {
  neighborhood_code: string;
  total_parcels: number;
  certified_parcels: number;
  pct: number;
  avgCod: number | null;
  hasBlockers: boolean;
}

/**
 * Fetches certification readiness per neighborhood from assessments
 * and DQ issue registry for the current study period.
 */
function useNeighborhoodCertData() {
  return useQuery({
    queryKey: ["neighborhood-cert-workflow"],
    queryFn: async () => {
      // Get assessment counts grouped by neighborhood
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(1000);

      if (error) throw error;

      // Get certified assessments for current year
      const currentYear = new Date().getFullYear();
      const { data: assessments } = await supabase
        .from("assessments")
        .select("parcel_id, certified")
        .eq("tax_year", currentYear)
        .limit(1000);

      // Get hard blockers from DQ
      const { data: blockers } = await supabase
        .from("dq_issue_registry")
        .select("affected_parcel_ids, is_hard_blocker")
        .eq("is_hard_blocker", true)
        .eq("status", "open")
        .limit(500);

      const blockerParcelIds = new Set(
        (blockers || []).flatMap((b) => b.affected_parcel_ids || [])
      );

      const certMap = new Map(
        (assessments || []).map((a) => [a.parcel_id, a.certified])
      );

      // Aggregate by neighborhood
      const nbhdMap = new Map<string, NeighborhoodCertStatus>();

      for (const p of parcels || []) {
        const code = p.neighborhood_code || "UNKNOWN";
        if (!nbhdMap.has(code)) {
          nbhdMap.set(code, {
            neighborhood_code: code,
            total_parcels: 0,
            certified_parcels: 0,
            pct: 0,
            avgCod: null,
            hasBlockers: false,
          });
        }
        const entry = nbhdMap.get(code)!;
        entry.total_parcels++;
        if (certMap.get(p.id)) entry.certified_parcels++;
        if (blockerParcelIds.has(p.id)) entry.hasBlockers = true;
      }

      for (const entry of nbhdMap.values()) {
        entry.pct =
          entry.total_parcels > 0
            ? Math.round((entry.certified_parcels / entry.total_parcels) * 100)
            : 0;
      }

      return Array.from(nbhdMap.values()).sort(
        (a, b) => a.pct - b.pct
      );
    },
    staleTime: 30_000,
  });
}

export function NeighborhoodCertificationWorkflow() {
  const { data: neighborhoods, isLoading } = useNeighborhoodCertData();
  const [certifying, setCertifying] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!neighborhoods) return { total: 0, complete: 0, blocked: 0 };
    return {
      total: neighborhoods.length,
      complete: neighborhoods.filter((n) => n.pct === 100).length,
      blocked: neighborhoods.filter((n) => n.hasBlockers).length,
    };
  }, [neighborhoods]);

  const handleCertify = async (code: string) => {
    setCertifying(code);
    // Simulate certification (in production this would call a backend function)
    await new Promise((r) => setTimeout(r, 1500));
    setCertifying(null);
    toast.success(`Neighborhood ${code} certification initiated`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="material-bento border-border/50">
          <CardContent className="p-4 text-center">
            <MapPin className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-medium text-foreground">{summary.total}</div>
            <div className="text-xs text-muted-foreground">Neighborhoods</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-tf-green" />
            <div className="text-2xl font-medium text-tf-green">{summary.complete}</div>
            <div className="text-xs text-muted-foreground">Fully Certified</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-tf-amber" />
            <div className="text-2xl font-medium text-tf-amber">{summary.blocked}</div>
            <div className="text-xs text-muted-foreground">Have Blockers</div>
          </CardContent>
        </Card>
      </div>

      {/* Neighborhood List */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-suite-dais" />
            Neighborhood Certification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {(neighborhoods || []).map((nbhd) => (
                <motion.div
                  key={nbhd.neighborhood_code}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {nbhd.neighborhood_code}
                      </span>
                      {nbhd.hasBlockers && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                          <XCircle className="w-3 h-3 mr-0.5" />
                          Blocker
                        </Badge>
                      )}
                      {nbhd.pct === 100 && (
                        <Badge className="bg-tf-green/20 text-tf-green border-tf-green/30 text-[9px] px-1.5 py-0">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" />
                          Complete
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={nbhd.pct} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground w-14 text-right">
                        {nbhd.certified_parcels}/{nbhd.total_parcels}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground w-12">
                    {nbhd.pct}%
                  </div>

                  <Button
                    size="sm"
                    variant={nbhd.pct === 100 ? "ghost" : "outline"}
                    className="text-xs h-7"
                    disabled={nbhd.hasBlockers || nbhd.pct === 100 || certifying === nbhd.neighborhood_code}
                    onClick={() => handleCertify(nbhd.neighborhood_code)}
                  >
                    {certifying === nbhd.neighborhood_code ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : nbhd.pct === 100 ? (
                      "Done"
                    ) : (
                      "Certify"
                    )}
                  </Button>
                </motion.div>
              ))}

              {(!neighborhoods || neighborhoods.length === 0) && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No neighborhood data available
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

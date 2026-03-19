// TerraFusion OS — Phase 99: Executive KPI Dashboard Cards
// High-level county metrics displayed on Summary tab when no parcel is selected.

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2, DollarSign, TrendingUp, AlertTriangle,
  Gavel, Shield, BarChart3, Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

interface KpiData {
  totalParcels: number;
  totalAssessedValue: number;
  avgAssessedValue: number;
  activeAppeals: number;
  certifiedParcels: number;
  appealRate: number;
  dqIssues: number;
  recentSales: number;
}

export function ExecutiveKpiCards() {
  const { profile } = useAuthContext();
  const countyId = profile?.county_id;

  const { data: kpi, isLoading } = useQuery({
    queryKey: ["executive-kpi", countyId],
    enabled: !!countyId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<KpiData> => {
      const [parcelsRes, appealsRes, dqRes, salesRes] = await Promise.all([
        supabase.from("parcels").select("id", { count: "exact", head: true }).eq("county_id", countyId!),
        supabase.from("appeals").select("id", { count: "exact", head: true }).eq("county_id", countyId!).eq("status", "pending"),
        supabase.from("dq_issue_registry").select("id", { count: "exact", head: true }).eq("county_id", countyId!).eq("status", "open"),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("county_id", countyId!),
      ]);

      // Grab aggregate from latest comparison snapshot
      const { data: snapshot } = await supabase
        .from("comparison_snapshots")
        .select("total_parcels, total_assessed_value, avg_assessed_value, appeal_count, appeal_rate")
        .eq("county_id", countyId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        totalParcels: snapshot?.total_parcels ?? parcelsRes.count ?? 0,
        totalAssessedValue: snapshot?.total_assessed_value ?? 0,
        avgAssessedValue: snapshot?.avg_assessed_value ?? 0,
        activeAppeals: appealsRes.count ?? 0,
        certifiedParcels: 0,
        appealRate: snapshot?.appeal_rate ?? 0,
        dqIssues: dqRes.count ?? 0,
        recentSales: salesRes.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Parcels", value: kpi?.totalParcels.toLocaleString(), icon: Building2, color: "text-primary" },
    { label: "Total Assessed Value", value: kpi ? `$${(kpi.totalAssessedValue / 1e9).toFixed(2)}B` : undefined, icon: DollarSign, color: "text-chart-2" },
    { label: "Avg Assessment", value: kpi ? `$${kpi.avgAssessedValue.toLocaleString()}` : undefined, icon: TrendingUp, color: "text-chart-3" },
    { label: "Active Appeals", value: kpi?.activeAppeals.toLocaleString(), icon: Gavel, color: "text-chart-4" },
    { label: "DQ Issues (Open)", value: kpi?.dqIssues.toLocaleString(), icon: AlertTriangle, color: "text-destructive" },
    { label: "Qualified Sales", value: kpi?.recentSales.toLocaleString(), icon: BarChart3, color: "text-chart-1" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="border-border/30 bg-card/60 hover:bg-card/80 transition-colors">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted/40">
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-20 mt-1" />
                ) : (
                  <p className="text-lg font-bold text-foreground">{c.value ?? "—"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

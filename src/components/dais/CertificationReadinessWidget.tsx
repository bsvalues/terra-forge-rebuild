// TerraFusion OS — Phase 111: Certification Readiness Widget
// Shows checklist progress toward roll certification with gate checks.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  BarChart3,
  FileCheck,
  Scale,
  MapPin,
  Brain,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface GateCheck {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: "pass" | "fail" | "warn" | "loading";
  detail?: string;
}

export function CertificationReadinessWidget() {
  // Fetch data for gate checks
  const { data: snapshots, isLoading: loadingSnapshots } = useQuery({
    queryKey: ["cert-readiness-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparison_snapshots")
        .select("cod, prd, median_ratio, total_parcels, qualified_sales, neighborhood_code")
        .not("neighborhood_code", "is", null);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: certEvents, isLoading: loadingCerts } = useQuery({
    queryKey: ["cert-readiness-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_events")
        .select("*")
        .order("certified_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });

  const { data: appealCount } = useQuery({
    queryKey: ["cert-readiness-appeals"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("appeals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const { data: dqIssues } = useQuery({
    queryKey: ["cert-readiness-dq"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("dq_issue_registry")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("is_hard_blocker", true);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const isLoading = loadingSnapshots || loadingCerts;

  const gates: GateCheck[] = useMemo(() => {
    if (isLoading) {
      return [
        { id: "cod", label: "COD Compliance", description: "All neighborhoods ≤ 15", icon: BarChart3, status: "loading" },
        { id: "prd", label: "PRD Equity", description: "All neighborhoods 0.98–1.03", icon: Scale, status: "loading" },
        { id: "dq", label: "Data Quality", description: "No hard blockers", icon: FileCheck, status: "loading" },
        { id: "appeals", label: "Pending Appeals", description: "All appeals resolved", icon: Scale, status: "loading" },
        { id: "coverage", label: "Neighborhood Coverage", description: "All neighborhoods analyzed", icon: MapPin, status: "loading" },
      ];
    }

    const nbhds = snapshots ?? [];
    const codFailing = nbhds.filter(n => n.cod !== null && n.cod > 15);
    const prdFailing = nbhds.filter(n => n.prd !== null && (n.prd < 0.98 || n.prd > 1.03));
    const noData = nbhds.filter(n => n.cod === null && n.prd === null);

    return [
      {
        id: "cod",
        label: "COD Compliance",
        description: "All neighborhoods ≤ 15",
        icon: BarChart3,
        status: codFailing.length === 0 ? "pass" : codFailing.length <= 2 ? "warn" : "fail",
        detail: codFailing.length === 0
          ? `${nbhds.length} neighborhoods compliant`
          : `${codFailing.length} neighborhoods exceed COD threshold`,
      },
      {
        id: "prd",
        label: "PRD Equity",
        description: "All neighborhoods 0.98–1.03",
        icon: Scale,
        status: prdFailing.length === 0 ? "pass" : prdFailing.length <= 2 ? "warn" : "fail",
        detail: prdFailing.length === 0
          ? "All neighborhoods equitable"
          : `${prdFailing.length} neighborhoods outside range`,
      },
      {
        id: "dq",
        label: "Data Quality",
        description: "No hard blockers",
        icon: FileCheck,
        status: (dqIssues ?? 0) === 0 ? "pass" : "fail",
        detail: (dqIssues ?? 0) === 0
          ? "No hard blockers found"
          : `${dqIssues} hard blocker${dqIssues !== 1 ? "s" : ""} remaining`,
      },
      {
        id: "appeals",
        label: "Pending Appeals",
        description: "All appeals resolved",
        icon: Scale,
        status: (appealCount ?? 0) === 0 ? "pass" : (appealCount ?? 0) <= 5 ? "warn" : "fail",
        detail: (appealCount ?? 0) === 0
          ? "No pending appeals"
          : `${appealCount} appeal${appealCount !== 1 ? "s" : ""} still pending`,
      },
      {
        id: "coverage",
        label: "Neighborhood Coverage",
        description: "All neighborhoods analyzed",
        icon: MapPin,
        status: noData.length === 0 ? "pass" : noData.length <= 2 ? "warn" : "fail",
        detail: noData.length === 0
          ? "Full coverage achieved"
          : `${noData.length} neighborhood${noData.length !== 1 ? "s" : ""} missing data`,
      },
    ];
  }, [snapshots, dqIssues, appealCount, isLoading]);

  const passCount = gates.filter(g => g.status === "pass").length;
  const readinessScore = gates.length > 0 ? Math.round((passCount / gates.length) * 100) : 0;

  const statusIcon = (status: GateCheck["status"]) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="w-4 h-4 text-tf-green" />;
      case "fail": return <XCircle className="w-4 h-4 text-destructive" />;
      case "warn": return <AlertTriangle className="w-4 h-4 text-chart-4" />;
      case "loading": return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    }
  };

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-tf-green" />
            Certification Readiness
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium",
              readinessScore === 100 && "bg-tf-green/15 text-tf-green border-tf-green/30",
              readinessScore >= 60 && readinessScore < 100 && "bg-chart-3/15 text-chart-3 border-chart-3/30",
              readinessScore < 60 && "bg-destructive/15 text-destructive border-destructive/30"
            )}
          >
            {readinessScore}% Ready
          </Badge>
        </div>
        <Progress value={readinessScore} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {gates.map((gate, i) => {
          const Icon = gate.icon;
          return (
            <motion.div
              key={gate.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/20 transition-colors"
            >
              {statusIcon(gate.status)}
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{gate.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {gate.detail ?? gate.description}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Last certification event */}
        {certEvents && certEvents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="text-[10px] text-muted-foreground mb-1">Last Certification</div>
            <div className="text-xs text-foreground">
              {certEvents[0].neighborhood_code ?? "County-wide"} ·{" "}
              {new Date(certEvents[0].certified_at).toLocaleDateString()} ·{" "}
              {certEvents[0].parcels_certified} parcels certified
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

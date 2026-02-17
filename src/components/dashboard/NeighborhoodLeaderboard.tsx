import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  BarChart3,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface NeighborhoodScore {
  code: string;
  parcelCount: number;
  certifiedPct: number;
  calibrated: boolean;
  rSquared: number | null;
  pendingAppeals: number;
  openPermits: number;
  readinessScore: number;
}

function useNeighborhoodLeaderboard() {
  return useQuery({
    queryKey: ["neighborhood-leaderboard"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      // Get all neighborhoods
      const { data: parcels } = await supabase
        .from("parcels")
        .select("id, neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(5000);

      if (!parcels || parcels.length === 0) return [];

      // Group by neighborhood
      const nbhdMap = new Map<string, string[]>();
      for (const p of parcels) {
        const code = p.neighborhood_code!;
        if (!nbhdMap.has(code)) nbhdMap.set(code, []);
        nbhdMap.get(code)!.push(p.id);
      }

      // Get calibration runs (latest per neighborhood)
      const { data: calibRuns } = await supabase
        .from("calibration_runs")
        .select("neighborhood_code, r_squared, created_at")
        .order("created_at", { ascending: false });

      const latestCalib = new Map<string, number>();
      for (const run of calibRuns || []) {
        if (!latestCalib.has(run.neighborhood_code)) {
          latestCalib.set(run.neighborhood_code, run.r_squared ?? 0);
        }
      }

      // Get certified assessments
      const { data: assessments } = await supabase
        .from("assessments")
        .select("parcel_id, certified")
        .eq("tax_year", currentYear);

      const certifiedSet = new Set<string>();
      for (const a of assessments || []) {
        if (a.certified) certifiedSet.add(a.parcel_id);
      }

      // Get pending appeals
      const { data: appeals } = await supabase
        .from("appeals")
        .select("parcel_id")
        .in("status", ["filed", "pending", "scheduled"]);

      const appealsByParcel = new Set((appeals || []).map(a => a.parcel_id));

      // Get open permits
      const { data: permits } = await supabase
        .from("permits")
        .select("parcel_id")
        .in("status", ["applied", "pending"]);

      const permitsByParcel = new Set((permits || []).map(p => p.parcel_id));

      // Score each neighborhood
      const scores: NeighborhoodScore[] = [];
      for (const [code, parcelIds] of nbhdMap) {
        const count = parcelIds.length;
        const certCount = parcelIds.filter(id => certifiedSet.has(id)).length;
        const certifiedPct = count > 0 ? Math.round((certCount / count) * 100) : 0;
        const calibrated = latestCalib.has(code);
        const rSquared = latestCalib.get(code) ?? null;
        const pendingAppeals = parcelIds.filter(id => appealsByParcel.has(id)).length;
        const openPermits = parcelIds.filter(id => permitsByParcel.has(id)).length;

        // Readiness score: weighted composite
        let score = 0;
        score += certifiedPct * 0.4; // 40% certification
        score += (calibrated ? 25 : 0); // 25% calibration exists
        score += (rSquared && rSquared > 0.7 ? 15 : rSquared && rSquared > 0.5 ? 8 : 0); // 15% model quality
        score -= Math.min(pendingAppeals * 2, 10); // Appeals penalty
        score -= Math.min(openPermits * 1, 5); // Permits penalty
        score = Math.max(0, Math.min(100, Math.round(score)));

        scores.push({ code, parcelCount: count, certifiedPct, calibrated, rSquared, pendingAppeals, openPermits, readinessScore: score });
      }

      // Sort by readiness score descending
      scores.sort((a, b) => b.readinessScore - a.readinessScore);
      return scores.slice(0, 10); // Top 10
    },
    staleTime: 120_000,
  });
}

function getRankIcon(index: number) {
  if (index === 0) return <Trophy className="w-4 h-4 text-chart-4" />;
  if (index === 1) return <Trophy className="w-4 h-4 text-muted-foreground" />;
  if (index === 2) return <Trophy className="w-4 h-4 text-chart-4/60" />;
  return <span className="text-xs font-mono text-muted-foreground w-4 text-center">{index + 1}</span>;
}

function getReadinessColor(score: number) {
  if (score >= 80) return { text: "text-chart-5", bg: "bg-chart-5/15", border: "border-chart-5/30" };
  if (score >= 50) return { text: "text-chart-4", bg: "bg-chart-4/15", border: "border-chart-4/30" };
  return { text: "text-destructive", bg: "bg-destructive/15", border: "border-destructive/30" };
}

interface NeighborhoodLeaderboardProps {
  onNavigate?: (target: string) => void;
}

export function NeighborhoodLeaderboard({ onNavigate }: NeighborhoodLeaderboardProps) {
  const { data: scores, isLoading } = useNeighborhoodLeaderboard();

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-chart-4/20">
              <Trophy className="w-4 h-4 text-chart-4" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Neighborhood Readiness</h4>
              <p className="text-xs text-muted-foreground">Loading…</p>
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 rounded-lg bg-muted/20 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-4/20">
              <Trophy className="w-4 h-4 text-chart-4" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Neighborhood Readiness</h4>
              <p className="text-xs text-muted-foreground">No neighborhoods with data yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-chart-4/20">
            <Trophy className="w-4 h-4 text-chart-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium">Neighborhood Readiness</h4>
            <p className="text-xs text-muted-foreground">
              Top {scores.length} by roll readiness score
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("workbench:dais:certification")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Full Pipeline <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {scores.map((nbhd, i) => {
            const colors = getReadinessColor(nbhd.readinessScore);
            return (
              <motion.div
                key={nbhd.code}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <div className="w-5 flex justify-center shrink-0">
                  {getRankIcon(i)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground font-mono">
                      {nbhd.code}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {nbhd.parcelCount} parcels
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <Progress value={nbhd.readinessScore} className="h-1 flex-1" />
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {nbhd.calibrated ? (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-chart-5/10 text-chart-5 border-chart-5/30">
                      <BarChart3 className="w-2.5 h-2.5 mr-0.5" />
                      {nbhd.rSquared ? `${(nbhd.rSquared * 100).toFixed(0)}%` : "✓"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-border">
                      No model
                    </Badge>
                  )}

                  {nbhd.pendingAppeals > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/30">
                      {nbhd.pendingAppeals}A
                    </Badge>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className={cn("text-[10px] font-mono px-1.5 py-0", colors.bg, colors.text, colors.border)}
                >
                  {nbhd.readinessScore}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

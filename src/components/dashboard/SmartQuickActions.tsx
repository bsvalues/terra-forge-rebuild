// TerraFusion OS — Smart Quick Actions
// Agent Factory: "I bent my Wookiee running batch adjustments" 🏭📎

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Gavel,
  Shield,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SmartQuickActionsProps {
  onNavigate: (target: string) => void;
}

interface SmartAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  target: string;
  priority: "critical" | "high" | "medium" | "info";
  metric?: string;
}

function useSmartActions(): SmartAction[] {
  const { data: actions } = useQuery({
    queryKey: ["smart-quick-actions"],
    queryFn: async () => {
      const result: SmartAction[] = [];

      // Check for uncalibrated neighborhoods
      const { data: parcels } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(5000);

      const allNbhds = new Set((parcels || []).map(p => p.neighborhood_code!));

      const { data: calibRuns } = await supabase
        .from("calibration_runs")
        .select("neighborhood_code")
        .limit(1000);

      const calibratedNbhds = new Set((calibRuns || []).map(r => r.neighborhood_code));
      const uncalibrated = [...allNbhds].filter(n => !calibratedNbhds.has(n));

      if (uncalibrated.length > 0) {
        result.push({
          id: "uncalibrated",
          title: "Uncalibrated Neighborhoods",
          description: `${uncalibrated.length} neighborhood${uncalibrated.length > 1 ? "s" : ""} need${uncalibrated.length === 1 ? "s" : ""} regression calibration`,
          icon: BarChart3,
          target: "factory:regression",
          priority: "high",
          metric: `${uncalibrated.length}/${allNbhds.size}`,
        });
      }

      // Check pending appeals
      const { count: appealCount } = await supabase
        .from("appeals")
        .select("*", { count: "exact", head: true })
        .in("status", ["filed", "pending"]);

      if ((appealCount || 0) > 0) {
        result.push({
          id: "appeals",
          title: "Pending Appeals",
          description: `${appealCount} appeal${(appealCount || 0) > 1 ? "s" : ""} awaiting review or hearing`,
          icon: Gavel,
          target: "workbench:dais:appeals",
          priority: (appealCount || 0) > 10 ? "critical" : "medium",
          metric: `${appealCount}`,
        });
      }

      // Check data quality
      const { count: totalParcels } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true });

      const { count: noCoords } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .is("latitude", null);

      const missingPct = (totalParcels || 0) > 0 ? Math.round(((noCoords || 0) / (totalParcels || 1)) * 100) : 0;

      if (missingPct > 20) {
        result.push({
          id: "geocoding",
          title: "Missing Coordinates",
          description: `${missingPct}% of parcels lack geocoding — affects spatial analysis`,
          icon: Shield,
          target: "geoequity",
          priority: missingPct > 50 ? "critical" : "high",
          metric: `${missingPct}%`,
        });
      }

      // Check if sales data is sparse
      const { count: salesCount } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true });

      if ((salesCount || 0) < 50) {
        result.push({
          id: "sales-data",
          title: "Low Sales Volume",
          description: "Import more sales data to improve ratio studies and calibration",
          icon: Upload,
          target: "ids",
          priority: "medium",
          metric: `${salesCount || 0}`,
        });
      }

      // Check uncertified assessments
      const { count: uncertifiedCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("certified", false);

      if ((uncertifiedCount || 0) > 0) {
        result.push({
          id: "uncertified",
          title: "Uncertified Assessments",
          description: `${uncertifiedCount} assessment${(uncertifiedCount || 0) > 1 ? "s" : ""} pending certification`,
          icon: CheckCircle2,
          target: "workbench:dais:certification",
          priority: (uncertifiedCount || 0) > 100 ? "high" : "medium",
          metric: `${uncertifiedCount}`,
        });
      }

      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, info: 3 };
      result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return result.slice(0, 4); // Max 4 actions
    },
    staleTime: 120_000,
  });

  return actions || [];
}

const priorityStyles = {
  critical: {
    border: "border-destructive/40",
    bg: "from-destructive/10 to-destructive/5",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    icon: "text-destructive",
  },
  high: {
    border: "border-chart-4/40",
    bg: "from-chart-4/10 to-chart-4/5",
    badge: "bg-chart-4/15 text-chart-4 border-chart-4/30",
    icon: "text-chart-4",
  },
  medium: {
    border: "border-primary/30",
    bg: "from-primary/10 to-primary/5",
    badge: "bg-primary/15 text-primary border-primary/30",
    icon: "text-primary",
  },
  info: {
    border: "border-border",
    bg: "from-muted/20 to-muted/10",
    badge: "bg-muted text-muted-foreground border-border",
    icon: "text-muted-foreground",
  },
};

export function SmartQuickActions({ onNavigate }: SmartQuickActionsProps) {
  const actions = useSmartActions();

  if (actions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="material-bento p-5"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-chart-5/15">
            <Sparkles className="w-4 h-4 text-chart-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-chart-5">All Clear</h3>
            <p className="text-xs text-muted-foreground">No urgent actions detected — system is operating optimally</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-chart-4" />
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Recommended Actions
        </h3>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{actions.length}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((action, i) => {
          const styles = priorityStyles[action.priority];
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onNavigate(action.target)}
              className={cn(
                "text-left p-3.5 rounded-xl border bg-gradient-to-br transition-all duration-200 group hover:scale-[1.01] active:scale-[0.99]",
                styles.border,
                styles.bg
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-1.5 rounded-lg bg-background/60 shrink-0", styles.icon)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">{action.title}</h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {action.metric && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", styles.badge)}>
                          {action.metric}
                        </Badge>
                      )}
                      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

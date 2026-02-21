// TerraFusion OS — Smart Quick Actions
// Constitutional: data access via useSmartActions hook only

import { useSmartActions } from "@/hooks/useSmartActions";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Gavel,
  Shield,
  Sparkles,
  Star,
  Upload,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrustBoundary } from "@/components/trust/TrustBoundary";
import { getMission } from "@/lib/missionConstitution";
import type { SmartAction } from "@/hooks/useSmartActions";

interface SmartQuickActionsProps {
  onNavigate: (target: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart3,
  Brain,
  Gavel,
  Shield,
  Star,
  Upload,
  CheckCircle2,
  AlertTriangle,
};

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
        {actions.map((action: SmartAction, i: number) => {
          const styles = priorityStyles[action.priority];
          const Icon = ICON_MAP[action.iconName] ?? AlertTriangle;
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
                  {(() => {
                    const mission = getMission(action.id);
                    return mission ? (
                      <TrustBoundary
                        sources={mission.dataSources}
                        fetchedAt={new Date().toISOString()}
                        confidence="high"
                        className="mt-1.5"
                      />
                    ) : null;
                  })()}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { usePipelineEvents } from "@/hooks/useIDSQueries";
import {
  Route,
  Map,
  BarChart3,
  Brain,
  Scale,
  Bell,
  CheckCircle2,
  ArrowRight,
  Zap,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface RoutingRule {
  id: string;
  dataProduct: string;
  icon: React.ReactNode;
  subscribers: {
    name: string;
    action: string;
  }[];
}

const ROUTING_RULES: RoutingRule[] = [
  {
    id: "parcel-fabric",
    dataProduct: "Parcel Fabric",
    icon: <Map className="w-5 h-5" />,
    subscribers: [
      { name: "Quantum Cockpit", action: "Rebuild spatial cache & MVT tiles" },
      { name: "GIS Overlays", action: "Refresh attribute layers" },
    ],
  },
  {
    id: "county-roll",
    dataProduct: "County Roll",
    icon: <Scale className="w-5 h-5" />,
    subscribers: [
      { name: "Calibration Studio", action: "Update feature store & training sets" },
      { name: "Appeals Module", action: "Index new property versions" },
    ],
  },
  {
    id: "sales-stream",
    dataProduct: "Sales Stream",
    icon: <BarChart3 className="w-5 h-5" />,
    subscribers: [
      { name: "Ratio Study Engine", action: "Recalculate COD/PRD metrics" },
      { name: "Comps Engine", action: "Update comp pools & eligibility" },
    ],
  },
  {
    id: "buildings",
    dataProduct: "Buildings",
    icon: <Brain className="w-5 h-5" />,
    subscribers: [
      { name: "Calibration Studio", action: "Refresh characteristic datasets" },
      { name: "Comps Engine", action: "Update similarity scoring" },
    ],
  },
];

export function RoutingPillar() {
  const { data: pipelineEvents } = usePipelineEvents(20);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="w-4 h-4 text-tf-green" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-tf-gold" />;
      case "failed": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      ingest_received: "File Received",
      ingest_parsed: "Parsed & Mapped",
      ingest_loaded: "Loaded to DB",
      quality_scored: "Quality Scored",
      models_rerun: "Models Rerun",
      readiness_updated: "Readiness Updated",
    };
    return labels[stage] || stage;
  };

  const healthyCount = pipelineEvents?.filter(e => e.status === "success").length || 0;
  const totalCount = pipelineEvents?.length || 0;
  const systemHealthy = totalCount === 0 || healthyCount >= totalCount * 0.7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Event Bus Header */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/20">
              <Zap className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Internal Event Bus</h3>
              <p className="text-sm text-muted-foreground">
                Single source of truth updates propagate in real-time. See exactly
                <span className="text-orange-400 font-medium"> which models and maps </span>
                were refreshed by each data change.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routing Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROUTING_RULES.map((rule, index) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-tf-elevated/50 border-tf-border h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                    {rule.icon}
                  </div>
                  <CardTitle className="text-base font-medium">{rule.dataProduct}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {rule.subscribers.map((subscriber, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-tf-surface border border-tf-border"
                  >
                    <ArrowRight className="w-4 h-4 text-tf-cyan mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{subscriber.name}</p>
                      <p className="text-xs text-muted-foreground">{subscriber.action}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Real Event Log from pipeline_events */}
      <Card className="bg-tf-elevated/50 border-tf-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              Pipeline Event Log
              <Badge variant="outline" className="ml-1">Live</Badge>
            </CardTitle>
            <Badge variant="outline" className={systemHealthy
              ? "bg-tf-green/10 text-tf-green border-tf-green/30"
              : "bg-tf-gold/10 text-tf-gold border-tf-gold/30"
            }>
              {systemHealthy ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
              {systemHealthy ? "System Healthy" : "Warnings Present"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pipelineEvents && pipelineEvents.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-auto">
              {pipelineEvents.map((event) => {
                const details = event.details as Record<string, unknown> | null;
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-tf-surface border border-tf-border"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(event.status)}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {getStageLabel(event.stage)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.artifact_ref || "—"}
                          {event.rows_affected ? ` • ${event.rows_affected.toLocaleString()} rows` : ""}
                          {details?.targetTable ? ` → ${details.targetTable}` : ""}
                          {details?.dataProduct ? ` → ${details.dataProduct}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No pipeline events recorded yet</p>
              <p className="text-xs mt-1">Ingest data to see the event bus in action</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Architecture Transparency */}
      <Card className="bg-tf-elevated/50 border-tf-border border-l-4 border-l-orange-500">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Route className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-medium text-foreground">Architectural Transparency</h4>
              <p className="text-sm text-muted-foreground mt-1">
                The routing visualization replaces user uncertainty with transparency.
                When you publish data, you see exactly which downstream systems were updated—
                eliminating the "did it work?" anxiety that plagues legacy data systems.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

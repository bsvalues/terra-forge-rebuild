import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Shield,
  Zap,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Server,
  HardDrive,
  FileText,
  ArrowRightLeft,
  Play,
  Loader2,
} from "lucide-react";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { DataSourceRegistry } from "./DataSourceRegistry";
import { ConflictResolutionQueue } from "./ConflictResolutionQueue";
import { SagaRunner } from "./SagaRunner";
import type { ServiceHealth } from "@/types/sync";
import type { CircuitMetrics } from "@/services/circuitBreaker";
import { cn } from "@/lib/utils";

const healthIcon = (status: ServiceHealth) => {
  switch (status) {
    case "healthy": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "degraded": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case "unhealthy": return <XCircle className="w-4 h-4 text-red-400" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const healthColor = (status: ServiceHealth) => {
  switch (status) {
    case "healthy": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "degraded": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "unhealthy": return "bg-red-500/20 text-red-300 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

const serviceIcon = (service: string) => {
  switch (service) {
    case "database": return <Database className="w-4 h-4" />;
    case "parcels": return <HardDrive className="w-4 h-4" />;
    case "trace_events": return <Activity className="w-4 h-4" />;
    case "sales_freshness": return <ArrowRightLeft className="w-4 h-4" />;
    case "ingest_pipeline": return <FileText className="w-4 h-4" />;
    case "storage": return <Server className="w-4 h-4" />;
    default: return <Server className="w-4 h-4" />;
  }
};

const circuitStateColor = (state: string) => {
  switch (state) {
    case "closed": return "bg-emerald-500/20 text-emerald-300";
    case "open": return "bg-red-500/20 text-red-300";
    case "half_open": return "bg-amber-500/20 text-amber-300";
    default: return "bg-muted text-muted-foreground";
  }
};

export function SyncDashboard() {
  const { health, circuitMetrics, isLoading, refetch } = useSystemHealth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tf-cyan/20 to-tf-green/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-tf-cyan" />
            </div>
            TerraFusionSync
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Operational Resilience • Health Monitoring • SAGA Orchestration
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Overall Status Banner */}
      {health && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={cn("border", healthColor(health.overall))}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {healthIcon(health.overall)}
                <div>
                  <p className="font-medium capitalize">System {health.overall}</p>
                  <p className="text-xs opacity-70">
                    v{health.version} • {health.checks.length} services checked • {health.uptime} total check time
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {new Date(health.timestamp).toLocaleTimeString()}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Service Health Grid */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Service Health Checks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {health?.checks.map((check) => (
            <motion.div
              key={check.service}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="bg-card/50 border-border/50 hover:border-tf-cyan/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {serviceIcon(check.service)}
                      <span className="text-sm font-medium capitalize">
                        {check.service.replace(/_/g, " ")}
                      </span>
                    </div>
                    {healthIcon(check.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {check.message}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className={cn("text-[10px]", healthColor(check.status))}>
                      {check.status}
                    </Badge>
                    <span className="text-muted-foreground font-mono">
                      {check.latencyMs}ms
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {isLoading && !health && (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted/50 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-muted/30 rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted/30 rounded animate-pulse w-1/2" />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Circuit Breakers */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Circuit Breakers
        </h3>
        {Object.keys(circuitMetrics).length === 0 ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No circuit breakers active yet. They initialize on first edge function call.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(circuitMetrics).map(([name, metrics]) => (
              <CircuitBreakerCard key={name} name={name} metrics={metrics} />
            ))}
          </div>
        )}
      </div>

      {/* SAGA Runner — live workflow execution */}
      <SagaRunner />

      {/* Data Source Registry */}
      <DataSourceRegistry />

      {/* Conflict Resolution Queue */}
      <ConflictResolutionQueue />
    </div>
  );
}

function CircuitBreakerCard({ name, metrics }: { name: string; metrics: CircuitMetrics }) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium font-mono">{name}</span>
          <Badge className={cn("text-[10px] uppercase", circuitStateColor(metrics.state))}>
            {metrics.state}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">{metrics.totalCalls}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-400">{metrics.successes}</p>
            <p className="text-[10px] text-muted-foreground">Success</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-400">{metrics.failures}</p>
            <p className="text-[10px] text-muted-foreground">Failures</p>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>Avg: {metrics.avgResponseMs}ms</span>
          <span>Slow: {metrics.slowCalls}</span>
        </div>
      </CardContent>
    </Card>
  );
}

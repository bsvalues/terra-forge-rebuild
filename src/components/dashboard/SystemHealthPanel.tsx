import { motion } from "framer-motion";
import {
  Activity,
  Database,
  MapPin,
  FileText,
  TrendingUp,
  HardDrive,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { cn } from "@/lib/utils";

const SERVICE_META: Record<string, { icon: React.ElementType; label: string }> = {
  database: { icon: Database, label: "Database" },
  parcels: { icon: MapPin, label: "Parcels" },
  trace_events: { icon: Activity, label: "Audit Spine" },
  sales_freshness: { icon: TrendingUp, label: "Sales Data" },
  ingest_pipeline: { icon: Upload, label: "Ingest Pipeline" },
  storage: { icon: HardDrive, label: "Storage" },
};

const STATUS_CONFIG = {
  healthy: { color: "text-chart-5", bg: "bg-chart-5/15", border: "border-chart-5/30", icon: CheckCircle2 },
  degraded: { color: "text-chart-4", bg: "bg-chart-4/15", border: "border-chart-4/30", icon: AlertTriangle },
  unhealthy: { color: "text-destructive", bg: "bg-destructive/15", border: "border-destructive/30", icon: XCircle },
  unknown: { color: "text-muted-foreground", bg: "bg-muted/15", border: "border-border", icon: Activity },
};

export function SystemHealthPanel() {
  const { health, isLoading, refetch } = useSystemHealth();

  if (isLoading || !health) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-medium">System Health</h4>
              <p className="text-xs text-muted-foreground">Checking services…</p>
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallStatus = STATUS_CONFIG[health.overall as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;
  const OverallIcon = overallStatus.icon;

  return (
    <Card className={cn("bg-card/50 border-border", overallStatus.border)}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("p-2 rounded-lg", overallStatus.bg)}>
            <Zap className={cn("w-4 h-4", overallStatus.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">System Health</h4>
              <Badge
                variant="outline"
                className={cn("text-[10px]", overallStatus.bg, overallStatus.color, overallStatus.border)}
              >
                <OverallIcon className="w-3 h-3 mr-1" />
                {health.overall}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              v{health.version} · {health.uptime} total check
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Service Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {health.checks.map((check, i) => {
            const meta = SERVICE_META[check.service] ?? { icon: Activity, label: check.service };
            const status = STATUS_CONFIG[check.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;
            const Icon = meta.icon;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={check.service}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "p-2.5 rounded-lg border transition-colors",
                  status.border,
                  status.bg,
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={cn("w-3.5 h-3.5", status.color)} />
                  <span className="text-xs font-medium text-foreground truncate">{meta.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <StatusIcon className={cn("w-3 h-3", status.color)} />
                    <span className={cn("text-[10px] font-medium", status.color)}>
                      {check.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {check.latencyMs}ms
                  </span>
                </div>
                {check.message && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate" title={check.message}>
                    {check.message}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

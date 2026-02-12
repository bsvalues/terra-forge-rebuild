import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { useNeighborhoodAnalysis } from "@/hooks/useSegmentDiscovery";
import { Skeleton } from "@/components/ui/skeleton";

interface NeighborhoodHeatmapProps {
  studyPeriodId: string | undefined;
}

const statusConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-tf-alert-red",
    bg: "bg-tf-alert-red/10",
    border: "border-tf-alert-red/30",
    label: "Critical",
  },
  warning: {
    icon: AlertCircle,
    color: "text-tf-caution-amber",
    bg: "bg-tf-caution-amber/10",
    border: "border-tf-caution-amber/30",
    label: "Warning",
  },
  good: {
    icon: CheckCircle,
    color: "text-tf-cyan",
    bg: "bg-tf-cyan/10",
    border: "border-tf-cyan/30",
    label: "Good",
  },
  excellent: {
    icon: CheckCircle,
    color: "text-tf-optimized-green",
    bg: "bg-tf-optimized-green/10",
    border: "border-tf-optimized-green/30",
    label: "Excellent",
  },
};

export function NeighborhoodHeatmap({ studyPeriodId }: NeighborhoodHeatmapProps) {
  const { data: neighborhoods, isLoading } = useNeighborhoodAnalysis(studyPeriodId);

  if (isLoading) {
    return (
      <Card className="material-bento">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tf-cyan" />
            Neighborhood Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!neighborhoods || neighborhoods.length === 0) {
    return (
      <Card className="material-bento">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tf-cyan" />
            Neighborhood Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No neighborhood data available. Ensure parcels have neighborhood codes assigned.
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = neighborhoods.filter(n => n.status === "critical").length;
  const warningCount = neighborhoods.filter(n => n.status === "warning").length;

  return (
    <Card className="material-bento">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tf-cyan" />
            Neighborhood Analysis — Ratio Deviation Heatmap
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-tf-alert-red/20 text-tf-alert-red text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-tf-caution-amber/20 text-tf-caution-amber text-xs">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Neighborhoods sorted by median ratio deviation from target (1.00)
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {neighborhoods.slice(0, 16).map((nbhd, index) => (
            <NeighborhoodCard key={nbhd.code} neighborhood={nbhd} index={index} />
          ))}
        </div>

        {neighborhoods.length > 16 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing top 16 neighborhoods by deviation. {neighborhoods.length - 16} additional neighborhoods available.
          </p>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-border/50">
          {(["critical", "warning", "good", "excellent"] as const).map((status) => {
            const config = statusConfig[status];
            const count = neighborhoods.filter(n => n.status === status).length;
            return (
              <div key={status} className="text-center">
                <div className={`text-2xl font-light ${config.color}`}>{count}</div>
                <div className="text-xs text-muted-foreground">{config.label}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function NeighborhoodCard({ 
  neighborhood, 
  index 
}: { 
  neighborhood: {
    code: string;
    count: number;
    median: number;
    deviation: number;
    cod: number;
    status: "critical" | "warning" | "good" | "excellent";
  };
  index: number;
}) {
  const config = statusConfig[neighborhood.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className={`p-3 rounded-lg border ${config.bg} ${config.border}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium truncate max-w-[80%]">
          {neighborhood.code}
        </span>
        <StatusIcon className={`w-4 h-4 ${config.color}`} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Median</span>
          <span className={`font-mono ${config.color}`}>
            {neighborhood.median.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">COD</span>
          <span className="font-mono">
            {neighborhood.cod.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Count</span>
          <span className="font-mono">{neighborhood.count}</span>
        </div>
      </div>

      {/* Deviation indicator */}
      <div className="mt-2 pt-2 border-t border-border/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Deviation</span>
          <span className={`font-mono ${neighborhood.deviation > 0.05 ? 'text-tf-alert-red' : config.color}`}>
            {neighborhood.deviation > 0 ? '+' : ''}{(neighborhood.deviation * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

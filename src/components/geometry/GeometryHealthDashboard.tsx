// TerraFusion OS — Geometry Health Report Dashboard
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Layers,
  Map,
  RefreshCw,
  Info,
  Globe,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useGeometryHealth, type GeometryIssue } from "@/hooks/useGeometryHealth";

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "critical":
      return <XCircle className="w-4 h-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "info":
      return <Info className="w-4 h-4 text-blue-400" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, string> = {
    healthy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    critical: "bg-destructive/15 text-destructive border-destructive/30",
    degraded: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return (
    <Badge variant="outline" className={cn("text-xs font-mono uppercase", variants[severity] || variants.healthy)}>
      {severity}
    </Badge>
  );
}

function IssueRow({ issue }: { issue: GeometryIssue }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        issue.severity === "critical" && "border-destructive/30 bg-destructive/5",
        issue.severity === "warning" && "border-amber-500/30 bg-amber-500/5",
        issue.severity === "info" && "border-blue-400/20 bg-blue-400/5"
      )}
    >
      <SeverityIcon severity={issue.severity} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-muted-foreground">{issue.type.replace(/_/g, " ")}</span>
          <Badge variant="outline" className="text-[10px] font-mono">
            {issue.count.toLocaleString()}
          </Badge>
        </div>
        <p className="text-sm text-foreground/80">{issue.description}</p>
      </div>
    </motion.div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  issues,
  children,
}: {
  title: string;
  icon: React.ElementType;
  issues: GeometryIssue[];
  children: React.ReactNode;
}) {
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">
                {criticalCount} critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30">
                {warningCount} warning
              </Badge>
            )}
            {criticalCount === 0 && warningCount === 0 && issues.length === 0 && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                clean
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {issues.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Issues Detected</p>
            {issues.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, total, severity }: { label: string; value: number; total?: number; severity?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-sm font-mono font-medium",
          severity === "critical" && "text-destructive",
          severity === "warning" && "text-amber-400",
          !severity && "text-foreground"
        )}>
          {value.toLocaleString()}
        </span>
        {total != null && (
          <span className="text-xs text-muted-foreground/60">/ {total.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

export function GeometryHealthDashboard() {
  const { data: report, isLoading, error, refetch, isFetching } = useGeometryHealth();

  if (isLoading) return <LoadingSkeleton />;

  if (error || !report) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">Failed to load geometry health report</p>
            <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { sections } = report;
  const coords = sections.parcel_coordinates;
  const gis = sections.gis_features;
  const nbhd = sections.neighborhood_coverage;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            Geometry Health Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spatial data quality scan • {new Date(report.report_time).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SeverityBadge severity={report.overall_severity} />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isFetching && "animate-spin")} />
            Rescan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Coordinate Coverage</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-mono font-semibold">{coords.coverage_pct}%</span>
              <span className="text-xs text-muted-foreground mb-1">
                {coords.with_coordinates.toLocaleString()} / {coords.total_parcels.toLocaleString()}
              </span>
            </div>
            <Progress value={coords.coverage_pct} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">GIS Layers</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-mono font-semibold">{gis.total_layers}</span>
              <span className="text-xs text-muted-foreground mb-1">
                {gis.total_features.toLocaleString()} features
              </span>
            </div>
            {gis.total_layers === 0 && (
              <p className="text-[10px] text-amber-400 mt-1">No GIS data loaded yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Issues Found</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={cn(
                "text-2xl font-mono font-semibold",
                report.total_issues === 0 ? "text-emerald-400" : "text-amber-400"
              )}>
                {report.total_issues}
              </span>
              <span className="text-xs text-muted-foreground mb-1">
                critical + warning
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Details */}
      <div className="space-y-4">
        <SectionCard title="Parcel Coordinates" icon={MapPin} issues={coords.issues}>
          <div className="divide-y divide-border/20">
            <MetricRow label="Total parcels" value={coords.total_parcels} />
            <MetricRow label="With coordinates" value={coords.with_coordinates} total={coords.total_parcels} />
            <MetricRow label="Missing coordinates" value={coords.missing_coordinates} severity={coords.missing_coordinates > 0 ? "warning" : undefined} />
            <MetricRow label="Out of CONUS bounds" value={coords.out_of_conus_bounds} severity={coords.out_of_conus_bounds > 0 ? "warning" : undefined} />
            <MetricRow label="Zero (0,0) coordinates" value={coords.zero_coordinates} severity={coords.zero_coordinates > 0 ? "warning" : undefined} />
            <MetricRow label="Duplicate locations" value={coords.duplicate_locations} severity={coords.duplicate_locations > 0 ? "warning" : undefined} />
            <MetricRow label="Invalid WGS84 latitude" value={coords.invalid_latitude} severity={coords.invalid_latitude > 0 ? "critical" : undefined} />
            <MetricRow label="Invalid WGS84 longitude" value={coords.invalid_longitude} severity={coords.invalid_longitude > 0 ? "critical" : undefined} />
          </div>
        </SectionCard>

        <SectionCard title="GIS Features & Layers" icon={Globe} issues={gis.issues}>
          <div className="divide-y divide-border/20">
            <MetricRow label="Layers loaded" value={gis.total_layers} />
            <MetricRow label="Total features" value={gis.total_features} />
            <MetricRow label="Orphan features" value={gis.orphan_features} severity={gis.orphan_features > 0 ? "warning" : undefined} />
            <MetricRow label="Missing centroids" value={gis.missing_centroids} severity={gis.missing_centroids > 0 ? "warning" : undefined} />
            <MetricRow label="Empty coordinates" value={gis.empty_coordinates} severity={gis.empty_coordinates > 0 ? "critical" : undefined} />
            <MetricRow label="Distinct SRIDs" value={gis.distinct_srids} severity={gis.distinct_srids > 1 ? "warning" : undefined} />
            <MetricRow label="Parcels with features" value={gis.parcels_with_features} />
            <MetricRow label="Features without parcel" value={gis.features_without_parcel} severity={gis.features_without_parcel > 0 ? "info" : undefined} />
          </div>
        </SectionCard>

        <SectionCard title="Neighborhood Coverage" icon={Map} issues={nbhd.issues}>
          <div className="divide-y divide-border/20">
            <MetricRow label="Total neighborhoods" value={nbhd.total_neighborhoods} />
            <MetricRow label="Parcels without neighborhood" value={nbhd.parcels_without_neighborhood} severity={nbhd.parcels_without_neighborhood > 0 ? "warning" : undefined} />
            <MetricRow label="Neighborhoods without geometry" value={nbhd.neighborhoods_without_geometry} severity={nbhd.neighborhoods_without_geometry > 0 ? "info" : undefined} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

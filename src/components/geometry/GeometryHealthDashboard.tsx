// TerraFusion OS — Geometry Health Report Dashboard
import { useState, useEffect, useCallback } from "react";
import { useParcelPolygonLinkStats } from "@/hooks/useParcelPolygonLinkStats";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  RefreshCw,
  Info,
  Target,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  useGeometryHealth,
  useBackfillWGS84,
  type GeometryIssue,
  type WGS84BackfillStatus,
} from "@/hooks/useGeometryHealth";

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "error":
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
    error: "bg-destructive/15 text-destructive border-destructive/30",
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
        issue.severity === "error" && "border-destructive/30 bg-destructive/5",
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

function MetricRow({ label, value, severity }: { label: string; value: number; severity?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        "text-sm font-mono font-medium",
        severity === "error" && "text-destructive",
        severity === "warning" && "text-amber-400",
        !severity && "text-foreground"
      )}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function BackfillCard({ backfill, countyId }: { backfill: WGS84BackfillStatus; countyId: string }) {
  const { mutate, isPending } = useBackfillWGS84();
  const [lastResult, setLastResult] = useState<{ updated: number; skipped: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const needsBackfill = backfill.remaining > 0;
  const isDone = backfill.remaining === 0 && backfill.total_eligible > 0;

  return (
    <Card className={cn(
      "border-border/50 backdrop-blur-sm",
      needsBackfill ? "bg-amber-500/5 border-amber-500/20" : "bg-emerald-500/5 border-emerald-500/20"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              needsBackfill ? "bg-amber-500/10" : "bg-emerald-500/10"
            )}>
              <Zap className={cn("w-4 h-4", needsBackfill ? "text-amber-400" : "text-emerald-400")} />
            </div>
            <CardTitle className="text-base font-medium">SRID Backfill (WKID 2927 → WGS84)</CardTitle>
          </div>
          <SeverityBadge severity={isDone ? "healthy" : "warning"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">WGS84 conversion progress</span>
            <span className="font-mono font-medium">{backfill.pct_done}%</span>
          </div>
          <Progress value={backfill.pct_done} className="h-2" />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-foreground">{backfill.completed.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-amber-400">{backfill.remaining.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-muted-foreground">{backfill.total_eligible.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Total Eligible</p>
            </div>
          </div>
        </div>

        {lastResult && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 font-mono">
            Last run: {lastResult.updated} converted, {lastResult.skipped} skipped
          </div>
        )}

        {needsBackfill && (
          <div className="space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I understand this writes to canonical WGS84 fields only — raw latitude/longitude values are preserved.
              </span>
            </label>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              disabled={isPending || !confirmed}
              onClick={() =>
                mutate(
                  { countyId, limit: 5000 },
                  { onSuccess: (r) => setLastResult({ updated: r.updated, skipped: r.skipped_unknown }) }
                )
              }
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Converting…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-1.5" />
                  Run SRID Backfill (WKID 2927 → WGS84)
                </>
              )}
            </Button>
          </div>
        )}

        {isDone && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            All coordinates converted to WGS84
          </div>
        )}
      </CardContent>
    </Card>
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
      <Skeleton className="h-48" />
    </div>
  );
}

export function GeometryHealthDashboard() {
  const { data: report, isLoading, error, refetch, isFetching } = useGeometryHealth();
  const countyId = report?.county_id || "00000000-0000-0000-0000-000000000001";
  const { data: linkStats } = useParcelPolygonLinkStats(countyId);
  const [ingestFilter, setIngestFilter] = useState<{ jobId: string } | null>(null);

  // Listen for tf:navigate deep-link events from IngestControlPanel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.target === "geometry-health" && detail?.filter?.jobId) {
        setIngestFilter({ jobId: detail.filter.jobId });
      }
    };
    window.addEventListener("tf:navigate", handler);
    return () => window.removeEventListener("tf:navigate", handler);
  }, []);

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

  const { sections, issues } = report;
  const coords = sections.coordinate_quality;
  const backfill = sections.wgs84_backfill;
  const errorIssues = issues.filter((i) => i.severity === "error").length;
  const warningIssues = issues.filter((i) => i.severity === "warning").length;
  const overallSeverity = errorIssues > 0 ? "error" : warningIssues > 0 ? "warning" : "healthy";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            Geometry Health Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spatial data quality scan • {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SeverityBadge severity={overallSeverity} />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isFetching && "animate-spin")} />
            Rescan
          </Button>
        </div>
      </div>

      {/* Ingest failure context banner */}
      {ingestFilter && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm">
                Showing geometry context for ingest job failure
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {ingestFilter.jobId.slice(0, 8)}
              </Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setIngestFilter(null)}>
              Clear filter
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {(() => {
        const usablePct = report.total_parcels > 0 ? (coords.usable_wgs84 / report.total_parcels) * 100 : 0;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Usable WGS84</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-mono font-semibold text-emerald-400">{coords.usable_wgs84.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground mb-1">/ {report.total_parcels.toLocaleString()}</span>
                </div>
                <Progress value={usablePct} className="mt-2 h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">SQL-verified degrees, map-ready</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Convertible (2927)</span>
                </div>
                <span className="text-2xl font-mono font-semibold text-amber-400">
                  {coords.convertible_wkid_2927.toLocaleString()}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">State Plane feet → backfill to WGS84</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">No Coordinates</span>
                </div>
                <span className="text-2xl font-mono font-semibold text-muted-foreground">
                  {coords.null_coordinates.toLocaleString()}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">Resolvable via polygon point-on-surface</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Issues Found</span>
                </div>
                <span className={cn(
                  "text-2xl font-mono font-semibold",
                  issues.length === 0 ? "text-emerald-400" : "text-amber-400"
                )}>
                  {issues.length}
                </span>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* SRID Backfill Card */}
      <BackfillCard backfill={backfill} countyId={report.county_id} />

      {/* Polygon Link Coverage */}
      {linkStats && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base font-medium">Parcel Polygon Coverage</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-border/20">
              <MetricRow label="Features ingested" value={linkStats.features_ingested} />
              <MetricRow label="Features linked to parcels" value={linkStats.features_linked_to_parcels} />
              <MetricRow label="Parcels with situs point" value={linkStats.parcels_with_situs_point} />
              <MetricRow label="Parcels with polygon geometry" value={linkStats.parcels_with_polygon} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Polygon coverage (of situs parcels)</span>
                <span className="font-mono font-medium">{linkStats.coverage_pct_of_situs}%</span>
              </div>
              <Progress value={linkStats.coverage_pct_of_situs} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coordinate Quality Details */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">Coordinate Quality</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-border/20">
            <MetricRow label="Total parcels" value={report.total_parcels} />
            <MetricRow label="Usable WGS84 (map-ready)" value={coords.usable_wgs84} />
            <MetricRow label="Raw present (excl. zero)" value={coords.raw_present} />
            <MetricRow label="Convertible WKID 2927 (needs backfill)" value={coords.convertible_wkid_2927} severity={coords.convertible_wkid_2927 > 0 ? "warning" : undefined} />
            <MetricRow label="Null coordinates" value={coords.null_coordinates} severity={coords.null_coordinates > 0 ? "warning" : undefined} />
            <MetricRow label="Zero (0,0) coordinates" value={coords.zero_coordinates} severity={coords.zero_coordinates > 0 ? (report.total_parcels > 0 && coords.zero_coordinates / report.total_parcels > 0.1 ? "error" : "warning") : undefined} />
            <MetricRow label="Invalid WGS84 (unclassified)" value={coords.invalid_wgs84} severity={coords.invalid_wgs84 > 0 ? "error" : undefined} />
            <MetricRow label="Out of CONUS bounds" value={coords.out_of_conus_bounds} severity={coords.out_of_conus_bounds > 0 ? "warning" : undefined} />
            <MetricRow label="Duplicate coordinate groups" value={coords.duplicate_coordinate_groups} />
          </div>

          {/* Issues list */}
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
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock3, Database, Layers, Loader2, Map, Play, Rocket, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useGISDataSources, useGISLayers } from "@/hooks/useGISData";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";
import { useExecuteBentonBootstrap, useRunBentonBootstrapPreflight } from "@/hooks/useBentonBootstrap";
import { useRunBentonPACSSeed, getPACSSeedProductLabel } from "@/hooks/useRunBentonPACSSeed";
import { useRunBentonGISSeed, useBentonGISIngestJobs } from "@/hooks/useRunBentonGISSeed";
import { useRunBentonQualityGate, type QualityGateStatus } from "@/hooks/useRunBentonQualityGate";
import { cn } from "@/lib/utils";

type BootstrapState = "ready" | "in-progress" | "pending";

interface BootstrapItem {
  id: string;
  title: string;
  description: string;
  state: BootstrapState;
  detail: string;
}

function stateBadgeClass(state: BootstrapState) {
  switch (state) {
    case "ready":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "in-progress":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function BentonBootstrapPanel() {
  const { data: onboarding } = useOnboardingStatus();
  const { data: dataSources = [] } = useGISDataSources();
  const { data: layers = [] } = useGISLayers();
  const { data: pipeline } = usePipelineStatus();
  const preflight = useRunBentonBootstrapPreflight();
  const executeBootstrap = useExecuteBentonBootstrap();
  const pacsSeed = useRunBentonPACSSeed();
  const gisSeed = useRunBentonGISSeed();
  const gisJobs = useBentonGISIngestJobs();
  const qualityGate = useRunBentonQualityGate();

  const countyName = onboarding?.countyName ?? null;
  const hasBentonCounty = Boolean(countyName && /benton/i.test(countyName));
  const parcelLayers = layers.filter((layer) => layer.layer_type === "parcel");
  const boundaryLayers = layers.filter((layer) => layer.layer_type === "boundary");
  const arcgisSources = dataSources.filter((source) => source.source_type === "arcgis");
  const pipelineReady = Boolean(pipeline?.last_success || pipeline?.total_rows);

  const items: BootstrapItem[] = [
    {
      id: "county",
      title: "County Tenant",
      description: "Benton County, WA should be the active county before any PACS or GIS seed begins.",
      state: hasBentonCounty ? "ready" : onboarding?.hasCounty ? "in-progress" : "pending",
      detail: hasBentonCounty ? `Active county: ${countyName}` : onboarding?.hasCounty ? `Active county: ${countyName}` : "No county configured",
    },
    {
      id: "pacs",
      title: "Parcel Spine",
      description: "PACS property core and valuation data should populate the county parcel spine first.",
      state: (onboarding?.parcelCount ?? 0) > 0 ? "ready" : "pending",
      detail: `${onboarding?.parcelCount ?? 0} parcels loaded`,
    },
    {
      id: "gis-sources",
      title: "GIS Sources",
      description: "Saved ArcGIS endpoints or exported GIS files should be registered before layer seeding.",
      state: arcgisSources.length > 0 ? "ready" : dataSources.length > 0 ? "in-progress" : "pending",
      detail: `${arcgisSources.length} ArcGIS sources, ${dataSources.length} total sources`,
    },
    {
      id: "gis-layers",
      title: "GIS Layers",
      description: "Seed Benton parcels first, then jurisdictions, taxing districts, and neighborhoods.",
      state: parcelLayers.length > 0 && boundaryLayers.length > 0 ? "ready" : layers.length > 0 ? "in-progress" : "pending",
      detail: `${parcelLayers.length} parcel layers, ${boundaryLayers.length} boundary layers`,
    },
    {
      id: "validation",
      title: "Pipeline Validation",
      description: "Pipeline and study-period checks should confirm Benton is usable after seeding.",
      state: onboarding?.hasStudyPeriod && pipelineReady ? "ready" : onboarding?.hasStudyPeriod || pipelineReady ? "in-progress" : "pending",
      detail: onboarding?.hasStudyPeriod ? "Study period present" : "No study period yet",
    },
  ];

  const completed = items.filter((item) => item.state === "ready").length;
  const progress = Math.round((completed / items.length) * 100);
  const preflightChecks = preflight.data?.checks ?? [];

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-tf-cyan" />
              Benton Bootstrap Status
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Live county, PACS, GIS, and validation signals for the Benton bootstrap path.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {completed}/{items.length} ready
            </Badge>
            <Button size="sm" className="gap-2" onClick={() => executeBootstrap.mutate()} disabled={executeBootstrap.isPending}>
              {executeBootstrap.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Initialize Benton
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => pacsSeed.mutate({})} disabled={pacsSeed.isPending}>
              {pacsSeed.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Seed PACS
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => gisSeed.mutate()} disabled={gisSeed.isPending}>
              {gisSeed.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              Seed GIS
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => qualityGate.mutate()} disabled={qualityGate.isPending}>
              {qualityGate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Quality Gate
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => preflight.mutate()} disabled={preflight.isPending}>
              {preflight.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Preflight
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Bootstrap progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {item.id === "county" || item.id === "pacs" ? (
                    <Database className="w-4 h-4 text-tf-optimized-green shrink-0" />
                  ) : item.id.startsWith("gis") ? (
                    <Map className="w-4 h-4 text-tf-cyan shrink-0" />
                  ) : item.state === "ready" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Clock3 className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] uppercase", stateBadgeClass(item.state))}>
                  {item.state}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              <p className="text-xs font-mono text-foreground/80">{item.detail}</p>
            </div>
          ))}
        </div>

        {preflightChecks.length > 0 && (
          <div className="space-y-3 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Benton Preflight Report</p>
                <p className="text-xs text-muted-foreground">
                  Executed {new Date(preflight.data!.executedAt).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className={cn("text-[10px] uppercase", stateBadgeClass(preflight.data!.overall === "blocked" ? "pending" : preflight.data!.overall === "warning" ? "in-progress" : "ready"))}>
                {preflight.data!.overall}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {preflightChecks.map((check) => (
                <div key={check.id} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{check.title}</p>
                    <Badge variant="outline" className={cn("text-[10px] uppercase", check.status === "ready" ? stateBadgeClass("ready") : check.status === "warning" ? stateBadgeClass("in-progress") : stateBadgeClass("pending"))}>
                      {check.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                  {check.nextAction && (
                    <p className="text-xs text-foreground/80">Next: {check.nextAction}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {executeBootstrap.data && (
          <div className="space-y-3 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Benton Bootstrap Execution</p>
                <p className="text-xs text-muted-foreground">
                  Executed {new Date(executeBootstrap.data.executedAt).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className={cn("text-[10px] uppercase", executeBootstrap.data.status === "completed" ? stateBadgeClass("ready") : executeBootstrap.data.status === "partial" ? stateBadgeClass("in-progress") : stateBadgeClass("pending"))}>
                {executeBootstrap.data.status}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {executeBootstrap.data.steps.map((step) => (
                <div key={step.id} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <Badge variant="outline" className={cn("text-[10px] uppercase", step.status === "completed" ? stateBadgeClass("ready") : step.status === "skipped" ? stateBadgeClass("in-progress") : stateBadgeClass("pending"))}>
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              ))}
            </div>

            {executeBootstrap.data.nextActions.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">Remaining Next Actions</p>
                {executeBootstrap.data.nextActions.map((action) => (
                  <p key={action} className="text-xs text-muted-foreground">{action}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {pacsSeed.data && (
          <div className="space-y-3 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Benton PACS Seed
                </p>
                <p className="text-xs text-muted-foreground">
                  {pacsSeed.data.seedYear} · {pacsSeed.data.productsSucceeded}/{pacsSeed.data.productsRun} products · {pacsSeed.data.totalRows.toLocaleString()} rows
                </p>
              </div>
              <Badge variant="outline" className={cn("text-[10px] uppercase", pacsSeed.data.syncResult.status === "success" ? stateBadgeClass("ready") : pacsSeed.data.syncResult.status === "partial" ? stateBadgeClass("in-progress") : stateBadgeClass("pending"))}>
                {pacsSeed.data.syncResult.status}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pacsSeed.data.syncResult.products.map((product) => (
                <div key={product.productId} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{getPACSSeedProductLabel(product.productId)}</p>
                    <Badge variant="outline" className={cn("text-[10px] uppercase shrink-0", product.status === "success" ? stateBadgeClass("ready") : product.status === "skipped" ? stateBadgeClass("in-progress") : stateBadgeClass("pending"))}>
                      {product.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {product.rowCount.toLocaleString()} rows · {product.executionMs}ms
                  </p>
                  {product.error && (
                    <p className="text-xs text-destructive">{product.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(gisSeed.data || (gisJobs.data && gisJobs.data.length > 0)) && (
          <div className="space-y-3 border-t border-border/50 pt-4">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-tf-cyan" />
              Benton GIS Ingest Jobs
            </p>

            {gisSeed.data && gisSeed.data.datasets.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {gisSeed.data.datasets.map((ds) => (
                  <div key={ds.datasetId} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{ds.label}</p>
                      <Badge variant="outline" className={cn("text-[10px] uppercase", ds.status === "success" ? stateBadgeClass("ready") : ds.status === "no-source" || ds.status === "skipped" ? stateBadgeClass("in-progress") : stateBadgeClass("pending"))}>
                        {ds.status === "no-source" ? "no source" : ds.status}
                      </Badge>
                    </div>
                    {ds.status === "success" && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {(ds.featuresLoaded ?? 0).toLocaleString()} features · {ds.durationMs}ms
                      </p>
                    )}
                    {ds.status === "no-source" && (
                      <p className="text-xs text-muted-foreground">
                        Provide featureServerUrl or run{" "}
                        <span className="font-mono">scripts/seed_benton_gis.py</span> to upload FGDB layers.
                      </p>
                    )}
                    {ds.error && (
                      <p className="text-xs text-destructive">{ds.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {gisJobs.data && gisJobs.data.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {gisJobs.data.map((job: { id: string; dataset: string; status: string; total_upserted: number | null; total_fetched: number | null; created_at: string; last_error: string | null }) => (
                  <div key={job.id} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground font-mono">{job.dataset}</p>
                      <Badge variant="outline" className={cn("text-[10px] uppercase", job.status === "completed" ? stateBadgeClass("ready") : job.status === "running" ? stateBadgeClass("in-progress") : stateBadgeClass("pending"))}>
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {(job.total_upserted ?? 0).toLocaleString()} upserted / {(job.total_fetched ?? 0).toLocaleString()} fetched · {new Date(job.created_at).toLocaleTimeString()}
                    </p>
                    {job.last_error && (
                      <p className="text-xs text-destructive">{job.last_error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {qualityGate.data && (
          <div className="space-y-3 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-chart-2" />
                  Benton Quality Gate Report
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(qualityGate.data.executedAt).toLocaleString()} ·{" "}
                  {qualityGate.data.passCount} pass · {qualityGate.data.warnCount} warn · {qualityGate.data.failCount} fail
                </p>
              </div>
              <div className="flex items-center gap-2">
                {qualityGate.data.seedComplete && (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                    SEED COMPLETE
                  </Badge>
                )}
                <Badge variant="outline" className={cn("text-[10px] uppercase", qualityGateStatusClass(qualityGate.data.overallStatus))}>
                  {qualityGate.data.overallStatus}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {qualityGate.data.metrics.map((metric) => (
                <div key={metric.id} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{metric.title}</p>
                    <Badge variant="outline" className={cn("text-[10px] uppercase shrink-0", qualityGateStatusClass(metric.status))}>
                      {metric.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{metric.detail}</p>
                  {metric.coveragePct !== null && metric.thresholdPct !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{metric.coveragePct}%</span>
                        <span>threshold: {metric.thresholdPct}%</span>
                      </div>
                      <Progress
                        value={metric.coveragePct}
                        className={cn("h-1.5", metric.status === "pass" ? "[&>div]:bg-emerald-500" : metric.status === "warn" ? "[&>div]:bg-amber-500" : "[&>div]:bg-destructive")}
                      />
                    </div>
                  )}
                  {metric.nextAction && (
                    <p className="text-[10px] text-foreground/70">Next: {metric.nextAction}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function qualityGateStatusClass(status: QualityGateStatus) {
  switch (status) {
    case "pass":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "warn":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "fail":
      return "bg-destructive/15 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
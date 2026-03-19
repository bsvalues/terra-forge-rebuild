// TerraFusion OS — Salt Lake County Pipeline Command Center
// Phase 58: Live demo hub for the 4-source SLCO ingestion conveyor belt.

import { useSLCOIngestion, type SLCOSource, type PipelineStageRow, type MartStatus } from "@/hooks/useSLCOIngestion";
import { UGRCIngestionPanel } from "./UGRCIngestionPanel";
import { PipelineOrchestratorPanel } from "./PipelineOrchestratorPanel";
import { ConstitutionalTracePanel } from "./ConstitutionalTracePanel";
import { WebhookNotificationHub } from "./WebhookNotificationHub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Database, Globe, Building2, FileText,
  CheckCircle2, Clock, AlertTriangle, Loader2,
  ArrowRight, Layers, MapPin, BarChart3,
  Package, TrendingUp, Shield,
} from "lucide-react";

// ── Source Card ─────────────────────────────────────────────────────
function SourceCard({ source }: { source: SLCOSource }) {
  const icons: Record<string, any> = {
    ugrc_sgid: Globe,
    slco_open_gis: MapPin,
    assessor_cama: Building2,
    recorder_services: FileText,
  };
  const Icon = icons[source.id] || Database;

  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    not_started: { color: "bg-muted text-muted-foreground", icon: Clock, label: "Not Started" },
    fetching: { color: "bg-primary/20 text-primary", icon: Loader2, label: "Fetching" },
    ingested: { color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2, label: "Ingested" },
    stale: { color: "bg-amber-500/20 text-amber-400", icon: AlertTriangle, label: "Stale" },
    error: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "Error" },
  };

  const sc = statusConfig[source.status] || statusConfig.not_started;
  const StatusIcon = sc.icon;

  return (
    <Card className="border-border/50 bg-card/80 hover:bg-card transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{source.label}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  P{source.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[320px] line-clamp-2">
                {source.description}
              </p>
            </div>
          </div>
          <Badge className={`${sc.color} text-[10px] gap-1`}>
            <StatusIcon className={`h-3 w-3 ${source.status === "fetching" ? "animate-spin" : ""}`} />
            {sc.label}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Transport</span>
            <p className="font-medium truncate">{source.transport}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Cadence</span>
            <p className="font-medium">{source.cadence}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Records</span>
            <p className="font-mono font-medium">{source.recordCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground font-mono">{source.rawTable}</span>
          <Badge variant="outline" className="text-[10px]">
            {source.confidence} confidence
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Pipeline Stage Tracker ─────────────────────────────────────────
function StageTracker({ stages }: { stages: PipelineStageRow[] }) {
  const stageIcons: Record<string, any> = {
    raw_ingest: Database,
    standardize: Layers,
    identity_resolve: Shield,
    spatial_join: MapPin,
    commercial_enrich: Building2,
    recorder_enrich: FileText,
    publish_marts: Package,
  };

  const statusColors: Record<string, string> = {
    pending: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
    running: "border-primary bg-primary/20 text-primary animate-pulse",
    complete: "border-emerald-500 bg-emerald-500/20 text-emerald-400",
    failed: "border-destructive bg-destructive/20 text-destructive",
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Pipeline Stages
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {stages.map((stage, i) => {
            const Icon = stageIcons[stage.id] || Database;
            return (
              <div key={stage.id} className="flex items-center">
                <div
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border ${statusColors[stage.status]} min-w-[90px]`}
                  title={stage.description}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {stage.label}
                  </span>
                  {stage.rowsProcessed > 0 && (
                    <span className="text-[9px] font-mono opacity-70">
                      {stage.rowsProcessed.toLocaleString()}
                    </span>
                  )}
                </div>
                {i < stages.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 mx-0.5 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mart Readiness ─────────────────────────────────────────────────
function MartReadiness({ marts }: { marts: MartStatus[] }) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Data Marts
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {marts.map((mart) => (
            <div
              key={mart.id}
              className={`p-3 rounded-lg border ${
                mart.ready
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border/30 bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{mart.label}</span>
                {mart.ready ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[9px]">{mart.suite}</Badge>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {mart.rowCount.toLocaleString()} rows
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Fetch Policy Card ──────────────────────────────────────────────
function FetchPolicyCard() {
  const rules = [
    { icon: Globe, label: "Download & query first", desc: "UGRC/SGID public data, SLCo Open GIS" },
    { icon: Building2, label: "Purchase second", desc: "Assessor CAMA database, Recorder Data Services" },
    { icon: AlertTriangle, label: "Scrape last", desc: "Only targeted HTML fallback for identified commercial parcels" },
  ];

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Acquisition Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/20">
            <div className="p-1.5 rounded bg-primary/10 mt-0.5">
              <rule.icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <span className="text-xs font-semibold">{rule.label}</span>
              <p className="text-[10px] text-muted-foreground">{rule.desc}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Main Hub ───────────────────────────────────────────────────────
export function SLCOPipelineHub() {
  const { data, isLoading } = useSLCOIngestion();

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const completedSources = data.sources.filter((s) => s.status === "ingested").length;
  const completedStages = data.stages.filter((s) => s.status === "complete").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            Salt Lake County Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live demo ingestion hub — 4-source acquisition with provenance-first marts
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono">{data.overallProgress}%</div>
          <span className="text-xs text-muted-foreground">Pipeline Progress</span>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={data.overallProgress} className="h-2" />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Sources Active", value: `${completedSources}/${data.sources.length}`, icon: Database },
          { label: "Stages Complete", value: `${completedStages}/${data.stages.length}`, icon: TrendingUp },
          { label: "Raw Records", value: data.totalRawRecords.toLocaleString(), icon: Layers },
          { label: "Published Records", value: data.totalPublishedRecords.toLocaleString(), icon: Package },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold font-mono">{stat.value}</div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="opacity-30" />

      {/* Source Cards */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Data Sources — Ordered by Acquisition Priority
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      </div>

      {/* UGRC Live Fetch Controls */}
      <UGRCIngestionPanel />

      {/* Pipeline Orchestrator */}
      <PipelineOrchestratorPanel />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <StageTracker stages={data.stages} />
        </div>
        <FetchPolicyCard />
      </div>

      <MartReadiness marts={data.marts} />

      {/* Constitutional Traceability */}
      <ConstitutionalTracePanel />

      {/* Webhook Notification Hub */}
      <WebhookNotificationHub />

      {/* Schema Preview */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Canonical Schema — 10-Table Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              "parcel_master",
              "parcel_source_registry",
              "parcel_geometry_snapshot",
              "parcel_assessment_summary",
              "parcel_commercial_characteristics",
              "parcel_value_history",
              "recorder_document_index",
              "parcel_identifier_history",
              "parcel_spatial_context",
              "parcel_evidence_registry",
            ].map((table) => (
              <div
                key={table}
                className="p-2 rounded-md bg-muted/30 border border-border/20 text-center"
              >
                <span className="text-[10px] font-mono text-muted-foreground">{table}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

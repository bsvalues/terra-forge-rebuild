// TerraFusion OS — Polygon Ingest Control Panel (Admin)
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Database,
  MapPin,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useIngestJobs,
  useIngestJobEvents,
  useStartIngest,
  useResumeIngest,
  usePauseIngest,
  useRetryPage,
  type IngestJob,
} from "@/hooks/usePolygonIngest";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  queued: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  running: { icon: Loader2, color: "text-blue-400", label: "Running" },
  paused: { icon: Pause, color: "text-amber-400", label: "Paused" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  complete: { icon: CheckCircle2, color: "text-emerald-400", label: "Complete" },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-mono text-xs", cfg.color)}>
      <Icon className={cn("w-3 h-3", status === "running" && "animate-spin")} />
      {cfg.label}
    </Badge>
  );
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

function JobCard({ job }: { job: IngestJob }) {
  const [expanded, setExpanded] = useState(false);
  const { resume, isPending: isResuming } = useResumeIngest();
  const { pause, isPending: isPausing } = usePauseIngest();
  const { retryPage, isPending: isRetrying } = useRetryPage();
  const { data: events = [] } = useIngestJobEvents(expanded ? job.id : undefined);

  const canResume = job.status === "paused" || job.status === "failed";
  const canRetry = job.status === "failed";
  const canPause = job.status === "running";

  const handleResume = async () => {
    toast.info("Resuming ingestion…");
    await resume(job.id);
    toast.success("Ingest batch complete — check status for next cursor");
  };

  const handlePause = async () => {
    await pause(job.id);
    toast.info("Ingest paused — cursor preserved");
  };

  const handleRetryPage = async () => {
    toast.info("Retrying failed page…");
    await retryPage(job.id);
    toast.success("Retry complete — check event log");
  };

  const copyDiagnostics = () => {
    const diag = {
      jobId: job.id,
      dataset: job.dataset,
      status: job.status,
      cursorOffset: job.cursor_offset,
      totalFetched: job.total_fetched,
      totalUpserted: job.total_upserted,
      lastError: job.last_error,
      url: job.feature_server_url,
    };
    navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
    toast.success("Diagnostics copied");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-lg bg-card"
    >
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-foreground truncate">
              {job.dataset}
            </span>
            <StatusChip status={job.status} />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {formatNumber(job.total_fetched)} fetched
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {formatNumber(job.total_upserted)} upserted
            </span>
            <span>
              Page {job.pages_processed} · OID cursor {formatNumber(job.cursor_offset)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canResume && (
            <Button
              size="sm"
              onClick={handleResume}
              disabled={isResuming}
              className="gap-1"
            >
              {isResuming ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              Resume
            </Button>
          )}
          {canRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryPage}
              disabled={isRetrying}
              className="gap-1"
            >
              {isRetrying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
              Retry Page
            </Button>
          {canPause && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePause}
              disabled={isPausing}
              className="gap-1"
            >
              <Pause className="w-3 h-3" />
              Pause
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {job.last_error && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-destructive font-mono break-all">{job.last_error}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Failed at OID cursor {formatNumber(job.cursor_offset)} (page {job.pages_processed}).
                {" → "}
                <a
                  href="/?tab=geometry-health"
                  className="underline text-primary hover:text-primary/80"
                  onClick={(e) => {
                    e.preventDefault();
                    // Navigate to geometry health with failure context
                    window.dispatchEvent(new CustomEvent("tf:navigate", {
                      detail: { target: "geometry-health", filter: { source: "ingest", jobId: job.id } }
                    }));
                  }}
                >
                  Open Geometry Health
                </a>
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={copyDiagnostics} className="shrink-0">
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Progress bar for running jobs */}
      {job.status === "running" && (
        <div className="px-4 pb-3">
          <Progress value={undefined} className="h-1.5" />
        </div>
      )}

      {/* Expanded event log */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Event Log
                </span>
                <Button size="sm" variant="ghost" onClick={copyDiagnostics} className="gap-1 text-xs">
                  <Copy className="w-3 h-3" /> Copy Diagnostics
                </Button>
              </div>
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground">No events yet</p>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 text-xs">
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                      {ev.event_type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(ev.created_at).toLocaleTimeString()}
                    </span>
                    {ev.payload.error && (
                      <span className="text-destructive">{ev.payload.error}</span>
                    )}
                    {ev.payload.fetched && (
                      <span>+{ev.payload.fetched} features</span>
                    )}
                    {ev.payload.last_objectid && (
                      <span className="text-muted-foreground">OID {ev.payload.last_objectid}</span>
                    )}
                    {ev.payload.failure_sample && ev.payload.failure_sample.length > 0 && (
                      <span className="text-warning">
                        {ev.payload.failure_sample.length} features flagged
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function IngestControlPanel() {
  const { data: jobs = [], isLoading } = useIngestJobs();
  const { start, isPending: isStarting } = useStartIngest();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newDataset, setNewDataset] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const activeJob = jobs.find((j) => j.status === "running" || j.status === "paused");

  const handleStartNew = async () => {
    if (!newDataset.trim() || !newUrl.trim()) {
      toast.error("Dataset name and Feature Server URL required");
      return;
    }
    toast.info("Starting polygon ingestion…");
    await start({ featureServerUrl: newUrl.trim(), dataset: newDataset.trim() });
    toast.success("First batch complete");
    setShowNewForm(false);
    setNewDataset("");
    setNewUrl("");
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Polygon Ingestion
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeJob && <StatusChip status={activeJob.status} />}
            {!showNewForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewForm(true)}
                disabled={!!jobs.find((j) => j.status === "running")}
                className="gap-1"
              >
                <Play className="w-3 h-3" />
                Start New
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* New job form */}
        <AnimatePresence>
          {showNewForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 border border-border rounded-lg space-y-3 bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-xs">Dataset Name</Label>
                  <Input
                    placeholder="e.g., benton_taxlots_2026Q1"
                    value={newDataset}
                    onChange={(e) => setNewDataset(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ArcGIS FeatureServer URL</Label>
                  <Input
                    placeholder="https://gis.example.com/arcgis/rest/services/Parcels/FeatureServer/0"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleStartNew}
                    disabled={isStarting}
                    className="gap-1"
                  >
                    {isStarting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    Start Ingest
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Job list */}
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No ingestion jobs yet. Start a new one to import polygon data.
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

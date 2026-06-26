// TerraFusion OS — UGRC Spatial Ingestion Panel
// Live controls for fetching Salt Lake County parcels from Utah's SGID.

import { useState } from "react";
import {
  useUGRCJobs,
  useUGRCJobDetail,
  useStartUGRC,
  useResumeUGRC,
  usePauseUGRC,
  type UGRCJob,
} from "@/hooks/useUGRCIngestion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Play, Pause, RotateCcw, CheckCircle2,
  AlertTriangle, Clock, Loader2, Database, Layers,
  MapPin, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// ── Job Card ───────────────────────────────────────────────────────
function JobCard({
  job,
  onSelect,
  isSelected,
}: {
  job: UGRCJob;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    queued: { color: "bg-muted text-muted-foreground", icon: Clock, label: "Queued" },
    running: { color: "bg-primary/20 text-primary", icon: Loader2, label: "Running" },
    paused: { color: "bg-amber-500/20 text-amber-400", icon: Pause, label: "Paused" },
    complete: { color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2, label: "Complete" },
    failed: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "Failed" },
  };

  const sc = statusConfig[job.status] || statusConfig.queued;
  const StatusIcon = sc.icon;

  return (
    <Card
      className={`border-border/50 bg-card/80 cursor-pointer transition-colors hover:bg-card ${
        isSelected ? "ring-1 ring-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">UGRC SGID Fetch</span>
          </div>
          <Badge className={`${sc.color} text-[10px] gap-1`}>
            <StatusIcon className={`h-3 w-3 ${job.status === "running" ? "animate-spin" : ""}`} />
            {sc.label}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs mt-2">
          <div>
            <span className="text-muted-foreground">Fetched</span>
            <p className="font-mono font-medium">{job.total_fetched.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Upserted</span>
            <p className="font-mono font-medium">{job.total_upserted.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Pages</span>
            <p className="font-mono font-medium">{job.pages_processed}</p>
          </div>
        </div>
        {job.last_error && (
          <p className="text-[10px] text-destructive mt-2 truncate">{job.last_error}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Event Log ──────────────────────────────────────────────────────
function EventLog({ jobId }: { jobId: string }) {
  const { data } = useUGRCJobDetail(jobId);
  const events = data?.events || [];

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground p-3">No events yet.</p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-1 p-3">
      {events.slice(0, 15).map((ev) => (
        <div key={ev.id} className="flex items-center gap-2 text-[10px]">
          <Badge variant="outline" className="text-[9px] px-1">
            {ev.event_type}
          </Badge>
          <span className="text-muted-foreground font-mono">
            {new Date(ev.created_at).toLocaleTimeString()}
          </span>
          {ev.payload?.fetched && (
            <span className="text-muted-foreground">
              +{ev.payload.fetched} features
            </span>
          )}
          {ev.payload?.error && (
            <span className="text-destructive truncate max-w-[200px]">
              {ev.payload.error}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────
export function UGRCIngestionPanel() {
  const { data: jobs, isLoading } = useUGRCJobs();
  const startMutation = useStartUGRC();
  const resumeMutation = useResumeUGRC();
  const pauseMutation = usePauseUGRC();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handleStart = async () => {
    try {
      const result = await startMutation.start({ pageSize: 250, maxPages: 20 });
      toast.success("UGRC fetch started", {
        description: `Job ${result.jobId?.slice(0, 8)} — fetching Salt Lake County parcels`,
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      await resumeMutation.resume(jobId, 20);
      toast.success("UGRC fetch resumed");
    } catch {
      // Error handled by mutation
    }
  };

  const handlePause = async (jobId: string) => {
    try {
      await pauseMutation.pause(jobId);
      toast.info("UGRC fetch paused");
    } catch {
      // Error handled by mutation
    }
  };

  const activeJob = (jobs || []).find((j) => j.status === "running");
  const jobList = jobs || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              UGRC/SGID Parcel Ingestion — Salt Lake County
            </CardTitle>
            <div className="flex gap-2">
              {activeJob ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePause(activeJob.id)}
                  disabled={pauseMutation.isPending}
                >
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleStart}
                  disabled={startMutation.isPending}
                >
                  {startMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  Start Fetch
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Pipeline visualization */}
          <div className="flex items-center gap-2 mb-4">
            {[
              { icon: Globe, label: "UGRC API" },
              { icon: ArrowRight, label: "" },
              { icon: Database, label: "Raw Features" },
              { icon: ArrowRight, label: "" },
              { icon: MapPin, label: "Spatial Join" },
              { icon: ArrowRight, label: "" },
              { icon: Layers, label: "Parcel Spine" },
            ].map((step, i) =>
              step.label === "" ? (
                <ArrowRight key={i} className="h-3 w-3 text-muted-foreground/50" />
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-muted/30 border border-border/20"
                >
                  <step.icon className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-medium">{step.label}</span>
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">
                {jobList.reduce((s, j) => s + j.total_fetched, 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground">Total Fetched</span>
            </div>
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">
                {jobList.reduce((s, j) => s + j.total_upserted, 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground">Upserted</span>
            </div>
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">{jobList.length}</div>
              <span className="text-[10px] text-muted-foreground">Jobs</span>
            </div>
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">
                {jobList.filter((j) => j.status === "complete").length}
              </div>
              <span className="text-[10px] text-muted-foreground">Complete</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : jobList.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-8 text-center">
            <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No UGRC fetch jobs yet. Click "Start Fetch" to begin ingesting Salt Lake County parcels.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobList.map((job) => (
            <div key={job.id}>
              <JobCard
                job={job}
                isSelected={selectedJobId === job.id}
                onSelect={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
              />
              {selectedJobId === job.id && (
                <Card className="border-border/50 bg-card/60 mt-1 ml-4">
                  <CardHeader className="pb-2 pt-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs">Event Log</CardTitle>
                      {job.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px]"
                          onClick={() => handleResume(job.id)}
                          disabled={resumeMutation.isPending}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <EventLog jobId={job.id} />
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

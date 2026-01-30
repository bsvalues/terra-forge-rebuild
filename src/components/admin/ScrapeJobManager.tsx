import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Globe,
  Play,
  Square,
  Pause,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  TrendingUp,
  Calendar,
  RefreshCw,
  Zap,
  MapPin,
  AlertTriangle,
  Info,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ScrapeJob {
  id: string;
  job_type: string;
  status: string;
  counties: unknown;
  current_county: string | null;
  counties_completed: number;
  counties_total: number;
  parcels_enriched: number;
  sales_added: number;
  errors: unknown;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock; label: string; spin?: boolean }> = {
  pending: { 
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30", 
    icon: Clock, 
    label: "Pending" 
  },
  running: { 
    color: "bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30", 
    icon: Loader2, 
    label: "Running",
    spin: true 
  },
  completed: { 
    color: "bg-tf-green/20 text-tf-green border-tf-green/30", 
    icon: CheckCircle, 
    label: "Completed" 
  },
  failed: { 
    color: "bg-destructive/20 text-destructive border-destructive/30", 
    icon: AlertCircle, 
    label: "Failed" 
  },
  cancelled: { 
    color: "bg-muted text-muted-foreground border-muted", 
    icon: Square, 
    label: "Cancelled" 
  },
};

// Washington State Counties grouped by region
const WA_REGIONS = {
  "Puget Sound": ["King", "Pierce", "Snohomish", "Kitsap", "Thurston", "Island", "San Juan", "Skagit", "Whatcom"],
  "Southwest": ["Clark", "Cowlitz", "Lewis", "Pacific", "Skamania", "Wahkiakum"],
  "Central": ["Benton", "Franklin", "Yakima", "Kittitas", "Klickitat", "Grant", "Adams"],
  "Eastern": ["Spokane", "Whitman", "Lincoln", "Stevens", "Pend Oreille", "Ferry"],
  "North Central": ["Chelan", "Douglas", "Okanogan"],
  "Olympic Peninsula": ["Clallam", "Jefferson", "Grays Harbor", "Mason"],
  "Southeast": ["Walla Walla", "Columbia", "Garfield", "Asotin"],
};

export function ScrapeJobManager() {
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; jobId?: string }>({
    open: false,
    action: "",
  });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Fetch all jobs
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-scrape-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scrape_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ScrapeJob[];
    },
    refetchInterval: 3000,
  });

  // Start job mutation
  const startJobMutation = useMutation({
    mutationFn: async (params: { jobType: string; region?: string }) => {
      const { data, error } = await supabase.functions.invoke("statewide-scrape", {
        body: { action: "start", ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Scrape job started successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-scrape-jobs"] });
      setConfirmDialog({ open: false, action: "" });
    },
    onError: (error) => {
      toast.error(`Failed to start job: ${error.message}`);
    },
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("statewide-scrape", {
        body: { action: "cancel", jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.info("Job cancellation requested");
      queryClient.invalidateQueries({ queryKey: ["admin-scrape-jobs"] });
      setConfirmDialog({ open: false, action: "" });
    },
    onError: (error) => {
      toast.error(`Failed to cancel job: ${error.message}`);
    },
  });

  // Retry job mutation  
  const retryJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("statewide-scrape", {
        body: { action: "retry", jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Retrying failed counties");
      queryClient.invalidateQueries({ queryKey: ["admin-scrape-jobs"] });
    },
    onError: (error) => {
      toast.error(`Failed to retry: ${error.message}`);
    },
  });

  const activeJob = jobs.find((j) => j.status === "running" || j.status === "pending");
  const hasActiveJob = !!activeJob;

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return "—";
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const seconds = Math.floor((endTime - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ${seconds % 60}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalStats = {
    totalJobs: jobs.length,
    parcelsEnriched: jobs.reduce((sum, j) => sum + (j.parcels_enriched || 0), 0),
    salesAdded: jobs.reduce((sum, j) => sum + (j.sales_added || 0), 0),
    successRate: jobs.filter(j => j.status === "completed" || j.status === "failed").length > 0
      ? Math.round((jobs.filter(j => j.status === "completed").length / jobs.filter(j => j.status === "completed" || j.status === "failed").length) * 100)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-tf-cyan" />
            Statewide Data Collection
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage background enrichment jobs for all 39 Washington counties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setConfirmDialog({ open: true, action: "start-statewide" })}
                  disabled={hasActiveJob || startJobMutation.isPending}
                  className="gap-2 bg-tf-cyan hover:bg-tf-cyan/90"
                >
                  {startJobMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Start Statewide Scrape
                </Button>
              </TooltipTrigger>
              {hasActiveJob && (
                <TooltipContent>
                  <p>A job is already running. Wait for it to complete or cancel it.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Active Job Banner */}
      {activeJob && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-5 border-2 border-tf-cyan/50 bg-tf-cyan/5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-tf-cyan/20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-tf-cyan animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-lg text-foreground">
                    {activeJob.job_type === "statewide" ? "Statewide Collection" : `Regional: ${activeJob.job_type}`}
                  </span>
                  <Badge className={STATUS_CONFIG[activeJob.status as keyof typeof STATUS_CONFIG]?.color || STATUS_CONFIG.pending.color}>
                    {activeJob.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Currently processing: <span className="text-tf-cyan font-medium">{activeJob.current_county || "Initializing..."}</span> County
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog({ open: true, action: "cancel", jobId: activeJob.id })}
              disabled={cancelJobMutation.isPending}
              className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
            >
              <Square className="w-4 h-4 mr-1.5" />
              Cancel Job
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {activeJob.counties_completed} of {activeJob.counties_total} counties
              </span>
            </div>
            <Progress
              value={(activeJob.counties_completed / Math.max(activeJob.counties_total, 1)) * 100}
              className="h-2.5"
            />
            
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <div className="text-2xl font-light text-tf-green">
                  {activeJob.parcels_enriched.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Parcels Enriched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-tf-gold">
                  {activeJob.sales_added.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Sales Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-foreground">
                  {formatDuration(activeJob.started_at, null)}
                </div>
                <div className="text-xs text-muted-foreground">Elapsed Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-destructive">
                  {Array.isArray(activeJob.errors) ? activeJob.errors.length : 0}
                </div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Globe className="w-4 h-4" />
              Total Jobs Run
            </div>
            <div className="text-2xl font-light text-foreground">{totalStats.totalJobs}</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MapPin className="w-4 h-4" />
              Parcels Enriched
            </div>
            <div className="text-2xl font-light text-tf-green">{totalStats.parcelsEnriched.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-4 h-4" />
              Sales Added
            </div>
            <div className="text-2xl font-light text-tf-gold">{totalStats.salesAdded.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CheckCircle className="w-4 h-4" />
              Success Rate
            </div>
            <div className="text-2xl font-light text-tf-cyan">{totalStats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Job History */}
      <Card className="glass-card border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-tf-cyan" />
            Job History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
                  {jobs.map((job) => {
                    const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const errorsArray = Array.isArray(job.errors) ? job.errors as Array<{ county: string; error: string }> : [];
                    const hasErrors = errorsArray.length > 0;
                    
                    return (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", statusConfig.color)}>
                            <StatusIcon className={cn("w-4 h-4", statusConfig.spin && "animate-spin")} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm capitalize">{job.job_type}</span>
                              <Badge variant="outline" className="text-xs">
                                {job.counties_total} counties
                              </Badge>
                              {hasErrors && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[300px]">
                                      <p className="font-medium mb-1">{errorsArray.length} errors:</p>
                                      <ul className="text-xs space-y-0.5">
                                        {errorsArray.slice(0, 3).map((e, i) => (
                                          <li key={i}>{e.county}: {e.error}</li>
                                        ))}
                                        {errorsArray.length > 3 && <li>...and {errorsArray.length - 3} more</li>}
                                      </ul>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(job.created_at)}</p>
                          </div>
                        </div>
                    <div className="flex items-center gap-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-right">
                          <div className="font-medium text-tf-green">+{job.parcels_enriched || 0}</div>
                          <div className="text-xs text-muted-foreground">parcels</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-tf-gold">+{job.sales_added || 0}</div>
                          <div className="text-xs text-muted-foreground">sales</div>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <div className="font-medium text-foreground">
                            {formatDuration(job.started_at, job.completed_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">duration</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(statusConfig.color, "min-w-[80px] justify-center")}>
                          {statusConfig.label}
                        </Badge>
                        {job.status === "failed" && hasErrors && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => retryJobMutation.mutate(job.id)}
                                  disabled={retryJobMutation.isPending || hasActiveJob}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retry failed counties</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {jobs.length === 0 && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No scrape jobs yet</p>
                  <p className="text-sm">Click "Start Statewide Scrape" to begin data collection</p>
                </div>
              )}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-tf-cyan" />
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent className="glass-card border-tf-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog.action === "start-statewide" && (
                <>
                  <Zap className="w-5 h-5 text-tf-cyan" />
                  Start Statewide Scrape
                </>
              )}
              {confirmDialog.action === "cancel" && (
                <>
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Cancel Job
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "start-statewide" && (
                "This will start a background job to enrich property data from all 39 Washington State county assessor websites. This process may take several hours."
              )}
              {confirmDialog.action === "cancel" && (
                "Are you sure you want to cancel this job? Progress will be saved but remaining counties will not be processed."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, action: "" })}>
              Cancel
            </Button>
            {confirmDialog.action === "start-statewide" && (
              <Button
                onClick={() => startJobMutation.mutate({ jobType: "statewide" })}
                disabled={startJobMutation.isPending}
                className="bg-tf-cyan hover:bg-tf-cyan/90"
              >
                {startJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Start Scrape
              </Button>
            )}
            {confirmDialog.action === "cancel" && confirmDialog.jobId && (
              <Button
                variant="destructive"
                onClick={() => cancelJobMutation.mutate(confirmDialog.jobId!)}
                disabled={cancelJobMutation.isPending}
              >
                {cancelJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Yes, Cancel Job
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

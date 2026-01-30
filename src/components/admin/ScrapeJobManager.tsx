import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Globe,
  Play,
  Square,
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
  RotateCcw,
  ChevronDown,
  Map,
  ListOrdered,
  X,
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
  queued: { 
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30", 
    icon: ListOrdered, 
    label: "Queued" 
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

// Region colors for visual distinction
const REGION_COLORS: Record<string, string> = {
  "Puget Sound": "text-tf-cyan",
  "Southwest": "text-tf-green",
  "Central": "text-tf-gold",
  "Eastern": "text-amber-400",
  "North Central": "text-purple-400",
  "Olympic Peninsula": "text-blue-400",
  "Southeast": "text-rose-400",
};

export function ScrapeJobManager() {
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{ 
    open: boolean; 
    action: string; 
    jobId?: string;
    selectedRegions?: string[];
  }>({
    open: false,
    action: "",
    selectedRegions: [],
  });
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

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

  // Start job mutation (now supports queuing)
  const startJobMutation = useMutation({
    mutationFn: async (params: { jobType: string; counties?: string[]; regions?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("statewide-scrape", {
        body: { action: "start", ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.queued) {
        toast.info("Job added to queue", {
          description: "Will start automatically when current job completes"
        });
      } else {
        toast.success("Scrape job started successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-scrape-jobs"] });
      setConfirmDialog({ open: false, action: "", selectedRegions: [] });
      setSelectedRegions([]);
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
      toast.info("Job cancelled");
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

  const activeJob = jobs.find((j) => j.status === "running");
  const queuedJobs = jobs.filter((j) => j.status === "queued");
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
          
          {/* Regional Scrape Dropdown - Always enabled now (supports queuing) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={startJobMutation.isPending}
                className="gap-2"
              >
                <Map className="w-4 h-4" />
                Regional Scrape
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center justify-between">
                Select Region
                {hasActiveJob && (
                  <Badge variant="outline" className="text-[10px] ml-2 text-purple-400">
                    Will Queue
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(WA_REGIONS).map(([region, counties]) => (
                <DropdownMenuItem
                  key={region}
                  onClick={() => setConfirmDialog({ 
                    open: true, 
                    action: "start-regional",
                    selectedRegions: [region]
                  })}
                  className="flex items-center justify-between"
                >
                  <span className={REGION_COLORS[region]}>{region}</span>
                  <Badge variant="outline" className="text-xs ml-2">
                    {counties.length} counties
                  </Badge>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDialog({ 
                  open: true, 
                  action: "start-multi-region",
                  selectedRegions: []
                })}
                className="text-muted-foreground"
              >
                Select Multiple Regions...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setConfirmDialog({ open: true, action: "start-statewide" })}
                  disabled={startJobMutation.isPending}
                  className="gap-2 bg-tf-cyan hover:bg-tf-cyan/90"
                >
                  {startJobMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {hasActiveJob ? "Queue Statewide" : "Start Statewide Scrape"}
                </Button>
              </TooltipTrigger>
              {hasActiveJob && (
                <TooltipContent>
                  <p>A job is running. This will be added to the queue.</p>
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
                    {activeJob.job_type === "statewide" ? "Statewide Collection" : `Regional: ${activeJob.job_type.replace("region:", "")}`}
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

      {/* Job Queue Banner */}
      <AnimatePresence>
        {queuedJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl p-4 border border-purple-500/30 bg-purple-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <ListOrdered className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {queuedJobs.length} Job{queuedJobs.length > 1 ? "s" : ""} Queued
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Will start automatically when current job completes
                  </p>
                </div>
              </div>
            </div>

            {/* Queued jobs list */}
            <div className="mt-3 space-y-2">
              {queuedJobs.map((job, index) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-tf-substrate/50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm capitalize">
                      {job.job_type.replace("region:", "").replace("regions:", "Multi-region: ")}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {job.counties_total} counties
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => cancelJobMutation.mutate(job.id)}
                    disabled={cancelJobMutation.isPending}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                          <span className="font-medium text-sm capitalize">
                            {job.job_type.replace("region:", "").replace("regions:", "Multi-")}
                          </span>
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
                        {job.status === "queued" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => cancelJobMutation.mutate(job.id)}
                                  disabled={cancelJobMutation.isPending}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove from queue</TooltipContent>
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
        <DialogContent className="glass-card border-tf-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog.action === "start-statewide" && (
                <>
                  <Zap className="w-5 h-5 text-tf-cyan" />
                  {hasActiveJob ? "Queue Statewide Scrape" : "Start Statewide Scrape"}
                </>
              )}
              {confirmDialog.action === "start-regional" && (
                <>
                  <Map className="w-5 h-5 text-tf-cyan" />
                  {hasActiveJob ? "Queue" : "Start"} Regional Scrape: {confirmDialog.selectedRegions?.[0]}
                </>
              )}
              {confirmDialog.action === "start-multi-region" && (
                <>
                  <Map className="w-5 h-5 text-tf-cyan" />
                  Select Regions to {hasActiveJob ? "Queue" : "Scrape"}
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
                hasActiveJob 
                  ? "This will add a statewide scrape job to the queue. It will start automatically when the current job completes."
                  : "This will start a background job to enrich property data from all 39 Washington State county assessor websites. This process may take several hours."
              )}
              {confirmDialog.action === "start-regional" && confirmDialog.selectedRegions?.[0] && (
                <>
                  {hasActiveJob 
                    ? `This will queue a scrape for ${WA_REGIONS[confirmDialog.selectedRegions[0] as keyof typeof WA_REGIONS]?.length || 0} counties in the ${confirmDialog.selectedRegions[0]} region.`
                    : `This will scrape ${WA_REGIONS[confirmDialog.selectedRegions[0] as keyof typeof WA_REGIONS]?.length || 0} counties in the ${confirmDialog.selectedRegions[0]} region:`
                  }
                  <span className="block text-xs mt-1 text-muted-foreground">
                    {WA_REGIONS[confirmDialog.selectedRegions[0] as keyof typeof WA_REGIONS]?.join(", ")}
                  </span>
                </>
              )}
              {confirmDialog.action === "start-multi-region" && (
                `Select one or more regions to ${hasActiveJob ? "add to the queue" : "include in the scrape job"}.`
              )}
              {confirmDialog.action === "cancel" && (
                "Are you sure you want to cancel this job? Progress will be saved but remaining counties will not be processed. The next queued job will start automatically."
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Multi-region selection */}
          {confirmDialog.action === "start-multi-region" && (
            <div className="grid grid-cols-2 gap-3 py-4">
              {Object.entries(WA_REGIONS).map(([region, counties]) => {
                const isSelected = selectedRegions.includes(region);
                return (
                  <div
                    key={region}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected 
                        ? "border-tf-cyan bg-tf-cyan/10" 
                        : "border-tf-border hover:border-tf-cyan/50"
                    )}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedRegions(prev => prev.filter(r => r !== region));
                      } else {
                        setSelectedRegions(prev => [...prev, region]);
                      }
                    }}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRegions(prev => [...prev, region]);
                        } else {
                          setSelectedRegions(prev => prev.filter(r => r !== region));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className={cn("font-medium text-sm", REGION_COLORS[region])}>{region}</div>
                      <div className="text-xs text-muted-foreground">{counties.length} counties</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setConfirmDialog({ open: false, action: "" });
              setSelectedRegions([]);
            }}>
              Cancel
            </Button>
            {confirmDialog.action === "start-statewide" && (
              <Button
                onClick={() => startJobMutation.mutate({ jobType: "statewide" })}
                disabled={startJobMutation.isPending}
                className="bg-tf-cyan hover:bg-tf-cyan/90"
              >
                {startJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {hasActiveJob ? "Add to Queue" : "Start Scrape"} (39 counties)
              </Button>
            )}
            {confirmDialog.action === "start-regional" && confirmDialog.selectedRegions?.[0] && (
              <Button
                onClick={() => {
                  const region = confirmDialog.selectedRegions![0];
                  const counties = WA_REGIONS[region as keyof typeof WA_REGIONS] || [];
                  startJobMutation.mutate({ 
                    jobType: `region:${region}`,
                    counties,
                    regions: [region]
                  });
                }}
                disabled={startJobMutation.isPending}
                className="bg-tf-cyan hover:bg-tf-cyan/90"
              >
                {startJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {hasActiveJob ? "Add to Queue" : "Start Regional Scrape"}
              </Button>
            )}
            {confirmDialog.action === "start-multi-region" && (
              <Button
                onClick={() => {
                  const counties = selectedRegions.flatMap(
                    region => WA_REGIONS[region as keyof typeof WA_REGIONS] || []
                  );
                  startJobMutation.mutate({ 
                    jobType: selectedRegions.length === 1 
                      ? `region:${selectedRegions[0]}` 
                      : `regions:${selectedRegions.length}`,
                    counties,
                    regions: selectedRegions
                  });
                }}
                disabled={startJobMutation.isPending || selectedRegions.length === 0}
                className="bg-tf-cyan hover:bg-tf-cyan/90"
              >
                {startJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {hasActiveJob ? "Add to Queue" : "Start Scrape"} ({selectedRegions.flatMap(r => WA_REGIONS[r as keyof typeof WA_REGIONS] || []).length} counties)
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

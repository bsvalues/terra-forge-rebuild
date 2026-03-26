import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Globe,
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
  BarChart3,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { CountyDataQualityReport } from "./CountyDataQualityReport";
import { useScrapeJobsRealtime, useStartScrapeJob, useCancelScrapeJob } from "@/hooks/useScrapeJobs";

interface ScrapeJob {
  id: string;
  job_type: string;
  status: string;
  counties: string[];
  current_county: string | null;
  counties_completed: number;
  counties_total: number;
  parcels_enriched: number;
  sales_added: number;
  errors: Array<{ county: string; error: string }>;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  running: "bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30",
  completed: "bg-tf-optimized-green/20 text-tf-optimized-green border-tf-optimized-green/30",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  running: <Loader2 className="w-4 h-4 animate-spin" />,
  completed: <CheckCircle className="w-4 h-4" />,
  failed: <AlertCircle className="w-4 h-4" />,
  cancelled: <Square className="w-4 h-4" />,
};

export function ScrapeJobsDashboard() {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useScrapeJobsRealtime();
  const startJobMutation = useStartScrapeJob();
  const cancelJobMutation = useCancelScrapeJob();
  const activeJob = jobs.find((j) => j.status === "running" || j.status === "pending");
  const completedJobs = jobs.filter((j) => j.status === "completed" || j.status === "failed");

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return "—";
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const seconds = Math.floor((endTime - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString();
  };

  return (
    <Tabs defaultValue="jobs" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-tf-cyan" />
            Statewide Data Collection
          </h3>
          <p className="text-sm text-muted-foreground">
            Background job processing for all 39 Washington counties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TabsList className="bg-tf-elevated/50">
            <TabsTrigger value="jobs" className="gap-2 data-[state=active]:bg-tf-cyan/20">
              <Zap className="w-4 h-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="quality" className="gap-2 data-[state=active]:bg-tf-sacred-gold/20">
              <BarChart3 className="w-4 h-4" />
              Data Quality
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["scrape-jobs"] })}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => startJobMutation.mutate({ jobType: "statewide" })}
            disabled={!!activeJob || startJobMutation.isPending}
            className="gap-2 bg-tf-cyan hover:bg-tf-cyan/90"
          >
            {startJobMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Scrape All Counties
          </Button>
        </div>
      </div>

      <TabsContent value="jobs" className="mt-0 space-y-6">
        {/* Active Job Card */}
        {activeJob && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="material-bento rounded-lg p-4 border-2 border-tf-cyan/50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-tf-cyan/20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-tf-cyan animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {activeJob.job_type === "statewide" ? "Statewide Collection" : activeJob.job_type}
                    </span>
                    <Badge className={STATUS_COLORS[activeJob.status]}>
                      {STATUS_ICONS[activeJob.status]}
                      <span className="ml-1 capitalize">{activeJob.status}</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Processing {activeJob.current_county || "..."} County
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelJobMutation.mutate(activeJob.id)}
                disabled={cancelJobMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Square className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {activeJob.counties_completed} / {activeJob.counties_total} counties
                </span>
              </div>
              <Progress
                value={(activeJob.counties_completed / activeJob.counties_total) * 100}
                className="h-2"
              />
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-light text-tf-optimized-green">
                    {activeJob.parcels_enriched}
                  </div>
                  <div className="text-xs text-muted-foreground">Parcels Enriched</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light text-tf-sacred-gold">
                    {activeJob.sales_added}
                  </div>
                  <div className="text-xs text-muted-foreground">Sales Added</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light text-foreground">
                    {formatDuration(activeJob.started_at, null)}
                  </div>
                  <div className="text-xs text-muted-foreground">Elapsed Time</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-tf-elevated border-tf-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Globe className="w-4 h-4" />
                Total Jobs
              </div>
              <div className="text-2xl font-light text-foreground">{jobs.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-tf-elevated border-tf-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-4 h-4" />
                Parcels Enriched
              </div>
              <div className="text-2xl font-light text-tf-optimized-green">
                {jobs.reduce((sum, j) => sum + (j.parcels_enriched || 0), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-tf-elevated border-tf-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Database className="w-4 h-4" />
                Sales Added
              </div>
              <div className="text-2xl font-light text-tf-sacred-gold">
                {jobs.reduce((sum, j) => sum + (j.sales_added || 0), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-tf-elevated border-tf-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <CheckCircle className="w-4 h-4" />
                Success Rate
              </div>
              <div className="text-2xl font-light text-tf-cyan">
                {completedJobs.length > 0
                  ? Math.round(
                      (completedJobs.filter((j) => j.status === "completed").length /
                        completedJobs.length) *
                        100
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job History */}
        <Card className="bg-tf-elevated border-tf-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-tf-cyan" />
              Job History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${STATUS_COLORS[job.status]}`}
                      >
                        {STATUS_ICONS[job.status]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm capitalize">
                            {job.job_type}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {job.counties_total} counties
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(job.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="font-medium text-tf-optimized-green">
                          +{job.parcels_enriched || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">parcels</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-tf-sacred-gold">
                          +{job.sales_added || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">sales</div>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <div className="font-medium text-foreground">
                          {formatDuration(job.started_at, job.completed_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">duration</div>
                      </div>
                      <Badge className={`${STATUS_COLORS[job.status]} min-w-[80px] justify-center`}>
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No scrape jobs yet</p>
                    <p className="text-xs">Click "Scrape All Counties" to start</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="quality" className="mt-0">
        <CountyDataQualityReport />
      </TabsContent>
    </Tabs>
  );
}

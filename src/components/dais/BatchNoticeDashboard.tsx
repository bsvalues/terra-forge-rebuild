// TerraFusion OS — Phase 34: Batch Notice Dashboard
// Constitutional owner: TerraDais (notices)
// County-scoped batch notice generation, review, and send pipeline

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, FileText, Send, Download, Loader2, Sparkles, Filter,
  CheckCircle2, XCircle, Clock, PlayCircle, Eye, ChevronDown,
  ChevronRight, Mail
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommitmentButton } from "@/components/ui/commitment-button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  useBatchNoticeJobs,
  useBatchNoticesByJob,
  useCreateBatchNoticeJob,
  useBulkUpdateNoticeStatus,
} from "@/hooks/useBatchNotices";
import { useNeighborhoodStats } from "@/hooks/useNeighborhoodStats";
import { toast } from "sonner";
import { format } from "date-fns";

export function BatchNoticeDashboard() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<any>(null);

  // Generate form state
  const [neighborhoodCode, setNeighborhoodCode] = useState("");
  const [propertyClass, setPropertyClass] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [aiLimit, setAiLimit] = useState(10);

  const { data: jobs = [], isLoading: jobsLoading } = useBatchNoticeJobs(statusFilter);
  const { data: jobNotices = [], isLoading: noticesLoading } = useBatchNoticesByJob(selectedJobId);
  const createJob = useCreateBatchNoticeJob();
  const bulkUpdate = useBulkUpdateNoticeStatus();
  const { data: neighborhoods = [] } = useNeighborhoodStats();

  const handleGenerate = () => {
    createJob.mutate(
      {
        neighborhoodCode: neighborhoodCode || undefined,
        propertyClass: propertyClass || undefined,
        useAI,
        aiLimit,
      },
      {
        onSuccess: (result) => {
          toast.success(`Generated ${result.generated} notices`, {
            description: result.failed > 0 ? `${result.failed} failed` : undefined,
          });
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleBulkApprove = (jobId: string) => {
    bulkUpdate.mutate(
      { jobId, newStatus: "approved" },
      { onSuccess: (r) => toast.success(`${r.updated} notices approved`) }
    );
  };

  const handleBulkSend = (jobId: string) => {
    bulkUpdate.mutate(
      { jobId, newStatus: "sent" },
      { onSuccess: (r) => toast.success(`${r.updated} notices marked as sent`) }
    );
  };

  const handleDownloadBatch = () => {
    if (!jobNotices.length) return;
    const allText = jobNotices
      .map((n: any) => `${"=".repeat(60)}\nParcel: ${n.parcel?.parcel_number || "N/A"} — ${n.parcel?.address || "N/A"}\nStatus: ${n.status}\n${"=".repeat(60)}\n\n${n.body}\n\n`)
      .join("\n");
    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-notices-${selectedJobId?.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Batch notices downloaded");
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--tf-optimized-green))]" />;
      case "running": return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--suite-dais))/0.15] flex items-center justify-center">
              <Mail className="w-5 h-5 text-[hsl(var(--suite-dais))]" />
            </div>
            Notice Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate, review, and send assessment notices at scale
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Generate Panel */}
        <div className="material-bento rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-[hsl(var(--suite-dais))]" />
            Generate Batch
          </h3>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Neighborhood (optional)</Label>
              <Select value={neighborhoodCode || "__all__"} onValueChange={(v) => setNeighborhoodCode(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All neighborhoods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All neighborhoods</SelectItem>
                  {neighborhoods.map((n: any) => (
                    <SelectItem key={n.neighborhood_code} value={n.neighborhood_code}>
                      {n.neighborhood_code} ({n.parcel_count} parcels)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Property Class (optional)</Label>
              <Input
                value={propertyClass}
                onChange={(e) => setPropertyClass(e.target.value)}
                placeholder="e.g. Residential"
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="batch-ai" className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                <Sparkles className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))]" />
                AI-drafted notices
              </Label>
              <Switch id="batch-ai" checked={useAI} onCheckedChange={setUseAI} className="scale-75" />
            </div>

            {useAI && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">AI draft limit</Label>
                <Select value={String(aiLimit)} onValueChange={(v) => setAiLimit(Number(v))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 notices</SelectItem>
                    <SelectItem value="10">10 notices</SelectItem>
                    <SelectItem value="25">25 notices</SelectItem>
                    <SelectItem value="50">50 notices</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground/70">
                  Remaining parcels use high-quality templates
                </p>
              </div>
            )}

            {createJob.isPending && (
              <div className="space-y-1.5">
                <Progress value={undefined} className="h-2" />
                <p className="text-[10px] text-muted-foreground text-center">Generating notices…</p>
              </div>
            )}

            <CommitmentButton
              onClick={handleGenerate}
              disabled={createJob.isPending}
              className="w-full"
            >
              {createJob.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {createJob.isPending ? "Generating…" : "Generate Notices"}
            </CommitmentButton>
          </div>
        </div>

        {/* Center: Batch Jobs List */}
        <div className="lg:col-span-2 material-bento rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-[hsl(var(--suite-dais))]" />
              Batch Jobs
            </h3>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {jobsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No batch jobs yet</p>
              <p className="text-xs mt-1">Use the panel on the left to generate your first batch</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border/30 rounded-xl p-4 space-y-3 hover:border-[hsl(var(--suite-dais))/0.3] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {statusIcon(job.status)}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {job.neighborhood_code ? `Neighborhood ${job.neighborhood_code}` : "All Neighborhoods"}
                            {job.property_class ? ` · ${job.property_class}` : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(job.created_at), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          job.status === "completed"
                            ? "text-[9px] bg-[hsl(var(--tf-optimized-green))/0.15] text-[hsl(var(--tf-optimized-green))] border-[hsl(var(--tf-optimized-green))/0.3]"
                            : job.status === "running"
                            ? "text-[9px] bg-primary/15 text-primary border-primary/30"
                            : "text-[9px] bg-muted text-muted-foreground"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {job.notices_generated}/{job.total_parcels} generated
                      </span>
                      {job.notices_failed > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="w-3 h-3" />
                          {job.notices_failed} failed
                        </span>
                      )}
                      {job.ai_drafted_count > 0 && (
                        <span className="flex items-center gap-1 text-[hsl(var(--tf-sacred-gold))]">
                          <Sparkles className="w-3 h-3" />
                          {job.ai_drafted_count} AI-drafted
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {job.status === "completed" && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                        >
                          {selectedJobId === job.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => handleBulkApprove(job.id)}
                          disabled={bulkUpdate.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Approve All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => handleBulkSend(job.id)}
                          disabled={bulkUpdate.isPending}
                        >
                          <Send className="w-3 h-3" />
                          Mark Sent
                        </Button>
                      </div>
                    )}

                    {/* Expanded: Notice List */}
                    <AnimatePresence>
                      {selectedJobId === job.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border/20 pt-3 mt-2 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground font-medium">
                                {jobNotices.length} notices
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] gap-1"
                                onClick={handleDownloadBatch}
                              >
                                <Download className="w-3 h-3" />
                                Download All
                              </Button>
                            </div>

                            {noticesLoading ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <ScrollArea className="h-[250px]">
                                <div className="space-y-1.5">
                                  {jobNotices.map((notice: any) => (
                                    <div
                                      key={notice.id}
                                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                                      onClick={() => setPreviewNotice(notice)}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <span className="text-xs font-mono truncate">
                                          {notice.parcel?.parcel_number || "N/A"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground truncate">
                                          {notice.parcel?.address || ""}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {notice.ai_drafted && (
                                          <Sparkles className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))]" />
                                        )}
                                        <Badge className={
                                          notice.status === "sent"
                                            ? "text-[8px] bg-[hsl(var(--tf-optimized-green))/0.15] text-[hsl(var(--tf-optimized-green))]"
                                            : notice.status === "approved"
                                            ? "text-[8px] bg-primary/15 text-primary"
                                            : "text-[8px] bg-muted text-muted-foreground"
                                        }>
                                          {notice.status}
                                        </Badge>
                                        <Eye className="w-3 h-3 text-muted-foreground" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Notice Preview Dialog */}
      <Dialog open={!!previewNotice} onOpenChange={(open) => !open && setPreviewNotice(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-[hsl(var(--suite-dais))]" />
              {previewNotice?.parcel?.parcel_number || "Notice"} — {previewNotice?.parcel?.address || ""}
              {previewNotice?.ai_drafted && (
                <Badge className="text-[8px] bg-[hsl(var(--tf-sacred-gold))/0.15] text-[hsl(var(--tf-sacred-gold))]">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />AI
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs whitespace-pre-wrap font-sans text-foreground p-4 bg-muted/30 rounded-lg">
              {previewNotice?.body}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

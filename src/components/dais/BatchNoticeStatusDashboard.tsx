// TerraFusion OS — Phase 102: Batch Notice Job Dashboard
// Real-time status tracking for batch notice generation jobs.

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Mail, Clock, CheckCircle2, AlertTriangle, Loader2, FileText,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export function BatchNoticeStatusDashboard() {
  const { profile } = useAuthContext();
  const countyId = profile?.county_id;

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["batch-notice-jobs", countyId],
    enabled: !!countyId,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batch_notice_jobs")
        .select("*")
        .eq("county_id", countyId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-chart-5" />;
      case "running": return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
      case "failed": return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-chart-5/10 text-chart-5 border-chart-5/20",
      running: "bg-primary/10 text-primary border-primary/20",
      failed: "bg-destructive/10 text-destructive border-destructive/20",
      pending: "bg-muted text-muted-foreground border-border/30",
    };
    return map[status] ?? map.pending;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="border-border/30">
        <CardContent className="py-12 text-center">
          <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No batch notice jobs yet</p>
          <p className="text-xs text-muted-foreground mt-1">Generate notices from the Notices panel to see them here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Recent Batch Jobs</h3>
        <Badge variant="outline" className="text-[9px] ml-auto">{jobs.length} jobs</Badge>
      </div>
      {jobs.map((job, i) => {
        const progress = job.total_parcels > 0
          ? Math.round((job.notices_generated / job.total_parcels) * 100)
          : 0;

        return (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className="border-border/30 hover:border-border/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {statusIcon(job.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground truncate">
                        {job.neighborhood_code ? `Neighborhood ${job.neighborhood_code}` : "All Parcels"}
                        {job.property_class && ` · ${job.property_class}`}
                      </span>
                      <Badge variant="outline" className={`text-[9px] ${statusBadge(job.status)}`}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                      <span>{job.notices_generated}/{job.total_parcels} notices</span>
                      {job.notices_failed > 0 && (
                        <span className="text-destructive">{job.notices_failed} failed</span>
                      )}
                      {job.ai_drafted_count > 0 && (
                        <span className="text-primary">{job.ai_drafted_count} AI-drafted</span>
                      )}
                      <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                </div>
                {job.status === "running" && (
                  <Progress value={progress} className="h-1 mt-2" />
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

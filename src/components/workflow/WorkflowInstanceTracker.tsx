// TerraFusion OS — Phase 90: Workflow Instance Tracker
// Surfaces active/completed workflow instances from Phase 82 schema.

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, CheckCircle2, Clock, AlertTriangle, Loader2,
  Play, Pause, XCircle, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkflowInstances, type WorkflowInstance } from "@/hooks/useWorkflowTemplates";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  active: { icon: Play, color: "text-primary", bg: "bg-primary/10" },
  paused: { icon: Pause, color: "text-chart-4", bg: "bg-chart-4/10" },
  completed: { icon: CheckCircle2, color: "text-chart-5", bg: "bg-chart-5/10" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/10" },
};

function InstanceRow({ instance }: { instance: WorkflowInstance }) {
  const config = STATUS_CONFIG[instance.status] ?? STATUS_CONFIG.active;
  const Icon = config.icon;
  const stepCount = instance.step_results?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3 px-4 hover:bg-muted/20 transition-colors border-b border-border/20 last:border-0"
    >
      <div className={cn("p-1.5 rounded-md", config.bg)}>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {(instance.context as any)?.name || `Workflow ${instance.id.slice(0, 8)}`}
          </span>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", config.color)}>
            {instance.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            Step {instance.current_step + 1}
          </span>
          <span>{stepCount} completed</span>
          {instance.parcel_id && (
            <span className="font-mono">parcel: {instance.parcel_id.slice(0, 8)}…</span>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(instance.created_at), { addSuffix: true })}
      </span>
    </motion.div>
  );
}

export function WorkflowInstanceTracker() {
  const { data: active = [], isLoading: loadingActive } = useWorkflowInstances("active");
  const { data: completed = [], isLoading: loadingCompleted } = useWorkflowInstances("completed");

  const isLoading = loadingActive || loadingCompleted;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Workflow Tracker</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">
            {active.length} active
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-3">
            <TabsList className="bg-muted/50 h-8">
              <TabsTrigger value="active" className="text-[11px] gap-1 h-6">
                <Clock className="w-3 h-3" />
                Active ({active.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-[11px] gap-1 h-6">
                <CheckCircle2 className="w-3 h-3" />
                Completed ({completed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0">
              <ScrollArea className="h-64">
                {active.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No active workflows</p>
                  </div>
                ) : (
                  active.map((inst) => <InstanceRow key={inst.id} instance={inst} />)
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <ScrollArea className="h-64">
                {completed.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No completed workflows yet</p>
                  </div>
                ) : (
                  completed.map((inst) => <InstanceRow key={inst.id} instance={inst} />)
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// TerraFusion OS — Phase 86: AVM Run Launcher & Results Panel
// Displays AVM run history, launches new runs, shows model diagnostics.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Play, Clock, CheckCircle2, XCircle, TrendingUp,
  BarChart3, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAvmRuns, useLaunchAvmRun, type AvmRun } from "@/hooks/useAvmPipeline";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const MODEL_TYPES = [
  { value: "linear_regression", label: "Linear Regression" },
  { value: "random_forest", label: "Random Forest" },
  { value: "gradient_boost", label: "Gradient Boost" },
  { value: "neural_net", label: "Neural Network" },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    completed: { color: "text-chart-2", icon: CheckCircle2 },
    running: { color: "text-primary", icon: Loader2 },
    queued: { color: "text-chart-4", icon: Clock },
    failed: { color: "text-destructive", icon: XCircle },
  };
  const c = config[status] ?? config.queued;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1", c.color)}>
      <c.icon className={cn("w-3 h-3", status === "running" && "animate-spin")} />
      {status}
    </Badge>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/30">
      <div className="text-lg font-semibold text-foreground">
        {value != null ? value.toFixed(4) : "—"}
        {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function AvmRunPanel() {
  const { profile } = useAuthContext();
  const countyId = profile?.county_id ?? undefined;
  const { data: runs = [], isLoading } = useAvmRuns(countyId);
  const launchRun = useLaunchAvmRun();

  const [modelName, setModelName] = useState("Residential MRA");
  const [modelType, setModelType] = useState("linear_regression");
  const [selectedRun, setSelectedRun] = useState<AvmRun | null>(null);

  const handleLaunch = () => {
    if (!countyId) return;
    launchRun.mutate({ countyId, modelName, modelType });
  };

  return (
    <div className="space-y-4">
      {/* Launch Form */}
      <Card className="bg-card/80 border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Launch AVM Run
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Model Name</Label>
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="mt-1 h-8 text-sm"
                placeholder="e.g., Residential MRA"
              />
            </div>
            <div>
              <Label className="text-xs">Model Type</Label>
              <Select value={modelType} onValueChange={setModelType}>
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleLaunch}
            disabled={!countyId || launchRun.isPending}
            className="w-full bg-primary text-primary-foreground"
            size="sm"
          >
            {launchRun.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Launch Model Run
          </Button>
        </CardContent>
      </Card>

      {/* Run History */}
      <Card className="bg-card/80 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-chart-5" />
            Run History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : runs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No AVM runs yet. Launch your first model above.
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {runs.map((run) => (
                  <motion.div
                    key={run.id}
                    className={cn(
                      "px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors",
                      selectedRun?.id === run.id && "bg-primary/5"
                    )}
                    onClick={() => setSelectedRun(run)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-foreground">{run.model_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{run.model_type}</span>
                      </div>
                      <StatusBadge status={run.status} />
                    </div>
                    {run.status === "completed" && (
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>R² {run.r_squared?.toFixed(4) ?? "—"}</span>
                        <span>COD {run.cod?.toFixed(2) ?? "—"}</span>
                        <span>n={run.sample_size ?? 0}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Run Detail */}
      {selectedRun && selectedRun.status === "completed" && (
        <Card className="bg-card/80 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-chart-2" />
              Model Diagnostics: {selectedRun.model_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="R-Squared" value={selectedRun.r_squared} />
              <MetricCard label="RMSE" value={selectedRun.rmse} unit="$" />
              <MetricCard label="MAE" value={selectedRun.mae} unit="$" />
              <MetricCard label="MAPE" value={selectedRun.mape} unit="%" />
              <MetricCard label="COD" value={selectedRun.cod} />
              <MetricCard label="PRD" value={selectedRun.prd} />
            </div>
            {selectedRun.training_time_ms && (
              <div className="text-[10px] text-muted-foreground text-center mt-2">
                Training time: {(selectedRun.training_time_ms / 1000).toFixed(1)}s
                · Sample: {selectedRun.sample_size ?? 0} parcels
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

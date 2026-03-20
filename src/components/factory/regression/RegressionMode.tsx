import { useCalibration } from "@/hooks/useCalibration";
import { RegressionControlPanel } from "./RegressionControlPanel";
import { CoefficientGrid } from "./CoefficientGrid";
import { CalibrationScatterPlot } from "./CalibrationScatterPlot";
import { CalibrationDiagnostics } from "./CalibrationDiagnostics";
import { BatchApplyPanel } from "./BatchApplyPanel";
import { BatchNoticePanel } from "./BatchNoticePanel";
import { RecentBatchesPanel } from "./RecentBatchesPanel";
import { RollReadinessPanel } from "./RollReadinessPanel";
import { BarChart3, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ScopeHeader } from "@/components/trust";
import { Badge } from "@/components/ui/badge";

interface RegressionModeProps {
  neighborhoodCode: string | null;
}

export function RegressionMode({ neighborhoodCode }: RegressionModeProps) {
  const hook = useCalibration(neighborhoodCode);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);

  // Track saved run ID when save completes
  const handleSave = () => {
    hook.saveRun();
    // We'll use latest history entry as the run ID after save
  };

  // Derive calibration run ID from most recent history entry matching current result
  const calibrationRunId = savedRunId || (hook.history.length > 0 ? hook.history[0]?.id : null);

  // Determine status badge for the latest run
  const latestRun = hook.history.length > 0 ? hook.history[0] : null;
  const runStatus = latestRun?.status as string | undefined;

  return (
    <div className="space-y-4">
      {/* Scope Header */}
      <div className="flex items-center gap-3">
        <ScopeHeader
          scope={neighborhoodCode ? "neighborhood" : "county"}
          label={neighborhoodCode || "All Neighborhoods"}
          source="factory"
          status={runStatus === "published" ? "published" : runStatus === "candidate" ? "candidate" : "draft"}
        />
        {latestRun && (
          <Badge variant="outline" className="text-[10px] py-0">
            Latest R²: {((latestRun.r_squared ?? 0) * 100).toFixed(1)}%
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Left: Control Panel + Batch Apply */}
      <div className="space-y-4">
        <RegressionControlPanel hook={hook} neighborhoodCode={neighborhoodCode} />

        {/* Batch Apply Panel — visible when we have results */}
        {hook.result && neighborhoodCode && (
          <>
            <BatchApplyPanel
              result={hook.result}
              neighborhoodCode={neighborhoodCode}
              calibrationRunId={calibrationRunId}
            />

            {/* Batch Notices — generate assessment change notices for affected parcels */}
            <BatchNoticePanel
              calibrationRunId={calibrationRunId}
              neighborhoodCode={neighborhoodCode}
              rSquared={hook.result.r_squared}
            />
          </>
        )}

        {/* Roll Readiness — certification blocker check */}
        <RollReadinessPanel neighborhoodCode={neighborhoodCode} />

        {/* Recent Batches with Rollback */}
        <RecentBatchesPanel />

        {/* Run History */}
        {hook.history.length > 0 && (
          <div className="material-bento p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Recent Runs</h3>
            <div className="space-y-2">
              {hook.history.slice(0, 5).map((run: any) => (
                <div key={run.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[hsl(var(--tf-elevated)/0.5)]">
                  <span className="text-muted-foreground">
                    {new Date(run.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-foreground">
                    R² {((run.r_squared ?? 0) * 100).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">n={run.sample_size ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Results Stage */}
      <div className="space-y-6">
        {hook.result ? (
          <>
            {hook.result.variables_dropped && hook.result.variables_dropped.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-warning)/0.1)] border border-[hsl(var(--tf-warning)/0.25)]">
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--tf-warning))] shrink-0 mt-0.5" />
                <div className="text-xs text-[hsl(var(--tf-warning))]">
                  <span className="font-medium">Variables auto-dropped</span>
                  <span className="text-muted-foreground ml-1">
                    (zero variance or collinearity):
                  </span>
                  {" "}
                  {hook.result.variables_dropped.map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px] py-0 mx-0.5 border-[hsl(var(--tf-warning)/0.4)] text-[hsl(var(--tf-warning))]">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <CalibrationDiagnostics diagnostics={hook.result.diagnostics} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CoefficientGrid coefficients={hook.result.coefficients} />
              <CalibrationScatterPlot data={hook.result.scatter} />
            </div>
          </>
        ) : (
          <div className="material-bento p-16 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--tf-elevated))] flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-[hsl(var(--tf-transcend-cyan)/0.5)]" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground">Regression Calibration</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {neighborhoodCode
                  ? "Select variables and run calibration to see results"
                  : "Select a neighborhood to begin"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

import { useCalibration } from "@/hooks/useCalibration";
import { RegressionControlPanel } from "./RegressionControlPanel";
import { CoefficientGrid } from "./CoefficientGrid";
import { CalibrationScatterPlot } from "./CalibrationScatterPlot";
import { CalibrationDiagnostics } from "./CalibrationDiagnostics";
import { BarChart3 } from "lucide-react";

interface RegressionModeProps {
  neighborhoodCode: string | null;
}

export function RegressionMode({ neighborhoodCode }: RegressionModeProps) {
  const hook = useCalibration(neighborhoodCode);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Left: Control Panel */}
      <div className="space-y-4">
        <RegressionControlPanel hook={hook} neighborhoodCode={neighborhoodCode} />

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
  );
}

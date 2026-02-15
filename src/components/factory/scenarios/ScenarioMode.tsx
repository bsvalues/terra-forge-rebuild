import { FlaskConical } from "lucide-react";

interface ScenarioModeProps {
  neighborhoodCode: string | null;
}

export function ScenarioMode({ neighborhoodCode }: ScenarioModeProps) {
  return (
    <div className="material-bento p-16 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
      <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--tf-elevated))] flex items-center justify-center">
        <FlaskConical className="w-8 h-8 text-[hsl(var(--tf-transcend-cyan)/0.5)]" />
      </div>
      <div>
        <h2 className="text-lg font-medium text-foreground">Scenario Modeling</h2>
        <p className="text-sm text-muted-foreground mt-1">Clone a calibration run, modify coefficients, and preview value impact</p>
      </div>
      {neighborhoodCode && (
        <p className="text-xs text-muted-foreground bg-[hsl(var(--tf-elevated))] px-3 py-1.5 rounded-full">
          Neighborhood: <span className="text-foreground font-medium">{neighborhoodCode}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground/60 italic mt-4">
        Phase 6.5 — Depends on Regression (6.2) and Cost (6.3) completion
      </p>
    </div>
  );
}

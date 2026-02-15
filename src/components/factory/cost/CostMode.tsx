import { CostScheduleEditor } from "./CostScheduleEditor";
import { DepreciationCurveEditor } from "./DepreciationCurveEditor";
import { CostApproachCalculator } from "./CostApproachCalculator";
import { DollarSign } from "lucide-react";

interface CostModeProps {
  neighborhoodCode: string | null;
}

export function CostMode({ neighborhoodCode }: CostModeProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Left: Schedule editor + depreciation */}
      <div className="space-y-6">
        <CostScheduleEditor />
        <DepreciationCurveEditor />
      </div>

      {/* Right: Calculator */}
      <div className="space-y-4">
        <CostApproachCalculator />
        {neighborhoodCode && (
          <div className="material-bento p-4">
            <p className="text-xs text-muted-foreground">
              Batch cost apply for <span className="text-foreground font-medium">{neighborhoodCode}</span> — coming in Phase 6.3.4
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

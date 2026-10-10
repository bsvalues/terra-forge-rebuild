import { useState } from "react";
import { CostScheduleEditor } from "./CostScheduleEditor";
import { DepreciationCurveEditor } from "./DepreciationCurveEditor";
import { DepreciationRowEditor } from "./DepreciationRowEditor";
import { CostApproachCalculator } from "./CostApproachCalculator";
import { BatchCostApplyPanel } from "./BatchCostApplyPanel";
import { CostRatioAnalysis } from "./CostRatioAnalysis";
import { type BatchCostResult } from "@/hooks/useCostBatchApply";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Ruler, Play } from "lucide-react";

interface CostModeProps {
  neighborhoodCode: string | null;
}

export function CostMode({ neighborhoodCode }: CostModeProps) {
  const [batchResults, _setBatchResults] = useState<BatchCostResult[] | null>(null);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList aria-label="Cost tools">
          <TabsTrigger value="schedules" className="text-xs gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Schedules & Calculator
          </TabsTrigger>
          <TabsTrigger value="depreciation" className="text-xs gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            Depreciation Tables
          </TabsTrigger>
          <TabsTrigger value="batch" className="text-xs gap-1.5">
            <Play className="w-3.5 h-3.5" />
            Batch Apply
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules">
          <div className="module-work-grid">
            <div className="space-y-6">
              <CostScheduleEditor />
            </div>
            <div>
              <CostApproachCalculator />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="depreciation">
          <div className="module-analysis-grid">
            <DepreciationRowEditor />
            <DepreciationCurveEditor />
          </div>
        </TabsContent>

        <TabsContent value="batch">
          <div className="module-analysis-grid">
            <BatchCostApplyPanel neighborhoodCode={neighborhoodCode} />
            {batchResults && batchResults.length > 0 && (
              <CostRatioAnalysis results={batchResults} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

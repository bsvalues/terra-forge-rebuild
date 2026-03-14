// TerraFusion OS — Phase 28: Income Mode (Factory tab)

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeApproachCalculator } from "./IncomeApproachCalculator";
import { IncomeDataManager } from "./IncomeDataManager";
import { BatchIncomeApplyPanel } from "./BatchIncomeApplyPanel";
import { Building2, Database, Play } from "lucide-react";

interface IncomeModeProps {
  neighborhoodCode: string | null;
}

export function IncomeMode({ neighborhoodCode }: IncomeModeProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="bg-[hsl(var(--tf-elevated)/0.5)]">
          <TabsTrigger value="data" className="text-xs gap-1.5">
            <Database className="w-3.5 h-3.5" />
            Income Data
          </TabsTrigger>
          <TabsTrigger value="calculator" className="text-xs gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="batch" className="text-xs gap-1.5">
            <Play className="w-3.5 h-3.5" />
            Batch Apply
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <IncomeDataManager neighborhoodCode={neighborhoodCode} />
        </TabsContent>

        <TabsContent value="calculator">
          <div className="max-w-md">
            <IncomeApproachCalculator />
          </div>
        </TabsContent>

        <TabsContent value="batch">
          <BatchIncomeApplyPanel neighborhoodCode={neighborhoodCode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

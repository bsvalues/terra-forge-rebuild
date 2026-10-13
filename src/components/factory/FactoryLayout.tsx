import { useSearchParams } from "react-router-dom";
import { WorkToolBar } from "@/components/navigation/WorkToolBar";
import { useWorkspaceTool } from "@/hooks/useWorkspaceTool";
import { motion } from "framer-motion";
import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { NeighborhoodSelector } from "./NeighborhoodSelector";
import { FactoryDashboardHeader } from "./FactoryDashboardHeader";
import { RegressionMode } from "./regression/RegressionMode";
import { CostMode } from "./cost/CostMode";
import { IncomeMode } from "./income/IncomeMode";
import { CompMode } from "./comps/CompMode";
import { ScenarioMode } from "./scenarios/ScenarioMode";
import { AdjustmentLedger } from "./AdjustmentLedger";
import { BarChart3, DollarSign, Building2, Grid3X3, FlaskConical, Factory as FactoryIcon, SlidersHorizontal } from "lucide-react";
import { ScopeHeader } from "@/components/trust";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { NeighborhoodFactorCalibration } from "./NeighborhoodFactorCalibration";

export type FactoryMode = "regression" | "cost" | "income" | "comps" | "scenarios" | "calibration";

interface FactoryLayoutProps {
  initialMode?: string;
}

const MODE_META: Record<FactoryMode, { label: string; icon: React.ElementType; description: string }> = {
  regression: { label: "Regression", icon: BarChart3, description: "Neighborhood OLS calibration" },
  cost:       { label: "Cost Tables", icon: DollarSign, description: "Marshall & Swift cost approach" },
  income:     { label: "Income", icon: Building2, description: "Cap rate & GRM valuation" },
  comps:      { label: "Comp Review", icon: Grid3X3, description: "Batch ratio review & adjustments" },
  scenarios:  { label: "Scenarios", icon: FlaskConical, description: "What-if impact analysis" },
  calibration: { label: "Calibration", icon: SlidersHorizontal, description: "PRD/COD/median ratio study" },
};

const MODES: FactoryMode[] = ["regression", "cost", "income", "comps", "scenarios", "calibration"];

export function FactoryLayout({ initialMode }: FactoryLayoutProps) {
  const [activeMode, handleModeChange] = useWorkspaceTool<FactoryMode>("mode", MODES, MODES.find(mode => mode === initialMode) ?? "regression");
  const [params, setParams] = useSearchParams();
  const neighborhood = params.get("neighborhood");
  const setNeighborhood = (value: string | null) => setParams(current => { const next = new URLSearchParams(current); if (value) next.set("neighborhood", value); else next.delete("neighborhood"); return next; }, { replace: true });
  const { data: vitals } = useCountyVitals();

  return (
    <div className="module-page space-y-4">
      <ModuleHeader title="Neighborhood valuation" icon={FactoryIcon}
        actions={<>
          <ScopeHeader scope={neighborhood ? "neighborhood" : "county"} label={neighborhood || "All Neighborhoods"} source="county-vitals" fetchedAt={vitals?.fetchedAt} />
          <NeighborhoodSelector value={neighborhood} onChange={setNeighborhood} />
        </>}
      />

      {/* Aggregate Stats Dashboard Header */}
      <details><summary className="cursor-pointer text-sm text-muted-foreground">County valuation summary</summary><div className="mt-4"><FactoryDashboardHeader /></div></details>

      {/* Mode Tabs */}
      <Tabs value={activeMode} onValueChange={handleModeChange} className="space-y-6">
        <WorkToolBar active={activeMode} onSelect={handleModeChange} primary={["regression", "cost", "income"]} tools={MODES.map(mode => ({ id: mode, label: MODE_META[mode].label, icon: MODE_META[mode].icon, group: "Review & reconciliation" }))} />

        {/* Mode Content */}
        {MODES.map((mode) => {
          return (
            <TabsContent key={mode} value={mode}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {mode === "regression" ? (
                  <RegressionMode neighborhoodCode={neighborhood} />
                ) : mode === "cost" ? (
                  <CostMode neighborhoodCode={neighborhood} />
                ) : mode === "income" ? (
                  <IncomeMode neighborhoodCode={neighborhood} />
                ) : mode === "comps" ? (
                  <CompMode neighborhoodCode={neighborhood} />
                ) : mode === "calibration" ? (
                  <NeighborhoodFactorCalibration neighborhoodCode={neighborhood} />
                ) : (
                  <ScenarioMode neighborhoodCode={neighborhood} />
                )}
              </motion.div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Adjustment Ledger — always visible below tabs */}
      <AdjustmentLedger />
    </div>
  );
}


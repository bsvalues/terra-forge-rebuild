import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NeighborhoodSelector } from "./NeighborhoodSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
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
  const [activeMode, setActiveMode] = useState<FactoryMode>(
    (MODES.includes(initialMode as FactoryMode) ? initialMode : "regression") as FactoryMode
  );
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const { data: vitals } = useCountyVitals();
  const countyId = useActiveCountyId();

  // Auto-select highest-density neighborhood on first load
  const { data: topNeighborhood } = useQuery({
    queryKey: ["factory-top-neighborhood", countyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .eq("county_id", countyId!)
        .not("neighborhood_code", "is", null)
        .limit(5000);
      if (!data?.length) return null;
      const counts = new Map<string, number>();
      for (const p of data) {
        const code = p.neighborhood_code!;
        counts.set(code, (counts.get(code) || 0) + 1);
      }
      let best = "";
      let bestN = 0;
      for (const [code, n] of counts) {
        if (n > bestN) { best = code; bestN = n; }
      }
      return best || null;
    },
    enabled: !!countyId,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!neighborhood && topNeighborhood) {
      setNeighborhood(topNeighborhood);
    }
  }, [topNeighborhood, neighborhood]);

  const handleModeChange = useCallback((val: string) => {
    setActiveMode(val as FactoryMode);
  }, []);

  return (
    <div className="module-page space-y-4">
      <ModuleHeader title="Mass Appraisal Factory" icon={FactoryIcon}
        description="Neighborhood calibration and valuation review"
        actions={<>
          <ScopeHeader scope={neighborhood ? "neighborhood" : "county"} label={neighborhood || "All Neighborhoods"} source="county-vitals" fetchedAt={vitals?.fetchedAt} />
          <NeighborhoodSelector value={neighborhood} onChange={setNeighborhood} />
        </>}
      />

      {/* Aggregate Stats Dashboard Header */}
      <FactoryDashboardHeader />

      {/* Mode Tabs */}
      <Tabs value={activeMode} onValueChange={handleModeChange} className="space-y-6">
        <TabsList aria-label="Factory modes">
          {MODES.map((mode) => {
            const meta = MODE_META[mode];
            const Icon = meta.icon;
            return (
              <TabsTrigger
                key={mode}
                value={mode}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{meta.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

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


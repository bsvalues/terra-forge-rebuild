import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NeighborhoodSelector } from "./NeighborhoodSelector";
import { BarChart3, DollarSign, Grid3X3, FlaskConical, Factory as FactoryIcon } from "lucide-react";

export type FactoryMode = "regression" | "cost" | "comps" | "scenarios";

interface FactoryLayoutProps {
  initialMode?: string;
}

const MODE_META: Record<FactoryMode, { label: string; icon: React.ElementType; description: string }> = {
  regression: { label: "Regression", icon: BarChart3, description: "Neighborhood OLS calibration" },
  cost:       { label: "Cost Tables", icon: DollarSign, description: "Marshall & Swift cost approach" },
  comps:      { label: "Comp Review", icon: Grid3X3, description: "Batch ratio review & adjustments" },
  scenarios:  { label: "Scenarios", icon: FlaskConical, description: "What-if impact analysis" },
};

const MODES: FactoryMode[] = ["regression", "cost", "comps", "scenarios"];

export function FactoryLayout({ initialMode }: FactoryLayoutProps) {
  const [activeMode, setActiveMode] = useState<FactoryMode>(
    (MODES.includes(initialMode as FactoryMode) ? initialMode : "regression") as FactoryMode
  );
  const [neighborhood, setNeighborhood] = useState<string | null>(null);

  const handleModeChange = useCallback((val: string) => {
    setActiveMode(val as FactoryMode);
  }, []);

  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Factory Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--suite-forge))] to-[hsl(var(--tf-bright-cyan))] flex items-center justify-center shadow-[0_4px_16px_hsl(var(--suite-forge)/0.3)]">
            <FactoryIcon className="w-5 h-5 text-[hsl(var(--tf-substrate))]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-foreground">Mass Appraisal Factory</h1>
            <p className="text-xs text-muted-foreground">Statistical assembly line — neighborhood-level calibration & review</p>
          </div>
        </div>

        <NeighborhoodSelector value={neighborhood} onChange={setNeighborhood} />
      </motion.div>

      {/* Mode Tabs */}
      <Tabs value={activeMode} onValueChange={handleModeChange} className="space-y-6">
        <TabsList className="bg-[hsl(var(--tf-surface))] border border-border p-1 h-auto">
          {MODES.map((mode) => {
            const meta = MODE_META[mode];
            const Icon = meta.icon;
            return (
              <TabsTrigger
                key={mode}
                value={mode}
                className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-[hsl(var(--tf-elevated))] data-[state=active]:text-[hsl(var(--tf-transcend-cyan))] data-[state=active]:shadow-sm"
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{meta.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Mode Content */}
        {MODES.map((mode) => {
          const meta = MODE_META[mode];
          return (
            <TabsContent key={mode} value={mode}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FactoryPlaceholder mode={mode} description={meta.description} neighborhood={neighborhood} />
              </motion.div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

/** Placeholder for each mode — will be replaced by real implementations in 6.2–6.5 */
function FactoryPlaceholder({ mode, description, neighborhood }: { mode: string; description: string; neighborhood: string | null }) {
  const meta = MODE_META[mode as FactoryMode];
  const Icon = meta.icon;

  return (
    <div className="material-bento p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
      <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--tf-elevated))] flex items-center justify-center">
        <Icon className="w-8 h-8 text-[hsl(var(--tf-transcend-cyan))]" />
      </div>
      <div>
        <h2 className="text-lg font-medium text-foreground">{meta.label}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {neighborhood && (
        <p className="text-xs text-muted-foreground bg-[hsl(var(--tf-elevated))] px-3 py-1.5 rounded-full">
          Neighborhood: <span className="text-foreground font-medium">{neighborhood}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground/60 italic mt-4">
        Phase 6.{mode === "regression" ? "2" : mode === "cost" ? "3" : mode === "comps" ? "4" : "5"} — Implementation pending
      </p>
    </div>
  );
}

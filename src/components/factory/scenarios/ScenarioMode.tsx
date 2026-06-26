import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useScenarioParcels, useScenarioSales } from "@/hooks/useScenarioData";
import { applyScenarioAdjustments } from "@/services/suites/forgeService";
import { invalidateFactory } from "@/lib/queryInvalidation";
import { FlaskConical, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, RefreshCw, Save, CheckCircle2, Loader2, Target, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { toast } from "sonner";

interface ScenarioModeProps {
  neighborhoodCode: string | null;
}

interface ScenarioConfig {
  landAdjustment: number;       // % change
  improvementAdjustment: number; // % change
  maxCapPct: number;             // cap increases at this %
  targetMedianRatio: number;     // target ratio
}

interface SavedScenario {
  id: string;
  name: string;
  config: ScenarioConfig;
  savedAt: string;
  parcelCount: number;
  avgChange: number;
}

const DEFAULT_SCENARIO: ScenarioConfig = {
  landAdjustment: 0,
  improvementAdjustment: 0,
  maxCapPct: 25,
  targetMedianRatio: 1.0,
};

export function ScenarioMode({ neighborhoodCode }: ScenarioModeProps) {
  const [config, setConfig] = useState<ScenarioConfig>(DEFAULT_SCENARIO);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const queryClient = useQueryClient();

  // Use extracted hooks (Data Constitution compliance)
  const { data: parcels, isLoading } = useScenarioParcels(neighborhoodCode);
  const { data: sales } = useScenarioSales(neighborhoodCode);

  // Compute scenario impact
  const impact = useMemo(() => {
    if (!parcels || parcels.length === 0) return null;

    let totalCurrentValue = 0;
    let totalNewValue = 0;
    let increases = 0;
    let decreases = 0;
    let unchanged = 0;
    let cappedCount = 0;

    const details = parcels.map((p) => {
      const land = p.land_value || 0;
      const impr = p.improvement_value || 0;
      const current = p.assessed_value || 0;

      const newLand = land * (1 + config.landAdjustment / 100);
      const newImpr = impr * (1 + config.improvementAdjustment / 100);
      let proposed = Math.round(newLand + newImpr);

      // Apply cap
      if (current > 0 && config.maxCapPct < 100) {
        const maxAllowed = current * (1 + config.maxCapPct / 100);
        if (proposed > maxAllowed) {
          proposed = Math.round(maxAllowed);
          cappedCount++;
        }
      }

      const change = current > 0 ? ((proposed - current) / current) * 100 : 0;
      totalCurrentValue += current;
      totalNewValue += proposed;
      if (change > 0.5) increases++;
      else if (change < -0.5) decreases++;
      else unchanged++;

      return { ...p, proposed, change };
    });

    const avgChange = totalCurrentValue > 0 ? ((totalNewValue - totalCurrentValue) / totalCurrentValue) * 100 : 0;
    const totalDelta = totalNewValue - totalCurrentValue;

    return { details, totalCurrentValue, totalNewValue, totalDelta, avgChange, increases, decreases, unchanged, cappedCount };
  }, [parcels, config]);

  // VEI ratio impact preview
  const ratioPreview = useMemo(() => {
    if (!impact || !sales || sales.length === 0) return null;

    const parcelProposed = new Map(impact.details.map(p => [p.id, p.proposed]));
    const parcelCurrent = new Map(impact.details.map(p => [p.id, p.assessed_value || 0]));

    const currentRatios: number[] = [];
    const proposedRatios: number[] = [];

    for (const sale of sales) {
      const current = parcelCurrent.get(sale.parcel_id);
      const proposed = parcelProposed.get(sale.parcel_id);
      if (current && current > 0 && sale.sale_price > 0) {
        currentRatios.push(current / sale.sale_price);
      }
      if (proposed && proposed > 0 && sale.sale_price > 0) {
        proposedRatios.push(proposed / sale.sale_price);
      }
    }

    if (currentRatios.length < 3) return null;

    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    const cod = (arr: number[], med: number) =>
      med > 0 ? (arr.reduce((s, v) => s + Math.abs(v - med), 0) / arr.length / med) * 100 : 0;

    const curMedian = median(currentRatios);
    const propMedian = median(proposedRatios.length > 0 ? proposedRatios : currentRatios);
    const curCOD = cod(currentRatios, curMedian);
    const propCOD = cod(proposedRatios.length > 0 ? proposedRatios : currentRatios, propMedian);

    return {
      sampleSize: currentRatios.length,
      currentMedian: curMedian,
      proposedMedian: propMedian,
      currentCOD: curCOD,
      proposedCOD: propCOD,
      medianDelta: propMedian - curMedian,
      codDelta: propCOD - curCOD,
    };
  }, [impact, sales]);

  // Apply scenario — route through Forge write lane (Data Constitution)
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!impact || !neighborhoodCode) throw new Error("No scenario to apply");

      const adjustments = impact.details
        .filter(p => Math.abs(p.change) > 0.5)
        .map(p => ({
          parcelId: p.id,
          previousValue: p.assessed_value || 0,
          newValue: p.proposed,
        }));

      if (adjustments.length === 0) throw new Error("No parcels changed — nothing to apply");

      const reason = `Scenario: Land ${config.landAdjustment > 0 ? "+" : ""}${config.landAdjustment}%, Impr ${config.improvementAdjustment > 0 ? "+" : ""}${config.improvementAdjustment}%, Cap ${config.maxCapPct}%`;

      return applyScenarioAdjustments(neighborhoodCode, adjustments, reason);
    },
    onSuccess: (data) => {
      toast.success(`Scenario applied to ${data.applied} parcels`, {
        description: "Value adjustments recorded in the ledger",
      });
      invalidateFactory(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Save scenario locally
  const handleSaveScenario = () => {
    if (!impact) return;
    const name = scenarioName.trim() || `Scenario ${savedScenarios.length + 1}`;
    setSavedScenarios(prev => [
      {
        id: `sc_${Date.now()}`,
        name,
        config: { ...config },
        savedAt: new Date().toISOString(),
        parcelCount: impact.details.length,
        avgChange: impact.avgChange,
      },
      ...prev,
    ].slice(0, 10));
    setScenarioName("");
    toast.success(`Scenario "${name}" saved`);
  };

  const loadScenario = (sc: SavedScenario) => {
    setConfig(sc.config);
    toast.info(`Loaded scenario: ${sc.name}`);
  };

  if (!neighborhoodCode) {
    return (
      <div className="material-bento p-16 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--tf-elevated))] flex items-center justify-center">
          <FlaskConical className="w-8 h-8 text-[hsl(var(--tf-transcend-cyan)/0.5)]" />
        </div>
        <h2 className="text-lg font-medium text-foreground">Scenario Modeling</h2>
        <p className="text-sm text-muted-foreground">Select a neighborhood to begin what-if analysis</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      {/* Left: Controls */}
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="material-bento p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-tf-cyan" />
              Scenario Parameters
            </h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfig(DEFAULT_SCENARIO)}>
              <RefreshCw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>

          <ScenarioSlider
            label="Land Value Adjustment"
            value={config.landAdjustment}
            onChange={(v) => setConfig(prev => ({ ...prev, landAdjustment: v }))}
            min={-30} max={30} step={0.5}
            suffix="%"
          />
          <ScenarioSlider
            label="Improvement Value Adjustment"
            value={config.improvementAdjustment}
            onChange={(v) => setConfig(prev => ({ ...prev, improvementAdjustment: v }))}
            min={-30} max={30} step={0.5}
            suffix="%"
          />
          <ScenarioSlider
            label="Max Increase Cap"
            value={config.maxCapPct}
            onChange={(v) => setConfig(prev => ({ ...prev, maxCapPct: v }))}
            min={5} max={100} step={1}
            suffix="%"
          />

          <div className="pt-3 border-t border-border/30">
            <Badge variant="outline" className="text-[10px]">
              Neighborhood: {neighborhoodCode}
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isLoading ? "Loading..." : `${parcels?.length || 0} parcels in scope`}
            </p>
          </div>
        </motion.div>

        {/* VEI Ratio Impact Preview */}
        {ratioPreview && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="material-bento p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              VEI Ratio Impact
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Current Median</p>
                <p className="text-sm font-mono font-medium">{ratioPreview.currentMedian.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Proposed Median</p>
                <p className={`text-sm font-mono font-medium ${
                  Math.abs(ratioPreview.proposedMedian - 1.0) < Math.abs(ratioPreview.currentMedian - 1.0) ? "text-primary" : "text-destructive"
                }`}>{ratioPreview.proposedMedian.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Current COD</p>
                <p className="text-sm font-mono font-medium">{ratioPreview.currentCOD.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Proposed COD</p>
                <p className={`text-sm font-mono font-medium ${
                  ratioPreview.proposedCOD < ratioPreview.currentCOD ? "text-primary" : "text-destructive"
                }`}>{ratioPreview.proposedCOD.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Based on {ratioPreview.sampleSize} qualified sales
            </p>
          </motion.div>
        )}

        {/* Save & Apply Actions */}
        {impact && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="material-bento p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scenario name..."
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="flex-1 text-xs bg-muted/50 border border-border/50 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/50"
              />
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSaveScenario}>
                <Save className="w-3 h-3" /> Save
              </Button>
            </div>

            <CommitmentButton
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending || impact.increases + impact.decreases === 0}
              variant="gold"
            >
              {applyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {applyMutation.isPending ? "Applying…" : `Apply to ${impact.increases + impact.decreases} Parcels`}
            </CommitmentButton>

            {impact.increases + impact.decreases === 0 && (
              <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Adjust parameters to create changes
              </p>
            )}
          </motion.div>
        )}

        {/* Saved Scenarios */}
        {savedScenarios.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="material-bento p-4 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saved Scenarios</h3>
            {savedScenarios.map(sc => (
              <button
                key={sc.id}
                onClick={() => loadScenario(sc)}
                className="w-full flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <span className="font-medium text-foreground truncate">{sc.name}</span>
                <span className={`font-mono ${sc.avgChange >= 0 ? "text-primary" : "text-destructive"}`}>
                  {sc.avgChange >= 0 ? "+" : ""}{sc.avgChange.toFixed(1)}%
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Right: Impact Analysis */}
      <div className="space-y-4">
        {impact ? (
          <>
            {/* Impact Summary Cards */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ImpactCard
                icon={DollarSign}
                label="Total Δ"
                value={`${impact.totalDelta >= 0 ? "+" : ""}$${Math.abs(impact.totalDelta).toLocaleString()}`}
                accent={impact.totalDelta >= 0 ? "text-tf-green" : "text-destructive"}
              />
              <ImpactCard
                icon={Percent}
                label="Avg Change"
                value={`${impact.avgChange >= 0 ? "+" : ""}${impact.avgChange.toFixed(1)}%`}
                accent={Math.abs(impact.avgChange) < 5 ? "text-tf-green" : "text-tf-amber"}
              />
              <ImpactCard
                icon={TrendingUp}
                label="Increases"
                value={impact.increases.toString()}
                accent="text-tf-green"
              />
              <ImpactCard
                icon={TrendingDown}
                label="Decreases"
                value={impact.decreases.toString()}
                accent="text-destructive"
              />
            </motion.div>

            {/* Capped notice */}
            {impact.cappedCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-tf-amber bg-[hsl(var(--tf-amber)/0.1)] rounded-lg px-4 py-2">
                <BarChart3 className="w-3.5 h-3.5" />
                {impact.cappedCount} parcel{impact.cappedCount !== 1 ? "s" : ""} capped at {config.maxCapPct}% max increase
              </div>
            )}

            {/* Parcel Impact Table */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="material-bento rounded-2xl p-5"
            >
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-tf-cyan" />
                Parcel Impact Preview
                <Badge variant="outline" className="text-[10px] ml-auto">{impact.details.length} parcels</Badge>
              </h4>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border/50 text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-3">PIN</th>
                      <th className="text-right py-2 pr-3">Current</th>
                      <th className="text-right py-2 pr-3">Proposed</th>
                      <th className="text-right py-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.details.slice(0, 100).map((p) => (
                      <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-2 pr-3">
                          <span className="font-mono text-xs">{p.parcel_number}</span>
                        </td>
                        <td className="text-right py-2 pr-3 text-muted-foreground font-mono text-xs">
                          ${p.assessed_value?.toLocaleString()}
                        </td>
                        <td className="text-right py-2 pr-3 font-mono text-xs font-medium">
                          ${p.proposed.toLocaleString()}
                        </td>
                        <td className="text-right py-2">
                          <span className={`text-xs font-medium ${
                            p.change > 0.5 ? "text-tf-green" : p.change < -0.5 ? "text-destructive" : "text-muted-foreground"
                          }`}>
                            {p.change >= 0 ? "+" : ""}{p.change.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {impact.details.length > 100 && (
                  <p className="text-center text-xs text-muted-foreground py-3">
                    Showing 100 of {impact.details.length} parcels
                  </p>
                )}
              </div>
            </motion.div>
          </>
        ) : (
          <div className="material-bento p-16 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
            <FlaskConical className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Loading scenario data...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioSlider({
  label, value, onChange, min, max, step, suffix = "",
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-mono font-medium ${
          value > 0 ? "text-tf-green" : value < 0 ? "text-destructive" : "text-muted-foreground"
        }`}>
          {value > 0 ? "+" : ""}{value}{suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min} max={max} step={step}
        className="w-full"
      />
    </div>
  );
}

function ImpactCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="material-bento rounded-xl p-4 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${accent}`} />
      <div className={`text-lg font-medium ${accent}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

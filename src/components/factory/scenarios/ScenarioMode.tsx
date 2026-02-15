import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FlaskConical, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface ScenarioModeProps {
  neighborhoodCode: string | null;
}

interface ScenarioConfig {
  landAdjustment: number;       // % change
  improvementAdjustment: number; // % change
  maxCapPct: number;             // cap increases at this %
  targetMedianRatio: number;     // target ratio
}

const DEFAULT_SCENARIO: ScenarioConfig = {
  landAdjustment: 0,
  improvementAdjustment: 0,
  maxCapPct: 25,
  targetMedianRatio: 1.0,
};

export function ScenarioMode({ neighborhoodCode }: ScenarioModeProps) {
  const [config, setConfig] = useState<ScenarioConfig>(DEFAULT_SCENARIO);

  // Fetch real parcel data for the selected neighborhood
  const { data: parcels, isLoading } = useQuery({
    queryKey: ["scenario-parcels", neighborhoodCode],
    queryFn: async () => {
      let query = supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value, land_value, improvement_value, neighborhood_code")
        .gt("assessed_value", 0);
      if (neighborhoodCode) {
        query = query.eq("neighborhood_code", neighborhoodCode);
      }
      const { data } = await query.limit(500);
      return data || [];
    },
    staleTime: 120_000,
  });

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

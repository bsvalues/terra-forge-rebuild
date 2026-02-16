import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { Save, Play, Loader2, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFieldCohort } from "@/hooks/useFieldCohort";
import type { useCalibration } from "@/hooks/useCalibration";

interface RegressionControlPanelProps {
  hook: ReturnType<typeof useCalibration>;
  neighborhoodCode: string | null;
}

export function RegressionControlPanel({ hook, neighborhoodCode }: RegressionControlPanelProps) {
  const { availableVariables, selectedVars, setSelectedVars, runCalibration, isRunning, saveRun, isSaving, result } = hook;
  const { cohort, count: fieldCount } = useFieldCohort();
  const [fieldFilter, setFieldFilter] = useState(false);

  const toggleVar = (id: string) => {
    setSelectedVars((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  return (
    <div className="material-bento p-5 space-y-5">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">Independent Variables</h3>
        <p className="text-xs text-muted-foreground mb-3">Select features for the OLS model</p>
        <div className="space-y-2">
          {availableVariables.map((v) => (
            <label key={v.id} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={selectedVars.includes(v.id)}
                onCheckedChange={() => toggleVar(v.id)}
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {v.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Field Cohort Filter — recently inspected strata */}
      {fieldCount > 0 && (
        <div className="border border-border/50 rounded-lg p-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={fieldFilter} onCheckedChange={(c) => setFieldFilter(!!c)} />
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm text-foreground">Recently Inspected</span>
            <Badge variant="outline" className="ml-auto text-[10px]">{fieldCount}</Badge>
          </label>
          {fieldFilter && (
            <p className="text-[11px] text-muted-foreground pl-6">
              Cohort filter active — {fieldCount} field-verified parcels will seed recalibration strata.
            </p>
          )}
        </div>
      )}

      {!neighborhoodCode && (
        <p className="text-xs text-[hsl(var(--tf-sacred-gold))] bg-[hsl(var(--tf-sacred-gold)/0.1)] px-3 py-2 rounded-lg">
          Select a neighborhood to run calibration
        </p>
      )}

      <div className="flex flex-col gap-2">
        <CommitmentButton
          onClick={() => runCalibration()}
          disabled={!neighborhoodCode || selectedVars.length === 0 || isRunning}
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isRunning ? "Running…" : "Run Calibration"}
        </CommitmentButton>

        {result && (
          <CommitmentButton
            variant="gold"
            onClick={() => saveRun()}
            disabled={isSaving}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving…" : "Save Run"}
          </CommitmentButton>
        )}
      </div>
    </div>
  );
}

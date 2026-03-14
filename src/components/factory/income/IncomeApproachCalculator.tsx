// TerraFusion OS — Phase 28: Income Approach Calculator

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { computeIncomeApproach } from "@/hooks/useIncomeApproach";

export function IncomeApproachCalculator() {
  const [inputs, setInputs] = useState({
    grossIncome: 120000,
    vacancyRate: 0.05,
    expenses: 40000,
    capRate: 0.08,
    grm: 10,
  });

  const result = useMemo(
    () => computeIncomeApproach(inputs.grossIncome, inputs.vacancyRate, inputs.expenses, inputs.capRate, inputs.grm),
    [inputs]
  );

  return (
    <div className="material-bento p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-[hsl(var(--tf-transcend-cyan))]" />
        <h3 className="text-sm font-medium text-foreground">Income Approach Calculator</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Gross Rental Income ($)</Label>
          <Input type="number" value={inputs.grossIncome} onChange={(e) => setInputs((p) => ({ ...p, grossIncome: +e.target.value }))} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Vacancy Rate</Label>
          <Input type="number" step="0.01" min="0" max="1" value={inputs.vacancyRate} onChange={(e) => setInputs((p) => ({ ...p, vacancyRate: +e.target.value }))} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Operating Expenses ($)</Label>
          <Input type="number" value={inputs.expenses} onChange={(e) => setInputs((p) => ({ ...p, expenses: +e.target.value }))} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Cap Rate</Label>
          <Input type="number" step="0.005" min="0.01" max="0.5" value={inputs.capRate} onChange={(e) => setInputs((p) => ({ ...p, capRate: +e.target.value }))} className="h-8 text-sm" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Gross Rent Multiplier (GRM)</Label>
          <Input type="number" step="0.5" value={inputs.grm} onChange={(e) => setInputs((p) => ({ ...p, grm: +e.target.value }))} className="h-8 text-sm" />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <ResultCard label="Effective Gross" value={`$${(inputs.grossIncome * (1 - inputs.vacancyRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} muted />
        <ResultCard label="NOI" value={`$${result.noi.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <ResultCard label="Cap Rate Value" value={result.capRateValue ? `$${result.capRateValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} />
        <ResultCard label="GRM Value" value={result.grmValue ? `$${result.grmValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} />
        <div className="col-span-2 bg-[hsl(var(--tf-elevated))] rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Reconciled Income Value</p>
          <p className="text-xl font-mono font-medium text-[hsl(var(--tf-transcend-cyan))]">
            {result.reconciled ? `$${result.reconciled.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </p>
          <Badge variant="outline" className="text-[10px] mt-1">
            Cap Rate: {(inputs.capRate * 100).toFixed(1)}% · GRM: {inputs.grm.toFixed(1)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="text-center p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

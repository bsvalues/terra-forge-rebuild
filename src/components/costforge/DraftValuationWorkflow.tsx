import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalcRCNLD, useImprvTypeCodes } from "@/hooks/useCostForgeHooks";
import { useSaveCalcTrace } from "@/hooks/useCostForgeMutations";
import type { CostForgeCalcInput, QualityGrade } from "@/services/costforgeConnector";
import { ClipboardCheck, Calculator, Save, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";

const BENTON_COUNTY_ID = "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d";

type Step = 1 | 2 | 3;

interface DraftForm {
  imprvTypeCd: string;
  isResidential: boolean;
  yearBuilt: string;
  areaSqft: string;
  qualityGrade: QualityGrade;
  extWallType: string;
  effectiveLife: string;
  constructionClass: string;
  sectionId: string;
  occupancyCode: string;
}

const QUALITY_OPTIONS: QualityGrade[] = ["Low", "Fair", "Average", "Good", "Excellent"];

function toNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function DraftValuationWorkflow() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<DraftForm>({
    imprvTypeCd: "",
    isResidential: true,
    yearBuilt: "",
    areaSqft: "",
    qualityGrade: "Average",
    extWallType: "Metal or Vinyl Siding",
    effectiveLife: "45",
    constructionClass: "D",
    sectionId: "",
    occupancyCode: "",
  });

  const { data: typeCodes = [] } = useImprvTypeCodes(BENTON_COUNTY_ID);
  const { result, isLoading: calcLoading, error: calcError, calculate, reset } = useCalcRCNLD();
  const saveMutation = useSaveCalcTrace();

  const yearNow = new Date().getFullYear();

  // Split type codes into residential / commercial
  const resCodes = useMemo(() => typeCodes.filter((c) => c.is_residential), [typeCodes]);
  const commCodes = useMemo(() => typeCodes.filter((c) => !c.is_residential), [typeCodes]);
  const activeCodes = form.isResidential ? resCodes : commCodes;

  // Derived from selected type code
  const selectedCode = useMemo(
    () => typeCodes.find((c) => c.imprv_det_type_cd === form.imprvTypeCd) ?? null,
    [typeCodes, form.imprvTypeCd],
  );

  const canAdvanceToStep2 = form.imprvTypeCd !== "" && toNum(form.areaSqft) > 0 && toNum(form.yearBuilt) > 0;

  // Build CostForgeCalcInput from form
  function buildCalcInput(): CostForgeCalcInput {
    return {
      lrsn: null,
      pin: null,
      county_id: BENTON_COUNTY_ID,
      imprv_det_type_cd: form.imprvTypeCd,
      yr_built: toNum(form.yearBuilt) || null,
      area_sqft: toNum(form.areaSqft) || null,
      condition_code: null,
      construction_class_raw: form.constructionClass || null,
      use_code: null,
      section_id: selectedCode?.section_id ?? (toNum(form.sectionId) || null),
      occupancy_code: selectedCode?.occupancy_code ?? form.occupancyCode || null,
      is_residential: form.isResidential,
    };
  }

  async function handleCalculate() {
    const input = buildCalcInput();
    await (calculate as any)(
      {
        prop_type: form.isResidential ? "R" : "C",
        year_built: toNum(form.yearBuilt),
        area: toNum(form.areaSqft),
        county_id: BENTON_COUNTY_ID,
        ...input,
      },
      form.qualityGrade,
      form.isResidential ? form.extWallType : undefined,
      toNum(form.effectiveLife) || 45,
    );
    setStep(3);
  }

  async function handleSave() {
    if (!result) return;
    saveMutation.mutate({
      county_id: BENTON_COUNTY_ID,
      parcel_id: null,
      lrsn: null,
      prop_id: null,
      calc_year: yearNow,
      imprv_sequence: 1,
      imprv_type_cd: form.imprvTypeCd,
      section_id: selectedCode?.section_id ?? null,
      occupancy_code: selectedCode?.occupancy_code ?? null,
      construction_class: (form.constructionClass as any) ?? null,
      quality_grade: form.qualityGrade,
      area_sqft: toNum(form.areaSqft) || null,
      base_unit_cost: result.baseUnitCost,
      local_multiplier: result.localMultiplier,
      current_cost_mult: result.currentCostMult,
      rcn_before_ref: result.rcnBeforeRef,
      refinements_total: result.refinementsTotal ?? 0,
      rcn: result.rcn,
      age_years: result.ageYears,
      effective_life_years: result.effectiveLifeYears,
      pct_good: result.pctGood,
      rcnld: result.rcnld,
      schedule_source: result.scheduleSource,
      calc_method: "draft_manual",
    });
  }

  function handleReset() {
    setStep(1);
    reset();
    saveMutation.reset();
    setForm((f) => ({ ...f, imprvTypeCd: "", yearBuilt: "", areaSqft: "" }));
  }

  const set = <K extends keyof DraftForm>(key: K, val: DraftForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // ── Step 1: Select improvement type & basics ─────────────────────────────
  const Step1 = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Property Type</Label>
          <Select
            value={form.isResidential ? "R" : "C"}
            onValueChange={(v) => {
              set("isResidential", v === "R");
              set("imprvTypeCd", "");
            }}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="R">Residential</SelectItem>
              <SelectItem value="C">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Improvement Type</Label>
          <Select value={form.imprvTypeCd} onValueChange={(v) => set("imprvTypeCd", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
            <SelectContent>
              {activeCodes.map((c) => (
                <SelectItem key={c.imprv_det_type_cd} value={c.imprv_det_type_cd}>
                  {c.imprv_det_type_cd} — {c.type_desc ?? c.canonical_desc ?? "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Year Built</Label>
          <Input
            className="h-9 text-sm"
            type="number"
            placeholder="e.g. 2005"
            value={form.yearBuilt}
            onChange={(e) => set("yearBuilt", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Area (sqft)</Label>
          <Input
            className="h-9 text-sm"
            type="number"
            placeholder="e.g. 1800"
            value={form.areaSqft}
            onChange={(e) => set("areaSqft", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button size="sm" disabled={!canAdvanceToStep2} onClick={() => setStep(2)}>
          Next <ChevronRight className="ml-1 w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ── Step 2: Confirm / edit cost parameters ───────────────────────────────
  const Step2 = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Quality Grade</Label>
          <Select value={form.qualityGrade} onValueChange={(v) => set("qualityGrade", v as QualityGrade)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUALITY_OPTIONS.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.isResidential && (
          <div className="space-y-1">
            <Label className="text-xs">Exterior Wall</Label>
            <Input
              className="h-9 text-sm"
              value={form.extWallType}
              onChange={(e) => set("extWallType", e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Construction Class</Label>
          <Select value={form.constructionClass} onValueChange={(v) => set("constructionClass", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["A", "B", "C", "D", "S", "P"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Effective Life (years)</Label>
          <Input
            className="h-9 text-sm"
            type="number"
            value={form.effectiveLife}
            onChange={(e) => set("effectiveLife", e.target.value)}
          />
        </div>

        {!form.isResidential && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Section ID</Label>
              <Input
                className="h-9 text-sm"
                type="number"
                value={form.sectionId}
                onChange={(e) => set("sectionId", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Occupancy Code</Label>
              <Input
                className="h-9 text-sm"
                value={form.occupancyCode}
                onChange={(e) => set("occupancyCode", e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <p>Type: <strong>{form.imprvTypeCd}</strong> · Area: <strong>{toNum(form.areaSqft).toLocaleString()} sqft</strong> · Year Built: <strong>{form.yearBuilt}</strong> · Age: <strong>{Math.max(0, yearNow - toNum(form.yearBuilt))} yrs</strong></p>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={() => setStep(1)}>
          <ChevronLeft className="mr-1 w-4 h-4" /> Back
        </Button>
        <Button size="sm" onClick={handleCalculate} disabled={calcLoading}>
          {calcLoading ? "Calculating..." : "Calculate RCNLD"}
          <Calculator className="ml-1 w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ── Step 3: Review result & save ─────────────────────────────────────────
  const Step3 = (
    <div className="space-y-4">
      {calcError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Calculation failed: {String(calcError)}</span>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <ResultCell label="Base $/sqft" value={result.baseUnitCost != null ? `$${result.baseUnitCost.toFixed(2)}` : "—"} />
          <ResultCell label="Local Mult" value={result.localMultiplier != null ? `${result.localMultiplier}%` : "—"} />
          <ResultCell label="Current Cost Mult" value={result.currentCostMult != null ? `${result.currentCostMult}%` : "—"} />
          <ResultCell label="RCN" value={result.rcn != null ? `$${result.rcn.toLocaleString()}` : "—"} />
          <ResultCell label="Age" value={result.ageYears != null ? `${result.ageYears} yrs` : "—"} />
          <ResultCell label="Eff. Life" value={`${result.effectiveLifeYears} yrs`} />
          <ResultCell label="% Good" value={result.pctGood != null ? `${result.pctGood}%` : "—"} />
          <ResultCell label="RCNLD" value={result.rcnld != null ? `$${result.rcnld.toLocaleString()}` : "—"} highlight />
        </div>
      )}

      {saveMutation.isSuccess && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Draft trace saved successfully.
        </div>
      )}

      {saveMutation.isError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Save failed: {String((saveMutation.error as Error)?.message ?? saveMutation.error)}</span>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={() => setStep(2)}>
          <ChevronLeft className="mr-1 w-4 h-4" /> Back
        </Button>
        <div className="flex gap-2">
          {saveMutation.isSuccess ? (
            <Button size="sm" variant="outline" onClick={handleReset}>
              New Draft
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!result || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Draft Trace"}
              <Save className="ml-1 w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          Draft Valuation Workflow
        </CardTitle>
        <StepIndicator current={step} />
      </CardHeader>
      <CardContent>
        {step === 1 && Step1}
        {step === 2 && Step2}
        {step === 3 && Step3}
      </CardContent>
    </Card>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = ["Select Improvement", "Cost Parameters", "Review & Save"];
  return (
    <div className="flex items-center gap-1 mt-2">
      {steps.map((label, i) => {
        const num = (i + 1) as Step;
        const active = num === current;
        const done = num < current;
        return (
          <div key={label} className="flex items-center gap-1">
            {i > 0 && <div className={`w-6 h-px ${done || active ? "bg-primary" : "bg-border"}`} />}
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium
                ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {done ? "✓" : num}
            </span>
            <span className={`text-[11px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ResultCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md p-2 ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

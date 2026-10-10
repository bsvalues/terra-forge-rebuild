import { useState } from "react";
import { Play, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface ValuationResult {
  estimatedValue: { low: number; mid: number; high: number };
  confidenceScore: number;
  costApproach?: {
    replacementCost: number;
    depreciation: number;
    landValue: number;
    totalValue: number;
  };
  marketApproach?: {
    indicatedValue: number;
  };
  recommendations: string[];
  riskFactors: string[];
  sacredBalance?: {
    level3Foundation: number;
    level6Harmony: number;
    level9Transcendence: number;
  };
  summary: string;
}

const sampleProperty = {
  address: "123 Oak Street, Springfield",
  livingArea: 2400,
  lotSize: 0.35,
  yearBuilt: 1998,
  bedrooms: 4,
  bathrooms: 2.5,
  garage: 2,
  pool: true,
  condition: "Good",
  location: "Suburban A-rated school district",
  comparables: [
    { salePrice: 425000, livingArea: 2300, saleDate: "2025-11-15" },
    { salePrice: 445000, livingArea: 2500, saleDate: "2025-10-22" },
    { salePrice: 410000, livingArea: 2200, saleDate: "2025-12-01" },
  ],
};

export function AIValuationPanel() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [analysisType, setAnalysisType] = useState<"quick" | "full" | "cost_approach">("quick");

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/valuation-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            propertyData: sampleProperty,
            analysisType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      setResult(data);
      toast({
        title: "Analysis Complete",
        description: "AI valuation recommendations are ready.",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unable to complete analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-5 min-w-0">
      <section aria-labelledby="ai-valuation-input" className="space-y-4">
        <div className="module-toolbar">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="ai-valuation-input" className="text-base font-semibold">Valuation analysis</h2>
              <Badge variant="outline">Example property</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{sampleProperty.address} · Not a county parcel record</p>
          </div>
          <ToggleGroup
            type="single"
            value={analysisType}
            onValueChange={(value) => {
              if (value === "quick" || value === "full" || value === "cost_approach") setAnalysisType(value);
            }}
            variant="outline"
            size="sm"
            aria-label="Valuation analysis type"
            className="justify-start flex-wrap"
            disabled={isAnalyzing}
          >
            <ToggleGroupItem value="quick">Quick</ToggleGroupItem>
            <ToggleGroupItem value="cost_approach">Cost Approach</ToggleGroupItem>
            <ToggleGroupItem value="full">Full Analysis</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <dl className="module-data-band">
          {[
            ["Living Area", `${sampleProperty.livingArea.toLocaleString()} sqft`],
            ["Year Built", sampleProperty.yearBuilt],
            ["Bed/Bath", `${sampleProperty.bedrooms}/${sampleProperty.bathrooms}`],
            ["Condition", sampleProperty.condition],
          ].map(([label, value]) => (
            <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd></div>
          ))}
        </dl>
        <Button onClick={runAnalysis} disabled={isAnalyzing} className="gap-2">
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {isAnalyzing ? "Analyzing example…" : "Analyze example property"}
        </Button>
      </section>

      <div aria-live="polite" aria-busy={isAnalyzing}>
        {result && (
          <div className="space-y-5">
            <section className="module-section" aria-labelledby="valuation-range">
              <h2 id="valuation-range" className="text-base font-semibold">Estimated value range</h2>
              <dl className="module-data-band mt-3">
                {[["Low", result.estimatedValue.low], ["Indicated Value", result.estimatedValue.mid], ["High", result.estimatedValue.high]].map(([label, value]) => (
                  <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums break-words">{formatCurrency(Number(value))}</dd></div>
                ))}
              </dl>
              <div className="mt-4 max-w-lg space-y-2">
                <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Model-reported confidence</span><span className="tabular-nums">{result.confidenceScore}%</span></div>
                <Progress value={result.confidenceScore} aria-label="Model-reported confidence" className="h-2" />
              </div>
            </section>

            {result.costApproach && (
              <section className="module-section" aria-labelledby="cost-breakdown">
                <h2 id="cost-breakdown" className="text-base font-semibold">Cost approach breakdown</h2>
                <dl className="mt-3 divide-y divide-border">
                  {[
                    ["Replacement Cost New", formatCurrency(result.costApproach.replacementCost)],
                    ["Less: Depreciation", `−${formatCurrency(result.costApproach.depreciation)}`],
                    ["Plus: Land Value", `+${formatCurrency(result.costApproach.landValue)}`],
                    ["Total Cost Approach Value", formatCurrency(result.costApproach.totalValue)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums">{value}</dd></div>
                  ))}
                </dl>
              </section>
            )}

            {result.sacredBalance && (
              <section className="module-section" aria-labelledby="supplemental-scores">
                <h2 id="supplemental-scores" className="text-base font-semibold">Supplemental model scores</h2>
                <p className="mt-1 text-xs text-muted-foreground">Model-provided scores; not assessment validation measures.</p>
                <dl className="module-data-band mt-3">
                  {[["Level 3 · Foundation", result.sacredBalance.level3Foundation], ["Level 6 · Harmony", result.sacredBalance.level6Harmony], ["Level 9 · Transcendence", result.sacredBalance.level9Transcendence]].map(([label, value]) => (
                    <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd></div>
                  ))}
                </dl>
              </section>
            )}

            <div className="module-analysis-grid">
              <section className="module-section">
                <h2 className="flex items-center gap-2 text-base font-semibold"><CheckCircle2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Recommendations</h2>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  {result.recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
                </ul>
              </section>
              <section className="module-section">
                <h2 className="flex items-center gap-2 text-base font-semibold"><AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Risk factors</h2>
                {result.riskFactors.length > 0 ? (
                  <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">{result.riskFactors.map((risk, index) => <li key={index}>{risk}</li>)}</ul>
                ) : <p className="mt-3 text-sm text-muted-foreground">No risk factors returned by this analysis.</p>}
              </section>
            </div>
            <section className="module-section">
              <h2 className="text-base font-semibold">Analysis summary</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Card */}
      <Card className="glass-card border-tf-transcend-cyan/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-tf-transcend-cyan/10">
                <Brain className="w-6 h-6 text-tf-transcend-cyan" />
              </div>
              <div>
                <CardTitle className="text-lg text-gradient-sovereign">
                  AI Valuation Engine
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Powered by TerraFusion Quantum Intelligence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={analysisType === "quick" ? "default" : "outline"}
                size="sm"
                onClick={() => setAnalysisType("quick")}
                className={analysisType === "quick" ? "btn-sovereign" : ""}
              >
                Quick
              </Button>
              <Button
                variant={analysisType === "cost_approach" ? "default" : "outline"}
                size="sm"
                onClick={() => setAnalysisType("cost_approach")}
                className={analysisType === "cost_approach" ? "btn-sovereign" : ""}
              >
                Cost Approach
              </Button>
              <Button
                variant={analysisType === "full" ? "default" : "outline"}
                size="sm"
                onClick={() => setAnalysisType("full")}
                className={analysisType === "full" ? "btn-sovereign" : ""}
              >
                Full Analysis
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-tf-elevated/50">
              <p className="text-xs text-muted-foreground">Living Area</p>
              <p className="text-sm font-medium">{sampleProperty.livingArea.toLocaleString()} sqft</p>
            </div>
            <div className="p-3 rounded-lg bg-tf-elevated/50">
              <p className="text-xs text-muted-foreground">Year Built</p>
              <p className="text-sm font-medium">{sampleProperty.yearBuilt}</p>
            </div>
            <div className="p-3 rounded-lg bg-tf-elevated/50">
              <p className="text-xs text-muted-foreground">Bed/Bath</p>
              <p className="text-sm font-medium">{sampleProperty.bedrooms}/{sampleProperty.bathrooms}</p>
            </div>
            <div className="p-3 rounded-lg bg-tf-elevated/50">
              <p className="text-xs text-muted-foreground">Condition</p>
              <p className="text-sm font-medium">{sampleProperty.condition}</p>
            </div>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full btn-sovereign gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Property...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run AI Valuation Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Value Estimate Card */}
            <Card className="glass-card border-tf-optimized-green/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-tf-optimized-green" />
                  Estimated Value Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-tf-elevated/30">
                    <p className="text-xs text-muted-foreground mb-1">Low</p>
                    <p className="text-lg font-semibold text-tf-caution-amber">
                      {formatCurrency(result.estimatedValue.low)}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-tf-transcend-cyan/10 border border-tf-transcend-cyan/30">
                    <p className="text-xs text-muted-foreground mb-1">Indicated Value</p>
                    <p className="text-2xl font-bold text-tf-transcend-cyan">
                      {formatCurrency(result.estimatedValue.mid)}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-tf-elevated/30">
                    <p className="text-xs text-muted-foreground mb-1">High</p>
                    <p className="text-lg font-semibold text-tf-optimized-green">
                      {formatCurrency(result.estimatedValue.high)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confidence Score</span>
                    <span className="font-medium">{result.confidenceScore}%</span>
                  </div>
                  <Progress value={result.confidenceScore} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Cost Approach Details */}
            {result.costApproach && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cost Approach Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Replacement Cost New</span>
                      <span className="font-medium">{formatCurrency(result.costApproach.replacementCost)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Less: Depreciation</span>
                      <span className="font-medium text-tf-alert-red">
                        -{formatCurrency(result.costApproach.depreciation)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Plus: Land Value</span>
                      <span className="font-medium text-tf-optimized-green">
                        +{formatCurrency(result.costApproach.landValue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-tf-transcend-cyan/10 px-3 rounded-lg">
                      <span className="font-medium">Total Cost Approach Value</span>
                      <span className="font-bold text-tf-transcend-cyan">
                        {formatCurrency(result.costApproach.totalValue)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sacred Balance */}
            {result.sacredBalance && (
              <Card className="glass-card border-tf-sacred-gold/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">3-6-9 Sacred Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-tf-alert-red mb-1">
                        {result.sacredBalance.level3Foundation}
                      </div>
                      <p className="text-xs text-muted-foreground">Level 3</p>
                      <p className="text-xs text-tf-alert-red">Foundation</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-tf-caution-amber mb-1">
                        {result.sacredBalance.level6Harmony}
                      </div>
                      <p className="text-xs text-muted-foreground">Level 6</p>
                      <p className="text-xs text-tf-caution-amber">Harmony</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-tf-transcend-cyan mb-1">
                        {result.sacredBalance.level9Transcendence}
                      </div>
                      <p className="text-xs text-muted-foreground">Level 9</p>
                      <p className="text-xs text-tf-transcend-cyan">Transcendence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations & Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-tf-optimized-green" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-tf-transcend-cyan mt-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-tf-caution-amber" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.riskFactors.length > 0 ? (
                      result.riskFactors.map((risk, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-tf-caution-amber mt-1">•</span>
                          {risk}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No significant risk factors identified</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.summary}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

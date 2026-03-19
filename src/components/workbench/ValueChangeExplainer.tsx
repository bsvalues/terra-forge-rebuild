// TerraFusion OS — Phase 105: AI Value Change Explainer
// Uses Lovable AI to generate natural language explanations of assessment changes.

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ValueChangeExplainerProps {
  parcelNumber: string;
  address: string | null;
  propertyClass: string | null;
  currentValue: number;
  priorValue: number | null;
  landValue: number | null;
  improvementValue: number | null;
  neighborhoodCode: string | null;
  className?: string;
}

export function ValueChangeExplainer({
  parcelNumber,
  address,
  propertyClass,
  currentValue,
  priorValue,
  landValue,
  improvementValue,
  neighborhoodCode,
  className,
}: ValueChangeExplainerProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const change = priorValue ? currentValue - priorValue : null;
  const changePct = priorValue ? ((currentValue - priorValue) / priorValue) * 100 : null;

  const generateExplanation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-proxy", {
        body: {
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a county assessor's assistant. Generate a clear, professional 2-3 sentence explanation of a property value change for a property owner notification letter. Be factual and cite specific data points. Do not speculate beyond the data provided.`,
            },
            {
              role: "user",
              content: `Explain this assessment change:
- Parcel: ${parcelNumber}
- Address: ${address || "N/A"}
- Property Class: ${propertyClass || "N/A"}
- Neighborhood: ${neighborhoodCode || "N/A"}
- Prior Value: ${priorValue ? `$${priorValue.toLocaleString()}` : "N/A"}
- Current Value: $${currentValue.toLocaleString()}
- Change: ${change ? `$${change.toLocaleString()} (${changePct?.toFixed(1)}%)` : "N/A"}
- Land Value: ${landValue ? `$${landValue.toLocaleString()}` : "N/A"}
- Improvement Value: ${improvementValue ? `$${improvementValue.toLocaleString()}` : "N/A"}`,
            },
          ],
        },
      });

      if (error) throw error;
      const content = data?.choices?.[0]?.message?.content || data?.content || "Unable to generate explanation.";
      setExplanation(content);
    } catch (err: any) {
      setExplanation(`Unable to generate explanation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!priorValue) return null;

  return (
    <Card className={cn("border-border/30", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-chart-3" />
          AI Value Change Summary
          {change !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] ml-auto",
                change > 0 ? "text-chart-5 border-chart-5/30" : "text-destructive border-destructive/30"
              )}
            >
              {change > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {change > 0 ? "+" : ""}{changePct?.toFixed(1)}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {explanation ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-sm text-foreground leading-relaxed">{explanation}</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6 px-2 text-muted-foreground"
              onClick={generateExplanation}
              disabled={loading}
            >
              <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} />
              Regenerate
            </Button>
          </motion.div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={generateExplanation}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Explain Value Change
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

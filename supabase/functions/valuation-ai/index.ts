import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { safeErrorResponse, aiGatewayErrorResponse } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PropertyData {
  address?: string;
  livingArea?: number;
  lotSize?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  garage?: number;
  pool?: boolean;
  condition?: string;
  location?: string;
  comparables?: Array<{
    salePrice: number;
    livingArea: number;
    saleDate: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    let auth;
    try {
      auth = await requireAuth(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { propertyData, analysisType } = await req.json() as { 
      propertyData: PropertyData; 
      analysisType: "full" | "quick" | "cost_approach" 
    };

    // Input validation
    if (!propertyData || typeof propertyData !== "object") {
      return new Response(JSON.stringify({ error: "propertyData object is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["full", "quick", "cost_approach"].includes(analysisType)) {
      return new Response(JSON.stringify({ error: "analysisType must be full, quick, or cost_approach" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Validate numeric ranges
    if (propertyData.livingArea !== undefined && (propertyData.livingArea < 0 || propertyData.livingArea > 200000)) {
      return new Response(JSON.stringify({ error: "livingArea out of range" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (propertyData.yearBuilt !== undefined && (propertyData.yearBuilt < 1700 || propertyData.yearBuilt > new Date().getFullYear() + 1)) {
      return new Response(JSON.stringify({ error: "yearBuilt out of range" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert property valuation AI assistant for TerraFusion, a government-grade property assessment system. You specialize in:

1. **Cost Approach Analysis**: Estimating replacement cost minus depreciation plus land value
2. **Market Approach Analysis**: Using comparable sales to estimate value
3. **Income Approach Analysis**: For income-producing properties

Your responses should be:
- Professional and precise
- Include specific numeric estimates with confidence ranges
- Reference IAAO (International Association of Assessing Officers) standards
- Consider the 3-6-9 Sacred Framework for valuation balance
- Provide actionable recommendations

Format your response as structured JSON with these sections:
{
  "estimatedValue": { "low": number, "mid": number, "high": number },
  "confidenceScore": number (0-100),
  "costApproach": {
    "replacementCost": number,
    "depreciation": number,
    "landValue": number,
    "totalValue": number
  },
  "marketApproach": {
    "adjustedComparables": array,
    "indicatedValue": number
  },
  "recommendations": array of strings,
  "riskFactors": array of strings,
  "sacredBalance": {
    "level3Foundation": number (0-100),
    "level6Harmony": number (0-100),
    "level9Transcendence": number (0-100)
  },
  "summary": string
}`;

    const userPrompt = analysisType === "quick" 
      ? `Provide a quick valuation estimate for this property: ${JSON.stringify(propertyData)}. Focus on key value drivers and give a confidence-weighted estimate.`
      : analysisType === "cost_approach"
      ? `Perform a detailed Cost Approach analysis for this property: ${JSON.stringify(propertyData)}. Calculate replacement cost new, apply appropriate depreciation factors, and estimate land value.`
      : `Perform a comprehensive property valuation analysis using all three approaches (Cost, Market, Income) for this property: ${JSON.stringify(propertyData)}. Provide detailed breakdowns and reconcile the values.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return aiGatewayErrorResponse(response.status, "valuation-ai", errorText, corsHeaders);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsedResult;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedResult = JSON.parse(jsonString.trim());
    } catch {
      parsedResult = {
        summary: content,
        estimatedValue: { low: 0, mid: 0, high: 0 },
        confidenceScore: 0,
        recommendations: ["Unable to parse structured response"],
        riskFactors: [],
      };
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return safeErrorResponse(error, "valuation-ai", corsHeaders);
  }
});

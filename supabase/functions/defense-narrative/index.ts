import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NARRATIVE_PROMPTS: Record<string, { system: string; userPrefix: string }> = {
  defense: {
    system: `You are a property assessment defense analyst. Generate a professional narrative for a Board of Equalization (BOE) defense packet. The narrative must:
1. Summarize the subject property and its current assessed value
2. Reference comparable sales with ratios
3. Cite IAAO ratio study statistics (COD, PRD, tier analysis)
4. Provide a conclusion supporting the assessed value
Keep the tone professional, factual, and defensible. Use specific numbers. Format in markdown.`,
    userPrefix: "Generate a BOE defense narrative for:",
  },
  value_change: {
    system: `You are a property assessment analyst explaining value changes to property owners. Generate a clear, transparent explanation that:
1. States the previous and new assessed values
2. Explains the market factors driving the change
3. References comparable sales supporting the new value
4. Notes any property characteristic changes (permits, improvements)
Keep the tone respectful, transparent, and educational. Format in markdown.`,
    userPrefix: "Explain the value change for:",
  },
  appeal_response: {
    system: `You are a county assessor drafting a formal response to a property tax appeal. Generate a professional response that:
1. Acknowledges the property owner's concerns
2. Presents the evidence supporting the current assessment
3. References comparable sales and ratio study statistics
4. Provides a clear recommendation (sustain, reduce, or modify)
Keep the tone formal, objective, and legally defensible. Format in markdown.`,
    userPrefix: "Draft an appeal response for:",
  },
  exemption_letter: {
    system: `You are a county assessor drafting an exemption decision letter. Generate a professional letter that:
1. References the specific exemption type requested
2. States whether the exemption is approved, denied, or modified
3. Cites the applicable statutory authority
4. Provides clear reasoning for the decision
Keep the tone formal and cite relevant legal standards. Format in markdown.`,
    userPrefix: "Draft an exemption decision letter for:",
  },
  evidence_synthesis: {
    system: `You are a property assessment evidence analyst. Synthesize all provided evidence into a cohesive summary that:
1. Summarizes each piece of evidence (documents, narratives, assessment data)
2. Identifies key themes and supporting data points
3. Notes any conflicts or gaps in the evidence
4. Provides a synthesis conclusion
Keep the tone analytical and objective. Format in markdown with clear sections.`,
    userPrefix: "Synthesize the evidence for:",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let auth;
    try {
      auth = await requireAuth(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const body = await req.json();
    const {
      parcelNumber,
      address,
      assessedValue,
      assessmentHistory,
      salesHistory,
      comps,
      ratioStats,
      narrativeType = "defense",
      additionalContext,
    } = body;

    if (parcelNumber && typeof parcelNumber !== "string") {
      return new Response(JSON.stringify({ error: "Invalid parcelNumber" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promptConfig = NARRATIVE_PROMPTS[narrativeType] || NARRATIVE_PROMPTS.defense;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `${promptConfig.userPrefix}
- Parcel: ${parcelNumber}
- Address: ${address}
- Current Assessed Value: $${assessedValue?.toLocaleString() || 'N/A'}

Assessment History:
${JSON.stringify(assessmentHistory || [], null, 2)}

Recent Comparable Sales:
${JSON.stringify(comps || [], null, 2)}

Ratio Study Statistics:
${JSON.stringify(ratioStats || {}, null, 2)}
${additionalContext ? `\nAdditional Context:\n${additionalContext}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: promptConfig.system },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const narrative = data.choices?.[0]?.message?.content || "Unable to generate narrative.";

    return new Response(JSON.stringify({ narrative, narrativeType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("defense-narrative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

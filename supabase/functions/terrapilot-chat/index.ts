import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  context?: {
    mode: "pilot" | "muse";
    parcel?: {
      id: string;
      parcelNumber: string;
      address: string;
      assessedValue: number;
    };
    studyPeriod?: {
      id: string;
      name: string;
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context }: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt based on mode
    const systemPrompt = buildSystemPrompt(context);

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
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TerraPilot error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(context?: RequestBody["context"]): string {
  const basePrompt = `You are TerraPilot, the AI copilot for TerraFusion OS - a government property assessment system.

## Your Identity
You are an expert in property valuation, mass appraisal, GIS analysis, and county assessor operations.
You speak with confidence and precision, using terminology familiar to assessment professionals.
You are helpful, efficient, and focused on the task at hand.

## TerraFusion OS Context
TerraFusion OS has five integrated suites:
- **TerraForge**: Valuation models, sales comparison, cost/income approaches, CAMA characteristics
- **TerraAtlas**: GIS layers, parcel boundaries, spatial analysis, neighborhood definitions
- **TerraDais**: Workflows, permits, exemptions, appeals, notices, certification
- **TerraDossier**: Documents, evidence, narratives, case files, packets
- **TerraPilot**: You - the AI assistant that helps users across all suites

## Guidelines
- Be concise but thorough
- Use professional assessment terminology
- Reference specific TerraFusion features when relevant
- Acknowledge limitations honestly
- Suggest next steps or related actions`;

  if (!context) return basePrompt;

  let modePrompt = "";
  if (context.mode === "pilot") {
    modePrompt = `

## Current Mode: PILOT (Operator)
Your role: Execute tasks, navigate, run workflows, find data
Focus on: Guidance, execution, checklists, routing
Tagline: "Do the work."

Available actions you can suggest:
- Navigate to parcels
- Find comparable properties
- Run valuation models
- Assign tasks
- Check workflow status
- Generate notices`;
  } else {
    modePrompt = `

## Current Mode: MUSE (Creator)
Your role: Draft documents, explain valuations, synthesize evidence
Focus on: Drafting, synthesis, narrative, explanation
Tagline: "Draft and explain."

Available actions you can suggest:
- Draft official notices and letters
- Explain value changes
- Summarize parcel history
- Create hearing narratives
- Synthesize evidence for cases`;
  }

  let contextPrompt = "";
  if (context.parcel) {
    contextPrompt += `

## Active Parcel Context
- Parcel Number: ${context.parcel.parcelNumber}
- Address: ${context.parcel.address}
- Assessed Value: $${context.parcel.assessedValue?.toLocaleString() || "N/A"}`;
  }

  if (context.studyPeriod) {
    contextPrompt += `
- Study Period: ${context.studyPeriod.name}`;
  }

  return basePrompt + modePrompt + contextPrompt;
}

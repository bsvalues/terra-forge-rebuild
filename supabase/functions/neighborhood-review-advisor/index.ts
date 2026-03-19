// TerraFusion OS — Neighborhood Review AI Advisor (Phase 76)
// Generates stage-specific recommendations using Lovable AI Gateway.
// "The AI told me the neighborhood needs more houses. I agree because I live in one." — Ralph Wiggum

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reviewId } = await req.json();
    if (!reviewId) throw new Error("reviewId is required");

    // Fetch review context via RPC
    const { data: context, error: rpcErr } = await supabase.rpc(
      "get_neighborhood_review_context",
      { p_review_id: reviewId }
    );
    if (rpcErr) throw new Error(`RPC error: ${rpcErr.message}`);
    if (!context) throw new Error("Review not found");

    const review = context.review;
    const stats = context.parcel_stats;
    const cal = context.calibration;
    const tasks = context.task_summary;
    const stage = review.current_stage;

    const systemPrompt = `You are TerraFusion's Neighborhood Review Advisor — an expert property assessment analyst. 
You provide actionable, stage-specific recommendations for neighborhood review workflows.
Be specific, data-driven, and concise. Use bullet points. Limit to 5 key recommendations.
Reference actual numbers from the data provided. Flag risks and blockers clearly.`;

    const userPrompt = `## Neighborhood Review: ${review.review_name}
Neighborhood Code: ${review.neighborhood_code}
Current Stage: ${stage}
Status: ${review.status}
Started: ${review.started_at}
Deadline: ${review.target_deadline || 'Not set'}

## Parcel Statistics
- Total parcels: ${stats.total}
- With coordinates: ${stats.with_coords} (${stats.coord_pct}%)
- With building data: ${stats.with_building} (${stats.building_pct}%)
- Median assessed value: $${stats.median_value?.toLocaleString() || 'N/A'}

## Latest Calibration
${cal ? `- R²: ${cal.r_squared}, RMSE: ${cal.rmse}, Sample: ${cal.sample_size}, Status: ${cal.status}` : 'No calibration runs found'}

## Task Progress
${JSON.stringify(tasks, null, 2)}

---

Provide 5 specific, actionable recommendations for the **${stage.replace(/_/g, ' ')}** stage of this neighborhood review. 
Include risk flags, quality gates that should pass before advancing, and suggested next actions.
Format as a JSON array of objects with keys: "recommendation", "priority" (high/medium/low), "category" (quality/risk/action/gate)`;

    const aiResp = await fetch(AI_GATEWAY, {
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
        tools: [
          {
            type: "function",
            function: {
              name: "provide_recommendations",
              description: "Return structured recommendations for the current review stage",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        recommendation: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        category: { type: "string", enum: ["quality", "risk", "action", "gate"] },
                      },
                      required: ["recommendation", "priority", "category"],
                    },
                  },
                  stage_readiness: {
                    type: "string",
                    enum: ["ready_to_advance", "needs_work", "blocked"],
                  },
                  summary: { type: "string" },
                },
                required: ["recommendations", "stage_readiness", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_recommendations" } },
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again shortly" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted — please add funds" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;

    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback if structured output fails
      result = {
        recommendations: [{ recommendation: "AI analysis unavailable — review data manually", priority: "medium", category: "action" }],
        stage_readiness: "needs_work",
        summary: "Unable to generate structured recommendations",
      };
    }

    // Save recommendations to the review
    await supabase
      .from("neighborhood_reviews")
      .update({
        ai_recommendations: result.recommendations,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    return new Response(JSON.stringify({ ...result, context: { stats, calibration: cal } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Review advisor error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

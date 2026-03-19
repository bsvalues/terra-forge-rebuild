// TerraFusion OS — Appeal Risk Scorer (Phase 77)
// Scans parcels for high value changes and generates AI-powered risk assessments.
// "I scored a risk once. It was risky." — Ralph Wiggum

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

    const { action, countyId, parcelIds, runId, highThreshold = 15, criticalThreshold = 30 } = await req.json();

    if (action === "scan") {
      // Create a scoring run
      const { data: run, error: runErr } = await supabase
        .from("appeal_risk_scoring_runs")
        .insert({
          county_id: countyId,
          status: "running",
          high_change_threshold: highThreshold,
          critical_change_threshold: criticalThreshold,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (runErr) throw new Error(`Failed to create run: ${runErr.message}`);

      // Fetch parcels with recent assessments that have value changes
      const currentYear = new Date().getFullYear();
      const { data: assessments, error: aErr } = await supabase
        .from("assessments")
        .select(`
          id, parcel_id, tax_year, total_value, land_value, improvement_value,
          parcels!inner(id, parcel_number, owner_name, situs_address, neighborhood_code, county_id)
        `)
        .eq("tax_year", currentYear)
        .order("parcel_id");

      if (aErr) throw new Error(`Assessment query failed: ${aErr.message}`);

      // Get prior year assessments for comparison
      const { data: priorAssessments, error: pErr } = await supabase
        .from("assessments")
        .select("parcel_id, total_value")
        .eq("tax_year", currentYear - 1);

      if (pErr) throw new Error(`Prior assessment query failed: ${pErr.message}`);

      const priorMap = new Map<string, number>();
      for (const pa of priorAssessments || []) {
        priorMap.set(pa.parcel_id, pa.total_value || 0);
      }

      // Score each parcel
      const riskScores: any[] = [];
      let critical = 0, high = 0, medium = 0, low = 0;

      for (const a of assessments || []) {
        const priorValue = priorMap.get(a.parcel_id) || 0;
        const newValue = a.total_value || 0;
        if (priorValue === 0 && newValue === 0) continue;

        const changePct = priorValue > 0 ? ((newValue - priorValue) / priorValue) * 100 : 0;
        const absChangePct = Math.abs(changePct);

        // Determine risk tier
        let riskTier: string;
        let riskScore: number;
        const riskFactors: string[] = [];

        if (absChangePct >= criticalThreshold) {
          riskTier = "critical";
          riskScore = Math.min(100, 70 + absChangePct);
          riskFactors.push(`Value change ${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% exceeds critical threshold`);
          critical++;
        } else if (absChangePct >= highThreshold) {
          riskTier = "high";
          riskScore = 40 + absChangePct;
          riskFactors.push(`Value change ${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% exceeds high threshold`);
          high++;
        } else if (absChangePct >= 8) {
          riskTier = "medium";
          riskScore = 20 + absChangePct;
          riskFactors.push(`Moderate value change of ${changePct.toFixed(1)}%`);
          medium++;
        } else {
          riskTier = "low";
          riskScore = absChangePct * 2;
          low++;
          continue; // Skip low-risk parcels to save space
        }

        // Additional risk factors
        if (newValue > 500000) riskFactors.push("High-value property (>$500K)");
        if (absChangePct > 25) riskFactors.push("Exceeds 25% — likely to trigger formal appeal");
        const parcel = a.parcels as any;

        riskScores.push({
          county_id: parcel?.county_id || countyId,
          parcel_id: a.parcel_id,
          parcel_number: parcel?.parcel_number || "Unknown",
          owner_name: parcel?.owner_name,
          situs_address: parcel?.situs_address,
          neighborhood_code: parcel?.neighborhood_code,
          prior_value: priorValue,
          new_value: newValue,
          risk_score: Math.round(Math.min(100, riskScore)),
          risk_tier: riskTier,
          risk_factors: riskFactors,
          defense_status: riskTier === "critical" ? "queued" : "unqueued",
          scoring_run_id: run.id,
        });
      }

      // Upsert risk scores (batch)
      if (riskScores.length > 0) {
        const { error: upsertErr } = await supabase
          .from("appeal_risk_scores")
          .upsert(riskScores, { onConflict: "parcel_id,tax_year" });
        if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}`);
      }

      // Update run with results
      await supabase
        .from("appeal_risk_scoring_runs")
        .update({
          status: "completed",
          total_parcels_scanned: (assessments || []).length,
          parcels_flagged: riskScores.length,
          critical_count: critical,
          high_count: high,
          medium_count: medium,
          low_count: low,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return new Response(JSON.stringify({
        runId: run.id,
        scanned: (assessments || []).length,
        flagged: riskScores.length,
        critical, high, medium, low,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "analyze") {
      // AI analysis for specific parcels
      if (!parcelIds || parcelIds.length === 0) throw new Error("parcelIds required for analyze action");

      const { data: scores, error: sErr } = await supabase
        .from("appeal_risk_scores")
        .select("*")
        .in("parcel_id", parcelIds);
      if (sErr) throw new Error(`Score fetch failed: ${sErr.message}`);

      const parcelsText = (scores || []).map(s =>
        `- ${s.parcel_number} (${s.situs_address || 'N/A'}): $${s.prior_value?.toLocaleString()} → $${s.new_value?.toLocaleString()} (${s.value_change_pct > 0 ? '+' : ''}${s.value_change_pct}%), Risk: ${s.risk_tier}, Factors: ${(s.risk_factors as string[]).join('; ')}`
      ).join('\n');

      const aiResp = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a property tax appeal defense strategist. Analyze parcels flagged for appeal risk and provide defense strategies. Be specific, reference comparable sales methodology, IAAO standards, and Board of Equalization hearing prep.`,
            },
            {
              role: "user",
              content: `Analyze these high-risk parcels and provide defense strategies:\n\n${parcelsText}\n\nFor each parcel, provide a risk summary and recommended defense strategy.`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "provide_analysis",
              description: "Provide risk analysis and defense strategies",
              parameters: {
                type: "object",
                properties: {
                  analyses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        parcel_id: { type: "string" },
                        risk_summary: { type: "string" },
                        defense_strategy: { type: "string" },
                      },
                      required: ["parcel_id", "risk_summary", "defense_strategy"],
                    },
                  },
                  overall_recommendation: { type: "string" },
                },
                required: ["analyses", "overall_recommendation"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "provide_analysis" } },
        }),
      });

      if (!aiResp.ok) throw new Error(`AI gateway error: ${aiResp.status}`);

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let result;

      if (toolCall?.function?.arguments) {
        result = JSON.parse(toolCall.function.arguments);

        // Update scores with AI analysis
        for (const analysis of result.analyses || []) {
          const matchingScore = scores?.find(s => s.parcel_number === analysis.parcel_id || s.parcel_id === analysis.parcel_id);
          if (matchingScore) {
            await supabase
              .from("appeal_risk_scores")
              .update({
                ai_risk_summary: analysis.risk_summary,
                ai_defense_strategy: analysis.defense_strategy,
                updated_at: new Date().toISOString(),
              })
              .eq("id", matchingScore.id);
          }
        }
      } else {
        result = { analyses: [], overall_recommendation: "AI analysis unavailable" };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: unknown) {
    console.error("Appeal risk scorer error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

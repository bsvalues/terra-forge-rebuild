// TerraFusion OS — AI Notice Drafting Edge Function
// Muse Mode: draft_notice tool — generates professional assessment change notices
// Agent Librarian verified the types while eating paste (the paste was typed correctly)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { safeErrorResponse, aiGatewayErrorResponse } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NoticeRequest {
  parcelNumber: string;
  address: string;
  previousValue: number;
  newValue: number;
  neighborhoodCode: string;
  rSquared: string;
  method: string;
  noticeType: string;
  recipientName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try {
      await requireAuth(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const body: NoticeRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const {
      parcelNumber, address, previousValue, newValue,
      neighborhoodCode, rSquared, method, noticeType,
      recipientName
    } = body;

    const delta = newValue - previousValue;
    const deltaPct = previousValue > 0 ? ((delta / previousValue) * 100).toFixed(1) : "N/A";
    const direction = delta >= 0 ? "increase" : "decrease";

    const systemPrompt = `You are an official County Assessor's Office notice drafter for TerraFusion OS.
Generate formal, professional assessment change notices that are legally compliant and clearly written.

Guidelines:
- Use formal government correspondence tone
- Include all required statutory notification elements
- Reference the valuation methodology used
- Clearly state appeal rights and deadlines (30-day appeal window)
- Include contact information placeholder for the Assessor's Office
- Format dates as Month Day, Year
- Format currency with $ and commas
- Keep the notice concise but complete (under 400 words)

Today's date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

    const userPrompt = `Draft a ${noticeType} notice for:
- Parcel: ${parcelNumber}
- Property Address: ${address}
- Recipient: ${recipientName || "Property Owner"}
- Previous Assessed Value: $${previousValue.toLocaleString()}
- New Assessed Value: $${newValue.toLocaleString()}
- Change: ${direction} of $${Math.abs(delta).toLocaleString()} (${deltaPct}%)
- Valuation Method: ${method}
- Model Fit: R² = ${rSquared}%
- Neighborhood: ${neighborhoodCode}

Generate the full notice text ready for printing and mailing.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return aiGatewayErrorResponse(aiResp.status, "draft-notice", errText, corsHeaders);
    }

    const data = await aiResp.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ notice: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return safeErrorResponse(error, "draft-notice", corsHeaders);
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Query live parcel data if a parcel is in context
    let liveDataContext = "";
    if (context?.parcel?.id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);

        // Fetch parcel details, recent sales, assessments, permits, and appeals in parallel
        const parcelId = context.parcel.id;
        const [parcelRes, salesRes, assessRes, permitsRes, appealsRes, exemptionsRes] = await Promise.all([
          sb.from("parcels").select("*").eq("id", parcelId).single(),
          sb.from("sales").select("*").eq("parcel_id", parcelId).order("sale_date", { ascending: false }).limit(10),
          sb.from("assessments").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }).limit(5),
          sb.from("permits").select("*").eq("parcel_id", parcelId).order("application_date", { ascending: false }).limit(5),
          sb.from("appeals").select("*").eq("parcel_id", parcelId).order("appeal_date", { ascending: false }).limit(5),
          sb.from("exemptions").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }).limit(5),
        ]);

        const parcel = parcelRes.data;
        const sales = salesRes.data || [];
        const assessments = assessRes.data || [];
        const permits = permitsRes.data || [];
        const appeals = appealsRes.data || [];
        const exemptions = exemptionsRes.data || [];

        if (parcel) {
          liveDataContext += `

## LIVE PARCEL DATA (from database)
**Parcel:** ${parcel.parcel_number}
**Address:** ${parcel.address}${parcel.city ? `, ${parcel.city}` : ""}${parcel.state ? ` ${parcel.state}` : ""} ${parcel.zip_code || ""}
**Property Class:** ${parcel.property_class || "N/A"}
**Neighborhood Code:** ${parcel.neighborhood_code || "N/A"}
**Assessed Value:** $${(parcel.assessed_value || 0).toLocaleString()}
**Land Value:** $${(parcel.land_value || 0).toLocaleString()}
**Improvement Value:** $${(parcel.improvement_value || 0).toLocaleString()}
**Land Area:** ${parcel.land_area ? parcel.land_area.toLocaleString() + " sqft" : "N/A"}
**Building Area:** ${parcel.building_area ? parcel.building_area.toLocaleString() + " sqft" : "N/A"}
**Year Built:** ${parcel.year_built || "N/A"}
**Bedrooms:** ${parcel.bedrooms ?? "N/A"} | **Bathrooms:** ${parcel.bathrooms ?? "N/A"}
**Last Verified:** ${parcel.last_verified_at || "N/A"}`;
        }

        if (sales.length > 0) {
          liveDataContext += `

### Sales History (${sales.length} records)
| Date | Price | Type | Qualified | Grantor → Grantee |
|------|-------|------|-----------|-------------------|
${sales.map(s => `| ${s.sale_date} | $${s.sale_price.toLocaleString()} | ${s.sale_type || "-"} | ${s.is_qualified ? "✅" : "❌"} | ${s.grantor || "-"} → ${s.grantee || "-"} |`).join("\n")}`;
        }

        if (assessments.length > 0) {
          liveDataContext += `

### Assessment History (${assessments.length} records)
| Tax Year | Land | Improvement | Total | Certified |
|----------|------|-------------|-------|-----------|
${assessments.map(a => `| ${a.tax_year} | $${(a.land_value || 0).toLocaleString()} | $${(a.improvement_value || 0).toLocaleString()} | $${(a.total_value || 0).toLocaleString()} | ${a.certified ? "✅" : "❌"} |`).join("\n")}`;
        }

        if (permits.length > 0) {
          liveDataContext += `

### Permits (${permits.length} records)
| # | Type | Status | Est. Value | Applied |
|---|------|--------|------------|---------|
${permits.map(p => `| ${p.permit_number} | ${p.permit_type} | ${p.status} | $${(p.estimated_value || 0).toLocaleString()} | ${p.application_date} |`).join("\n")}`;
        }

        if (appeals.length > 0) {
          liveDataContext += `

### Appeals (${appeals.length} records)
| Date | Original | Requested | Final | Status |
|------|----------|-----------|-------|--------|
${appeals.map(a => `| ${a.appeal_date} | $${a.original_value.toLocaleString()} | $${(a.requested_value || 0).toLocaleString()} | $${(a.final_value || 0).toLocaleString()} | ${a.status} |`).join("\n")}`;
        }

        if (exemptions.length > 0) {
          liveDataContext += `

### Exemptions (${exemptions.length} records)
| Type | Tax Year | Amount | Status |
|------|----------|--------|--------|
${exemptions.map(e => `| ${e.exemption_type} | ${e.tax_year} | $${(e.exemption_amount || 0).toLocaleString()} | ${e.status} |`).join("\n")}`;
        }

        if (!parcel && sales.length === 0) {
          liveDataContext += "\n\n*No detailed data found in the database for this parcel.*";
        }
      } catch (dbErr) {
        console.error("Database query error:", dbErr);
        liveDataContext += "\n\n*Database query failed — answering with context only.*";
      }
    }

    const systemPrompt = buildSystemPrompt(context, liveDataContext);

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
        stream: true,
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response directly back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("TerraPilot error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(context?: RequestBody["context"], liveData?: string): string {
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
- Suggest next steps or related actions
- Format responses with markdown for clarity
- When you have live data, reference specific values, dates, and amounts from the database
- Compute assessment ratios (assessed value / sale price) when both values are available
- Flag anomalies like large value changes, unusual ratios (<0.80 or >1.20), or stale assessments`;

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

  if (liveData) {
    contextPrompt += liveData;
  }

  return basePrompt + modePrompt + contextPrompt;
}

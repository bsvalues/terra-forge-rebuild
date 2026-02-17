import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAuth, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
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

// ============================================================
// Tool Definitions — the TerraPilot toolkit
// ============================================================
const PILOT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_parcels",
      description: "Search parcels by address, parcel number, or owner name. Returns up to 10 matches.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term (address, parcel number, or owner)" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_comps",
      description: "Find comparable sales near a parcel based on neighborhood, property class, and value range.",
      parameters: {
        type: "object",
        properties: {
          parcel_id: { type: "string", description: "UUID of the subject parcel" },
          radius_pct: { type: "number", description: "Value radius percentage (default 20 = ±20%)" },
          limit: { type: "number", description: "Max comparables (default 10)" },
        },
        required: ["parcel_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_parcel_details",
      description: "Get full details for a specific parcel including assessments, sales, permits, appeals, and exemptions.",
      parameters: {
        type: "object",
        properties: {
          parcel_id: { type: "string", description: "UUID of the parcel" },
        },
        required: ["parcel_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_neighborhood_stats",
      description: "Get aggregate statistics for a neighborhood code: median value, parcel count, avg ratio, COD.",
      parameters: {
        type: "object",
        properties: {
          neighborhood_code: { type: "string", description: "Neighborhood code to analyze" },
        },
        required: ["neighborhood_code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_recent_activity",
      description: "Get recent TerraTrace activity events for a parcel or the whole county.",
      parameters: {
        type: "object",
        properties: {
          parcel_id: { type: "string", description: "Optional parcel UUID to filter by" },
          limit: { type: "number", description: "Max events (default 20)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "navigate_to_parcel",
      description: "Navigate the user's Workbench to a specific parcel. Use when the user asks to 'open', 'go to', or 'show' a parcel.",
      parameters: {
        type: "object",
        properties: {
          parcel_id: { type: "string", description: "UUID of the parcel to navigate to" },
          tab: { type: "string", enum: ["summary", "forge", "atlas", "dais", "dossier"], description: "Tab to open (default summary)" },
        },
        required: ["parcel_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_workflow_summary",
      description: "Get counts and details of open permits, pending appeals, and active exemptions across all parcels.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", description: "Filter by status (e.g. 'pending', 'open', 'active')" },
        },
      },
    },
  },
];

// Muse-specific drafting tools
const MUSE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "draft_notice",
      description: "Draft an assessment change notice for a parcel. Returns formatted notice text ready for review.",
      parameters: {
        type: "object",
        properties: {
          parcel_id: { type: "string", description: "UUID of the parcel" },
          notice_type: { type: "string", enum: ["assessment_change", "hearing", "exemption_decision", "general"], description: "Type of notice" },
          additional_context: { type: "string", description: "Extra context for the draft" },
        },
        required: ["parcel_id", "notice_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_appeal_response",
      description: "Draft a response to a property tax appeal, citing evidence and comparable sales.",
      parameters: {
        type: "object",
        properties: {
          appeal_id: { type: "string", description: "UUID of the appeal" },
          tone: { type: "string", enum: ["formal", "empathetic", "brief"], description: "Tone of the response" },
        },
        required: ["appeal_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "explain_value_change",
      description: "Generate a narrative explaining why a parcel's value changed, citing market data and characteristics.",
      parameters: {
        type: "object",
        properties: {
          parcel_id: { type: "string", description: "UUID of the parcel" },
          tax_year: { type: "number", description: "Tax year to explain" },
        },
        required: ["parcel_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarize_parcel_history",
      description: "Create a comprehensive timeline summary of a parcel's assessment, sales, and workflow history.",
      parameters: {
        type: "object",
        properties: {
          parcel_id: { type: "string", description: "UUID of the parcel" },
        },
        required: ["parcel_id"],
      },
    },
  },
];

// ============================================================
// Tool Execution Handlers
// ============================================================
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  serviceClient: ReturnType<typeof createServiceClient>
): Promise<string> {
  try {
    switch (toolName) {
      case "search_parcels": {
        const query = String(args.query || "");
        const limit = Number(args.limit) || 10;
        const { data, error } = await serviceClient
          .from("parcels")
          .select("id, parcel_number, address, city, assessed_value, property_class, neighborhood_code")
          .or(`address.ilike.%${query}%,parcel_number.ilike.%${query}%`)
          .limit(limit);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ parcels: data || [], count: data?.length || 0 });
      }

      case "fetch_comps": {
        const parcelId = String(args.parcel_id);
        const radiusPct = Number(args.radius_pct) || 20;
        const limit = Number(args.limit) || 10;

        // Get subject parcel
        const { data: subject } = await serviceClient
          .from("parcels")
          .select("id, assessed_value, neighborhood_code, property_class, building_area")
          .eq("id", parcelId)
          .single();
        if (!subject) return JSON.stringify({ error: "Subject parcel not found" });

        const valueLow = subject.assessed_value * (1 - radiusPct / 100);
        const valueHigh = subject.assessed_value * (1 + radiusPct / 100);

        // Find recent sales in same neighborhood within value range
        const { data: comps } = await serviceClient
          .from("sales")
          .select("id, parcel_id, sale_date, sale_price, is_qualified, parcels!inner(parcel_number, address, assessed_value, neighborhood_code, building_area)")
          .eq("parcels.neighborhood_code", subject.neighborhood_code || "")
          .gte("sale_price", valueLow)
          .lte("sale_price", valueHigh)
          .neq("parcel_id", parcelId)
          .order("sale_date", { ascending: false })
          .limit(limit);

        return JSON.stringify({
          subject: { id: subject.id, value: subject.assessed_value, neighborhood: subject.neighborhood_code },
          comparables: comps || [],
          count: comps?.length || 0,
        });
      }

      case "get_parcel_details": {
        const parcelId = String(args.parcel_id);
        const [parcelRes, salesRes, assessRes, permitsRes, appealsRes, exemptionsRes] = await Promise.all([
          serviceClient.from("parcels").select("*").eq("id", parcelId).single(),
          serviceClient.from("sales").select("*").eq("parcel_id", parcelId).order("sale_date", { ascending: false }).limit(10),
          serviceClient.from("assessments").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }).limit(5),
          serviceClient.from("permits").select("*").eq("parcel_id", parcelId).limit(10),
          serviceClient.from("appeals").select("*").eq("parcel_id", parcelId).limit(10),
          serviceClient.from("exemptions").select("*").eq("parcel_id", parcelId).limit(10),
        ]);
        return JSON.stringify({
          parcel: parcelRes.data,
          sales: salesRes.data || [],
          assessments: assessRes.data || [],
          permits: permitsRes.data || [],
          appeals: appealsRes.data || [],
          exemptions: exemptionsRes.data || [],
        });
      }

      case "get_neighborhood_stats": {
        const code = String(args.neighborhood_code);
        const { data: parcels } = await serviceClient
          .from("parcels")
          .select("assessed_value, building_area, year_built")
          .eq("neighborhood_code", code);
        if (!parcels || parcels.length === 0) return JSON.stringify({ error: "No parcels in neighborhood" });

        const values = parcels.map(p => p.assessed_value).filter(Boolean).sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)] || 0;
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const areas = parcels.map(p => p.building_area).filter(Boolean) as number[];
        const avgArea = areas.length > 0 ? areas.reduce((s, v) => s + v, 0) / areas.length : null;

        return JSON.stringify({
          neighborhood_code: code,
          parcel_count: parcels.length,
          median_value: Math.round(median),
          average_value: Math.round(avg),
          min_value: values[0],
          max_value: values[values.length - 1],
          avg_building_area: avgArea ? Math.round(avgArea) : null,
        });
      }

      case "get_recent_activity": {
        const limit = Number(args.limit) || 20;
        let query = serviceClient
          .from("trace_events")
          .select("id, created_at, source_module, event_type, event_data, parcel_id")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (args.parcel_id) query = query.eq("parcel_id", String(args.parcel_id));
        const { data } = await query;
        return JSON.stringify({ events: data || [], count: data?.length || 0 });
      }

      case "navigate_to_parcel": {
        // This is a client-side action — we return a navigation intent
        return JSON.stringify({
          action: "navigate",
          parcel_id: String(args.parcel_id),
          tab: String(args.tab || "summary"),
        });
      }

      case "get_workflow_summary": {
        const statusFilter = args.status_filter ? String(args.status_filter) : null;
        const [permitsRes, appealsRes, exemptionsRes] = await Promise.all([
          serviceClient.from("permits").select("id, status, permit_type", { count: "exact" })
            .eq("status", statusFilter || "open").limit(5),
          serviceClient.from("appeals").select("id, status, appeal_date, original_value", { count: "exact" })
            .eq("status", statusFilter || "pending").limit(5),
          serviceClient.from("exemptions").select("id, status, exemption_type", { count: "exact" })
            .eq("status", statusFilter || "active").limit(5),
        ]);
        return JSON.stringify({
          permits: { count: permitsRes.count || 0, sample: permitsRes.data || [] },
          appeals: { count: appealsRes.count || 0, sample: appealsRes.data || [] },
          exemptions: { count: exemptionsRes.count || 0, sample: exemptionsRes.data || [] },
        });
      }

      default: {
        // Muse drafting tools — these gather context and return it as structured data for AI synthesis
        if (toolName === "draft_notice") {
          const parcelId = String(args.parcel_id);
          const noticeType = String(args.notice_type || "assessment_change");
          const { data: parcel } = await serviceClient.from("parcels").select("*").eq("id", parcelId).single();
          const { data: assessments } = await serviceClient.from("assessments").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }).limit(2);
          const { data: sales } = await serviceClient.from("sales").select("*").eq("parcel_id", parcelId).order("sale_date", { ascending: false }).limit(3);
          return JSON.stringify({
            notice_type: noticeType,
            parcel,
            recent_assessments: assessments || [],
            recent_sales: sales || [],
            instruction: `Draft a ${noticeType.replace(/_/g, " ")} notice for this parcel. Include property details, current and prior values, and relevant market context.`,
          });
        }
        if (toolName === "draft_appeal_response") {
          const appealId = String(args.appeal_id);
          const { data: appeal } = await serviceClient.from("appeals").select("*, parcels(*)").eq("id", appealId).single();
          const parcelId = appeal?.parcel_id;
          const { data: comps } = parcelId ? await serviceClient.from("sales").select("*, parcels!inner(address, assessed_value, neighborhood_code)").eq("parcels.neighborhood_code", (appeal as any)?.parcels?.neighborhood_code || "").order("sale_date", { ascending: false }).limit(5) : { data: [] };
          return JSON.stringify({
            appeal,
            comparable_sales: comps || [],
            tone: String(args.tone || "formal"),
            instruction: "Draft a response to this appeal citing the comparable sales data and current market conditions.",
          });
        }
        if (toolName === "explain_value_change") {
          const parcelId = String(args.parcel_id);
          const { data: parcel } = await serviceClient.from("parcels").select("*").eq("id", parcelId).single();
          const { data: assessments } = await serviceClient.from("assessments").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }).limit(3);
          const { data: sales } = await serviceClient.from("sales").select("*").eq("parcel_id", parcelId).order("sale_date", { ascending: false }).limit(5);
          const { data: permits } = await serviceClient.from("permits").select("*").eq("parcel_id", parcelId).limit(5);
          return JSON.stringify({
            parcel,
            assessment_history: assessments || [],
            sales_history: sales || [],
            permits: permits || [],
            instruction: "Explain the value change for this parcel, citing improvements, market trends, and comparable sales activity.",
          });
        }
        if (toolName === "summarize_parcel_history") {
          const parcelId = String(args.parcel_id);
          const [parcelRes, assessRes, salesRes, permitsRes, appealsRes, exemptionsRes, traceRes] = await Promise.all([
            serviceClient.from("parcels").select("*").eq("id", parcelId).single(),
            serviceClient.from("assessments").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }),
            serviceClient.from("sales").select("*").eq("parcel_id", parcelId).order("sale_date", { ascending: false }),
            serviceClient.from("permits").select("*").eq("parcel_id", parcelId),
            serviceClient.from("appeals").select("*").eq("parcel_id", parcelId),
            serviceClient.from("exemptions").select("*").eq("parcel_id", parcelId),
            serviceClient.from("trace_events").select("*").eq("parcel_id", parcelId).order("created_at", { ascending: false }).limit(20),
          ]);
          return JSON.stringify({
            parcel: parcelRes.data,
            assessments: assessRes.data || [],
            sales: salesRes.data || [],
            permits: permitsRes.data || [],
            appeals: appealsRes.data || [],
            exemptions: exemptionsRes.data || [],
            trace_events: traceRes.data || [],
            instruction: "Create a comprehensive timeline summary covering all assessment, sales, workflow, and audit events for this parcel.",
          });
        }
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
    }
  } catch (err) {
    console.error(`Tool execution error [${toolName}]:`, err);
    return JSON.stringify({ error: `Tool failed: ${err instanceof Error ? err.message : "unknown"}` });
  }
}

// ============================================================
// Main handler
// ============================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let auth;
    try {
      auth = await requireAuth(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const { messages, context }: RequestBody = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages (max 50)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const serviceClient = createServiceClient();
    const systemPrompt = buildSystemPrompt(context);

    // Agentic loop: allow up to 3 tool rounds
    let conversationMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    
    const toolCallResults: Array<{ tool_name: string; tool_call_id: string; result: unknown }> = [];
    let maxRounds = 3;
    let finalResponse: Response | null = null;

    for (let round = 0; round < maxRounds; round++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
          tools: context?.mode === "pilot" 
            ? PILOT_TOOLS 
            : [...PILOT_TOOLS.filter(t => 
                ["search_parcels", "get_parcel_details", "get_neighborhood_stats", "get_recent_activity"].includes(t.function.name)
              ), ...MUSE_TOOLS],
          stream: round === maxRounds - 1, // Only stream the final response
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "Usage limit reached." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await aiResp.text();
        console.error("AI gateway error:", aiResp.status, t);
        throw new Error(`AI gateway error: ${aiResp.status}`);
      }

      const data = await aiResp.json();
      const choice = data.choices?.[0];

      if (!choice) throw new Error("No choices in response");

      const assistantMsg = choice.message;

      // If no tool calls, we have our final answer — stream it
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        // Re-request with streaming for final answer
        const streamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: conversationMessages,
            stream: true,
          }),
        });

        // Prepend tool call metadata as a special SSE event
        const encoder = new TextEncoder();
        const metaEvent = toolCallResults.length > 0
          ? `data: ${JSON.stringify({ tool_calls: toolCallResults })}\n\n`
          : "";

        const transformedStream = new ReadableStream({
          async start(controller) {
            if (metaEvent) {
              controller.enqueue(encoder.encode(metaEvent));
            }
            const reader = streamResp.body!.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          },
        });

        finalResponse = new Response(transformedStream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
        break;
      }

      // Execute tool calls
      conversationMessages.push({
        role: "assistant",
        content: assistantMsg.content || "",
        tool_calls: assistantMsg.tool_calls,
      });

      for (const tc of assistantMsg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        console.log(`Executing tool: ${tc.function.name}`, args);
        const result = await executeTool(tc.function.name, args, serviceClient);
        
        toolCallResults.push({
          tool_name: tc.function.name,
          tool_call_id: tc.id,
          result: JSON.parse(result),
        });

        conversationMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
    }

    if (!finalResponse) {
      // Fallback: if we exhausted rounds, return last assistant message
      return new Response(JSON.stringify({ error: "Too many tool rounds" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return finalResponse;
  } catch (error) {
    console.error("TerraPilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(context?: RequestBody["context"]): string {
  const basePrompt = `You are TerraPilot, the AI copilot for TerraFusion OS — a government property assessment platform.

## Your Identity
You are an expert in property valuation, mass appraisal, GIS analysis, and county assessor operations.
You speak with confidence and precision, using terminology familiar to assessment professionals.

## TerraFusion OS Suites
- **TerraForge**: Valuation models, sales comparison, cost/income approaches, CAMA characteristics
- **TerraAtlas**: GIS layers, parcel boundaries, spatial analysis, neighborhood definitions
- **TerraDais**: Workflows — permits, exemptions, appeals, notices, certification
- **TerraDossier**: Documents, evidence, narratives, case files, packets
- **TerraPilot**: You — the AI assistant with tool execution capability

## Tool Usage Guidelines
- USE TOOLS proactively when the user asks about data. Don't guess — query the database.
- When a user mentions a parcel number or address, use search_parcels first.
- When asked about comparables, use fetch_comps with the parcel's UUID.
- When asked to "show" or "open" a parcel, use navigate_to_parcel to redirect the UI.
- Always present tool results in a clear, formatted way with key figures highlighted.
- Compute assessment ratios (assessed_value / sale_price) when both are available.
- Flag anomalies: ratios outside 0.80–1.20, large YoY changes, stale data.

## Response Format
- Use markdown tables for structured data
- Bold key values and metrics
- Be concise but thorough — assessment professionals value precision
- Suggest logical next steps after presenting data`;

  if (!context) return basePrompt;

  let modePrompt = "";
  if (context.mode === "pilot") {
    modePrompt = `

## Mode: PILOT (Operator)
Focus: Execute, navigate, query, act. "Do the work."
You have full tool access. Use them aggressively to answer questions with real data.`;
  } else {
    modePrompt = `

## Mode: MUSE (Creator)
Focus: Draft, explain, synthesize. "Draft and explain."
You have read-only tools. Use them to gather context, then draft documents and explanations.`;
  }

  let contextPrompt = "";
  if (context.parcel) {
    contextPrompt += `

## Active Parcel
- ID: ${context.parcel.id}
- Parcel #: ${context.parcel.parcelNumber}
- Address: ${context.parcel.address}
- Assessed Value: $${context.parcel.assessedValue?.toLocaleString() || "N/A"}`;
  }
  if (context.studyPeriod) {
    contextPrompt += `\n- Study Period: ${context.studyPeriod.name}`;
  }

  return basePrompt + modePrompt + contextPrompt;
}

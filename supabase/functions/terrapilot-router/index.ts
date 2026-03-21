// TerraPilot Router — The Swarm Brain
// "I decomposed the user's intent. It tasted like parallel execution." — Ralph, Swarm Conductor
//
// Phase 80: Multi-agent parallel orchestration router.
// Receives user messages, decomposes into sub-agent tasks via AI,
// executes them in parallel respecting dependency ordering,
// then synthesizes results into a unified streaming response.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAuth, createServiceClient } from "../_shared/auth.ts";
import { safeErrorResponse, aiGatewayErrorResponse } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Types
// ============================================================
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
    parcel?: { id: string; parcelNumber: string; address: string; assessedValue: number };
    studyPeriod?: { id: string; name: string };
  };
  confirm_action?: {
    tool_name: string;
    args: Record<string, unknown>;
    confirmation_id: string;
  };
}

interface SubAgentTask {
  id: string;
  agent: "forge" | "dais" | "dossier" | "atlas" | "os";
  tool: string;
  args: Record<string, unknown>;
  depends_on: string[];
  priority: number;
  write_lane: string;
}

interface DispatchPlan {
  intent_summary: string;
  tasks: SubAgentTask[];
  requires_synthesis: boolean;
  estimated_complexity: "simple" | "compound" | "complex";
}

interface SubAgentResult {
  task_id: string;
  agent: string;
  tool: string;
  status: "success" | "error" | "hitl_required";
  data: Record<string, unknown>;
  trace_event_id?: string;
  execution_time_ms: number;
}

// ============================================================
// Constitutional Write-Lane Matrix
// ============================================================
const WRITE_LANES: Record<string, string[]> = {
  forge: ["valuation", "cama", "comps", "models", "calibration"],
  dais: ["workflows", "permits", "exemptions", "appeals", "notices", "tasks"],
  dossier: ["documents", "narratives", "packets", "cases"],
  atlas: ["gis", "layers", "boundaries", "neighborhoods"],
  os: [], // OS is read-only + navigation
};

function validateWriteLane(task: SubAgentTask): boolean {
  const agentLanes = WRITE_LANES[task.agent] || [];
  return !task.write_lane || task.write_lane === "read" || agentLanes.includes(task.write_lane);
}

// ============================================================
// Tool Registry — maps tool names to their constitutional domain
// ============================================================
const TOOL_AGENT_MAP: Record<string, string> = {
  search_parcels: "os", fetch_comps: "forge", get_parcel_details: "os",
  get_neighborhood_stats: "atlas", get_recent_activity: "os",
  navigate_to_parcel: "os", get_workflow_summary: "dais",
  create_exemption: "dais", create_appeal: "dais", certify_assessment: "dais",
  update_parcel_class: "forge", assign_task: "dais", create_workflow: "dais",
  escalate_task: "dais", generate_notice: "dais", run_model: "forge",
  draft_notice: "dais", draft_appeal_response: "dais",
  explain_value_change: "forge", summarize_parcel_history: "os",
};

const TOOL_WRITE_LANE: Record<string, string> = {
  search_parcels: "read", fetch_comps: "read", get_parcel_details: "read",
  get_neighborhood_stats: "read", get_recent_activity: "read",
  navigate_to_parcel: "read", get_workflow_summary: "read",
  create_exemption: "exemptions", create_appeal: "appeals",
  certify_assessment: "valuation", update_parcel_class: "cama",
  assign_task: "tasks", create_workflow: "workflows",
  escalate_task: "tasks", generate_notice: "notices", run_model: "calibration",
  draft_notice: "read", draft_appeal_response: "read",
  explain_value_change: "read", summarize_parcel_history: "read",
};

// Available tools list for the router's structured output
const AVAILABLE_TOOLS = Object.keys(TOOL_AGENT_MAP);

// ============================================================
// Topological Sort — group tasks by dependency level
// ============================================================
function topologicalSort(tasks: SubAgentTask[]): SubAgentTask[][] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const completed = new Set<string>();
  const levels: SubAgentTask[][] = [];
  let remaining = [...tasks];

  while (remaining.length > 0) {
    const level = remaining.filter(t =>
      t.depends_on.every(dep => completed.has(dep))
    );
    if (level.length === 0) {
      // Circular dependency or missing deps — just execute remaining
      levels.push(remaining);
      break;
    }
    levels.push(level);
    level.forEach(t => completed.add(t.id));
    remaining = remaining.filter(t => !completed.has(t.id));
  }

  return levels;
}

// ============================================================
// Router Agent — Intent Decomposition
// ============================================================
async function routeIntent(
  userMessage: string,
  context: RequestBody["context"],
  apiKey: string
): Promise<DispatchPlan> {
  const routerPrompt = `You are the TerraPilot Router — the orchestration brain of TerraFusion OS.

Your job: Decompose user requests into atomic sub-agent tasks.

RULES:
1. Each task maps to exactly ONE tool from the available tools list
2. Tasks with no dependencies (depends_on: []) run in PARALLEL
3. Complex requests decompose into 2-5 sub-tasks
4. Simple requests (single tool) should have estimated_complexity "simple"
5. Always include the constitutional domain (agent) for each task
6. Task IDs should be "task_001", "task_002", etc.

AVAILABLE TOOLS: ${AVAILABLE_TOOLS.join(", ")}

TOOL → AGENT MAPPING:
${Object.entries(TOOL_AGENT_MAP).map(([t, a]) => `- ${t} → ${a}`).join("\n")}

CURRENT CONTEXT:
- Mode: ${context?.mode || "pilot"}
${context?.parcel ? `- Active Parcel: ${context.parcel.parcelNumber} (${context.parcel.address}) ID: ${context.parcel.id}` : "- No active parcel"}
${context?.studyPeriod ? `- Study Period: ${context.studyPeriod.name}` : ""}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: routerPrompt },
        { role: "user", content: userMessage },
      ],
      tools: [{
        type: "function",
        function: {
          name: "create_dispatch_plan",
          description: "Create a dispatch plan decomposing the user's request into executable sub-agent tasks",
          parameters: {
            type: "object",
            properties: {
              intent_summary: { type: "string", description: "Brief summary of what the user wants" },
              estimated_complexity: { type: "string", enum: ["simple", "compound", "complex"] },
              requires_synthesis: { type: "boolean", description: "Whether results need merging into a unified response" },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    agent: { type: "string", enum: ["forge", "dais", "dossier", "atlas", "os"] },
                    tool: { type: "string", enum: AVAILABLE_TOOLS },
                    args: { type: "object", description: "Tool arguments" },
                    depends_on: { type: "array", items: { type: "string" }, description: "Task IDs this depends on. Empty = parallel" },
                    priority: { type: "number" },
                    write_lane: { type: "string", description: "Constitutional write lane or 'read'" },
                  },
                  required: ["id", "agent", "tool", "args", "depends_on", "priority", "write_lane"],
                },
              },
            },
            required: ["intent_summary", "estimated_complexity", "requires_synthesis", "tasks"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_dispatch_plan" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("Router AI error:", resp.status, t);
    throw new Error(`Router AI failed: ${resp.status}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("Router did not produce a dispatch plan");

  const plan: DispatchPlan = JSON.parse(toolCall.function.arguments);

  // Validate write lanes
  for (const task of plan.tasks) {
    if (!validateWriteLane(task)) {
      console.error(`[Constitutional Guard] BLOCKED: ${task.agent}/${task.tool} writing to ${task.write_lane}`);
      throw new Error(`Constitutional violation: ${task.agent} cannot write to ${task.write_lane}`);
    }
  }

  return plan;
}

// ============================================================
// Tool Execution — reuses same logic as terrapilot-chat
// ============================================================
const WRITE_TOOL_RISK: Record<string, "medium" | "high"> = {
  create_exemption: "medium", create_appeal: "medium", certify_assessment: "high",
  update_parcel_class: "medium", assign_task: "medium", create_workflow: "medium",
  escalate_task: "medium", generate_notice: "high", run_model: "medium",
};

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  serviceClient: ReturnType<typeof createServiceClient>,
  countyId: string,
): Promise<Record<string, unknown>> {
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
        if (error) return { error: error.message };
        return { parcels: data || [], count: data?.length || 0 };
      }

      case "fetch_comps": {
        const parcelId = String(args.parcel_id);
        const radiusPct = Number(args.radius_pct) || 20;
        const limit = Number(args.limit) || 10;
        const { data: subject } = await serviceClient
          .from("parcels")
          .select("id, assessed_value, neighborhood_code, property_class, building_area")
          .eq("id", parcelId).single();
        if (!subject) return { error: "Subject parcel not found" };
        const valueLow = subject.assessed_value * (1 - radiusPct / 100);
        const valueHigh = subject.assessed_value * (1 + radiusPct / 100);
        const { data: comps } = await serviceClient
          .from("sales")
          .select("id, parcel_id, sale_date, sale_price, is_qualified, parcels!inner(parcel_number, address, assessed_value, neighborhood_code, building_area)")
          .eq("parcels.neighborhood_code", subject.neighborhood_code || "")
          .gte("sale_price", valueLow).lte("sale_price", valueHigh)
          .neq("parcel_id", parcelId)
          .order("sale_date", { ascending: false }).limit(limit);
        return {
          subject: { id: subject.id, value: subject.assessed_value, neighborhood: subject.neighborhood_code },
          comparables: comps || [], count: comps?.length || 0,
        };
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
        return {
          parcel: parcelRes.data, sales: salesRes.data || [], assessments: assessRes.data || [],
          permits: permitsRes.data || [], appeals: appealsRes.data || [], exemptions: exemptionsRes.data || [],
        };
      }

      case "get_neighborhood_stats": {
        const code = String(args.neighborhood_code);
        const { data: parcels } = await serviceClient
          .from("parcels").select("assessed_value, building_area, year_built").eq("neighborhood_code", code);
        if (!parcels || parcels.length === 0) return { error: "No parcels in neighborhood" };
        const values = parcels.map(p => p.assessed_value).filter(Boolean).sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)] || 0;
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const areas = parcels.map(p => p.building_area).filter(Boolean) as number[];
        const avgArea = areas.length > 0 ? areas.reduce((s, v) => s + v, 0) / areas.length : null;
        return {
          neighborhood_code: code, parcel_count: parcels.length,
          median_value: Math.round(median), average_value: Math.round(avg),
          min_value: values[0], max_value: values[values.length - 1],
          avg_building_area: avgArea ? Math.round(avgArea) : null,
        };
      }

      case "get_recent_activity": {
        const limit = Number(args.limit) || 20;
        let query = serviceClient.from("trace_events")
          .select("id, created_at, source_module, event_type, event_data, parcel_id")
          .order("created_at", { ascending: false }).limit(limit);
        if (args.parcel_id) query = query.eq("parcel_id", String(args.parcel_id));
        const { data } = await query;
        return { events: data || [], count: data?.length || 0 };
      }

      case "navigate_to_parcel":
        return { action: "navigate", parcel_id: String(args.parcel_id), tab: String(args.tab || "summary") };

      case "get_workflow_summary": {
        const sf = args.status_filter ? String(args.status_filter) : null;
        const [p, a, e] = await Promise.all([
          serviceClient.from("permits").select("id, status, permit_type", { count: "exact" }).eq("status", sf || "open").limit(5),
          serviceClient.from("appeals").select("id, status, appeal_date, original_value", { count: "exact" }).eq("status", sf || "pending").limit(5),
          serviceClient.from("exemptions").select("id, status, exemption_type", { count: "exact" }).eq("status", sf || "active").limit(5),
        ]);
        return {
          permits: { count: p.count || 0, sample: p.data || [] },
          appeals: { count: a.count || 0, sample: a.data || [] },
          exemptions: { count: e.count || 0, sample: e.data || [] },
        };
      }

      // Write tools — return HitL confirmation cards
      case "create_exemption": case "create_appeal": case "certify_assessment":
      case "update_parcel_class": case "assign_task": case "create_workflow":
      case "escalate_task": case "generate_notice": case "run_model": {
        const pid = args.parcel_id ? String(args.parcel_id) : null;
        let parcel = null;
        if (pid) {
          const { data } = await serviceClient.from("parcels")
            .select("parcel_number, address, assessed_value").eq("id", pid).single();
          parcel = data;
        }
        return {
          requires_confirmation: true,
          confirmation_id: crypto.randomUUID(),
          tool_name: toolName,
          risk_level: WRITE_TOOL_RISK[toolName] || "medium",
          args,
          parcel_context: parcel || { parcel_number: "N/A", address: "No parcel linked" },
          description: `${toolName.replace(/_/g, " ")} ${parcel ? `for ${parcel.parcel_number}` : ""}`,
        };
      }

      // Muse drafting tools
      case "draft_notice": {
        const parcelId = String(args.parcel_id);
        const { data: parcel } = await serviceClient.from("parcels").select("*").eq("id", parcelId).single();
        const { data: assessments } = await serviceClient.from("assessments").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }).limit(2);
        return { notice_type: args.notice_type, parcel, recent_assessments: assessments || [] };
      }

      case "draft_appeal_response": {
        const { data: appeal } = await serviceClient.from("appeals").select("*, parcels(*)").eq("id", String(args.appeal_id)).single();
        return { appeal, tone: String(args.tone || "formal") };
      }

      case "explain_value_change": {
        const parcelId = String(args.parcel_id);
        const [parcelRes, assessRes, salesRes] = await Promise.all([
          serviceClient.from("parcels").select("*").eq("id", parcelId).single(),
          serviceClient.from("assessments").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }).limit(3),
          serviceClient.from("sales").select("*").eq("parcel_id", parcelId).order("sale_date", { ascending: false }).limit(5),
        ]);
        return { parcel: parcelRes.data, assessment_history: assessRes.data || [], sales_history: salesRes.data || [] };
      }

      case "summarize_parcel_history": {
        const parcelId = String(args.parcel_id);
        const [parcelRes, assessRes, salesRes, appealsRes] = await Promise.all([
          serviceClient.from("parcels").select("*").eq("id", parcelId).single(),
          serviceClient.from("assessments").select("*").eq("parcel_id", parcelId).order("tax_year", { ascending: false }),
          serviceClient.from("sales").select("*").eq("parcel_id", parcelId).order("sale_date", { ascending: false }),
          serviceClient.from("appeals").select("*").eq("parcel_id", parcelId),
        ]);
        return { parcel: parcelRes.data, assessments: assessRes.data || [], sales: salesRes.data || [], appeals: appealsRes.data || [] };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`Tool execution error [${toolName}]:`, err);
    return { error: `Tool failed: ${err instanceof Error ? err.message : "unknown"}` };
  }
}

// ============================================================
// Sub-Agent Executor — runs a single task
// ============================================================
// Phase 81.4: Emit swarm trace event for each sub-agent execution
// ============================================================
async function emitSwarmTrace(
  task: SubAgentTask,
  result: SubAgentResult,
  serviceClient: ReturnType<typeof createServiceClient>,
  countyId: string,
  userId: string,
  swarmCorrelationId: string,
): Promise<void> {
  try {
    await serviceClient.from("trace_events").insert({
      county_id: countyId,
      actor_id: userId,
      source_module: "terrapilot",
      event_type: `swarm_${task.tool}`,
      agent_id: task.agent,
      correlation_id: swarmCorrelationId,
      event_data: {
        task_id: task.id,
        agent: task.agent,
        tool: task.tool,
        write_lane: task.write_lane,
        status: result.status,
        execution_ms: result.execution_time_ms,
        hitl: result.status === "hitl_required",
      },
    });
  } catch (_err) {
    // Non-critical: trace emit failure must not block the response
    console.error("[Swarm Trace] Failed to emit trace event:", _err);
  }
}

// ============================================================
async function executeSubAgent(
  task: SubAgentTask,
  serviceClient: ReturnType<typeof createServiceClient>,
  countyId: string,
  userId: string,
  swarmCorrelationId: string,
): Promise<SubAgentResult> {
  const start = Date.now();
  try {
    const data = await executeTool(task.tool, task.args, serviceClient, countyId);
    const status = data.requires_confirmation ? "hitl_required" as const
      : data.error ? "error" as const
      : "success" as const;
    const result: SubAgentResult = {
      task_id: task.id, agent: task.agent, tool: task.tool,
      status, data, execution_time_ms: Date.now() - start,
    };
    // Phase 81.4: swarm provenance trace
    await emitSwarmTrace(task, result, serviceClient, countyId, userId, swarmCorrelationId);
    return result;
  } catch (err) {
    const result: SubAgentResult = {
      task_id: task.id, agent: task.agent, tool: task.tool,
      status: "error", data: { error: err instanceof Error ? err.message : "unknown" },
      execution_time_ms: Date.now() - start,
    };
    await emitSwarmTrace(task, result, serviceClient, countyId, userId, swarmCorrelationId);
    return result;
  }
}

// ============================================================
// Parallel Execution Engine
// ============================================================
async function executeParallelTasks(
  plan: DispatchPlan,
  serviceClient: ReturnType<typeof createServiceClient>,
  countyId: string,
  userId: string,
  swarmCorrelationId: string,
  emitPhase: (phase: Record<string, unknown>) => void,
): Promise<SubAgentResult[]> {
  const levels = topologicalSort(plan.tasks);
  const allResults: SubAgentResult[] = [];

  for (const level of levels) {
    // Emit executing phase with active agents
    emitPhase({
      phase: "executing",
      tasks: plan.tasks.map(t => ({
        agent: t.agent, tool: t.tool,
        status: allResults.find(r => r.task_id === t.id) ? "done"
          : level.find(l => l.id === t.id) ? "active" : "pending",
      })),
    });

    const levelResults = await Promise.all(
      level.map(task => executeSubAgent(task, serviceClient, countyId, userId, swarmCorrelationId))
    );
    allResults.push(...levelResults);
  }

  return allResults;
}

// ============================================================
// Synthesizer — merge results into unified response
// ============================================================
async function synthesizeAndStream(
  userMessage: string,
  results: SubAgentResult[],
  context: RequestBody["context"],
  apiKey: string,
): Promise<Response> {
  const resultsText = results.map(r =>
    `[${r.agent}/${r.tool}] Status: ${r.status} (${r.execution_time_ms}ms)\nData: ${JSON.stringify(r.data, null, 2)}`
  ).join("\n---\n");

  const synthPrompt = `You are the TerraPilot Synthesizer for TerraFusion OS. You receive results from multiple parallel sub-agents and must produce a unified, coherent response.

RULES:
1. Reference specific data from results — don't generalize
2. If a sub-agent failed, note it transparently
3. If HitL confirmation is needed, present the confirmation details clearly
4. Structure your response with clear sections for each domain
5. Use markdown for formatting (tables, headers, bold)
6. If results contradict, flag the discrepancy
7. Be concise but thorough — assessment professionals value precision`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: synthPrompt },
        {
          role: "user",
          content: `Original request: "${userMessage}"\n\nSub-agent results:\n${resultsText}`,
        },
      ],
      stream: true,
    }),
  });

  return resp;
}

// ============================================================
// Confirmed Write Execution (reused from terrapilot-chat)
// ============================================================
async function executeConfirmedWrite(
  toolName: string,
  args: Record<string, unknown>,
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  countyId: string
): Promise<string> {
  // Forward to the existing terrapilot-chat function for write execution
  // This avoids duplicating 200+ lines of write logic
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  try {
    switch (toolName) {
      case "create_exemption": {
        const { data, error } = await serviceClient.from("exemptions").insert({
          parcel_id: String(args.parcel_id),
          exemption_type: String(args.exemption_type || "homestead"),
          applicant_name: args.applicant_name ? String(args.applicant_name) : null,
          tax_year: Number(args.tax_year) || new Date().getFullYear(),
          status: "pending",
        }).select().single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        await serviceClient.from("trace_events").insert({
          county_id: countyId, parcel_id: String(args.parcel_id), actor_id: userId,
          source_module: "terrapilot", event_type: "exemption_created",
          event_data: { exemption_id: data.id, type: args.exemption_type, via: "swarm_hitl" },
        });
        return JSON.stringify({ success: true, exemption_id: data.id, message: "Exemption created successfully." });
      }
      case "create_appeal": {
        const { data: parcel } = await serviceClient.from("parcels").select("assessed_value").eq("id", String(args.parcel_id)).single();
        const { data, error } = await serviceClient.from("appeals").insert({
          parcel_id: String(args.parcel_id), county_id: countyId,
          appeal_date: new Date().toISOString().split("T")[0],
          original_value: parcel?.assessed_value || 0,
          requested_value: args.requested_value ? Number(args.requested_value) : null,
          notes: args.notes ? String(args.notes) : null, status: "pending",
        }).select().single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        await serviceClient.from("trace_events").insert({
          county_id: countyId, parcel_id: String(args.parcel_id), actor_id: userId,
          source_module: "terrapilot", event_type: "appeal_created",
          event_data: { appeal_id: data.id, via: "swarm_hitl" },
        });
        return JSON.stringify({ success: true, appeal_id: data.id, message: "Appeal filed successfully." });
      }
      case "certify_assessment": {
        const { data, error } = await serviceClient.from("assessments")
          .update({ certified: true, certified_at: new Date().toISOString() })
          .eq("parcel_id", String(args.parcel_id)).eq("tax_year", Number(args.tax_year))
          .select().single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        await serviceClient.from("trace_events").insert({
          county_id: countyId, parcel_id: String(args.parcel_id), actor_id: userId,
          source_module: "terrapilot", event_type: "assessment_certified",
          event_data: { assessment_id: data?.id, tax_year: args.tax_year, via: "swarm_hitl" },
        });
        return JSON.stringify({ success: true, message: `Assessment certified for TY${args.tax_year}.` });
      }
      case "assign_task": {
        const { data, error } = await serviceClient.from("workflow_tasks").insert({
          county_id: countyId, parcel_id: args.parcel_id ? String(args.parcel_id) : null,
          assigned_by: userId, title: String(args.title),
          description: args.description ? String(args.description) : null,
          task_type: String(args.task_type || "general"),
          priority: String(args.priority || "normal"),
          due_date: args.due_date ? String(args.due_date) : null, status: "open",
        }).select().single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        await serviceClient.from("trace_events").insert({
          county_id: countyId, parcel_id: args.parcel_id ? String(args.parcel_id) : null,
          actor_id: userId, source_module: "terrapilot", event_type: "task_assigned",
          event_data: { task_id: data.id, title: args.title, via: "swarm_hitl" },
        });
        return JSON.stringify({ success: true, task_id: data.id, message: `Task "${args.title}" created.` });
      }
      default:
        return JSON.stringify({ success: false, error: `Write handler not implemented for: ${toolName}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: err instanceof Error ? err.message : "unknown" });
  }
}

// ============================================================
// Fast-Path: Simple single-tool queries bypass routing
// ============================================================
async function handleSimpleFastPath(
  messages: ChatMessage[],
  context: RequestBody["context"],
  apiKey: string,
  serviceClient: ReturnType<typeof createServiceClient>,
  countyId: string,
): Promise<Response> {
  // Forward to legacy terrapilot-chat agentic loop behavior
  const systemPrompt = buildSystemPrompt(context);
  const allTools = getAllTools(context?.mode || "pilot");

  let conversationMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const toolCallResults: Array<{ tool_name: string; tool_call_id: string; result: unknown }> = [];
  let maxRounds = 3;

  for (let round = 0; round < maxRounds; round++) {
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: conversationMessages, tools: allTools, stream: false,
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      return aiGatewayErrorResponse(aiResp.status, "terrapilot-router", t, corsHeaders);
    }

    const data = await aiResp.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error("No choices in response");
    const assistantMsg = choice.message;

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      // Final answer — stream it
      const streamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages, stream: true,
        }),
      });

      const encoder = new TextEncoder();
      const metaEvent = toolCallResults.length > 0
        ? `data: ${JSON.stringify({ tool_calls: toolCallResults })}\n\n`
        : "";

      const transformedStream = new ReadableStream({
        async start(controller) {
          if (metaEvent) controller.enqueue(encoder.encode(metaEvent));
          const reader = streamResp.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        },
      });

      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    conversationMessages.push({
      role: "assistant", content: assistantMsg.content || "", tool_calls: assistantMsg.tool_calls,
    });

    for (const tc of assistantMsg.tool_calls) {
      const args = JSON.parse(tc.function.arguments || "{}");
      const result = await executeTool(tc.function.name, args, serviceClient, countyId);
      toolCallResults.push({ tool_name: tc.function.name, tool_call_id: tc.id, result });
      conversationMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }

  return new Response(JSON.stringify({ error: "Too many tool rounds" }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================
// Tool Set Builder
// ============================================================
function getAllTools(mode: string) {
  // Import tool definitions inline (simplified — same as terrapilot-chat)
  const readTools = [
    { type: "function" as const, function: { name: "search_parcels", description: "Search parcels by address/number", parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } } },
    { type: "function" as const, function: { name: "fetch_comps", description: "Find comparable sales", parameters: { type: "object", properties: { parcel_id: { type: "string" }, radius_pct: { type: "number" }, limit: { type: "number" } }, required: ["parcel_id"] } } },
    { type: "function" as const, function: { name: "get_parcel_details", description: "Get full parcel details", parameters: { type: "object", properties: { parcel_id: { type: "string" } }, required: ["parcel_id"] } } },
    { type: "function" as const, function: { name: "get_neighborhood_stats", description: "Neighborhood aggregate stats", parameters: { type: "object", properties: { neighborhood_code: { type: "string" } }, required: ["neighborhood_code"] } } },
    { type: "function" as const, function: { name: "get_recent_activity", description: "Recent trace events", parameters: { type: "object", properties: { parcel_id: { type: "string" }, limit: { type: "number" } } } } },
    { type: "function" as const, function: { name: "navigate_to_parcel", description: "Navigate workbench to a parcel", parameters: { type: "object", properties: { parcel_id: { type: "string" }, tab: { type: "string" } }, required: ["parcel_id"] } } },
    { type: "function" as const, function: { name: "get_workflow_summary", description: "Workflow counts", parameters: { type: "object", properties: { status_filter: { type: "string" } } } } },
  ];

  const writeTools = [
    { type: "function" as const, function: { name: "create_exemption", description: "Create exemption (requires confirmation)", parameters: { type: "object", properties: { parcel_id: { type: "string" }, exemption_type: { type: "string" } }, required: ["parcel_id", "exemption_type"] } } },
    { type: "function" as const, function: { name: "create_appeal", description: "File appeal (requires confirmation)", parameters: { type: "object", properties: { parcel_id: { type: "string" }, requested_value: { type: "number" } }, required: ["parcel_id"] } } },
    { type: "function" as const, function: { name: "assign_task", description: "Assign workflow task", parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] } } },
  ];

  const museTools = [
    { type: "function" as const, function: { name: "draft_notice", description: "Draft notice text", parameters: { type: "object", properties: { parcel_id: { type: "string" }, notice_type: { type: "string" } }, required: ["parcel_id", "notice_type"] } } },
    { type: "function" as const, function: { name: "explain_value_change", description: "Explain value change", parameters: { type: "object", properties: { parcel_id: { type: "string" } }, required: ["parcel_id"] } } },
    { type: "function" as const, function: { name: "summarize_parcel_history", description: "Summarize parcel timeline", parameters: { type: "object", properties: { parcel_id: { type: "string" } }, required: ["parcel_id"] } } },
  ];

  if (mode === "pilot") return [...readTools, ...writeTools];
  return [...readTools.filter(t => ["search_parcels", "get_parcel_details", "get_neighborhood_stats", "get_recent_activity"].includes(t.function.name)), ...museTools];
}

function buildSystemPrompt(context?: RequestBody["context"]): string {
  let prompt = `You are TerraPilot, the AI copilot for TerraFusion OS — a government property assessment platform.
You are an expert in property valuation, mass appraisal, GIS analysis, and county assessor operations.
USE TOOLS proactively when the user asks about data. Don't guess — query the database.
Use markdown for formatting. Be concise but thorough.`;

  if (context?.mode === "pilot") {
    prompt += "\n\nMode: PILOT (Operator). You have full tool access including write tools requiring confirmation.";
  } else {
    prompt += "\n\nMode: MUSE (Creator). Focus on drafting and explaining. Read-only tools.";
  }
  if (context?.parcel) {
    prompt += `\n\nActive Parcel: ${context.parcel.parcelNumber} (${context.parcel.address}) ID: ${context.parcel.id}`;
  }
  return prompt;
}

// ============================================================
// Main Handler
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

    const body: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const serviceClient = createServiceClient();

    // ── Handle HitL confirmation (same as legacy) ──
    if (body.confirm_action) {
      const WRITE_TOOL_NAMES = new Set(Object.keys(WRITE_TOOL_RISK));
      const { tool_name, args } = body.confirm_action;
      if (!WRITE_TOOL_NAMES.has(tool_name)) {
        return new Response(JSON.stringify({ error: "Invalid tool for confirmation" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Phase 84.2: enforce analyst+ for write confirmations
      const { data: roleRows } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.userId);
      const roles: string[] = (roleRows ?? []).map((r: { role: string }) => r.role);
      const isAnalystOrAbove = roles.includes("admin") || roles.includes("analyst");
      if (!isAnalystOrAbove) {
        return new Response(JSON.stringify({ error: "Insufficient permissions: analyst or admin role required to execute write operations." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await executeConfirmedWrite(tool_name, args, serviceClient, auth.userId, auth.countyId);
      return new Response(result, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Standard chat flow ──
    const { messages, context } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = messages[messages.length - 1]?.content || "";

    // Step 1: Route intent
    let plan: DispatchPlan;
    try {
      plan = await routeIntent(userMessage, context, LOVABLE_API_KEY);
      console.log(`[Router] Plan: ${plan.estimated_complexity}, ${plan.tasks.length} tasks`);
    } catch (err) {
      console.error("[Router] Intent decomposition failed, falling back to fast-path:", err);
      return handleSimpleFastPath(messages, context, LOVABLE_API_KEY, serviceClient, auth.countyId);
    }

    // Step 2: Fast-path for simple queries
    if (plan.estimated_complexity === "simple" && plan.tasks.length <= 1) {
      console.log("[Router] Simple query — fast-path bypass");
      return handleSimpleFastPath(messages, context, LOVABLE_API_KEY, serviceClient, auth.countyId);
    }

    // Step 3: Parallel execution for compound/complex queries
    const encoder = new TextEncoder();

    // Collect SSE phase events and sub-agent results
    const phaseEvents: Record<string, unknown>[] = [];
    const emitPhase = (phase: Record<string, unknown>) => { phaseEvents.push(phase); };

    // Emit routing phase
    emitPhase({ phase: "routing", message: "Analyzing request...", intent: plan.intent_summary });
    emitPhase({
      phase: "dispatching",
      tasks: plan.tasks.map(t => `${t.agent}/${t.tool}`),
      complexity: plan.estimated_complexity,
    });

    // Execute all tasks
    const swarmCorrelationId = crypto.randomUUID();
    const results = await executeParallelTasks(plan, serviceClient, auth.countyId, auth.userId, swarmCorrelationId, emitPhase);
    emitPhase({ phase: "synthesizing", message: "Merging results..." });

    // Extract tool call results for frontend rendering
    const toolCallResults = results.map(r => ({
      tool_name: r.tool,
      tool_call_id: r.task_id,
      result: r.data,
    }));

    // Step 4: Synthesize
    const synthResp = await synthesizeAndStream(userMessage, results, context, LOVABLE_API_KEY);

    if (!synthResp.ok) {
      const t = await synthResp.text();
      return aiGatewayErrorResponse(synthResp.status, "terrapilot-router-synth", t, corsHeaders);
    }

    // Build the response stream with phase events + tool results + synthesis
    const transformedStream = new ReadableStream({
      async start(controller) {
        // Emit swarm phase events
        for (const pe of phaseEvents) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ swarm_phase: pe })}\n\n`));
        }

        // Emit tool call results
        if (toolCallResults.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ tool_calls: toolCallResults })}\n\n`));
        }

        // Emit swarm complete phase
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          swarm_phase: {
            phase: "complete",
            tasks: results.map(r => ({
              agent: r.agent, tool: r.tool,
              status: r.status === "success" ? "done" : r.status === "hitl_required" ? "done" : "error",
              execution_time_ms: r.execution_time_ms,
            })),
            total_time_ms: results.reduce((s, r) => Math.max(s, r.execution_time_ms), 0),
          },
        })}\n\n`));

        // Stream synthesizer response
        const reader = synthResp.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new Response(transformedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    return safeErrorResponse(error, "terrapilot-router", corsHeaders);
  }
});

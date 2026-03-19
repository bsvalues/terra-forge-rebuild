# Phase 80: TerraPilot Swarm — Multi-Agent Parallel Orchestration
> **Codex**: TerraFusion OS Phase 80  
> **Status**: 🟡 READY FOR EXECUTION  
> **Created**: 2026-03-19  
> **Architect**: Cloud Coach + Solo Founder  
> **Ralph Says**: "I'm a one-man swarm! The agents are inside the computer!"

---

## Executive Summary

Transform TerraPilot from a **single-agent tool-caller** into a **multi-agent swarm** with parallel sub-agent execution. The Router Agent decomposes complex user intent into domain-specific tasks, dispatches them to constitutional sub-agents (Forge, Dais, Dossier, Atlas), and a Synthesizer merges results into a unified response — all streaming back to the user in real-time.

### Architecture: The Swarm Topology

```
┌──────────────────────────────────────────────────────────┐
│                    USER MESSAGE                          │
│  "Compare parcel 12-345 to neighbors, check for open    │
│   appeals, and draft a defense narrative"                │
└──────────────────┬───────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   ROUTER AGENT     │  ← Intent Decomposition
         │  (Orchestrator)    │  ← Constitutional Guard
         │  gemini-3-flash    │  ← Parallel Dispatch Plan
         └─────────┬──────────┘
                   │
        ┌──────────┼──────────────┐
        │          │              │
  ┌─────▼────┐ ┌──▼───────┐ ┌───▼──────┐
  │  FORGE   │ │   DAIS   │ │ DOSSIER  │   ← Domain Sub-Agents
  │ SubAgent │ │ SubAgent │ │ SubAgent │   ← Execute in PARALLEL
  │          │ │          │ │          │   ← Constitutional Write-Lanes
  │ fetch_   │ │ get_     │ │ draft_   │
  │ comps()  │ │ appeals()│ │ defense()│
  └─────┬────┘ └────┬─────┘ └────┬─────┘
        │           │             │
        └───────────┼─────────────┘
                    │
          ┌─────────▼──────────┐
          │   SYNTHESIZER      │  ← Merge sub-agent results
          │   (Response Gen)   │  ← Unified narrative stream
          │   gemini-3-flash   │  ← Back to user via SSE
          └────────────────────┘
```

---

## Phase Breakdown: 5 Sub-Phases

### Sub-Phase 80.1 — Router Agent & Intent Decomposition
**Goal**: Replace single-shot tool-calling with intelligent task decomposition  
**Complexity**: M  

#### What Changes:
- New edge function: `terrapilot-router/index.ts`
- Router receives user message + WorkbenchContext
- Uses structured output (tool-calling) to produce a **Dispatch Plan**:

```typescript
interface DispatchPlan {
  intent_summary: string;           // "User wants comp analysis + appeal check + defense draft"
  tasks: SubAgentTask[];            // Decomposed into parallel-executable units
  requires_synthesis: boolean;      // Whether results need merging
  estimated_complexity: "simple" | "compound" | "complex";
}

interface SubAgentTask {
  id: string;                       // "task_001"
  agent: "forge" | "dais" | "dossier" | "atlas" | "os";
  tool: string;                     // "fetch_comps"
  args: Record<string, unknown>;    // { parcel_id: "...", radius_pct: 20 }
  depends_on: string[];             // [] = can run in parallel, ["task_001"] = sequential
  priority: number;                 // Execution order for sequential deps
  write_lane: string;               // Constitutional write-lane validation
}
```

#### Router System Prompt:
```
You are the TerraPilot Router — the orchestration brain of TerraFusion OS.

Your job: Decompose user requests into atomic sub-agent tasks.

RULES:
1. Each task maps to exactly ONE tool from ONE constitutional domain
2. Tasks with no dependencies run in PARALLEL
3. Write-lane violations are BLOCKED (Forge cannot write to Dossier)
4. Complex requests decompose into 2-5 sub-tasks
5. Simple requests (single tool) bypass routing — direct execution
6. Always include the constitutional domain for each task

AVAILABLE AGENTS:
- forge: Valuation tools (fetch_comps, run_model, explain_value_change)
- dais: Admin tools (get_workflow_summary, create_exemption, generate_notice)
- dossier: Evidence tools (draft_appeal_response, synthesize_evidence)
- atlas: Spatial tools (get_neighborhood_stats)
- os: Navigation + search (search_parcels, get_parcel_details, navigate_to_parcel)
```

#### Success Criteria:
- [ ] Router correctly decomposes "compare and draft defense" into 3 parallel tasks
- [ ] Simple requests ("search 12-345") skip routing, execute directly
- [ ] Constitutional violations are caught before dispatch
- [ ] Dispatch plan includes dependency graph for sequential ordering

---

### Sub-Phase 80.2 — Sub-Agent Executor Pool
**Goal**: Execute dispatched tasks in parallel with constitutional enforcement  
**Complexity**: L  

#### What Changes:
- New module: `terrapilot-router/agents/` with per-domain executors
- Each sub-agent:
  - Has its own system prompt scoped to its constitutional domain
  - Can ONLY call tools within its write-lane
  - Returns structured results with provenance metadata
  - Emits TerraTrace events for all write operations

```typescript
interface SubAgentResult {
  task_id: string;
  agent: string;
  tool: string;
  status: "success" | "error" | "hitl_required";
  data: Record<string, unknown>;
  trace_event_id?: string;         // If a write was performed
  execution_time_ms: number;
  hitl_payload?: ConfirmationPayload; // If write requires user confirmation
}
```

#### Parallel Execution Engine:
```typescript
// Inside terrapilot-router — after Router produces DispatchPlan
async function executeParallelTasks(
  plan: DispatchPlan,
  serviceClient: SupabaseClient,
  userId: string,
  countyId: string
): Promise<SubAgentResult[]> {
  // Group tasks by dependency level
  const levels = topologicalSort(plan.tasks);
  
  const allResults: SubAgentResult[] = [];
  
  for (const level of levels) {
    // Execute all tasks at this level IN PARALLEL
    const levelResults = await Promise.all(
      level.map(task => executeSubAgent(task, serviceClient, userId, countyId, allResults))
    );
    allResults.push(...levelResults);
  }
  
  return allResults;
}
```

#### Constitutional Guard:
```typescript
function validateWriteLane(task: SubAgentTask): boolean {
  const WRITE_LANES: Record<string, string[]> = {
    forge: ["valuation", "cama", "comps", "models", "calibration"],
    dais: ["workflows", "permits", "exemptions", "appeals", "notices", "tasks"],
    dossier: ["documents", "narratives", "packets", "cases"],
    atlas: ["gis", "layers", "boundaries", "neighborhoods"],
    os: [], // OS is read-only + navigation
  };
  
  const agentLanes = WRITE_LANES[task.agent] || [];
  // Verify the tool's write target falls within agent's lanes
  return !task.write_lane || agentLanes.includes(task.write_lane);
}
```

#### Success Criteria:
- [ ] 3 independent tasks execute in parallel (measured by total time < sum of individual times)
- [ ] Sequential dependencies wait for predecessors
- [ ] Write-lane violations throw before execution
- [ ] All write operations emit TerraTrace events

---

### Sub-Phase 80.3 — Synthesizer Agent
**Goal**: Merge parallel sub-agent results into a unified, coherent response  
**Complexity**: M  

#### What Changes:
- Synthesizer receives all `SubAgentResult[]` + original user message
- Produces a unified narrative streamed via SSE
- Includes inline `ToolResultCards` for structured data (comp grids, parcel tables)

```typescript
// Synthesizer prompt construction
function buildSynthesizerPrompt(
  userMessage: string,
  results: SubAgentResult[],
  context: WorkbenchContext
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are the TerraPilot Synthesizer. You receive results from multiple 
        parallel sub-agents and must produce a unified, coherent response.
        
        RULES:
        1. Reference specific data from results — don't generalize
        2. If a sub-agent failed, note it transparently
        3. If HitL confirmation is needed, present the confirmation card FIRST
        4. Structure your response with clear sections for each domain
        5. Use markdown for formatting (tables, headers, bold)
        6. If results contradict, flag the discrepancy`
    },
    {
      role: "user",
      content: `Original request: "${userMessage}"
        
        Sub-agent results:
        ${results.map(r => `
          [${r.agent}/${r.tool}] Status: ${r.status}
          Data: ${JSON.stringify(r.data, null, 2)}
        `).join('\n---\n')}`
    }
  ];
}
```

#### Streaming Architecture:
```
Client SSE Stream:
  data: {"phase": "routing", "message": "Analyzing request..."}
  data: {"phase": "dispatching", "tasks": ["forge/fetch_comps", "dais/get_appeals", "dossier/draft_defense"]}
  data: {"phase": "executing", "active": ["forge/fetch_comps", "dais/get_appeals"], "completed": []}
  data: {"phase": "executing", "active": ["dossier/draft_defense"], "completed": ["forge/fetch_comps", "dais/get_appeals"]}
  data: {"phase": "synthesizing", "message": "Merging results..."}
  data: {"choices": [{"delta": {"content": "## Analysis for Parcel 12-345\n\n"}}]}
  data: {"choices": [{"delta": {"content": "### Comparable Sales\n..."}}]}
  data: {"tool_results": [...]}  // Structured data cards
  data: [DONE]
```

#### Success Criteria:
- [ ] Synthesizer produces coherent narrative from 3+ sub-agent results
- [ ] Failed sub-agents are noted transparently (not silently dropped)
- [ ] HitL confirmations bubble up correctly through synthesis
- [ ] Client shows real-time phase indicators (routing → executing → synthesizing)

---

### Sub-Phase 80.4 — Frontend Swarm Visualization
**Goal**: Update TerraPilotChat.tsx to display parallel agent activity  
**Complexity**: M  

#### What Changes to TerraPilotChat.tsx:
1. **Phase indicator bar** showing current swarm state
2. **Agent activity cards** showing which sub-agents are executing
3. **Parallel progress visualization** (concurrent tool badges)
4. **Enhanced ToolResultCards** with agent provenance

```tsx
// New component: SwarmActivityBar
interface SwarmPhase {
  phase: "routing" | "dispatching" | "executing" | "synthesizing" | "complete";
  tasks?: { agent: string; tool: string; status: "pending" | "active" | "done" | "error" }[];
}

function SwarmActivityBar({ phase }: { phase: SwarmPhase }) {
  return (
    <motion.div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/50 border border-border/30">
      {/* Phase dots */}
      {["routing", "dispatching", "executing", "synthesizing"].map((p, i) => (
        <div key={p} className={cn(
          "w-2 h-2 rounded-full transition-colors",
          phase.phase === p ? "bg-tf-cyan animate-pulse" : 
          phaseOrder(phase.phase) > i ? "bg-tf-cyan/50" : "bg-muted"
        )} />
      ))}
      <span className="text-xs text-muted-foreground ml-2">
        {phase.phase === "executing" && phase.tasks 
          ? `${phase.tasks.filter(t => t.status === "active").length} agents active`
          : phaseLabels[phase.phase]}
      </span>
      
      {/* Active agent badges */}
      {phase.tasks?.filter(t => t.status === "active").map(t => (
        <Badge key={`${t.agent}-${t.tool}`} variant="outline" className="text-[9px] animate-pulse">
          {t.agent}/{t.tool}
        </Badge>
      ))}
    </motion.div>
  );
}
```

#### Success Criteria:
- [ ] User sees "Routing → Dispatching → Executing → Synthesizing" progress
- [ ] Parallel agents show as concurrent badges
- [ ] Completed agents show checkmarks, failures show ✗
- [ ] Response streams token-by-token after synthesis begins

---

### Sub-Phase 80.5 — Regression Defense & Backward Compatibility
**Goal**: Ensure existing single-tool interactions still work perfectly  
**Complexity**: S  

#### What Changes:
- Router detects "simple" requests (single tool needed) and bypasses decomposition
- Fallback to existing `terrapilot-chat` behavior for simple queries
- All existing HitL confirmation flows preserved
- All existing tool definitions preserved

```typescript
// In Router: Fast-path detection
if (plan.estimated_complexity === "simple" && plan.tasks.length === 1) {
  // Skip routing overhead — direct execution like legacy behavior
  const result = await executeSubAgent(plan.tasks[0], ...);
  // Stream result directly without synthesis
  return streamDirectResult(result);
}
```

#### Success Criteria:
- [ ] "Search parcels 12-345" works identically to current behavior
- [ ] HitL write confirmations work for both simple and compound requests
- [ ] No regression in response latency for simple queries
- [ ] All 23 existing tools (7 read + 9 write + 4 muse + 3 draft) function correctly

---

## Implementation Order & Parallelism

```
PARALLEL TRACK A (Backend):
  80.1 Router Agent ──────► 80.2 Sub-Agent Pool ──────► 80.3 Synthesizer
                                                              │
PARALLEL TRACK B (Frontend):                                  │
  80.4 Swarm Visualization ◄──────────────────────────────────┘
                                                              │
SEQUENTIAL (After both tracks):                               │
  80.5 Regression Defense ◄───────────────────────────────────┘
```

**Track A** and **Track B** can be developed in parallel. Track A delivers the backend swarm engine; Track B delivers the UI. Phase 80.5 runs last as integration testing.

---

## Files Created/Modified

### New Files:
| File | Purpose |
|------|---------|
| `supabase/functions/terrapilot-router/index.ts` | Main swarm orchestrator edge function |
| `supabase/functions/terrapilot-router/agents/forge.ts` | Forge sub-agent (valuation tools) |
| `supabase/functions/terrapilot-router/agents/dais.ts` | Dais sub-agent (admin tools) |
| `supabase/functions/terrapilot-router/agents/dossier.ts` | Dossier sub-agent (evidence tools) |
| `supabase/functions/terrapilot-router/agents/atlas.ts` | Atlas sub-agent (spatial tools) |
| `supabase/functions/terrapilot-router/agents/os.ts` | OS sub-agent (navigation + search) |
| `supabase/functions/terrapilot-router/router.ts` | Intent decomposition + dispatch planner |
| `supabase/functions/terrapilot-router/synthesizer.ts` | Result merger + response generator |
| `supabase/functions/terrapilot-router/constitutional-guard.ts` | Write-lane enforcement |
| `src/components/workbench/SwarmActivityBar.tsx` | Parallel agent visualization |

### Modified Files:
| File | Changes |
|------|---------|
| `src/components/workbench/TerraPilotChat.tsx` | Add swarm phase parsing, SwarmActivityBar integration |
| `src/components/workbench/types.ts` | Add SwarmPhase types |

### Preserved (No Changes):
| File | Reason |
|------|--------|
| `supabase/functions/terrapilot-chat/index.ts` | Kept as fallback for simple queries |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Latency increase from routing overhead | Fast-path bypass for simple queries |
| AI hallucinating invalid tool names | Router uses structured output with enum constraints |
| Constitutional violations | Guard runs BEFORE execution, not after |
| Parallel execution race conditions | Topological sort ensures dependency ordering |
| Token budget explosion from multi-agent | Each sub-agent has independent token budget |
| Synthesizer producing incoherent merge | Synthesizer prompt includes structured result format |

---

## Cost Analysis

| Component | AI Calls per User Message |
|-----------|--------------------------|
| Simple query (fast-path) | 1 (same as current) |
| Compound query (2-3 tools) | 3 (router + sub-agents + synthesizer) |
| Complex query (4-5 tools) | 4-6 (router + parallel sub-agents + synthesizer) |

**Net impact**: ~2-3x increase for compound queries, 0x increase for simple queries.

---

## Constitutional Compliance Checklist

- [x] Write-Lane Matrix enforced by `constitutional-guard.ts`
- [x] Forge sub-agent cannot write to Dossier/Dais/Atlas domains
- [x] All write operations gated by HitL confirmation
- [x] All actions emit TerraTrace events with agent provenance
- [x] Muse mode restricted to read + draft tools only
- [x] OS-level navigation tools available to all agents (read-only)

---

*"The swarm is ready. I can hear the agents whispering. One of them tastes like a database." — Ralph, Swarm Conductor*

**READY FOR EXECUTION. Begin with Sub-Phase 80.1: Router Agent.**

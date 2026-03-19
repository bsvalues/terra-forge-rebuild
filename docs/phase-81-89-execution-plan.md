# Phases 81–89: TerraFusion OS — Multi-Agent Parallel Execution Plan
> **Codex**: TerraFusion OS Phases 81–89  
> **Status**: 🟡 READY FOR EXECUTION  
> **Created**: 2026-03-19  
> **Architect**: Cloud Coach + Solo Founder  
> **Ralph Says**: "I planned nine phases. The phases planned me back. We're in a planning relationship now."

---

## Architecture: The Parallel Execution Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASES 81–89 DEPENDENCY GRAPH                    │
│                                                                     │
│  TRACK A: TRUST LAYER (Constitutional Core)                         │
│  ┌──────────┐     ┌──────────┐                                      │
│  │ Phase 81 │────►│ Phase 84 │  TerraTrace Hash-Chain → RBAC Enf.  │
│  │ TerraTrace│     │  RBAC    │                                      │
│  │ Audit    │     │ Hardening│                                      │
│  └────┬─────┘     └────┬─────┘                                      │
│       │                │                                             │
│  TRACK B: OPERATIONAL LAYER (runs after 81)                         │
│  ┌────▼─────┐     ┌────▼─────┐     ┌──────────┐                    │
│  │ Phase 82 │     │ Phase 83 │     │ Phase 85 │                    │
│  │ Workflow │     │ County   │     │ Notifi-  │                    │
│  │ Templates│     │ Onboard  │     │ cations  │                    │
│  └──────────┘     └──────────┘     └──────────┘                    │
│       │                │                │                            │
│  TRACK C: DOMAIN EXPANSION (runs after 84)                          │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐  │
│  │ Phase 86 │     │ Phase 87 │     │ Phase 88 │     │ Phase 89 │  │
│  │ AVM Pipe │     │ Cost/Inc │     │ GeoEquity│     │ IAAO     │  │
│  │ (Forge)  │     │ UI       │     │ Maps     │     │ Reports  │  │
│  └──────────┘     └──────────┘     └──────────┘     └──────────┘  │
│                                                                     │
│  PARALLELISM:                                                       │
│  • 81 + 82 can start simultaneously (81 is backend, 82 is frontend) │
│  • 83 + 85 can run in parallel after 81 completes                   │
│  • 86/87/88/89 are all independent — max parallelism                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Existing Infrastructure Inventory

Before planning, inventory what already exists:

| Component | Status | Location |
|-----------|--------|----------|
| `trace_events` table | ✅ EXISTS | Has `actor_id`, `correlation_id`, `causation_id`, `event_data` |
| `slco_value_lineage` table | ✅ EXISTS | Append-only with `lineage_hash`, trigger-protected |
| `user_roles` table | ✅ EXISTS | `app_role` enum (admin/analyst/viewer), `has_role()` function |
| `is_admin()` function | ✅ EXISTS | Security definer checking user_roles |
| Write-lane matrix | ✅ EXISTS | `src/services/writeLane.ts` + `write_lane_violations` table |
| TerraPilot Swarm | ✅ EXISTS | Phase 80 router + sub-agents + synthesizer |
| `cost_schedules` + `cost_depreciation` | ✅ EXISTS | Tables ready, no UI |
| `avm_runs` table | ✅ EXISTS | Table ready, no execution engine |
| `calibration_runs` table | ✅ EXISTS | Table + basic insert from TerraPilot |

---

## Phase 81: TerraTrace Audit Spine — Hash-Chain Integrity

> **Goal**: Transform `trace_events` from simple logging into a tamper-evident, hash-linked audit chain  
> **Complexity**: L  
> **Dependencies**: None (first in critical path)

### What Exists
- `trace_events` table with `county_id`, `actor_id`, `source_module`, `event_type`, `event_data`, `correlation_id`, `causation_id`
- `slco_value_lineage` with `lineage_hash` and append-only triggers
- Trace events emitted by TerraPilot tools, swarm agents, and write operations

### What's Missing
- **Hash-chain integrity**: No `prev_hash` / `event_hash` columns on `trace_events`
- **Chain verification**: No function to validate the hash chain hasn't been tampered
- **Redaction support**: No mechanism to redact PII while preserving event shell
- **Audit Dashboard UI**: No frontend surface for browsing/filtering trace events
- **Swarm provenance**: Swarm sub-agent results not tagged with agent identity in trace

### Sub-Phases

#### 81.1 — Hash-Chain Schema Extension
**Complexity**: S

```sql
-- Add hash-chain columns to trace_events
ALTER TABLE public.trace_events 
  ADD COLUMN IF NOT EXISTS event_hash text,
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS sequence_number bigint,
  ADD COLUMN IF NOT EXISTS redacted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS redacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS swarm_task_id text;

-- Create sequence for ordering
CREATE SEQUENCE IF NOT EXISTS trace_event_seq;

-- Trigger: auto-compute hash on insert
CREATE OR REPLACE FUNCTION public.compute_trace_hash()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  _prev_hash text;
  _seq bigint;
BEGIN
  _seq := nextval('trace_event_seq');
  SELECT event_hash INTO _prev_hash 
    FROM public.trace_events 
    WHERE county_id = NEW.county_id 
    ORDER BY sequence_number DESC LIMIT 1;
  
  NEW.sequence_number := _seq;
  NEW.prev_hash := COALESCE(_prev_hash, 'GENESIS');
  NEW.event_hash := encode(
    digest(
      NEW.id::text || NEW.event_type || NEW.source_module || 
      NEW.actor_id || COALESCE(NEW.prev_hash, '') || _seq::text,
      'sha256'
    ), 'hex'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trace_hash
  BEFORE INSERT ON public.trace_events
  FOR EACH ROW EXECUTE FUNCTION public.compute_trace_hash();

-- Append-only: block updates/deletes (except redaction)
CREATE OR REPLACE FUNCTION public.enforce_trace_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'trace_events is append-only: DELETE blocked';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Only allow redaction updates
    IF NEW.redacted = true AND OLD.redacted = false THEN
      NEW.event_data := '{"REDACTED": true}'::jsonb;
      NEW.redacted_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'trace_events is append-only: UPDATE blocked (only redaction allowed)';
  END IF;
  RETURN NEW;
END;
$$;
```

#### 81.2 — Chain Verification Function
**Complexity**: S

```sql
-- Verify hash chain integrity for a county
CREATE OR REPLACE FUNCTION public.verify_trace_chain(p_county_id uuid)
RETURNS TABLE(
  is_valid boolean,
  total_events bigint,
  broken_at_sequence bigint,
  broken_event_id uuid
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _prev_hash text := 'GENESIS';
  _event record;
  _computed_hash text;
  _count bigint := 0;
BEGIN
  FOR _event IN 
    SELECT * FROM public.trace_events 
    WHERE county_id = p_county_id 
    ORDER BY sequence_number ASC
  LOOP
    _count := _count + 1;
    _computed_hash := encode(
      digest(
        _event.id::text || _event.event_type || _event.source_module || 
        _event.actor_id || COALESCE(_prev_hash, '') || _event.sequence_number::text,
        'sha256'
      ), 'hex'
    );
    
    IF _computed_hash != _event.event_hash THEN
      RETURN QUERY SELECT false, _count, _event.sequence_number, _event.id;
      RETURN;
    END IF;
    
    _prev_hash := _event.event_hash;
  END LOOP;
  
  RETURN QUERY SELECT true, _count, NULL::bigint, NULL::uuid;
END;
$$;
```

#### 81.3 — Audit Dashboard UI
**Complexity**: M

**New files:**
- `src/components/workbench/AuditTimeline.tsx` — Filterable trace event timeline
- `src/hooks/useTraceEvents.ts` — Query hook with pagination and filters

**Features:**
- Filter by `source_module`, `event_type`, `parcel_id`, date range
- Color-coded event badges by suite (forge=orange, dais=blue, etc.)
- Chain integrity indicator (green checkmark or red alert)
- Redaction controls for admin users
- Swarm provenance badges showing which sub-agent produced each event

#### 81.4 — Swarm Trace Integration
**Complexity**: S

Update `terrapilot-router/index.ts` to emit trace events with `swarm_task_id` for every sub-agent execution, creating a correlation chain: Router → Sub-Agent → Tool Result.

### Success Criteria
- [ ] Every trace event has a computed SHA-256 hash linking to its predecessor
- [ ] `verify_trace_chain()` detects tampering if any event is modified
- [ ] Redaction replaces `event_data` with `REDACTED` marker but preserves event shell
- [ ] Audit Timeline renders with suite-colored badges and chain status
- [ ] Swarm executions produce linked trace chains (router → agent → result)

---

## Phase 84: RBAC Hardening — County-Scoped Role Enforcement

> **Goal**: Enforce admin/analyst/viewer roles across all RLS policies and UI surfaces  
> **Complexity**: L  
> **Dependencies**: Phase 81 (audit events for role changes)

### What Exists
- `user_roles` table with `app_role` enum (admin/analyst/viewer)
- `has_role()` and `is_admin()` security definer functions
- Auto-assignment of 'viewer' role on signup
- Admin role management edge function (`admin-manage-users`)

### What's Missing
- **RLS enforcement**: Most tables don't use `has_role()` in their policies
- **Analyst restrictions**: No distinction between analyst and viewer in UI or RLS
- **Write-lane × RBAC intersection**: Constitutional write-lanes don't check roles
- **Role change auditing**: Role changes not logged to TerraTrace
- **UI gating**: No component-level role checks for write actions

### Sub-Phases

#### 84.1 — RLS Policy Hardening
**Complexity**: M

Add role-aware policies to critical write tables:

```sql
-- Assessments: only analyst+ can insert/update
CREATE POLICY "Analysts can write assessments"
  ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'analyst') OR public.has_role(auth.uid(), 'admin'));

-- Appeals: viewers can read, analyst+ can write
CREATE POLICY "Analysts can manage appeals"
  ON public.appeals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'analyst') OR public.has_role(auth.uid(), 'admin'));

-- Exemptions: same pattern
-- Calibration runs: admin only
-- Certification events: admin only
```

#### 84.2 — Role-Aware TerraPilot
**Complexity**: S

Update `terrapilot-router` to check user role before executing write tools:
- Viewers → read tools only, write tools return "Insufficient permissions"
- Analysts → read + write tools (with HitL confirmation)
- Admins → full access including certification and model runs

#### 84.3 — Frontend Role Context
**Complexity**: M

**New files:**
- `src/hooks/useUserRole.ts` — Fetches and caches user role
- `src/components/ui/role-gate.tsx` — Conditional rendering by role

```tsx
// Usage: <RoleGate minRole="analyst"><CertifyButton /></RoleGate>
function RoleGate({ minRole, children }: { minRole: AppRole; children: React.ReactNode }) {
  const { role } = useUserRole();
  const hierarchy = { viewer: 0, analyst: 1, admin: 2 };
  if (hierarchy[role] < hierarchy[minRole]) return null;
  return <>{children}</>;
}
```

#### 84.4 — Role Change Auditing
**Complexity**: S

Emit trace events when roles are changed via `admin-manage-users`:
```json
{
  "event_type": "role_changed",
  "source_module": "os",
  "event_data": {
    "target_user_id": "...",
    "old_role": "viewer",
    "new_role": "analyst",
    "changed_by": "admin_user_id"
  }
}
```

### Success Criteria
- [ ] Viewers cannot execute write operations (UI hidden + RLS blocked)
- [ ] Analysts can write within their domain but cannot certify
- [ ] Admins have full access including certification
- [ ] All role changes emit trace events with before/after
- [ ] TerraPilot respects role boundaries in tool availability

---

## Phase 82: Workflow Automation Templates

> **Goal**: Standardized, multi-step workflow templates for revaluation, appeal, and exemption processing  
> **Complexity**: M  
> **Dependencies**: Phase 81 (trace events for workflow steps)

### Sub-Phases

#### 82.1 — Workflow Template Schema
**Complexity**: S

```sql
CREATE TABLE public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid REFERENCES counties(id),
  name text NOT NULL,
  workflow_type text NOT NULL, -- 'revaluation', 'appeal_defense', 'exemption_review'
  steps jsonb NOT NULL DEFAULT '[]',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Steps schema: [{ step_id, title, description, required_role, auto_actions, depends_on }]
```

#### 82.2 — Workflow Engine Service
**Complexity**: M

- `src/services/workflowEngine.ts` — State machine for template execution
- Tracks step completion, auto-triggers TerraPilot tools at each milestone
- Emits TerraTrace events for every step transition

#### 82.3 — Workflow Template UI
**Complexity**: M

- Template browser/creator in Dais tab
- Active workflow progress tracker with step cards
- Auto-assignment of tasks at each workflow stage

### Success Criteria
- [ ] 3 built-in templates: Revaluation Cycle, Appeal Defense, Exemption Review
- [ ] Each template step can auto-trigger TerraPilot tools
- [ ] All step transitions emit trace events

---

## Phase 83: County Onboarding Wizard

> **Goal**: Guided 5-step setup flow for new county deployment  
> **Complexity**: M  
> **Dependencies**: Phase 84 (role assignment for first admin)

### Sub-Phases

#### 83.1 — Onboarding Flow UI
**Complexity**: M

5-step wizard:
1. **County Profile** — Name, FIPS code, state, config
2. **Data Sources** — Connect CAMA, GIS, recorder systems
3. **Initial Ingest** — Trigger first ArcGIS/scrape import
4. **User Setup** — Invite team, assign roles
5. **Validation** — Run DQ diagnosis, show readiness score

#### 83.2 — Onboarding Edge Function
**Complexity**: S

- `supabase/functions/county-onboard/index.ts`
- Creates county record, seeds default config, triggers initial ingest

### Success Criteria
- [ ] New county deployable in <10 minutes via wizard
- [ ] First admin auto-assigned
- [ ] Initial ingest triggered with progress tracking

---

## Phase 85: Notification & Alert System

> **Goal**: Real-time alerts for deadlines, blockers, and DQ regressions  
> **Complexity**: M  
> **Dependencies**: Phase 81 (subscribes to trace events)

### Sub-Phases

#### 85.1 — Notification Schema
**Complexity**: S

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid REFERENCES counties(id),
  user_id uuid NOT NULL,
  notification_type text NOT NULL, -- 'deadline', 'blocker', 'dq_alert', 'assignment'
  title text NOT NULL,
  body text,
  severity text DEFAULT 'info', -- 'info', 'warning', 'critical'
  read_at timestamptz,
  action_url text,
  created_at timestamptz DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

#### 85.2 — Notification Bell UI
**Complexity**: M

- Bell icon in OS shell with unread count badge
- Dropdown panel with notification cards
- Real-time updates via Supabase Realtime subscription

#### 85.3 — Alert Rules Engine
**Complexity**: M

- Trigger-based alerts: appeal deadline within 7 days, cert blocker detected
- DQ regression alerts when quality score drops below threshold
- Assignment notifications when tasks are assigned via TerraPilot

### Success Criteria
- [ ] Real-time notification delivery via Supabase Realtime
- [ ] Bell icon shows unread count
- [ ] Deadline alerts fire 7 days before appeal hearings
- [ ] DQ regression alerts when score drops >5%

---

## Phase 86: AVM Pipeline (Forge)

> **Goal**: Connect `avm_runs` to actual AI-powered model training  
> **Complexity**: L  
> **Dependencies**: Phase 84 (admin-only model execution)

### Sub-Phases

#### 86.1 — AVM Training Edge Function
**Complexity**: L

- `supabase/functions/avm-execute/index.ts`
- Fetches parcel features + sales data
- Calls Lovable AI to generate regression coefficients
- Stores results in `avm_runs` with metrics (R², RMSE, COD, PRD)
- Generates predictions for unsold parcels

#### 86.2 — AVM Results UI (Forge Tab)
**Complexity**: M

- Model run history with metric comparison
- Feature importance visualization (bar chart)
- Prediction scatter plot (predicted vs actual)
- "Apply to Assessments" action with HitL confirmation

### Success Criteria
- [ ] AI-powered regression model produces R² > 0.70 on test data
- [ ] Feature importance chart rendered in Forge tab
- [ ] Model predictions storable as draft assessments

---

## Phase 87: Income & Cost Approach UI

> **Goal**: Build Forge UI surfaces for existing cost_schedules and cost_approach_runs tables  
> **Complexity**: M  
> **Dependencies**: None (tables exist)

### Sub-Phases

#### 87.1 — Cost Schedule Manager
**Complexity**: M

- CRUD for cost schedules (base_cost_per_sqft by property_class × quality_grade)
- Depreciation table editor (age_from/to, depreciation_pct, condition_modifier)
- Preview: calculated RCN for a sample parcel

#### 87.2 — Cost Approach Runner
**Complexity**: M

- Execute cost approach for a neighborhood
- Shows: matched parcels, mean/median ratio, COD
- Compare cost vs. sales comparison results side-by-side

### Success Criteria
- [ ] Cost schedules editable with live RCN preview
- [ ] Cost approach run produces ratio statistics
- [ ] Side-by-side comparison with sales comparison approach

---

## Phase 88: GeoEquity Mapping (Atlas)

> **Goal**: Spatial equity analysis with choropleth maps  
> **Complexity**: M  
> **Dependencies**: Phase 81 (trace spatial operations)

### Sub-Phases

#### 88.1 — Ratio Choropleth Layer
**Complexity**: M

- Color parcels by assessment ratio (sale_price / assessed_value)
- IAAO-aligned color scale: green (0.95-1.05), yellow (0.85-0.95, 1.05-1.15), red (outliers)
- Neighborhood boundary overlays with aggregate COD

#### 88.2 — Equity Analysis Panel
**Complexity**: M

- PRD (price-related differential) by neighborhood
- Vertical equity analysis: ratio by value tier
- Export equity report as PDF

### Success Criteria
- [ ] Parcels color-coded by ratio on Leaflet map
- [ ] Neighborhood COD overlay with clickable stats
- [ ] Vertical equity chart by value quintile

---

## Phase 89: IAAO Reporting Engine

> **Goal**: State compliance reporting with IAAO standard metrics  
> **Complexity**: M  
> **Dependencies**: Phase 86 (AVM metrics), Phase 88 (equity data)

### Sub-Phases

#### 89.1 — Ratio Study Report Generator
**Complexity**: M

- Compute: median ratio, COD, PRD, PRB for each neighborhood
- Generate summary table with pass/fail against IAAO standards
- COD < 15% (residential), PRD 0.98-1.03, PRB ±0.05

#### 89.2 — PDF Export Engine
**Complexity**: M

- Generate formatted PDF with executive summary, metrics tables, charts
- Include neighborhood-level breakdowns
- Digital signature placeholder for assessor certification

### Success Criteria
- [ ] Ratio study with IAAO-standard metrics for all neighborhoods
- [ ] PDF export with charts and tables
- [ ] Pass/fail indicators against IAAO benchmarks

---

## Implementation Order & Parallelism Matrix

```
WEEK 1 (Parallel Track A + B):
  ┌─────────────────────┐  ┌─────────────────────┐
  │ 81.1 Hash-Chain DB  │  │ 82.1 Workflow Schema│
  │ 81.2 Verify Func    │  │ 82.2 Workflow Engine│
  └─────────┬───────────┘  └─────────────────────┘
            │
WEEK 2 (Sequential 81 → Parallel 83+85):
  ┌─────────▼───────────┐  ┌─────────────────────┐
  │ 81.3 Audit UI       │  │ 83.1 Onboarding UI  │
  │ 81.4 Swarm Trace    │  │ 85.1 Notification DB│
  └─────────┬───────────┘  └─────────────────────┘
            │
WEEK 3 (84 RBAC — depends on 81):
  ┌─────────▼───────────┐  ┌─────────────────────┐
  │ 84.1 RLS Policies   │  │ 85.2 Bell UI        │
  │ 84.2 Pilot Role Chk │  │ 85.3 Alert Rules    │
  └─────────┬───────────┘  └─────────────────────┘
            │
WEEK 4 (84 + 82 completion):
  ┌─────────▼───────────┐  ┌─────────────────────┐
  │ 84.3 Frontend Gates │  │ 82.3 Template UI    │
  │ 84.4 Role Auditing  │  │ 83.2 Onboard Func   │
  └─────────────────────┘  └─────────────────────┘

WEEK 5-6 (Domain Expansion — all parallel):
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Phase 86 │  │ Phase 87 │  │ Phase 88 │  │ Phase 89 │
  │ AVM Pipe │  │ Cost UI  │  │ GeoEquity│  │ IAAO Rpt │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## Cost Analysis (AI Calls)

| Phase | AI Calls per User Action | Notes |
|-------|--------------------------|-------|
| 81 TerraTrace | 0 | Pure DB + UI |
| 82 Workflows | 1 (template AI suggestions) | Optional AI |
| 83 Onboarding | 0 | Pure wizard flow |
| 84 RBAC | 0 | Pure RLS + UI |
| 85 Notifications | 0 | Trigger-based |
| 86 AVM | 1-2 (model training) | Lovable AI for regression |
| 87 Cost/Income | 0 | Pure calculation |
| 88 GeoEquity | 0 | Pure spatial + math |
| 89 IAAO Reports | 1 (PDF narrative) | AI for executive summary |

---

## Risk Assessment

| Risk | Phase | Mitigation |
|------|-------|-----------|
| Hash-chain performance on large counties | 81 | Index on (county_id, sequence_number), partition by county |
| RLS policy conflicts with existing policies | 84 | Audit existing policies first, use OR logic |
| Workflow engine complexity creep | 82 | Cap at 3 built-in templates, defer custom builder |
| AVM accuracy on sparse data | 86 | Minimum 30 qualified sales requirement, fallback to cost |
| PDF generation in edge function timeout | 89 | Use chunked generation, cache intermediate results |

---

## Constitutional Compliance Checklist

- [x] All phases emit TerraTrace events for write operations
- [x] Write-Lane Matrix respected: no cross-domain writes
- [x] RBAC enforced at RLS level (not just UI)
- [x] HitL confirmation preserved for high-impact actions
- [x] Swarm sub-agent provenance tagged on all trace events
- [x] Append-only audit tables protected by PostgreSQL triggers
- [x] No secrets in client code — all AI calls through edge functions

---

*"I looked at the execution plan. It has more parallelism than my lunch. My lunch was a sandwich AND an apple. At the same time. I'm a one-man swarm." — Ralph, Program Director*

**READY FOR EXECUTION. Begin with Phase 81.1: Hash-Chain Schema Extension.**

# Phases 98–103: TerraFusion OS — Multi-Agent Parallel Execution Plan
> **Codex**: TerraFusion OS Phases 98–103  
> **Status**: 🟡 READY FOR EXECUTION  
> **Created**: 2026-03-21  
> **Architect**: GitHub Copilot + Solo Founder  
> **Ralph Says**: "I audited ninety-seven phases. Turns out most of them were already done. Even the ones I hadn't done yet. I'm a temporal paradox now."

---

## Ground Truth Audit (2026-03-21)

Before planning new work, we performed a full codebase audit using parallel subagents.

### Discovery: Phases 22–97 Status

| Range | Status | Evidence |
|-------|--------|----------|
| 22–66 | ✅ COMPLETE | Tracked in progress.md, all deliverables verified |
| 67–70 | 📋 PLANNED | SLCo sprint — hooks exist, formal execution pending |
| 71–79 | ❓ GAP | Renumbered / absorbed into later phases |
| 80 | ✅ COMPLETE | TerraPilot Swarm (referenced as existing by Phase 81 plan) |
| 81–89 | ✅ BUILT (UNTRACKED) | All hooks, services, UI components exist — never recorded in progress.md |
| 90–91 | ✅ BUILT | PACS Delta + Alert Engine (hooks + edge functions) |
| 92–97 | ✅ FULLY WIRED | Subagent audit proved ALL wiring done (not just code-complete) |

### Phase 92–97 Wiring Evidence

| Phase | Claimed "Missing" | Actual State | Verdict |
|-------|-------------------|--------------|---------|
| 92 Sketch→Workbench | "sketch not in SuiteTab" | `SuiteTab` has `"sketch"`, `TAB_COMPONENTS` has `SketchTab` | ✅ DONE |
| 93 Smart Views | "No saved_views table" | Migration pushed, `SavedFiltersPanel` has full CRUD+preview+pin+alert+share | ✅ DONE |
| 94 AxiomFS Storage | "sampleFiles hardcoded" | `sampleFiles = []`, `useAxiomFS` hook imported and wired | ✅ DONE |
| 95 TerraPilot Tools | "6 tools not in TOOL_AGENT_MAP" | All 26 tools registered including all 6 Phase 95 additions | ✅ DONE |
| 96 Multi-County | "No second county" | Yakima migration pushed, `CountySwitcher` has multi-tenant dropdown | ✅ DONE |
| 97 Owner Portal | "Direct supabase calls in page" | Zero `supabase.from()` calls — all via hooks | ✅ DONE |

### Build Health Baseline

```
TypeScript:  0 errors (npx tsc --noEmit)
Vitest:      106/106 passed, 6 test files
Migrations:  147 pushed to Supabase (udjoodlluygvlqccwade)
Edge Funcs:  32 functions + _shared
Hooks:       130+ hooks in src/hooks/
Components:  50+ lazy-loaded views across 4 modules
```

### Operational Seed Status (in-progress)

| Dataset | Status | Rows |
|---------|--------|------|
| Parcels | ✅ Complete | 84,905 |
| Assessments (2026) | ✅ Complete | 84,905 |
| Assessments (historical) | ✅ Complete | 162,264 |
| Sales | 🔄 60% | ~124,400 / 205,864 |
| GIS Features | ❌ Blocked | fiona GDB reader error |

---

## Architecture: The Parallel Execution Topology

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    PHASES 98–103 DEPENDENCY GRAPH                           │
│                                                                              │
│  WAVE 0: OPERATIONAL FOUNDATION (parallel, no code changes needed)          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │ 98.A         │  │ 98.B         │  │ 98.C         │                       │
│  │ Edge Func    │  │ GIS Seed     │  │ Progress.md  │                       │
│  │ Deploy       │  │ Fix+Run      │  │ Backfill     │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
│         │                 │                  │                                │
│  WAVE 1: VALIDATION SPRINT (parallel, read-only audit + gap-fill)           │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐                       │
│  │ Phase 99     │  │ Phase 100    │  │ Phase 101    │                       │
│  │ E2E Smoke    │  │ 81–89 Audit  │  │ 67–70 Triage │                       │
│  │ Tests        │  │ & Gap-Fill   │  │              │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
│         │                 │                  │                                │
│  WAVE 2: HARDENING (sequential — based on audit findings)                   │
│         └────────────────┬┘────────────────┘                                │
│                    ┌─────▼──────┐                                            │
│                    │ Phase 102  │                                            │
│                    │ Production │                                            │
│                    │ Hardening  │                                            │
│                    └─────┬──────┘                                            │
│                          │                                                   │
│  WAVE 3: LAUNCH SURFACE (depends on 102 stability)                          │
│                    ┌─────▼──────┐                                            │
│                    │ Phase 103  │                                            │
│                    │ Demo       │                                            │
│                    │ Readiness  │                                            │
│                    └────────────┘                                            │
│                                                                              │
│  AGENT ASSIGNMENTS:                                                          │
│  • 98.A → execution_subagent (terminal ops only)                            │
│  • 98.B → tf-writer (fiona fix) + execution_subagent (seed run)             │
│  • 98.C → tf-writer (docs only)                                            │
│  • 99   → integrator + Explore (parallel test + audit)                      │
│  • 100  → tf-proof-audit (read-only audit) → tf-writer (gap-fill)          │
│  • 101  → Explore (triage) → tf-checkpoint (close-or-defer)                │
│  • 102  → tf-phase-orchestrator (full phase lifecycle)                      │
│  • 103  → tf-writer (demo surface) + integrator (final gate)               │
│                                                                              │
│  PARALLELISM WINDOWS:                                                        │
│  • 98.A + 98.B + 98.C — full parallel (zero shared files)                   │
│  • 99 + 100 + 101 — full parallel (all read-first, then targeted writes)    │
│  • 102 — sequential gate (must know all gaps from Wave 1)                   │
│  • 103 — sequential gate (must pass 102 stability)                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## WAVE 0: OPERATIONAL FOUNDATION

> Unblock the system — no feature code, pure ops and documentation.

---

### Phase 98: Operational Activation & Bookkeeping

> **Goal**: Deploy all edge functions, fix GIS seed, backfill progress.md for Phases 67–97  
> **Complexity**: M  
> **Dependencies**: None (runs first)

#### 98.A — Edge Function Deployment
**Agent**: `execution_subagent`  
**Scope**: Terminal only (zero code changes)

```powershell
# Deploy all 32 edge functions to udjoodlluygvlqccwade
npx supabase functions deploy --project-ref udjoodlluygvlqccwade 2>&1

# Verify deployment
npx supabase functions list --project-ref udjoodlluygvlqccwade 2>&1
```

**Acceptance Criteria:**
- [ ] All 32 edge functions deployed
- [ ] `terrapilot-router` responds to health check
- [ ] `owner-portal-lookup` responds to test query
- [ ] `notification-alerts` responds to invoke

#### 98.B — GIS Seed Fix & Execution
**Agent**: `tf-writer` (fix script) + `execution_subagent` (run)  
**Scope**: `scripts/seed_benton_gis.py` only

**Problem**: fiona module error when reading Benton_County_Assessor.gdb  
**Fix Strategy**:
1. Diagnose: is fiona installed? Is GDAL_DATA set?
2. If fiona unavailable: convert GDB→GeoJSON via ogr2ogr, then ingest
3. If ogr2ogr unavailable: use pyogrio (already installed) as fiona replacement
4. Target: 72,513 GIS features seeded to `gis_features` table

**Acceptance Criteria:**
- [ ] GIS seed script runs without error
- [ ] ≥70,000 features inserted into `gis_features`
- [ ] Features have valid geometry (EPSG:4326 after reprojection from 2927)

#### 98.C — Progress.md Backfill
**Agent**: `tf-writer`  
**Scope**: `docs/progress.md` only

Update progress.md with completion records for all untracked phases:
- Phases 67–70: Mark status based on code evidence (hooks exist → likely complete)
- Phases 71–79: Document as "absorbed into 80–89 renumbering"
- Phases 80–91: Mark COMPLETE with evidence references
- Phases 92–97: Mark COMPLETE with wiring evidence from subagent audit

**Acceptance Criteria:**
- [ ] Every phase 22–97 has a status entry in progress.md
- [ ] No "phantom gaps" — all ranges accounted for

---

## WAVE 1: VALIDATION SPRINT

> Three parallel audit tracks. Each produces a gap report + targeted fixes.

---

### Phase 99: End-to-End Smoke Test Suite

> **Goal**: Write minimal smoke tests verifying all major UI paths render without crash  
> **Agent**: `integrator` (test execution) + `tf-writer` (test creation)  
> **Complexity**: M  
> **Dependencies**: Phase 98.A (edge functions must be deployed for integration tests)

#### 99.1 — Component Render Smoke Tests
**File**: `src/test/smoke.test.tsx`

```typescript
// For each of the 45+ lazy-loaded views in AppLayout:
// 1. Import the component
// 2. Render with minimal required props/context
// 3. Assert it doesn't throw
// Priority: Test the 4 module defaults first (SuiteHub, PropertyWorkbench, FactoryLayout, TrustRegistryPage)
```

#### 99.2 — Hook Data Contract Tests
**File**: `src/test/hooks-contract.test.ts`

```typescript
// For critical hooks (useAxiomFS, useSavedFilters, useOwnerPortal, usePACSDelta, useRunAlerts):
// 1. Verify export shape (functions + types)
// 2. Verify query key conventions
// 3. Verify error handling exists
```

#### 99.3 — Write-Lane Integrity Audit
**File**: `src/test/write-lane-audit.test.ts`

```typescript
// For each tool in TOOL_AGENT_MAP:
// 1. Verify TOOL_WRITE_LANE has a matching entry
// 2. Verify the lane matches the agent's constitutional write permissions
// 3. Flag any mismatches
```

**Acceptance Criteria:**
- [ ] Smoke tests cover all 4 module defaults + 10 high-priority views
- [ ] Hook contract tests verify 10 critical hooks
- [ ] Write-lane audit flags zero mismatches
- [ ] All tests pass in CI

---

### Phase 100: Phases 81–89 Audit & Gap-Fill

> **Goal**: Determine which of the "built but untracked" phases are truly complete vs. have gaps  
> **Agent**: `tf-proof-audit` (read-only first pass) → `Explore` (evidence gathering) → `tf-writer` (gap-fill)  
> **Complexity**: L  
> **Dependencies**: None (parallel with 99 and 101)

#### Audit Matrix

| Phase | Component | Hook | Migration | UI Wired | Edge Func | Audit Task |
|-------|-----------|------|-----------|----------|-----------|------------|
| 81 | AuditTimeline | useTraceEvents, useTraceChainVerification | trace_events (hash columns?) | registry:audit-chain | n/a | Verify hash-chain columns exist in DB |
| 82 | WorkflowTemplates? | useWorkflowTemplates, workflowEngine.ts | workflow_templates? | ? | n/a | Verify table exists, UI route exists |
| 83 | OnboardingWizard | useBentonBootstrap, useOnboardingStatus | county records | home:onboarding? | county-setup | Verify bootstrap flow works with Benton data |
| 84 | RoleGate? | useUserRole | RBAC policies (pushed) | UI gating | admin-manage-users | Verify RLS policies active in prod DB |
| 85 | NotificationCenter | useDBNotifications, useRealtimeNotifications | notifications (pushed) | home:activity | notification-alerts | Verify realtime subscription works |
| 86 | AVMStudioDashboard | useAvmPipeline, useAVMRuns | avm_runs | factory:avm | avm-train | Verify AVM UI renders with real data |
| 87 | CostApproach UI | useCostApproach, useCostSchedule, useIncomeApproach | cost_schedules | factory:calibration (CostMode) | n/a | Verify cost tabs render |
| 88 | GeoEquityDashboard | useEquityMapData, useEquityOverlays | n/a | factory:geoequity | n/a | Verify map renders with Benton parcels |
| 89 | IAAOComplianceDashboard | useIAAOCompliance, useRatioStudy | n/a | factory:iaao-compliance | n/a | Verify ratio study computes with real sales |

#### 100.1 — Database Schema Verification
**Agent**: `Explore` (read migration files)

For each phase, verify the expected tables/columns exist by reading migrations:
- Phase 81: `event_hash`, `prev_hash`, `sequence_number` on `trace_events`
- Phase 82: `workflow_templates` table
- Phase 84: RLS policies on assessments, appeals, exemptions
- Phase 85: `notifications` table with realtime enabled

#### 100.2 — UI Route Verification
**Agent**: `Explore` (read IA_MAP + AppLayout)

For each phase, verify a view ID exists and is reachable:
- Phase 82: Is there a `workflows` view? (check IA_MAP)
- Phase 83: Is there an `onboarding` view?
- Phase 86: `avm` view exists ✅ (factory module)
- Phase 88: `geoequity` view exists ✅ (factory module)
- Phase 89: `iaao-compliance` view exists ✅ (factory module)

#### 100.3 — Gap-Fill (conditional)
**Agent**: `tf-writer`

Fix any gaps discovered in 100.1-100.2. Expected scope:
- Missing IA_MAP view entries → add to IA_MAP.ts
- Missing AppLayout case statements → add lazy imports + cases
- Missing DB columns → new migration file

**Acceptance Criteria:**
- [ ] Audit report produced for all 9 phases (81–89)
- [ ] All discovered gaps fixed (≤10 files modified)
- [ ] Every phase has: hook ✅, component ✅, route ✅, DB schema ✅

---

### Phase 101: Phases 67–70 Triage

> **Goal**: Determine which SLCo final-sprint phases are de facto complete via existing code  
> **Agent**: `Explore` (evidence gathering) → `tf-checkpoint` (close or defer)  
> **Complexity**: S  
> **Dependencies**: None (parallel with 99 and 100)

#### Triage Matrix

| Phase | Plan Says | Existing Code Evidence | Verdict |
|-------|-----------|----------------------|---------|
| 67 Automated Demo Seeding | "Golden Dataset" for SLCo demos | `useSyntheticSales`, `seed_benton_pacs.py`, `seed_benton_gis.py` | Likely SUPERSEDED by Benton seed work |
| 68 Spatial Ratio Insights | Heatmaps for ratio disparities | `useRatioStudy`, `useEquityMapData`, `useEquityOverlays`, `GeoEquityDashboard` | Likely COMPLETE |
| 69 Write-Lane Enforcement | Dry-run mode, atomic rollback | `writeLane.ts` (12 tests passing), `write_lane_violations` table | Likely COMPLETE |
| 70 Final Roll Readiness | Notice generator, roll lock | `useRollReadiness`, `useCertificationPipeline`, `useRollExport`, `BatchNoticeDashboard` | Likely COMPLETE |

#### Action

For each phase:
1. `Explore` subagent reads the hook + component + migration evidence
2. If ≥90% of acceptance criteria met → `tf-checkpoint` closes as COMPLETE
3. If gaps exist → document as DEFERRED with specific gap list

**Acceptance Criteria:**
- [ ] Each of phases 67–70 has a disposition: COMPLETE, SUPERSEDED, or DEFERRED
- [ ] Any DEFERRED phases have a specific gap list (≤5 items each)

---

## WAVE 2: HARDENING

> Sequential — depends on all Wave 1 findings.

---

### Phase 102: Production Hardening

> **Goal**: Address all gaps from Wave 1, harden for production demo  
> **Agent**: `tf-phase-orchestrator` (full lifecycle) → `tf-writer` (implementation)  
> **Complexity**: L  
> **Dependencies**: Phases 99, 100, 101 (all audits complete)

#### 102.1 — Fix All Wave 1 Findings
**Scope**: Variable — depends on audit results  
**Expected categories**:
- Missing DB columns/tables (new migration)
- Missing UI routes (IA_MAP + AppLayout wiring)
- Failing smoke tests (component fixes)
- Write-lane mismatches (router config fixes)

#### 102.2 — Error Boundary Coverage
**Scope**: `src/components/ErrorBoundary.tsx` + critical paths

- Ensure all 4 module default views have error boundaries
- Ensure PropertyWorkbench tab switches don't crash on missing data
- Ensure SketchModule gracefully handles no-GPS scenario

#### 102.3 — Performance Audit
**Agent**: `integrator`

```bash
# Build + analyze bundle size
npx vite build 2>&1
# Target: <2MB initial bundle, <500KB per lazy chunk
```

#### 102.4 — Security Scan
**Agent**: `execution_subagent`

```bash
npm audit 2>&1
# Fix any high/critical vulnerabilities
```

**Acceptance Criteria:**
- [ ] All Wave 1 gaps fixed
- [ ] 0 TypeScript errors
- [ ] All Vitest tests passing
- [ ] No critical npm audit findings
- [ ] Bundle size within targets

---

## WAVE 3: LAUNCH SURFACE

> The demo-ready deliverable.

---

### Phase 103: Benton County Demo Readiness

> **Goal**: End-to-end Benton County demo flow — from login to parcel assessment to sketch to appeal  
> **Agent**: `tf-writer` (demo polish) + `integrator` (final gate)  
> **Complexity**: M  
> **Dependencies**: Phase 102 (all hardening complete)

#### 103.1 — Demo Flow Verification
**Agent**: Manual (or `Explore` subagent for code paths)

```
DEMO SCRIPT (6 steps, verifiable):
1. Login → SuiteHub dashboard shows Benton County stats
2. Search parcel "10012100100001" → PropertyWorkbench loads
3. Click Sketch tab → SketchModule renders measurement tools
4. Click Forge tab → Valuation data shows assessed value
5. Click Atlas tab → GIS map renders parcel boundary
6. Navigate to /portal → Owner Portal search finds parcel
```

#### 103.2 — Demo Data Verification
**Agent**: `execution_subagent`

```powershell
# Verify row counts via REST API
$headers = @{ "apikey" = $env:SUPABASE_ANON_KEY; "Authorization" = "Bearer $env:SUPABASE_ANON_KEY" }
# Counties: expect 2 (Benton + Yakima)
# Parcels: expect ~84,905
# Assessments: expect ~247,169
# Sales: expect ~205,864
# GIS Features: expect ~72,513
```

#### 103.3 — README Update
**Agent**: `tf-writer`  
**Scope**: `README.md`

Update with:
- Current feature inventory (130+ hooks, 50+ views, 32 edge functions)
- Demo flow instructions
- Architecture diagram (4-module hub pattern)
- Benton County data summary

**Acceptance Criteria:**
- [ ] All 6 demo steps execute without error
- [ ] Data counts verified via REST API
- [ ] README reflects current state
- [ ] Screenshot-round gates applicable (if UI review requested)

---

## Multi-Agent Orchestration Protocol

### Parallel Execution Windows

```
TIME ──────────────────────────────────────────────────────────────►

WINDOW 0 (Ops):
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ execution_sub   │  │ tf-writer       │  │ tf-writer       │
  │ 98.A: Deploy    │  │ 98.B: GIS Fix   │  │ 98.C: Docs      │
  │ Edge Functions  │  │ + Seed          │  │ Progress.md     │
  └─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘
            ▼                    ▼                    ▼
            
WINDOW 1 (Audit — 3-way parallel):
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ integrator      │  │ tf-proof-audit  │  │ Explore         │
  │ 99: Smoke Tests │  │ 100: 81-89 Audit│  │ 101: 67-70      │
  │ + Write-Lane    │  │ + Explore       │  │ Triage          │
  └─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘
            ▼                    ▼                    ▼
            └────────────────────┼────────────────────┘
                                 ▼
WINDOW 2 (Fix — sequential):
  ┌──────────────────────────────────────────────────────────────┐
  │ tf-phase-orchestrator → tf-writer → integrator              │
  │ 102: Production Hardening (fix all gaps from W0+W1)         │
  └──────────────────────────────────────┬───────────────────────┘
                                         ▼
WINDOW 3 (Launch — sequential):
  ┌──────────────────────────────────────────────────────────────┐
  │ tf-writer → integrator                                      │
  │ 103: Demo Readiness (end-to-end Benton verification)        │
  └──────────────────────────────────────────────────────────────┘
```

### Subagent Invocation Matrix

| Phase | Step | Agent | Mode | Parallel? |
|-------|------|-------|------|-----------|
| 98.A | Deploy edge funcs | `execution_subagent` | Execute | ✅ Yes (with 98.B, 98.C) |
| 98.B | Fix GIS seed | `tf-writer` then `execution_subagent` | Write+Execute | ✅ Yes (with 98.A, 98.C) |
| 98.C | Backfill docs | `tf-writer` | Write | ✅ Yes (with 98.A, 98.B) |
| 99.1 | Smoke tests | `tf-writer` | Write | ✅ Yes (with 100, 101) |
| 99.2 | Hook contracts | `tf-writer` | Write | ✅ Yes (with 100, 101) |
| 99.3 | Write-lane audit | `integrator` | Test | ✅ Yes (with 100, 101) |
| 100.1 | Schema verify | `Explore` | Read-only | ✅ Yes (with 99, 101) |
| 100.2 | Route verify | `Explore` | Read-only | ✅ Yes (with 99, 101) |
| 100.3 | Gap-fill | `tf-writer` | Write | ❌ Sequential (after 100.1-2) |
| 101 | Triage 67-70 | `Explore` → `tf-checkpoint` | Read → Close | ✅ Yes (with 99, 100) |
| 102 | Hardening | `tf-phase-orchestrator` | Full lifecycle | ❌ Sequential (after Wave 1) |
| 103 | Demo ready | `tf-writer` + `integrator` | Write+Test | ❌ Sequential (after 102) |

### Agent Capability Map

```
┌────────────────────┬──────────────────────────────────────────────┐
│ Agent              │ Capabilities                                 │
├────────────────────┼──────────────────────────────────────────────┤
│ execution_subagent │ Terminal commands, deploy, seed, npm ops     │
│ Explore            │ Read-only codebase search, file analysis     │
│ integrator         │ Vitest execution, regression checking        │
│ tf-writer          │ Source code, test, config modifications      │
│ tf-proof-audit     │ Read-only proof wall, gap identification     │
│ tf-checkpoint      │ Phase closure, progress recording            │
│ tf-phase-orch.     │ Full phase lifecycle orchestration           │
│ tf-contract-truth  │ Backend route/DTO truth establishment        │
│ forge-stats        │ IAAO ratio study patterns                    │
│ forge-outliers     │ Outlier detection patterns                   │
│ forge-compare      │ Model comparison surfaces                    │
└────────────────────┴──────────────────────────────────────────────┘
```

---

## Agent Assignment Matrix (Cost Estimate)

| Phase | Agent(s) | Files Created | Files Modified | Estimated Effort |
|-------|----------|---------------|----------------|-----------------|
| 98.A | execution_subagent | 0 | 0 | S (15 min) |
| 98.B | tf-writer + execution | 0 | 1 (GIS script) | M (45 min) |
| 98.C | tf-writer | 0 | 1 (progress.md) | S (20 min) |
| 99 | tf-writer + integrator | 3 (test files) | 0 | M (60 min) |
| 100 | Explore + tf-writer | 0–2 (migrations?) | 0–5 (route fixes?) | L (90 min) |
| 101 | Explore + tf-checkpoint | 0 | 1 (progress.md) | S (30 min) |
| 102 | tf-phase-orchestrator | TBD | TBD (Wave 1 findings) | L (120 min) |
| 103 | tf-writer + integrator | 0 | 1 (README) | M (60 min) |

**Total estimated scope**: ~7 hours across 4 execution windows  
**Maximum parallelism**: 3-way in Windows 0 and 1

---

## Operational Prerequisites

```powershell
# Must be true before execution begins:

# 1. Sales seed complete (currently ~60% — ETA ~1 hour)
#    Terminal: aa071a76-fa25-4d7b-a5dc-26844ea84a7b

# 2. Supabase CLI authenticated
npx supabase projects list 2>&1

# 3. Node.js + Python available
node --version  # v24.6.0
py -3.12 --version  # Python 3.12

# 4. All migrations pushed (147 confirmed)
npx supabase db push --project-ref udjoodlluygvlqccwade 2>&1
```

---

## Risk Assessment

| Risk | Phase | Mitigation |
|------|-------|-----------|
| GIS seed fiona error unresolvable | 98.B | Fall back to ogr2ogr or pyogrio |
| Edge function deploy fails (secrets?) | 98.A | Deploy individually with `--env-file` |
| 81–89 audit reveals major gaps | 100 | Budget 90 min for gap-fill in Phase 102 |
| Bundle size regression | 102.3 | Already using lazy loading + vendor chunks |
| Demo data incomplete (sales still loading) | 103 | Sales seed completes before Wave 2 starts |

---

## Success Criteria (End of Phase 103)

```
✅ 32 edge functions deployed and responding
✅ 84,905+ parcels, 247,169+ assessments, 205,864+ sales, 72,513+ GIS features seeded
✅ All phases 22–103 tracked in progress.md (zero phantom gaps)
✅ 0 TypeScript errors, 106+ Vitest tests passing
✅ All 45+ lazy-loaded views render without crash
✅ End-to-end demo flow verified (6-step script)
✅ README reflects current architecture
✅ No critical npm audit findings
✅ Bundle size <2MB initial load
```

---

*"I planned ninety-seven phases. Then I discovered they were all done. So I planned six more. The circle of life. Except it's a dependency graph." — Ralph, Program Director*

**READY FOR EXECUTION. Begin with Phase 98 (Wave 0): 3-way parallel operational activation.**

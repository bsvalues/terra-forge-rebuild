# Phases 104–129: TerraFusion OS — Advanced Feature Activation Plan
> **Codex**: TerraFusion OS Phases 104–129  
> **Status**: 🟡 READY FOR EXECUTION  
> **Created**: 2026-03-21  
> **Architect**: GitHub Copilot (Claude Opus 4.6) + Solo Founder  
> **Prerequisite**: Phases 22–103 COMPLETE (144/144 tests, 0 TS errors, 32 edge functions deployed)

---

## Ground Truth Audit (2026-03-21)

Before planning new work, we performed a deep subagent audit of all 20 component stubs (phases 104–129, with gaps at 106–108, 110, 117).

### Infrastructure Baseline

| Category | Total Needed | Already Exists | Missing | % Ready |
|----------|-------------|----------------|---------|---------|
| **DB Tables** | 10 | 9 | 1 (`owner_communications`) | 90% |
| **React Hooks** | 12 | 10 | 2 (`usePermitImpact`, `useWorkbench`) | 83% |
| **Edge Functions** | 5 | 1 (`appeal-risk-scorer`) | 4 | 20% |
| **IA_MAP Views** | 4 modules | 4 | 0 | 100% |
| **Components** | 20 | 20 (2 complete, 18 partial) | 0 | 100% |

### Already Complete (No Work Needed)

| Phase | Component | Verdict |
|-------|-----------|---------|
| **118** | DefensePacketPrint | ✅ COMPLETE — pure render function, props-driven, no infra needed |
| **128** | ValuationConfidenceVisualizer | ✅ COMPLETE — fully wired via `useWorkbench` + `useComparableSales` |

### Suite Distribution

| Suite | Count | Phases |
|-------|-------|--------|
| TerraDais | 10 | 111, 114–116, 119–121, 123–125, 127 |
| TerraForge | 5 | 104–105, 113, 122, 129 |
| TerraAtlas | 2 | 109, 126 |
| TerraDossier | 1 | 118 (already complete) |
| OS Core | 2 | 112, 120 |

---

## Architecture: Multi-Agent Parallel Execution Topology

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    PHASES 104–129 DEPENDENCY GRAPH                               │
│                                                                                  │
│  WAVE 0: ZERO-INFRA QUICK WINS (parallel — no tables, no edge funcs)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Phase 104    │  │ Phase 105    │  │ Phase 112    │  │ Phase 122    │         │
│  │ Parcel       │  │ Value Change │  │ Watchlist    │  │ Comparative  │         │
│  │ Compare      │  │ Explainer    │  │ Panel        │  │ Snapshot     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐                                              │
│  │ Phase 126    │  │ Phase 129    │  ← All use existing hooks/tables             │
│  │ Valuation    │  │ Equity       │                                              │
│  │ Heatmap      │  │ Matrix       │                                              │
│  └──────┬───────┘  └──────┬───────┘                                              │
│         │                 │                                                       │
│  WAVE 1: HOOK + UI WIRING (parallel — new hooks, existing tables)               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Phase 109    │  │ Phase 111    │  │ Phase 113    │  │ Phase 116    │         │
│  │ Heatmap      │  │ Cert Ready   │  │ Batch Adj    │  │ DQ Progress  │         │
│  │ Legend       │  │ Widget       │  │ Review       │  │ Tracker      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐                                                                │
│  │ Phase 124    │  ← CSV export logic, queries existing tables                   │
│  │ Batch Export │                                                                │
│  └──────┬───────┘                                                                │
│         │                                                                        │
│  WAVE 2: EDGE FUNCTION + MIGRATION TIER (sequential — new infra)                │
│  ┌──────▼───────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Phase 114    │  │ Phase 115    │  │ Phase 119    │  │ Phase 123    │         │
│  │ Appeal Risk  │  │ Exemption    │  │ Workflow     │  │ Permit       │         │
│  │ Dashboard    │  │ Eligibility  │  │ SLA Tracker  │  │ Impact       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                                  │
│  WAVE 3: CROSS-SUITE ORCHESTRATION (depends on Wave 2 tables)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                           │
│  │ Phase 120    │  │ Phase 121    │  │ Phase 125    │                           │
│  │ Parcel       │  │ Nbhd Cert   │  │ Appeal       │                           │
│  │ Timeline     │  │ Workflow     │  │ Predictor    │                           │
│  └──────────────┘  └──────────────┘  └──────────────┘                           │
│                                                                                  │
│  WAVE 4: COMMUNICATIONS + FINAL (depends on Wave 3)                             │
│  ┌──────────────┐                                                                │
│  │ Phase 127    │  ← Needs new `owner_communications` table + migration          │
│  │ Owner Comms  │                                                                │
│  │ Log          │                                                                │
│  └──────────────┘                                                                │
│                                                                                  │
│  AGENT ASSIGNMENTS:                                                              │
│  • Wave 0 → tf-writer (6 components, pure UI wiring, full parallel)             │
│  • Wave 1 → tf-writer (5 components, hook creation + UI, full parallel)         │
│  • Wave 2 → tf-phase-orchestrator → tf-writer (4 phases, sequential gates)      │
│  • Wave 3 → tf-phase-orchestrator → tf-writer (3 phases, cross-suite deps)      │
│  • Wave 4 → tf-writer + execution_subagent (migration + hook + UI)              │
│                                                                                  │
│  PARALLELISM WINDOWS:                                                            │
│  • Wave 0: ALL 6 phases parallel (zero shared files, existing infra only)        │
│  • Wave 1: ALL 5 phases parallel (new hooks, but distinct table domains)         │
│  • Wave 2: 2 parallel pairs — (114+119) then (115+123) — shared table domain    │
│  • Wave 3: Sequential — 120 → 121 → 125 (each depends on prior's table shape)  │
│  • Wave 4: Sequential (migration must land first, then hook, then UI)            │
│                                                                                  │
│  TOTAL: 18 phases to implement (2 already complete: 118, 128)                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## WAVE 0: ZERO-INFRA QUICK WINS

> **Goal**: Activate 6 components that only need UI polish + existing hook wiring  
> **Parallelism**: ALL 6 run simultaneously — zero shared files  
> **Agent**: `tf-writer` (6 parallel invocations)  
> **Estimated effort**: 1 session

---

### Phase 104 — Parcel Comparison View

| Field | Value |
|-------|-------|
| **Component** | `src/components/workbench/ParcelComparisonView.tsx` |
| **Suite** | TerraForge (Workbench) |
| **Complexity** | **M** |
| **Existing Infra** | `useParcel360` hook, `parcels` table, `assessments` table |
| **Missing** | None — all data layers exist |
| **Scope** | Wire side-by-side comparison with delta highlighting, ratio display |

**Acceptance Criteria:**
- [ ] Two-parcel selector (search or recent parcels)
- [ ] Side-by-side assessment values (land, improvement, total)
- [ ] Delta column with percentage change highlighting
- [ ] Characteristic comparison (sqft, year built, bedrooms, etc.)
- [ ] TerraTrace event on comparison action

---

### Phase 105 — Value Change Explainer

| Field | Value |
|-------|-------|
| **Component** | `src/components/workbench/ValueChangeExplainer.tsx` |
| **Suite** | TerraForge (Workbench) |
| **Complexity** | **S** |
| **Existing Infra** | `valuation-ai` edge function (deployed), `assessments` table |
| **Missing** | None — calls existing edge function |
| **Scope** | AI narrative explaining why a parcel's value changed year-over-year |

**Acceptance Criteria:**
- [ ] Calls `valuation-ai` edge function with parcel context
- [ ] Renders markdown narrative with value factors
- [ ] Shows contributing factors (market, improvements, comps)
- [ ] Loading skeleton while AI generates explanation
- [ ] Graceful fallback if edge function unavailable

---

### Phase 112 — Watchlist Panel

| Field | Value |
|-------|-------|
| **Component** | `src/components/workbench/WatchlistPanel.tsx` |
| **Suite** | OS Core (Workbench) |
| **Complexity** | **S** |
| **Existing Infra** | `useParcelWatchlist` + `useRemoveFromWatchlist` hooks, `parcel_watchlist` table |
| **Missing** | None — fully wired hooks exist |
| **Scope** | Watchlist CRUD + alert status display |

**Acceptance Criteria:**
- [ ] List all watched parcels with reason/notes
- [ ] Add parcel to watchlist via search
- [ ] Remove parcel with confirmation
- [ ] Filter by watch reason (value change, appeal, permit, custom)
- [ ] Badge count in navigation

---

### Phase 122 — Comparative Snapshot Diff

| Field | Value |
|-------|-------|
| **Component** | `src/components/forge/ComparativeSnapshotDiff.tsx` |
| **Suite** | TerraForge (Factory) |
| **Complexity** | **M** |
| **Existing Infra** | `comparison_snapshots` table (migration exists) |
| **Missing** | None — table exists, needs query + diff logic |
| **Scope** | Compare two model snapshots side-by-side with metric deltas |

**Acceptance Criteria:**
- [ ] Snapshot selector (two dropdowns: baseline vs candidate)
- [ ] Metric comparison table (COD, PRD, median ratio, RMSE)
- [ ] Strata-level breakdown with improvement/regression indicators
- [ ] Visual diff chart (bar or radar)
- [ ] Export to clipboard/CSV

---

### Phase 126 — Neighborhood Valuation Heatmap

| Field | Value |
|-------|-------|
| **Component** | `src/components/atlas/NeighborhoodValuationHeatmap.tsx` |
| **Suite** | TerraAtlas |
| **Complexity** | **M** |
| **Existing Infra** | `parcels` table, `useEquityOverlays` hook |
| **Missing** | None — queries parcels + aggregates by neighborhood |
| **Scope** | Neighborhood-level valuation summary with color-coded grid |

**Acceptance Criteria:**
- [ ] Grid/table of neighborhoods with median value, total value, parcel count
- [ ] Color-coded cells (green = stable, yellow = moderate change, red = high change)
- [ ] Click to drill into neighborhood detail
- [ ] Sort by any metric column
- [ ] Year-over-year comparison toggle

---

### Phase 129 — Neighborhood Equity Matrix

| Field | Value |
|-------|-------|
| **Component** | `src/components/forge/NeighborhoodEquityMatrix.tsx` |
| **Suite** | TerraForge (Factory) |
| **Complexity** | **M** |
| **Existing Infra** | `assessment_ratios` + `parcels` tables, `useEquityOverlays` hook |
| **Missing** | None — data exists, needs cross-neighborhood aggregation |
| **Scope** | Cross-neighborhood equity comparison matrix |

**Acceptance Criteria:**
- [ ] Matrix grid: neighborhoods × equity metrics (COD, PRD, median ratio)
- [ ] Heat coloring per cell (IAAO thresholds: green ≤ 15 COD, yellow ≤ 20, red > 20)
- [ ] Row/column sorting
- [ ] Click cell to see parcel-level detail
- [ ] Export matrix to CSV

---

## WAVE 1: HOOK + UI WIRING

> **Goal**: Create missing hooks + activate 5 components  
> **Parallelism**: ALL 5 run simultaneously — distinct table domains  
> **Agent**: `tf-writer` (5 parallel invocations)  
> **Estimated effort**: 1 session

---

### Phase 109 — Neighborhood Heatmap Legend

| Field | Value |
|-------|-------|
| **Component** | `src/components/atlas/NeighborhoodHeatmapLegend.tsx` |
| **Suite** | TerraAtlas |
| **Complexity** | **M** |
| **Existing Infra** | `useEquityOverlays` hook, `comparison_snapshots` table |
| **Missing** | Color mapping configuration + legend rendering |
| **New Hook** | None — extend `useEquityOverlays` return value with legend metadata |
| **Scope** | Dynamic legend for equity heatmaps with IAAO-standard thresholds |

**Acceptance Criteria:**
- [ ] Color gradient legend with labeled breaks (< 0.90, 0.90–0.95, 0.95–1.05, 1.05–1.10, > 1.10)
- [ ] Responsive sizing (compact in sidebar, expanded in panel)
- [ ] Metric selector (ratio, COD, PRD) changes legend scale
- [ ] Accessible: colorblind-safe palette + text labels

---

### Phase 111 — Certification Readiness Widget

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/CertificationReadinessWidget.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **M** |
| **Existing Infra** | `certification_events` table, `useCertificationPipeline` hook |
| **Missing** | Readiness scoring logic (prerequisite checklist) |
| **Scope** | Dashboard widget showing roll certification readiness percentage |

**Acceptance Criteria:**
- [ ] Readiness score (0–100%) based on prerequisite completion
- [ ] Checklist of prerequisites: DQ pass, appeals resolved, BOR complete, model accepted
- [ ] Each prerequisite shows status (pass/fail/pending) with count
- [ ] Click to drill into blocking items
- [ ] Automatic refresh on cert_event changes

---

### Phase 113 — Batch Adjustment Review Queue

| Field | Value |
|-------|-------|
| **Component** | `src/components/forge/BatchAdjustmentReviewQueue.tsx` |
| **Suite** | TerraForge |
| **Complexity** | **M** |
| **Existing Infra** | `useRecentBatchAdjustments` + `useRollbackBatch` hooks, `value_adjustments` table |
| **Missing** | None — hooks exist, needs queue UI wiring |
| **Scope** | Review queue for pending batch value adjustments with approve/rollback actions |

**Acceptance Criteria:**
- [ ] Pending batch list with date, count, adjustment type, total delta
- [ ] Expand batch to see individual parcel adjustments
- [ ] Approve batch (marks as reviewed)
- [ ] Rollback batch with reason (calls `useRollbackBatch`)
- [ ] Filter by adjustment type (market, BOR, correction, override)

---

### Phase 116 — DQ Remediation Progress Tracker

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/DQRemediationProgressTracker.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **M** |
| **Existing Infra** | `dq_remediation_batches` + `dq_verification_snapshots` + `dq_issue_registry` tables |
| **Missing** | Progress aggregation query |
| **New Hook** | `useRemediationProgress` — aggregate open/resolved/verified counts |
| **Scope** | Track data quality remediation across batches with verification status |

**Acceptance Criteria:**
- [ ] Progress bar: total issues → remediated → verified
- [ ] Batch list with status (open/in-progress/complete/verified)
- [ ] Verification snapshot history (before/after comparison)
- [ ] Issue category breakdown (missing values, range violations, inconsistencies)
- [ ] Export remediation report

---

### Phase 124 — Multi-Parcel Batch Export

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/MultiParcelBatchExport.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **M** |
| **Existing Infra** | `parcels` + `assessments` + `sales` tables |
| **Missing** | CSV generation + download logic |
| **Scope** | Select multiple parcels and export to CSV/Excel with configurable columns |

**Acceptance Criteria:**
- [ ] Parcel selector (search, filter by neighborhood, select all)
- [ ] Column picker (parcel_number, owner, land_value, improvement_value, total_value, etc.)
- [ ] Export formats: CSV, JSON
- [ ] Download triggers browser save dialog
- [ ] Row count limit warning (> 10,000 parcels)

---

## WAVE 2: EDGE FUNCTION + MIGRATION TIER

> **Goal**: Build new edge functions and complete complex workflow components  
> **Parallelism**: 2 parallel pairs — (114 + 119), then (115 + 123)  
> **Agent**: `tf-phase-orchestrator` → `tf-writer` (gated)  
> **Estimated effort**: 2 sessions

---

### Phase 114 — Appeal Risk Dashboard

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/AppealRiskDashboard.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **L** |
| **Existing Infra** | `appeal_risk_scores` table, `appeal-risk-scorer` edge function, `useAppealRiskScoring` hook |
| **Missing** | Dashboard-level aggregation views |
| **New Hook** | `useAppealRiskDashboard` — aggregates risk scores by neighborhood/risk tier |
| **Scope** | County-wide appeal risk overview with neighborhood hotspots |

**Acceptance Criteria:**
- [ ] Risk tier distribution chart (low/medium/high/critical)
- [ ] Neighborhood risk ranking table (sortable by avg risk score)
- [ ] Top 20 highest-risk parcels list with owner + value
- [ ] Risk trend over time (if historical scores exist)
- [ ] Trigger batch re-scoring via `appeal-risk-scorer` edge function
- [ ] TerraTrace event on re-score action

---

### Phase 119 — Workflow SLA Tracker

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/WorkflowSlaTracker.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **L** |
| **Existing Infra** | `appeals` + `permits` + `exemptions` tables with status + dates |
| **Missing** | SLA rule configuration + deadline computation |
| **New Hook** | `useWorkflowSLA` — computes SLA status per workflow item |
| **Scope** | Track SLA compliance for appeals (45-day), permits (30-day), exemptions (60-day) |

**Acceptance Criteria:**
- [ ] SLA dashboard: on-time %, at-risk count, overdue count
- [ ] Workflow type tabs (appeals, permits, exemptions)
- [ ] Individual item list with days remaining, status, assignee
- [ ] Color coding: green (> 7 days), yellow (≤ 7 days), red (overdue)
- [ ] SLA configuration panel (configurable deadlines per workflow type)
- [ ] Alert integration with `notification-alerts` edge function

---

### Phase 115 — Exemption Eligibility Checker

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/ExemptionEligibilityChecker.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **L** |
| **Existing Infra** | `exemptions` table |
| **Missing** | Rule engine edge function |
| **New Edge Function** | `exemption-rule-engine` — evaluates eligibility against RCW rules |
| **New Hook** | `useExemptionEligibility` — invokes edge function with parcel context |
| **Scope** | Check parcel eligibility for various exemption types (senior, disabled, nonprofit, etc.) |

**Acceptance Criteria:**
- [ ] Parcel selector with auto-load of current exemptions
- [ ] Exemption type picker (senior citizen, disabled, nonprofit, farm/ag, historic, church)
- [ ] Rule evaluation results (eligible/ineligible with reasons)
- [ ] Document checklist (required docs per exemption type)
- [ ] Submit eligibility recommendation
- [ ] Edge function validates against WA RCW exemption rules
- [ ] TerraTrace event on eligibility check

---

### Phase 123 — Permit Impact Estimator

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/PermitImpactEstimator.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **M** |
| **Existing Infra** | `permits` table, cost schedule data |
| **Missing** | Impact calculation logic |
| **New Hook** | `usePermitImpactCalculation` — computes value impact from permit type + cost |
| **Scope** | Estimate property value change from a permit (addition, remodel, demolition) |

**Acceptance Criteria:**
- [ ] Permit type selector (new construction, addition, remodel, demolition, mechanical)
- [ ] Permit cost input with auto-calculation of value impact
- [ ] Before/after value comparison
- [ ] Impact factors: cost multiplier, depreciation adjustment, neighborhood factor
- [ ] Save estimate to permit record
- [ ] Print/export impact report

---

## WAVE 3: CROSS-SUITE ORCHESTRATION

> **Goal**: Build components that aggregate data across multiple tables/suites  
> **Parallelism**: Sequential — each depends on prior wave's infrastructure  
> **Agent**: `tf-phase-orchestrator` → `tf-writer` (gated)  
> **Estimated effort**: 2 sessions

---

### Phase 120 — Parcel Timeline

| Field | Value |
|-------|-------|
| **Component** | `src/components/workbench/ParcelTimeline.tsx` |
| **Suite** | OS Core (Workbench) |
| **Complexity** | **L** |
| **Existing Infra** | `useAssessmentHistory` + `useParcelSales` hooks, `assessments` + `sales` + `appeals` + `permits` + `exemptions` tables |
| **Missing** | Unified event aggregation across 5 tables |
| **New Hook** | `useParcelTimeline` — merges events from assessments, sales, appeals, permits, exemptions into chronological timeline |
| **Scope** | Single unified timeline showing all events for a parcel |

**Acceptance Criteria:**
- [ ] Chronological event list (newest first)
- [ ] Event types with icons: assessment (📊), sale (💰), appeal (⚖️), permit (🔨), exemption (🏛️)
- [ ] Event detail expansion (click to see full record)
- [ ] Filter by event type
- [ ] Date range filter
- [ ] Infinite scroll or pagination (parcels can have 20+ years of events)

---

### Phase 121 — Neighborhood Certification Workflow

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/NeighborhoodCertificationWorkflow.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **L** |
| **Existing Infra** | `certification_events` table, `useCertificationPipeline` hook, `dq_issue_registry` table |
| **Missing** | Batch certification engine (neighborhood-level sign-off) |
| **New Hook** | `useNeighborhoodCertification` — tracks per-neighborhood certification status |
| **Scope** | Certify neighborhoods in batches with prerequisite gates |

**Acceptance Criteria:**
- [ ] Neighborhood list with certification status (not started → in review → certified)
- [ ] Prerequisites per neighborhood: DQ score ≥ 95%, appeals resolved, model accepted
- [ ] Batch certify action (select multiple neighborhoods)
- [ ] Certification event log per neighborhood
- [ ] Rollback certification with reason
- [ ] Progress bar: certified / total neighborhoods

---

### Phase 125 — Appeal Outcome Predictor

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/AppealOutcomePredictor.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **L** |
| **Existing Infra** | `appeals` table, `appeal_risk_scores` table, `useAppealRiskScoring` hook |
| **Missing** | Prediction model (statistical, not ML — based on historical outcomes) |
| **New Hook** | `useAppealOutcomePrediction` — analyzes historical appeal patterns |
| **Scope** | Predict likely outcome of a pending appeal based on historical data |

**Acceptance Criteria:**
- [ ] Parcel/appeal selector
- [ ] Prediction display: likely outcome (upheld/reduced/dismissed), confidence %
- [ ] Contributing factors list (assessment ratio, comp spread, neighborhood history)
- [ ] Historical comparison: similar appeals in same neighborhood
- [ ] Suggested defense strategy (if likely reduction)
- [ ] Disclaimer: "Statistical estimate — not legal advice"

---

## WAVE 4: COMMUNICATIONS + FINAL

> **Goal**: Build owner communications table + complete remaining component  
> **Parallelism**: Sequential (migration → hook → UI)  
> **Agent**: `execution_subagent` (migration) → `tf-writer` (hook + UI)  
> **Estimated effort**: 1 session

---

### Phase 127 — Owner Communication Log

| Field | Value |
|-------|-------|
| **Component** | `src/components/dais/OwnerCommunicationLog.tsx` |
| **Suite** | TerraDais |
| **Complexity** | **L** |
| **Existing Infra** | None — needs new table |
| **Missing** | `owner_communications` table + migration + hook + UI |
| **New Migration** | `owner_communications` (id, county_id, parcel_id, owner_name, contact_method, direction, subject, body, created_at, created_by) |
| **New Hook** | `useOwnerCommunications` — CRUD for communication records |
| **Scope** | Log and track all communications with property owners |

**Acceptance Criteria:**
- [ ] Migration creates `owner_communications` table with RLS
- [ ] Communication log list (newest first)
- [ ] Add communication form (type: phone, email, letter, in-person)
- [ ] Direction indicator (inbound/outbound)
- [ ] Link to parcel and appeal (if applicable)
- [ ] Search/filter by owner name, date range, type
- [ ] Write-lane: owner_communications → Dais

---

## Execution Summary

### Wave Roster

| Wave | Phases | Count | Parallelism | Agent Strategy | Dependencies |
|------|--------|-------|-------------|----------------|--------------|
| **0** | 104, 105, 112, 122, 126, 129 | 6 | Full parallel | `tf-writer` × 6 | None (existing infra) |
| **1** | 109, 111, 113, 116, 124 | 5 | Full parallel | `tf-writer` × 5 | Wave 0 complete |
| **2** | 114, 119, 115, 123 | 4 | 2 parallel pairs | `tf-phase-orchestrator` → `tf-writer` | Wave 1 complete |
| **3** | 120, 121, 125 | 3 | Sequential | `tf-phase-orchestrator` → `tf-writer` | Wave 2 complete |
| **4** | 127 | 1 | Sequential | `execution_subagent` → `tf-writer` | Wave 3 complete |
| **—** | 118, 128 | 2 | N/A | Already complete | — |

### Complexity Budget

| Complexity | Count | Phases |
|------------|-------|--------|
| **S** (UI only) | 3 | 105, 112, 118✅ |
| **M** (hook + UI) | 9 | 104, 109, 111, 113, 116, 122, 123, 124, 126, 129 |
| **L** (edge func / migration / cross-suite) | 8 | 114, 115, 119, 120, 121, 125, 127, 128✅ |

### New Infrastructure Needed

| Type | Count | Details |
|------|-------|---------|
| **New Migrations** | 1 | `owner_communications` (Phase 127) |
| **New Edge Functions** | 1 | `exemption-rule-engine` (Phase 115) |
| **New Hooks** | 7 | `useAppealRiskDashboard` (114), `useExemptionEligibility` (115), `useRemediationProgress` (116), `useWorkflowSLA` (119), `useParcelTimeline` (120), `useNeighborhoodCertification` (121), `useOwnerCommunications` (127) |
| **New Hook (simple)** | 2 | `usePermitImpactCalculation` (123), `useAppealOutcomePrediction` (125) |

### Gate Requirements (per wave)

```bash
# After each wave:
npx tsc --noEmit 2>&1              # 0 TypeScript errors
npx vitest run 2>&1                # All tests pass (currently 144)
```

### Phase Gap Notes

Phases **106, 107, 108, 110, 117** do not exist in the codebase. These numbers are reserved for future use and are NOT blockers. The execution plan covers all 20 existing components (104–129 with gaps).

---

## Quick Reference: What To Say

```
"Execute Wave 0"  → Activates phases 104, 105, 112, 122, 126, 129 (parallel)
"Execute Wave 1"  → Activates phases 109, 111, 113, 116, 124 (parallel)
"Execute Wave 2"  → Activates phases 114, 119, 115, 123 (paired sequential)
"Execute Wave 3"  → Activates phases 120, 121, 125 (sequential)
"Execute Wave 4"  → Activates phase 127 (migration + hook + UI)
"Go all waves"    → Full 18-phase execution (5 sessions estimated)
```

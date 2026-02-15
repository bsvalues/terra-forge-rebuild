# TerraFusion OS — Phase 6 Discovery: Mass Appraisal Factory
> **Purpose**: Exhaustive discovery for the Mass Appraisal Factory — the statistical engine that powers equitable assessment at scale.

**Created**: 2026-02-15  
**Agent**: Cloud Coach  
**Status**: ✅ DISCOVERY COMPLETE

---

## Discovery Context

### Who is the user?
**Field Appraiser** — boots on the ground. Needs efficient neighborhood-level review, batch value adjustments, comp selection, and regression calibration. Must produce defensible results that survive appeals.

### What pain does this solve?
Today: Appraisers open parcels one-at-a-time, manually compare values, and have no statistical tools for batch calibration. The "Factory" transforms this into a neighborhood-level assembly line where models are calibrated, comps are reviewed in bulk, and adjustments flow with full audit trail.

### Timeline?
Exploratory — maximize architectural quality and feature depth. No deadline pressure.

### Integration priority?
Internal focus — strengthen the core before adding external APIs.

---

## Capability Matrix

| # | Capability | Priority | Description |
|---|-----------|----------|-------------|
| F1 | Regression Calibration Runs | P0 | Neighborhood-level OLS regression — select parcels, run model, review coefficients, apply adjustments |
| F2 | Cost Approach Tables | P0 | Marshall & Swift style base costs, quality grades, depreciation schedules, effective age |
| F3 | Neighborhood Comp Review | P0 | Batch comp grid with ratio review, over/under flags, one-click adjustment |
| F4 | What-If Scenario Modeling | P1 | Before/after impact when changing coefficients or cost factors — "how many parcels shift?" |
| F5 | Value Adjustment Ledger | P0 | Track every batch adjustment with reason, rollback, and TerraTrace audit |
| F6 | Model Parameter Versioning | P0 | Store calibration run outputs with R², coefficients, sample size — time-travel audit |
| F7 | Comp Grid Configuration | P1 | Configurable distance/similarity criteria for automated comparable selection |

---

## UX Architecture Decision

**Decision: Separate `/factory` Route**

Rationale per Ralph Wiggum Mode (simple rules, relentless enforcement):

1. **Workbench = Control Room** (single parcel, human feedback loop)
2. **Factory = Assembly Line** (neighborhood/batch, statistical pipeline)
3. Mixing them violates the "One Parcel, One Screen" constitutional principle
4. Factory needs wide tables, scatter plots, coefficient grids — fundamentally different layout than Workbench tabs
5. Deep-link pattern: `/factory/:mode` (e.g., `/factory/regression`, `/factory/cost`, `/factory/comps`)
6. Factory can "Send to Workbench" for individual parcel drill-down (context handoff)
7. Workbench can "Open in Factory" for neighborhood context expansion (explicit exit)

### Factory Layout
```
┌─────────────────────────────────────────────────┐
│ Top System Bar (County · Tax Year · Sync)       │
├─────────────────────────────────────────────────┤
│ Factory Header: Mode Selector + Neighborhood    │
│ [Regression] [Cost Tables] [Comp Review] [Scenarios] │
├──────────────────────┬──────────────────────────┤
│                      │                          │
│   Control Panel      │     Results Stage        │
│   (filters, params,  │     (tables, charts,     │
│    model config)     │      scatter plots)      │
│                      │                          │
├──────────────────────┴──────────────────────────┤
│ Action Bar: Apply · Export · Save Run · Rollback │
└─────────────────────────────────────────────────┘
```

---

## Data Structure Requirements

### 1. Cost Schedule Tables

```sql
-- cost_schedules: Base cost per sqft by quality/class
-- cost_depreciation: Age-based depreciation curves
-- cost_modifiers: Local adjustment factors
```

### 2. Model Parameter Storage

```sql
-- calibration_runs: Each regression execution
-- calibration_coefficients: Variable coefficients per run
-- calibration_diagnostics: R², RMSE, VIF, etc.
```

### 3. Value Adjustment Ledger

```sql
-- value_adjustments: Batch adjustment records
-- Links to calibration_run or manual reason
-- Rollback capability via soft-delete + reversal record
```

### 4. Comp Grid Configuration

```sql
-- comp_grids: Named comp selection criteria sets
-- Distance radius, property class match, year built range, etc.
```

---

## Questions Resolved

| # | Question | Answer |
|---|----------|--------|
| Q1 | Include all 4 capabilities? | Yes — everything |
| Q2 | Separate route or tab extension? | Separate `/factory` route (Cloud Coach decision) |
| Q3 | All data structures? | Yes — cost schedules, model params, adjustment ledger, comp grids |
| Q4 | Primary persona? | Field Appraiser |
| Q5 | Timeline? | Exploratory — quality over speed |
| Q6 | External integrations? | None — internal focus |

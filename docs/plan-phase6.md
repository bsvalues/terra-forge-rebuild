# TerraFusion OS — Phase 6: Mass Appraisal Factory
> **Purpose**: Engineering blueprint for the Mass Appraisal Factory — batch valuation, regression calibration, cost approach, and neighborhood comp review.

**Created**: 2026-02-15  
**Status**: 🟡 READY FOR EXECUTION  
**Agent**: Cloud Coach  
**Discovery**: docs/discovery-phase6.md

---

## Executive Summary

Build a **separate `/factory` route** as the statistical assembly line for mass appraisal. Four modes: Regression Calibration, Cost Approach, Comp Review, and Scenario Modeling. All outputs feed through the Value Adjustment Ledger with full TerraTrace audit.

**Build order**: Schema → Factory Shell → Regression Mode → Cost Mode → Comp Review → Scenarios → Integration

---

## Phase 6.0: Database Schema
**Goal**: Create all data structures needed for Factory operations  
**Depends on**: Existing parcels, assessments, sales tables

### Tasks:
- [ ] **6.0.1** — Create `calibration_runs` table (id, county_id, neighborhood_code, model_type, status, r_squared, rmse, sample_size, coefficients JSONB, diagnostics JSONB, created_by, created_at)
- [ ] **6.0.2** — Create `cost_schedules` table (id, county_id, property_class, quality_grade, base_cost_per_sqft, effective_year, created_by)
- [ ] **6.0.3** — Create `cost_depreciation` table (id, schedule_id FK, age_from, age_to, depreciation_pct, condition_modifier)
- [ ] **6.0.4** — Create `value_adjustments` table (id, county_id, parcel_id FK, adjustment_type, previous_value, new_value, adjustment_reason, calibration_run_id FK nullable, applied_by, applied_at, rolled_back_at nullable)
- [ ] **6.0.5** — Create `comp_grids` table (id, county_id, name, criteria JSONB, created_by)
- [ ] **6.0.6** — RLS policies: county-scoped access on all tables, write restricted to analyst+ roles
- [ ] **6.0.7** — Add `narrative` and `packet` to ArtifactType in trace_events (already done)

### Acceptance:
- All tables created with proper indexes and RLS
- Write-lane matrix updated: calibration_runs/cost_schedules/value_adjustments → "forge"

---

## Phase 6.1: Factory Shell
**Goal**: Build the `/factory` route with mode selector and layout  
**Depends on**: 6.0

### Tasks:
- [ ] **6.1.1** — Create `src/pages/Factory.tsx` with mode routing
- [ ] **6.1.2** — Create `FactoryLayout` component (header, mode tabs, split panel)
- [ ] **6.1.3** — Create `NeighborhoodSelector` component (dropdown of unique neighborhood_codes from parcels)
- [ ] **6.1.4** — Add `/factory` and `/factory/:mode` routes to App.tsx
- [ ] **6.1.5** — Add Factory entry point to Dock Launcher and Suite Hub
- [ ] **6.1.6** — Add "Open in Factory" link from Workbench ForgeTab

### Acceptance:
- `/factory` renders with 4 mode tabs
- Neighborhood selector filters all Factory views
- Deep-link `/factory/regression` loads correct mode

---

## Phase 6.2: Regression Calibration Mode
**Goal**: Neighborhood-level OLS regression with coefficient review and batch apply  
**Depends on**: 6.1

### Tasks:
- [ ] **6.2.1** — Create `useRegressionCalibration` hook (fetches parcels + assessments for neighborhood, computes client-side OLS via matrix operations or calls edge function)
- [ ] **6.2.2** — Create `regression-calibrate` edge function (receives parcel data, returns coefficients, R², residuals, diagnostics)
- [ ] **6.2.3** — Build `RegressionControlPanel` (variable selection, run button, status)
- [ ] **6.2.4** — Build `CoefficientGrid` component (variable name, β, std error, t-stat, p-value, VIF)
- [ ] **6.2.5** — Build `CalibrationScatterPlot` (predicted vs actual with residual coloring)
- [ ] **6.2.6** — Build `CalibrationDiagnostics` (R², RMSE, sample size, F-statistic summary cards)
- [ ] **6.2.7** — "Apply to Parcels" action: compute new values from coefficients, write to value_adjustments, emit TerraTrace events
- [ ] **6.2.8** — Save calibration_run record with full coefficient snapshot

### Acceptance:
- Select neighborhood → run regression → see coefficients + scatter plot
- Apply generates value_adjustments with audit trail
- Calibration run saved and versioned

---

## Phase 6.3: Cost Approach Mode
**Goal**: Marshall & Swift style cost tables with depreciation schedules  
**Depends on**: 6.1

### Tasks:
- [ ] **6.3.1** — Build `CostScheduleEditor` (CRUD for base cost per sqft by property class + quality grade)
- [ ] **6.3.2** — Build `DepreciationCurveEditor` (age ranges + depreciation percentages, visual curve plot)
- [ ] **6.3.3** — Build `CostApproachCalculator` (inputs: sqft, quality, age, condition → outputs: RCN, depreciated value, land value, total)
- [ ] **6.3.4** — Batch cost apply: run cost approach for all parcels in neighborhood, compare vs current assessed value
- [ ] **6.3.5** — Cost vs Market scatter: plot cost approach values vs sale prices for calibration

### Acceptance:
- Cost schedules CRUD with persistence
- Depreciation curves visualized
- Batch cost calculation with comparison table

---

## Phase 6.4: Neighborhood Comp Review Mode
**Goal**: Batch comparable review with ratio flags and one-click adjustments  
**Depends on**: 6.1

### Tasks:
- [ ] **6.4.1** — Build `CompGridTable` (neighborhood parcels with assessed value, recent sale, ratio, flag)
- [ ] **6.4.2** — Color-coded ratio flags: green (0.90-1.10), yellow (0.80-0.90 or 1.10-1.20), red (outside)
- [ ] **6.4.3** — Inline value adjustment: click ratio cell → enter new value → writes to value_adjustments
- [ ] **6.4.4** — Comp selection sidebar: for selected parcel, show nearest comps ranked by similarity score
- [ ] **6.4.5** — Batch ratio statistics summary: COD, PRD, median ratio for the visible set

### Acceptance:
- Table shows all parcels in neighborhood with ratios
- Click-to-adjust with immediate feedback
- Ratio stats update live as adjustments are made

---

## Phase 6.5: Scenario Modeling
**Goal**: What-if analysis for coefficient/factor changes  
**Depends on**: 6.2, 6.3

### Tasks:
- [ ] **6.5.1** — Build `ScenarioBuilder` (clone a calibration run, modify coefficients)
- [ ] **6.5.2** — Build `ImpactAnalysis` (histogram of value changes, count of parcels affected, aggregate revenue impact)
- [ ] **6.5.3** — Before/after comparison table (parcel, current value, scenario value, delta, %)
- [ ] **6.5.4** — "Commit Scenario" action: apply scenario values to value_adjustments

### Acceptance:
- Modify coefficients → see distribution of impact
- Commit applies with full audit trail

---

## Phase 6.6: Integration & Polish
**Goal**: Wire Factory outputs back to Workbench and evidence layer  
**Depends on**: 6.2-6.5

### Tasks:
- [ ] **6.6.1** — "Send to Workbench" action from Factory comp review (opens parcel in Property Workbench)
- [ ] **6.6.2** — ForgeTab shows latest calibration_run and value_adjustments for active parcel
- [ ] **6.6.3** — Dossier integration: auto-generate calibration narrative from run results
- [ ] **6.6.4** — VEI integration: ratio stats on Factory reflect same compute_ratio_statistics function
- [ ] **6.6.5** — Update write-lane matrix for Factory domains
- [ ] **6.6.6** — Update progress.md with Phase 6 completion

---

## Files Created

| File | Purpose |
|------|---------|
| `src/pages/Factory.tsx` | Factory route handler |
| `src/components/factory/FactoryLayout.tsx` | Shell layout with mode tabs |
| `src/components/factory/NeighborhoodSelector.tsx` | Neighborhood filter |
| `src/components/factory/regression/*` | Regression calibration UI |
| `src/components/factory/cost/*` | Cost approach UI |
| `src/components/factory/comps/*` | Comp review UI |
| `src/components/factory/scenarios/*` | Scenario modeling UI |
| `src/hooks/useCalibration.ts` | Calibration run hooks |
| `src/hooks/useCostSchedule.ts` | Cost schedule hooks |
| `src/hooks/useValueAdjustments.ts` | Adjustment ledger hooks |
| `supabase/functions/regression-calibrate/index.ts` | Server-side regression |

## Files Modified

| File | Change |
|------|--------|
| Database migration | Create calibration_runs, cost_schedules, cost_depreciation, value_adjustments, comp_grids |
| `src/App.tsx` | Add `/factory` routes |
| `src/services/writeLane.ts` | Add Factory domains to matrix |
| `src/types/parcel360.ts` | Add Factory-related types |
| `src/components/navigation/DockLauncher.tsx` | Add Factory entry |
| `src/components/dashboard/SuiteHub.tsx` | Add Factory card |

## Implementation Sequence

1. Database migration (6.0.1–6.0.6)
2. Factory shell + routing (6.1.1–6.1.6)
3. Regression mode (6.2.1–6.2.8) — highest analytical value
4. Cost approach mode (6.3.1–6.3.5) — second valuation pillar
5. Comp review mode (6.4.1–6.4.5) — field appraiser daily driver
6. Scenario modeling (6.5.1–6.5.4) — strategic analysis
7. Integration + polish (6.6.1–6.6.6) — close the loop

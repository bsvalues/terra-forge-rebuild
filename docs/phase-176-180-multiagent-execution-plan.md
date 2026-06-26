# Phases 176–180: Multi-Agent Parallel Execution Plan

**Status**: READY TO EXECUTE  
**Base commit**: `ff35712` (origin/main, HEAD)  
**Tests baseline**: 205 passing / 11 files  
**Toolchain**: TypeScript + React + Vitest + Supabase + Python 3

---

## Dependency Graph

```
Phase 176 ──────────────────────────────────────── INDEPENDENT
Phase 177 ──────────┐
                    ├──► Phase 178 (depends on 177)
Phase 179 ──────────┘ (independent, runs parallel)
Phase 180 ───────────────────────────────────────  INDEPENDENT (seeder ext.)
```

**Parallel Wave 1**: 176 ∥ 177 ∥ 179 ∥ 180 (all start simultaneously)  
**Wave 2**: 178 (starts after 177 merges)

---

## Agent Track Assignments

| Track | Agent | Phases | Files |
|-------|-------|--------|-------|
| A | `subagent-alpha` | 176 DQ Monitor | `src/components/analytics/DQMonitorPanel.tsx`, `src/hooks/useDQMonitor.ts`, test |
| B | `subagent-beta` | 177 Comparable Sales Grid | `src/components/forge/ComparableSalesGrid.tsx`, test |
| C | `subagent-gamma` | 179 Roll Readiness Enhancement | `src/components/analytics/RollReadinessPanel.tsx`, test |
| D | `subagent-delta` | 180 Multi-County Seed Expansion | `scripts/county_registry.py`, `scripts/__main__.py` (extend) |
| E | `main-agent` | 178 Neighborhood Factor Calibration | `src/components/factory/NeighborhoodFactorCalibration.tsx`, test (after B) |

---

## Phase 176 — DQ Continuous Monitor (Track A)

### Acceptance Criteria
- `DQMonitorPanel` component renders per-table record counts, null rates, and a 7-day sparkline
- `useDQMonitor` hook queries `data_quality_log` or falls back to `parcels`/`sales` row counts
- Sparkline uses existing `RatioTrendSparklines` pattern (Recharts `<Sparkline>`)
- ≥8 Vitest tests: hook shape, null-rate calculation, sparkline data transform, error state

### Files to Create/Edit
```
CREATE  src/hooks/useDQMonitor.ts
CREATE  src/components/analytics/DQMonitorPanel.tsx
CREATE  src/hooks/useDQMonitor.test.ts
MAYBE   supabase/functions/dq-monitor/index.ts  (if edge fn needed)
```

### Implementation Steps for Track A Agent
1. **Read** `src/components/analytics/RatioTrendSparklines.tsx` to copy sparkline pattern
2. **Read** `src/integrations/supabase/types.ts` lines 1–60 to find `data_quality_log` table existence
3. **Create** `src/hooks/useDQMonitor.ts`:
   ```ts
   // useQuery → supabase.from("parcels").select("id", { count: "exact", head: true })
   // useQuery → supabase.from("sales").select("id", { count: "exact", head: true })
   // returns { parcelCount, salesCount, nullRates, sparkData, isLoading }
   ```
4. **Create** `src/components/analytics/DQMonitorPanel.tsx`:
   - Card layout with table rows: Table | Records | Null Rate | 7-day Trend
   - Recharts `<LineChart>` sparkline per table using sparkData
   - Uses `Badge` (green/yellow/red) from `@/components/ui/badge`
5. **Create** `src/hooks/useDQMonitor.test.ts` with ≥8 tests
6. **Verify**: `npx tsc --noEmit` passes; `npx vitest run src/hooks/useDQMonitor.test.ts` passes

### Tool Call Sequence for Track A
```
parallel: [
  read_file(RatioTrendSparklines.tsx, 1-100),
  grep_search("data_quality_log", src/integrations/supabase/types.ts)
]
→ create_file(src/hooks/useDQMonitor.ts)
→ create_file(src/components/analytics/DQMonitorPanel.tsx)
→ create_file(src/hooks/useDQMonitor.test.ts)
→ execution_subagent("npx tsc --noEmit && npx vitest run src/hooks/useDQMonitor.test.ts")
```

---

## Phase 177 — Comparable Sales Grid (Track B)

### Acceptance Criteria
- `ComparableSalesGrid` renders a sortable data table of comps for a given parcel
- Columns: Address, Sale Date, Sale Price, $/sqft, Value Ratio, Days on Market indicator
- Uses existing `useComparableSales(parcelId, neighborhoodCode, assessedValue)` hook (no new hook needed)
- Grid supports sort by sale_date or sale_price
- ≥8 Vitest tests: renders with data, empty state, sort toggle, ratio calculation, formatted price

### Files to Create/Edit
```
CREATE  src/components/forge/ComparableSalesGrid.tsx
CREATE  src/components/forge/ComparableSalesGrid.test.tsx
EDIT    src/components/forge/ValuationConfidenceVisualizer.tsx  (add <ComparableSalesGrid> below confidence band)
```

### Implementation Steps for Track B Agent
1. **Read** `src/hooks/useParcelDetails.ts` lines 40–80 (useComparableSales signature)
2. **Read** `src/components/forge/ValuationConfidenceVisualizer.tsx` lines 1–50 (import style)
3. **Create** `src/components/forge/ComparableSalesGrid.tsx`:
   ```tsx
   // Props: parcelId, neighborhoodCode, assessedValue
   // useState for sortKey: "sale_date" | "sale_price"
   // Derived: sorted array, $/sqft = sale_price / parcels.building_area
   // valueRatio = sale_price / parcels.assessed_value
   // Table: shadcn <Table> with sticky header, max-h-64 scroll
   ```
4. **Edit** `ValuationConfidenceVisualizer.tsx` to render `<ComparableSalesGrid>` beneath band
5. **Create** `src/components/forge/ComparableSalesGrid.test.tsx` with ≥8 tests
6. **Verify**: `npx tsc --noEmit` passes; vitest passes

### Tool Call Sequence for Track B
```
parallel: [
  read_file(useParcelDetails.ts, 40-80),
  read_file(ValuationConfidenceVisualizer.tsx, 1-60)
]
→ create_file(ComparableSalesGrid.tsx)
→ replace_string_in_file(ValuationConfidenceVisualizer.tsx — append grid)
→ create_file(ComparableSalesGrid.test.tsx)
→ execution_subagent("npx tsc --noEmit && npx vitest run src/components/forge/ComparableSalesGrid.test.tsx")
```

---

## Phase 178 — Neighborhood Factor Calibration (Track E — after 177)

### Prerequisite
- Phase 177 merged. `ComparableSalesGrid` exists and exports its type.

### Acceptance Criteria
- `NeighborhoodFactorCalibration` component shows per-neighborhood PRD, COD, and median ratio
- Pulls comps data via `fetchNeighborhoodParcels(neighborhoodCode)` + `useComparableSales`
- Inputs: neighborhood code selector (reuse `NeighborhoodSelector`), date range, min sales threshold
- Calculates: Median Ratio = median(sale_price / assessed_value), COD = coefficient of dispersion, PRD = price-related differential
- Renders `<ComparableSalesGrid>` filtered to the selected neighborhood
- Apply button calls `supabase.from("calibration_runs").insert(...)` via write lane
- ≥10 Vitest tests: PRD/COD math, median calculation, insert call, empty neighborhood guard

### Files to Create/Edit
```
CREATE  src/components/factory/NeighborhoodFactorCalibration.tsx
CREATE  src/components/factory/NeighborhoodFactorCalibration.test.tsx
EDIT    src/components/factory/FactoryLayout.tsx  (add tab for Calibration)
```

### Implementation Steps for Track E (main-agent)
1. **Read** `src/components/factory/NeighborhoodSelector.tsx` (full)
2. **Read** `src/services/ingestService.ts` lines 335–365 (fetchNeighborhoodParcels, fetchActiveAdjustments)
3. **Read** `src/services/writeLane.ts` (full — WRITE_LANE_TABLES, insertWithWriteLane)
4. **Create** `src/components/factory/NeighborhoodFactorCalibration.tsx`
5. **Edit** `FactoryLayout.tsx` to add Calibration tab
6. **Create** `src/components/factory/NeighborhoodFactorCalibration.test.tsx` ≥10 tests
7. **Verify**: `npx tsc --noEmit && npx vitest run src/components/factory/NeighborhoodFactorCalibration.test.tsx`

### Math Reference
```ts
const ratios = sales.map(s => s.sale_price / s.parcels.assessed_value);
const sorted = [...ratios].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const meanRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
const cod = (ratios.reduce((s, r) => s + Math.abs(r - median), 0) / ratios.length / median) * 100;
const prd = meanRatio / (ratios.reduce((s, r, _, a) => s + r * (1/a.length), 0) / ratios.length);
```

---

## Phase 179 — Roll Readiness Enhancement (Track C)

### Acceptance Criteria
- `RollReadinessPanel` component extracted from `AnalyticsDashboard.tsx`
- Shows: roll_readiness_index gauge (0–100), breakdown by category (parcels reviewed, DQ passed, sales ratio compliant)
- Drill-down: clicking a category shows list of blocking parcels
- Animated gauge using Recharts `<RadialBarChart>`
- ≥8 Vitest tests: gauge render, drill-down toggle, category math, 0/100 edge cases

### Files to Create/Edit
```
CREATE  src/components/analytics/RollReadinessPanel.tsx
CREATE  src/hooks/useRollReadiness.ts
CREATE  src/hooks/useRollReadiness.test.ts
EDIT    src/components/analytics/AnalyticsDashboard.tsx  (replace inline readiness with <RollReadinessPanel>)
```

### Implementation Steps for Track C Agent
1. **Read** `src/components/analytics/AnalyticsDashboard.tsx` lines 55–100 (roll_readiness_index usage)
2. **Read** `src/integrations/supabase/types.ts` - search for `roll_readiness` to find related tables
3. **Create** `src/hooks/useRollReadiness.ts`:
   ```ts
   // useQuery for county_vitals → roll_readiness_index
   // useQuery for roll_readiness_details if table exists, else compute from parcels
   // returns { index, categories, blockingParcels, isLoading }
   ```
4. **Create** `src/components/analytics/RollReadinessPanel.tsx` with RadialBarChart + drill-down
5. **Edit** `AnalyticsDashboard.tsx` — replace `roll_readiness_index` inline display with `<RollReadinessPanel>`
6. **Create** `src/hooks/useRollReadiness.test.ts` ≥8 tests
7. **Verify**: all pass

---

## Phase 180 — Multi-County Seed Expansion (Track D)

### Acceptance Criteria
- `scripts/county_registry.py` — dict of county configs keyed by slug
- `scripts/__main__.py` — `--target` now accepts any registered county slug
- Seeder dispatches to correct config without code changes
- `python -m scripts.seed --target benton --domain all --dry-run` still passes
- `python -m scripts.seed --list-counties` prints registry table
- `scripts/county_registry.py` unit-testable (no DB calls; pure data)
- At minimum: benton + a stub for `yakima` county to prove extensibility

### Files to Create/Edit
```
CREATE  scripts/county_registry.py
EDIT    scripts/__main__.py  (import registry, validate --target, add --list-counties)
CREATE  scripts/test_county_registry.py
```

### Implementation Steps for Track D Agent
1. **Read** `scripts/__main__.py` (full) to understand current --target handling
2. **Create** `scripts/county_registry.py`:
   ```python
   COUNTY_REGISTRY = {
     "benton": {
       "id": "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
       "name": "Benton County",
       "state": "WA",
       "fips": "53005",
       "domains": ["costforge", "pacs", "gis", "ascend", "pacs_domain"],
     },
     "yakima": {
       "id": None,  # stub — requires DB provisioning
       "name": "Yakima County",
       "state": "WA",
       "fips": "53077",
       "domains": ["costforge", "pacs"],
     },
   }
   def get_county(slug: str):
       if slug not in COUNTY_REGISTRY:
           raise ValueError(f"Unknown county: {slug!r}. Run --list-counties.")
       return COUNTY_REGISTRY[slug]
   ```
3. **Edit** `scripts/__main__.py`:
   - Import `COUNTY_REGISTRY, get_county` from `county_registry`
   - Validate `args.target` against registry
   - Add `--list-counties` flag that prints registry table and exits
4. **Create** `scripts/test_county_registry.py` with ≥6 tests
5. **Verify**: `python -m scripts.seed --dry-run --target benton --domain all`

---

## Execution Protocol

### Wave 1 — Launch 4 subagents in parallel

```python
# Main agent orchestrates:
parallel_launch([
  subagent("subagent-alpha", task=PHASE_176_SPEC),  # Track A
  subagent("subagent-beta",  task=PHASE_177_SPEC),  # Track B  
  subagent("subagent-gamma", task=PHASE_179_SPEC),  # Track C
  subagent("subagent-delta", task=PHASE_180_SPEC),  # Track D
])
```

Each subagent spec contains:
1. Exact files to read (listed above per phase)
2. Exact files to create/edit (listed above)  
3. Test command to run for self-verification
4. Return: list of files created/edited + test pass count

### Wave 2 — After Track B (177) completes

```python
main_agent.execute(PHASE_178_SPEC)  # Track E — uses ComparableSalesGrid from 177
```

### Final Validation (main agent)

```bash
npx tsc --noEmit
npx vitest run
git add -A
git commit -m "feat: Phases 176-180 — DQ Monitor, Comp Grid, Nbhd Calibration, Roll Readiness, Multi-County Seeds"
git push
```

Expected final test count: **≥245** (205 baseline + 8+8+10+8+6 = 40 new tests)

---

## Inter-Agent Contracts

| Provider | Consumer | Contract |
|----------|----------|----------|
| Track B (177) | Track E (178) | `ComparableSalesGrid` exports `ComparableSalesGridProps` and default export component |
| Track A (176) | Any | `DQMonitorPanel` is standalone; no downstream consumer in these phases |
| Track D (180) | Any | `county_registry.py` is pure Python; no TS imports |

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| `data_quality_log` table missing (Phase 176) | Fall back to `parcels`/`sales` count-only queries; log a console.warn |
| `sales.parcels.building_area` nullable (Phase 177) | Guard: `building_area > 0 ? price/area : null`; show "—" in grid |
| `calibration_runs` write-lane blocked (Phase 178) | Check `WRITE_LANE_TABLES` in writeLane.ts; add if missing |
| Yakima county_id null (Phase 180) | Guard: `if (!county.id) throw new Error("County not provisioned in DB")` before any DB call |
| Wave 1 conflict on shared utility files | Tracks A/B/C/D touch non-overlapping files (verified above) |

---

## File Ownership Matrix (no conflicts)

| File | Phase | Track |
|------|-------|-------|
| `src/hooks/useDQMonitor.ts` | 176 | A |
| `src/components/analytics/DQMonitorPanel.tsx` | 176 | A |
| `src/components/forge/ComparableSalesGrid.tsx` | 177 | B |
| `src/components/forge/ValuationConfidenceVisualizer.tsx` | 177 | B |
| `src/hooks/useRollReadiness.ts` | 179 | C |
| `src/components/analytics/RollReadinessPanel.tsx` | 179 | C |
| `src/components/analytics/AnalyticsDashboard.tsx` | 179 | C |
| `scripts/county_registry.py` | 180 | D |
| `scripts/__main__.py` | 180 | D |
| `src/components/factory/NeighborhoodFactorCalibration.tsx` | 178 | E (Wave 2) |
| `src/components/factory/FactoryLayout.tsx` | 178 | E (Wave 2) |

**Zero overlapping file writes across Wave 1 tracks.**

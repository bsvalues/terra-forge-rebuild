# TerraFusion OS — Phase 160–168 Multi-Agent Parallel Execution Plan
# ═══════════════════════════════════════════════════════════════════════
# SPRINT: "Close the Loop — Data Foundation → Real UI → TerraPilot Brain"
# Date: 2026-03-23  |  HEAD: 75278fc (Phase 159 CostForge committed)
# Executor: GitHub Copilot (Claude Sonnet 4.6) + parallel subagents
# ═══════════════════════════════════════════════════════════════════════

## Sprint Mission

Three data pipelines exist but NO UI surfaces them as TerraForge yet. Every phase since
146 was data-layer. This sprint wires the data into the Workbench, makes the Forge Tab
real, and gives TerraPilot parcel-contextual intelligence.

## Current Asset Inventory

### What Exists (can be extended, not rebuilt)
| Asset | Location | State |
|---|---|---|
| `CostForgeDashboard.tsx` | `src/components/costforge/` | Uses old "Sacred 3-6-9" mock data — needs real connector wired |
| `CostScheduleManager.tsx` | `src/components/costforge/` | Stub — needs `costforgeConnector.ts` |
| `CostApproachRunner.tsx` | `src/components/costforge/` | Uses raw `supabase.from("parcels")` — needs real calc engine |
| `ForgeTab.tsx` | `src/components/workbench/tabs/` | 17 sub-views, none is CostForge yet |
| `SummaryTab.tsx` | `src/components/workbench/tabs/` | Real data via `useParcel360`, no value history |
| `TerraPilotChat.tsx` | `src/components/workbench/` | Chat exists, no parcel/CostForge context injection |
| `costforgeConnector.ts` | `src/services/` | NEW at 75278fc — typed, `calcRCNLD()`, full API |
| `ascendConnector.ts` | `src/services/` | NEW at f0b2a4e — `getValueHistory()`, `getFullValueHistory()` |
| `WorkbenchContext.tsx` | `src/components/workbench/` | `parcel.id`, `parcel.parcelNumber` etc. available |
| `useParcel360.ts` | `src/hooks/` | Core parcel data hook |
| `usePacsImprovements.ts` | `src/hooks/` | Existing, functional |
| `usePacsLandDetails.ts` | `src/hooks/` | Existing, functional |
| `usePacsAssessmentRoll.ts` | `src/hooks/` | Existing, functional |

### What Does NOT Exist Yet
- `useFullValueHistory` hook (Ascend pre-2015 + PACS 2015+ unified timeline)
- `FullValueHistoryTimeline.tsx` component
- `useCostForgeSchedules` / `useCostForgeCalc` hooks
- `CostForgeSchedulePanel.tsx` — residential/commercial schedule grid
- `CostForgeCalcPanel.tsx` — RCNLD calculator UI
- `useAscendProperty` / `useAscendImprovements` hooks
- TerraPilot `build_context()` function for parcel-aware responses

---

## Agent Assignment Matrix

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  WAVE 0 (5 min) — Infrastructure — PRIMARY AGENT                             │
│  Phase 160: git push origin main                                             │
└───────────────────────────────────────────────────────────────────────────────┘
          ↓ (unblocks CI + remote sync, all other work can proceed locally)

┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐
│  LANE A       │  │  LANE B       │  │  LANE C       │  │  LANE D           │
│  Phase 161    │  │  Phase 162    │  │  Phase 163+   │  │  Phase 168        │
│               │  │               │  │               │  │                   │
│  AGENT: A     │  │  AGENT: B     │  │  AGENT: C     │  │  AGENT: D         │
│  CostForge    │  │  Value History│  │  Forge Tab    │  │  TerraPilot       │
│  Connector    │  │  Timeline     │  │  Integration  │  │  Context Brain    │
│  → UI Wiring  │  │  Component    │  │               │  │                   │
│               │  │               │  │               │  │                   │
│  Writes:      │  │  Writes:      │  │  Writes:      │  │  Writes:          │
│  - hooks/     │  │  - hooks/     │  │  - ForgeTab   │  │  - TerraPilot     │
│    useCostForge│ │    useFullVal │  │    adds view  │  │    Chat.tsx       │
│  - costforge/ │  │  - workbench/ │  │  - CostForge  │  │  - pilot/         │
│    Dashboard  │  │    tabs/      │  │    Dashboard  │  │    context.ts     │
│    Manager    │  │    SummaryTab │  │    real data  │  │                   │
│    Runner     │  │               │  │               │  │  Phase 168        │
│               │  │  Phase 162    │  │  Phases 163+  │  │                   │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └────────┬──────────┘
        │                  │                  │                   │
        └──────────────────┴──────────────────┴───────────────────┘
                                    ↓
               WAVE 2 (after all 4 lanes merge): Phase 164
               PRIMARY AGENT: Draft Valuation End-to-End flow
               (requires: Lane A connector + Lane C Forge tab)
```

---

## WAVE 0: Phase 160 — Git Push

**Agent**: Primary (no subagent needed)  
**Effort**: 2 minutes  
**Command**:
```
git push origin main
```
**Acceptance**: `origin/main` HEAD = `75278fc`. Unlocks CI for remote validation.

---

## WAVE 1, LANE A: Phase 161 — CostForge Connector → UI Wiring

**Agent**: Subagent A  
**Base**: `costforgeConnector.ts` (created in Phase 159)  
**Goal**: Replace mock/Sacred data with real CostForge Supabase data in existing components.

### Task A1: Create `useCostForgeHooks.ts`
**File**: `src/hooks/useCostForgeHooks.ts`  
**Exports**:
```typescript
// Read hooks
useResidentialSchedules(countyId?)     // returns ResidentialScheduleRow[]
useCommercialSchedules(sectionId?, countyId?)  // returns CommercialScheduleRow[]
useDepreciationTable(propType, countyId?)      // returns DepreciationRow[]
useCostMultipliers(countyId?)                  // returns CostMultiplierRow[]
useCostForgeCoverage(countyId?)                // returns CostForgeCoverage | null
useCalcTrace(parcelId, countyId?)              // returns CalcTraceRow[]

// Calculation hook
useCalcRCNLD(input: CostForgeCalcInput | null)  // returns { result, isLoading, error }
```
**Pattern**: Use `@tanstack/react-query` — same pattern as `usePacsImprovements.ts`.  
**Import from**: `@/services/costforgeConnector`  
**Note**: ALL `supabase.from()` calls in connector are typed as `any` casts — use `(supabase as any)` consistently.

### Task A2: Rewrite `CostScheduleManager.tsx`
**File**: `src/components/costforge/CostScheduleManager.tsx`  
**Replace**: Current stub implementation  
**New behavior**:
- `Tabs` with: `Residential` | `Commercial` | `Depreciation` | `Multipliers`
- **Residential tab**: Table displaying `useResidentialSchedules()` — columns: quality_grade, min_area, ext_wall_type, unit_cost ($/sqft)
  - Group by quality_grade with collapsible sections
- **Commercial tab**: Section selector (11–18, 61, 64) → `useCommercialSchedules(sectionId)` → table of occupancy × class × quality → unit_cost
- **Depreciation tab**: Two sub-tabs (residential/commercial) — age × eff_life → pct_good grid, heatmap coloring (green=80–100%, yellow=60–79%, red=<60%)
- **Multipliers tab**: Local multipliers table + Current cost multipliers table
- Empty state: "Run seed script to load Benton County schedules" if `coverage.res_schedule_rows === 0`

### Task A3: Rewrite `CostApproachRunner.tsx`
**File**: `src/components/costforge/CostApproachRunner.tsx`  
**Replace**: Current neighborhood-level runner that uses raw `supabase.from("parcels")`  
**New behavior**: Single-improvement RCNLD calculator:

```
Inputs (form):
  - Property type: Residential / Commercial
  - Year built (number input)
  - Area (sqft, number input)
  - Quality grade (dropdown from schedule values)
  - Ext wall type [residential] OR Section + Occupancy + Class [commercial]
  - Effective life (years, dropdown: 20/25/30/35/40/45/50/55/60/65/70)

Action: "Calculate RCNLD" button
  → calls calcRCNLD() from costforgeConnector
  → shows result breakdown card:
     ┌─────────────────────────────────────────┐
     │  Base Unit Cost:        $92.40 / sqft   │
     │  × Local Multiplier:    110%             │
     │  × Current Cost Mult:   101.5%           │
     │  × Area:                1,800 sqft       │
     │  ────────────────────────────────────────│
     │  RCN (before refin.):   $184,712         │
     │  Age / Eff Life:        22yr / 45yr      │
     │  % Good:                76%              │
     │  ════════════════════════════════════════│
     │  RCNLD:                 $140,381         │
     └─────────────────────────────────────────┘
```

**Dependencies**: `useCalcRCNLD` from Task A1

### Acceptance Criteria (Lane A)
- `CostScheduleManager` renders residential grid from real Supabase tables (or empty state if unseeded)
- `CostApproachRunner` calls `calcRCNLD()` and shows the breakdown. No hardcoded values.
- 0 TS errors in all 3 files
- `useMemo` on expensive schedule data arrays

---

## WAVE 1, LANE B: Phase 162 — Full Value History Timeline

**Agent**: Subagent B  
**Base**: `vw_full_value_history` view (created in `20260323160000_ascend_staging_tables.sql`)  
**Goal**: Surface the unified 2010–2025 value timeline on every parcel's Summary tab.

### Task B1: Create `useFullValueHistory.ts`
**File**: `src/hooks/useFullValueHistory.ts`
```typescript
export interface ValueHistoryPoint {
  roll_year: number;
  land_value: number | null;
  impr_value: number | null;
  total_value: number | null;
  taxable_value: number | null;
  source_system: "ascend" | "pacs";
}

export function useFullValueHistory(parcelId: string | null, countyId?: string)
// QueryKey: ["full-value-history", parcelId, countyId]
// Query: supabase.from("vw_full_value_history").select("*").eq("parcel_id", parcelId).order("roll_year")
// Returns: { data: ValueHistoryPoint[], isLoading, error }
```
**Note**: Use `(supabase as any)` cast since view not yet in generated types.

### Task B2: Create `FullValueHistoryTimeline.tsx`
**File**: `src/components/workbench/FullValueHistoryTimeline.tsx`

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Value History  2010 – 2025                    ● Ascend  ● PACS │
│                                                                  │
│  $500K ┤                                      ╭────────         │
│  $400K ┤                           ╭──────────╯                 │
│  $300K ┤           ╭───────────────╯                            │
│  $200K ┤───────────╯                                            │
│        └────────────────────────────────────────────────────────│
│         2010  2011  2012  2013  2014  2015  2016 ... 2025       │
│                                   ↑ Source boundary             │
│                            Ascend │ PACS                        │
└─────────────────────────────────────────────────────────────────┘
  Land ██  Improvement ██  Total ─  Taxable ─ ─
```

**Implementation**:
- Use `recharts` `AreaChart` or `ComposedChart` (already in project)
- Data from `useFullValueHistory(parcel.id)`
- Color-code points by `source_system`: Ascend=`#8B5CF6` (purple), PACS=`#10B981` (green)
- Vertical dashed line at the 2014→2015 boundary with label "Source bridge"
- Toggle: show/hide Land, Improvement, Total, Taxable lines
- Empty state: "Select a parcel to view value history"
- Loading skeleton: 3 shimmer lines in chart area
- Show min/max/latest value cards below chart

### Task B3: Wire into `SummaryTab.tsx`
**File**: `src/components/workbench/tabs/SummaryTab.tsx`

In `ParcelSummaryContent` (the function that renders when a parcel IS selected):
- Import `FullValueHistoryTimeline`
- Add as a new section BETWEEN the assessment sparklines and the ParcelTimeline/DataLineage block
- Section heading: "Value History (2010–2025)"

**Note**: Do NOT restructure existing SummaryTab sections — insert only.

### Acceptance Criteria (Lane B)
- Timeline renders for Benton County parcel with Ascend pre-2015 data
- Source bridge line visible at 2014/2015 boundary  
- 0 TS errors
- Graceful loading/empty states

---

## WAVE 1, LANE C: Phase 163 — Forge Tab: CostForge Integration

**Agent**: Subagent C  
**Base**: `ForgeTab.tsx` (17 existing sub-views), `CostForgeDashboard.tsx` (with new Schedules/Runner tabs from Lane A)  
**Goal**: Add CostForge as an 18th sub-view in ForgeTab; wire the real `CostForgeDashboard`.

### Task C1: Add "costforge" view to `ForgeTab.tsx`
**File**: `src/components/workbench/tabs/ForgeTab.tsx`

Add to the `ForgeView` type union (line ~49):
```typescript
type ForgeView = "vei" | ... | "diff" | "costforge";
```

Add to `forgeViews` array:
```typescript
{ id: "costforge", label: "CostForge", icon: DollarSign },
```

Add case in the content render section:
```tsx
{activeView === "costforge" && <CostForgeDashboard />}
```

Import:
```typescript
import { CostForgeDashboard } from "@/components/costforge/CostForgeDashboard";
```

**Note**: `DollarSign` icon already imported in ForgeTab. No new icon imports needed.

### Task C2: Add Ascend Value History view to `ForgeTab.tsx`
Add sub-view `"ascend"` to visualize the Ascend data for the selected parcel:
```typescript
{ id: "ascend", label: "Legacy Data", icon: Database },
```

Create `AscendParcelPanel.tsx` in `src/components/forge/`:

**File**: `src/components/forge/AscendParcelPanel.tsx`

Uses `useWorkbench()` to get `parcel.id` and resolve lrsn via `usePacsParcelBridge`.  
Then calls `ascendConnector.ts`:
- `getPropertyByLrsn(lrsn)` → owner, legal description, property class grid
- `getImprovements(lrsn)` → improvement list table (yr_built, use_desc, fin_size, cond_desc, const_frame)
- `getValueHistory(lrsn)` → table of tax_year → MKLND / MKIMP / MKTTL

Layout: 3-section accordion (Property Info | Improvements | Value History)

### Acceptance Criteria (Lane C)
- ForgeTab has "CostForge" view wired to real `CostForgeDashboard`
- ForgeTab has "Legacy Data" view showing Ascend improvements + value history
- 0 TS errors

---

## WAVE 1, LANE D: Phase 168 — TerraPilot Parcel Context Brain

**Agent**: Subagent D  
**Base**: `TerraPilotChat.tsx`, `WorkbenchContext.tsx`  
**Goal**: When a parcel is selected, TerraPilot automatically knows about it and can answer
valuation questions using real CostForge + Ascend + PACS data.

### Task D1: Create `src/services/pilotContextBuilder.ts`
**File**: `src/services/pilotContextBuilder.ts`

```typescript
// Assembles a parcel context block for injection into TerraPilot system prompt
export async function buildParcelContext(
  parcelId: string,
  parcelNumber: string | null,
  address: string | null,
  countyId: string
): Promise<string>
```

The function:
1. Calls `usePacsParcelBridge` equivalent (direct Supabase query for lrsn from prop_id)
2. If lrsn found: calls `ascendConnector.getValueHistory(lrsn)` → last 5 years of values
3. Calls `supabase.from("vw_full_value_history")` for most recent 3 years
4. Calls `supabase.from("pacs_assessment_roll")` for current year assessed value
5. Assembles string block:

```
PARCEL CONTEXT:
  Parcel: {parcelNumber} | {address}
  Latest Total Value: ${total} (Tax Year {year})
  Recent Value History:
    {year}: Land ${land} | Impr ${impr} | Total ${total} [{source}]
    ...
  Improvements: {count} improvement(s)
  Year Built (primary): {yr_built}
  Area (primary): {sqft} sqft
  CostForge Status: {res_rows} residential schedule rows loaded
```

Returns empty string if no parcel context available.

### Task D2: Wire context into `TerraPilotChat.tsx`
**File**: `src/components/workbench/TerraPilotChat.tsx`

Current: sends bare messages to AI endpoint.  
Add:
1. Import `buildParcelContext` from `@/services/pilotContextBuilder`
2. Import `useWorkbench` (already imported)
3. `useEffect` on `parcel.id` changes: call `buildParcelContext()` → store in `parcelContextBlock` state
4. When sending message, prepend `parcelContextBlock` as system context in the request body

Concretely — find the `handleSend` or submit function in `TerraPilotChat.tsx` and inject:
```typescript
const systemContext = parcelContextBlock
  ? `You are TerraPilot inside TerraFusion OS.\n\n${parcelContextBlock}\n\nAnswer questions about this property using the context above.`
  : "You are TerraPilot inside TerraFusion OS. No parcel is currently selected.";
```

**No new UI**. This is a pure data-injection enhancement to existing chat.

### Task D3: Add "Parcel context loaded" indicator
In `TerraPilotPanel.tsx` or `PilotTab.tsx`, show a small badge when context is loaded:
```tsx
{parcelContextReady && (
  <Badge variant="outline" className="gap-1 text-xs">
    <MapPin className="w-3 h-3" />
    {parcel.parcelNumber}
  </Badge>
)}
```

### Acceptance Criteria (Lane D)
- TerraPilot receives parcel context when a parcel is selected
- User can ask "What is the assessed value?" and get a real answer from context
- 0 TS errors
- Context block is ≤2000 characters (avoid token overruns)

---

## WAVE 2 (Sequential): Phase 164 — Draft Valuation End-to-End

**Agent**: Primary (sequential, after Lanes A + C complete)  
**Depends on**: Lane A (CostForge hooks + RCNLD engine) + Lane C (ForgeTab CostForge view)  
**Goal**: A assessor can open a parcel, open Forge → CostForge, and run a full draft valuation
that saves to `costforge_calc_trace`.

### Task 164.1: Create `useSaveCostForgeCalcTrace.ts`
**File**: `src/hooks/useSaveCostForgeCalcTrace.ts`

Wraps a `useMutation` that:
1. Calls `calcRCNLD(input)` from `costforgeConnector`
2. Inserts result into `costforge_calc_trace` via `(supabase as any).from("costforge_calc_trace").insert(...)`
3. Returns `{ mutate, isLoading, result, error }`

Uses `TerraTrace` pattern — adds event to `trace_events` after save (via existing `useConstitutionalTrace` hook).

### Task 164.2: Create `DraftValuationWorkflow.tsx`
**File**: `src/components/forge/DraftValuationWorkflow.tsx`

A 3-step wizard:
```
Step 1: Select Improvement
  → Shows improvements from usePacsImprovements(propId)
  → User selects which improvement to value

Step 2: Confirm Inputs
  → Pre-fills: yr_built, area (fin_size), use_code → auto-resolve type code via resolveTypeCode()
  → Editable fields: quality_grade, ext_wall_type (res) / construction_class (comm)
  → Effective life selector
  → "Preview RCNLD" → calls calcRCNLD() and shows live breakdown

Step 3: Confirm & Save
  → Shows final RCNLD
  → "Save Draft Valuation" → calls useSaveCostForgeCalcTrace
  → TerraTrace event added
  → Success toast with saved calc_trace_id
```

### Task 164.3: Wire into `CostForgeDashboard.tsx`
Add a 4th tab: `"draft"` → renders `<DraftValuationWorkflow parcel={workbench.parcel} />`

### Acceptance Criteria (Phase 164)
- Full round-trip: select parcel → select improvement → see RCNLD breakdown → save to calc_trace
- TerraTrace event logged on save
- Cannot save if no parcel selected (guard + tooltip)
- 0 TS errors

---

## WAVE 3 (Sequential): Phases 165–167 — Workbench Completion

These phases are secondary priority — execute after Waves 1+2.

### Phase 165 — Atlas Tab: Real Parcel Map
**File**: `src/components/workbench/tabs/AtlasTab.tsx`
- Atlas already exists with GIS views
- Task: When parcel is selected, auto-center map on `parcel.latitude/longitude`
- Task: Add "Selected Parcel" highlight layer using GIS features from `gis_features` table
- Wire `parcel.id` from WorkbenchContext into `ParcelSearchPanel` and `GeoEquityMap`
- Effort: Small (plumbing only, no new components)

### Phase 166 — Dais Tab: Parcel-Scoped Workflows
**File**: `src/components/workbench/tabs/DaisTab.tsx`
- `DaisTab` already has Appeals, Permits, Exemptions workflows
- Task: Pass `parcel.id` as prop to `AppealsWorkflow`, `PermitsWorkflow`, `ExemptionsWorkflow`
- Task: Add parcel context banner at top when parcel is selected: "Filtering for: {parcelNumber}"
- Effort: Small (prop threading)

### Phase 167 — Dossier Tab: Parcel-Scoped Documents
**File**: `src/components/workbench/tabs/DossierTab.tsx`
- `DossierTab` already passes `parcelId` to `DocumentsPanel` and `PacketAssemblyPanel`
- Task: Wire to Ascend data — add "Legacy Records" tab in DossierTab showing `ascend_property` owner history
- Task: Add "CostForge Trace" tab showing `costforge_calc_trace` for this parcel (read from `useCalcTrace(parcelId)`)
- Effort: Medium (2 new sub-tabs)

---

## WAVE 1 Parallel Execution Commands

The orchestrator (primary agent) fires all 4 wave-1 lanes simultaneously:

```
PRIMARY: git push origin main  [Phase 160]

SUBAGENT A: Build useCostForgeHooks.ts, rewrite CostScheduleManager.tsx, rewrite CostApproachRunner.tsx
SUBAGENT B: Build useFullValueHistory.ts, build FullValueHistoryTimeline.tsx, wire into SummaryTab.tsx
SUBAGENT C: Add costforge + ascend views to ForgeTab.tsx, build AscendParcelPanel.tsx
SUBAGENT D: Build pilotContextBuilder.ts, wire into TerraPilotChat.tsx, add parcel context badge

[MERGE POINT — all TS errors checked]

PRIMARY: Phase 164 — Draft Valuation Workflow
PRIMARY: Phase 165 — Atlas parcel centering
PRIMARY: Phase 166 — Dais parcel scoping
PRIMARY: Phase 167 — Dossier legacy + CostForge trace tabs
```

---

## Write-Lane Register (Constitutional Compliance)

| Domain written | Allowed lane | Phase |
|---|---|---|
| CostForge schedule reads | Forge (read-only) | 161, 163 |
| CostForge calc_trace writes | Forge | 164 |
| TerraTrace event writes | OS Core via `useConstitutionalTrace` | 164 |
| Value history reads | Forge (read-only) | 162 |
| Parcel context reads | OS Core / Pilot | 168 |
| GIS centering | Atlas (read-only action) | 165 |
| Appeal/Permit scoping | Dais (read-only filter) | 166 |
| Dossier legacy records | Dossier (read-only) | 167 |

No cross-lane writes. calc_trace is Forge's write domain — all other lanes are read-only.

---

## File Creation Summary (all phases)

```
NEW FILES:
  src/hooks/useCostForgeHooks.ts             [Lane A]
  src/hooks/useFullValueHistory.ts           [Lane B]
  src/components/workbench/FullValueHistoryTimeline.tsx  [Lane B]
  src/components/forge/AscendParcelPanel.tsx [Lane C]
  src/services/pilotContextBuilder.ts        [Lane D]
  src/hooks/useSaveCostForgeCalcTrace.ts     [Phase 164]
  src/components/forge/DraftValuationWorkflow.tsx       [Phase 164]

MODIFIED FILES:
  src/components/costforge/CostScheduleManager.tsx  [Lane A — rewrite]
  src/components/costforge/CostApproachRunner.tsx   [Lane A — rewrite]
  src/components/workbench/tabs/SummaryTab.tsx      [Lane B — insert section]
  src/components/workbench/tabs/ForgeTab.tsx        [Lane C — add 2 views]
  src/components/workbench/TerraPilotChat.tsx       [Lane D — inject context]
  src/components/costforge/CostForgeDashboard.tsx   [Phase 164 — add draft tab]
  src/components/workbench/tabs/AtlasTab.tsx        [Phase 165 — parcel center]
  src/components/workbench/tabs/DaisTab.tsx         [Phase 166 — parcel filter]
  src/components/workbench/tabs/DossierTab.tsx      [Phase 167 — 2 tabs add]
```

---

## Success Metrics

| Metric | Target |
|---|---|
| TS compile errors | 0 |
| Vitest test pass rate | 172/172 (no regression) |
| ForgeTab views | 19 (was 17, +costforge +ascend) |
| Parcel timeline span | 2010–2025 (Ascend + PACS unified) |
| TerraPilot parcel awareness | Real assessed value in response |
| CostForge RCNLD calc | Full breakdown shown without mock data |
| Draft valuation saves | Writes to costforge_calc_trace with TerraTrace event |

---

## Commit Strategy

```
git commit -m "Phase 160: Push to remote"                             [Wave 0]
git commit -m "Phase 161: CostForge connector wired to UI"             [Lane A]
git commit -m "Phase 162: Full value history timeline (Ascend+PACS)"   [Lane B]
git commit -m "Phase 163: ForgeTab — CostForge + Legacy Data views"    [Lane C]
git commit -m "Phase 168: TerraPilot parcel context injection"         [Lane D]
git commit -m "Phase 164: Draft Valuation end-to-end workflow"         [Wave 2]
git commit -m "Phase 165-167: Workbench completion — Atlas, Dais, Dossier" [Wave 3]
```

---

## Critical Constraints (all agents must respect)

1. **NO `supabase.from("new_table")` without `(supabase as any)` cast** — new CostForge/Ascend tables are not yet in generated types. This is known and acceptable pre-deployment.
2. **DO NOT restructure existing hook/component interfaces** unless the file is being fully rewritten (list above).
3. **DO NOT add "Sacred 3-6-9" or "Quantum" language** in new code — those are legacy UI strings being retired.
4. **Import `supabase` only from** `@/integrations/supabase/client`
5. **TerraPilot context block must be ≤ 2000 characters** — truncate if needed.
6. **`useConstitutionalTrace`** must be called on write operations in Phase 164.
7. **ForgeTab `DollarSign` icon is already imported** — do not add duplicate import.

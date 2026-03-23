# Phases 130–140: PACS Domain UI + Quality Dashboard
# ═══════════════════════════════════════════════════
# Multi-Agent Parallel Execution Strategy
# Created: 2026-03-23
# Workspace: terra-forge-rebuild (Supabase + React)
# Predecessor: pacs-legacy-execution-plan.md (ALL LANES COMPLETE)

## Problem Statement

The PACS connector v2 delivered **12 sync products**, **10 quality gates**, and **~988K rows**
across 6 new `pacs_*` tables in hosted Supabase. But **zero UI components** consume this data.
The frontend has no hooks, no panels, no dashboards for owners, sales, land, improvements,
or assessment roll data. This plan wires the data layer to the UI.

## Architecture Rule

All Supabase queries go through `@tanstack/react-query` hooks. No raw `supabase.from()` in components.
Hook pattern: `src/hooks/usePacs*.ts` → Component pattern: `src/components/pacs/*.tsx`.
Quality gates run client-side via `pacsQualityGates.ts` — no new edge functions needed.

---

## PHASE MAP (4 Parallel Waves)

```
┌─────────────────────────────────────────────────────────────────────┐
│               WAVE 0: Data Hooks (5 Parallel Lanes)                │
│  All lanes are INDEPENDENT — execute simultaneously                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │usePacsOwner│ │usePacsSales│ │usePacsLand │ │usePacsImprv│      │
│  │Lookup      │ │History     │ │Details     │ │& Details   │      │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘      │
│        │               │              │              │             │
│  ┌─────┴──────────────────────────────┴──────────────┘             │
│  │ usePacsAssessmentRoll                                           │
│  └─────┬───────────────────────────────────────────────────────────│
│        ↓                                                           │
├─────────────────────────────────────────────────────────────────────┤
│               WAVE 1: Domain Components (3 Parallel Lanes)         │
│  Depends on: Wave 0 hooks                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │OwnerPanel    │ │SalesPanel    │ │PropertyPanel │               │
│  │(owners +     │ │(sales +      │ │(land + imprv │               │
│  │ assessment)  │ │ ratios)      │ │ + details)   │               │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘               │
│         └────────────────┴────────────────┘                        │
│                          ↓                                         │
├─────────────────────────────────────────────────────────────────────┤
│               WAVE 2: Integration (2 Parallel Lanes)               │
│  Depends on: Wave 1 components                                     │
│  ┌──────────────────────┐ ┌──────────────────────┐                 │
│  │ParcelDossierPACS     │ │QualityGateDashboard  │                 │
│  │(unified detail view) │ │(gate runner + UI)    │                 │
│  └──────────┬───────────┘ └──────────┬───────────┘                 │
│             └────────────────────────┘                              │
│                          ↓                                         │
├─────────────────────────────────────────────────────────────────────┤
│               WAVE 3: Wiring + Validation (Sequential)             │
│  Depends on: Wave 2                                                │
│  ┌──────────────────┐ ┌─────────────┐ ┌────────────┐              │
│  │AppLayout routing  │ │TypeScript   │ │Vitest      │              │
│  │+ navigation       │ │tsc --noEmit │ │tests       │              │
│  └──────────────────┘ └─────────────┘ └────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## WAVE 0: Data Hooks (5 Parallel Lanes)

### Phase 130: usePacsOwnerLookup
**File**: `src/hooks/usePacsOwnerLookup.ts`
**Table**: `pacs_owners`
**Parallel**: Yes — independent of all other Wave 0 lanes

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Return type matches pacs_owners schema
export interface PacsOwner {
  id: string;
  county_id: string;
  prop_id: number;
  owner_id: number;
  owner_name: string | null;
  pct_ownership: number | null;
  owner_tax_yr: number | null;
  sup_num: number | null;
}

export function usePacsOwnerLookup(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-owners", propId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_owners")
        .select("id, county_id, prop_id, owner_id, owner_name, pct_ownership, owner_tax_yr, sup_num")
        .eq("prop_id", propId!)
        .order("owner_tax_yr", { ascending: false });
      if (error) throw error;
      return data as PacsOwner[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}

export function usePacsOwnerSearch(searchTerm: string | null) {
  return useQuery({
    queryKey: ["pacs-owner-search", searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_owners")
        .select("id, prop_id, owner_id, owner_name, pct_ownership, owner_tax_yr")
        .ilike("owner_name", `%${searchTerm}%`)
        .limit(50);
      if (error) throw error;
      return data as PacsOwner[];
    },
    enabled: !!searchTerm && searchTerm.length >= 3,
    staleTime: 30000,
  });
}
```

### Phase 131: usePacsSalesHistory
**File**: `src/hooks/usePacsSalesHistory.ts`
**Table**: `pacs_sales`
**Parallel**: Yes — independent

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsSale {
  id: string;
  county_id: string;
  chg_of_owner_id: number | null;
  prop_id: number;
  geo_id: string | null;
  sale_price: number | null;
  sale_date: string | null;
  sale_type_cd: string | null;
  ratio_cd: string | null;
  ratio_type_cd: string | null;
  market_value: number | null;
  hood_cd: string | null;
  ratio: number | null;
}

export function usePacsSalesHistory(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-sales", propId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_sales")
        .select("*")
        .eq("prop_id", propId!)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data as PacsSale[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}

export function usePacsNeighborhoodSales(hoodCd: string | null) {
  return useQuery({
    queryKey: ["pacs-hood-sales", hoodCd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_sales")
        .select("*")
        .eq("hood_cd", hoodCd!)
        .not("ratio", "is", null)
        .order("sale_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as PacsSale[];
    },
    enabled: !!hoodCd,
    staleTime: 60000,
  });
}
```

### Phase 132: usePacsLandDetails
**File**: `src/hooks/usePacsLandDetails.ts`
**Table**: `pacs_land_details`
**Parallel**: Yes — independent

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsLandDetail {
  id: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number | null;
  land_seg_id: number | null;
  land_type_cd: string | null;
  land_class_code: string | null;
  land_soil_code: string | null;
  land_acres: number | null;
  land_sqft: number | null;
  land_adj_factor: number | null;
  num_lots: number | null;
  land_unit_price: number | null;
  land_val: number | null;
  ag_val: number | null;
  ag_use_val: number | null;
  market_schedule: string | null;
  ag_schedule: string | null;
}

export function usePacsLandDetails(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-land-details", propId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_land_details")
        .select("*")
        .eq("prop_id", propId!)
        .order("prop_val_yr", { ascending: false });
      if (error) throw error;
      return data as PacsLandDetail[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}
```

### Phase 133: usePacsImprovements
**File**: `src/hooks/usePacsImprovements.ts`
**Tables**: `pacs_improvements` + `pacs_improvement_details`
**Parallel**: Yes — independent

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsImprovement {
  id: string;
  prop_id: number;
  prop_val_yr: number;
  imprv_id: number;
  imprv_type_cd: string | null;
  imprv_desc: string | null;
  imprv_val: number | null;
  flat_val: number | null;
  imprv_val_source: string | null;
  economic_pct: number | null;
  physical_pct: number | null;
  functional_pct: number | null;
}

export interface PacsImprovementDetail {
  id: string;
  prop_id: number;
  prop_val_yr: number;
  imprv_id: number;
  imprv_det_id: number;
  imprv_det_type_cd: string | null;
  imprv_det_class_cd: string | null;
  imprv_det_area: number | null;
  imprv_det_val: number | null;
  actual_year_built: number | null;
  yr_remodel: number | null;
  condition_cd: string | null;
  quality_cd: string | null;
  living_area: number | null;
  num_bedrooms: number | null;
  total_bath: number | null;
}

export function usePacsImprovements(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-improvements", propId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_improvements")
        .select("*")
        .eq("prop_id", propId!)
        .order("prop_val_yr", { ascending: false });
      if (error) throw error;
      return data as PacsImprovement[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}

export function usePacsImprovementDetails(propId: number | null, imprvId: number | null) {
  return useQuery({
    queryKey: ["pacs-improvement-details", propId, imprvId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_improvement_details")
        .select("*")
        .eq("prop_id", propId!)
        .eq("imprv_id", imprvId!)
        .order("imprv_det_id", { ascending: true });
      if (error) throw error;
      return data as PacsImprovementDetail[];
    },
    enabled: !!propId && !!imprvId,
    staleTime: 60000,
  });
}
```

### Phase 134: usePacsAssessmentRoll
**File**: `src/hooks/usePacsAssessmentRoll.ts`
**Table**: `pacs_assessment_roll`
**Parallel**: Yes — independent

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsAssessmentRollEntry {
  id: string;
  prop_id: number;
  geo_id: string | null;
  owner_id: number | null;
  owner_name: string | null;
  imprv_hstd_val: number | null;
  imprv_non_hstd_val: number | null;
  land_hstd_val: number | null;
  land_non_hstd_val: number | null;
  timber_market: number | null;
  ag_market: number | null;
  appraised_classified: number | null;
  appraised_non_classified: number | null;
  taxable_classified: number | null;
  taxable_non_classified: number | null;
  tax_area_id: number | null;
  tax_area_desc: string | null;
  situs_display: string | null;
  property_use_cd: string | null;
  state_cd: string | null;
  roll_year: number | null;
}

export function usePacsAssessmentRoll(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-assessment-roll", propId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_assessment_roll")
        .select("*")
        .eq("prop_id", propId!)
        .order("roll_year", { ascending: false });
      if (error) throw error;
      return data as PacsAssessmentRollEntry[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}

export function usePacsAssessmentRollByGeo(geoId: string | null) {
  return useQuery({
    queryKey: ["pacs-assessment-roll-geo", geoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_assessment_roll")
        .select("*")
        .eq("geo_id", geoId!)
        .order("roll_year", { ascending: false });
      if (error) throw error;
      return data as PacsAssessmentRollEntry[];
    },
    enabled: !!geoId,
    staleTime: 60000,
  });
}
```

---

## WAVE 1: Domain Components (3 Parallel Lanes)

### Phase 135: PacsOwnerPanel
**File**: `src/components/pacs/PacsOwnerPanel.tsx`
**Depends on**: Phase 130 (usePacsOwnerLookup), Phase 134 (usePacsAssessmentRoll)
**Parallel**: Yes — independent of other Wave 1 lanes

**Component spec**:
- Props: `{ propId: number }`
- Queries: `usePacsOwnerLookup(propId)`, `usePacsAssessmentRoll(propId)`
- UI sections:
  1. **Current Owner(s)** — table: owner_name, pct_ownership, owner_tax_yr
  2. **Assessment Roll Summary** — card grid: homestead/non-homestead imprv+land vals, taxable, situs
- Loading skeleton while queries pending
- Error state with retry button
- Empty state: "No PACS owner data for this property"

### Phase 136: PacsSalesPanel
**File**: `src/components/pacs/PacsSalesPanel.tsx`
**Depends on**: Phase 131 (usePacsSalesHistory)
**Parallel**: Yes — independent of other Wave 1 lanes

**Component spec**:
- Props: `{ propId: number; hoodCd?: string }`
- Queries: `usePacsSalesHistory(propId)`, optionally `usePacsNeighborhoodSales(hoodCd)`
- UI sections:
  1. **Sales History** — table: sale_date, sale_price, sale_type_cd, ratio_cd, market_value, ratio
  2. **Ratio Badge** — if ratio exists, color-coded: green (0.90–1.10), yellow (0.80–0.90 or 1.10–1.20), red (outside)
  3. **Neighborhood Context** — if hoodCd provided, show median ratio + count for neighborhood
- Currency formatting for sale_price, market_value
- Date formatting for sale_date

### Phase 137: PacsPropertyPanel
**File**: `src/components/pacs/PacsPropertyPanel.tsx`
**Depends on**: Phase 132 (usePacsLandDetails), Phase 133 (usePacsImprovements)
**Parallel**: Yes — independent of other Wave 1 lanes

**Component spec**:
- Props: `{ propId: number }`
- Queries: `usePacsLandDetails(propId)`, `usePacsImprovements(propId)`
- UI sections:
  1. **Land Segments** — table: land_seg_id, land_type_cd, land_acres, land_sqft, land_val, ag_val
  2. **Improvements Summary** — cards: imprv_desc, imprv_val, imprv_type_cd, depreciation (economic/physical/functional %)
  3. **Improvement Details** (collapsible per improvement) — yr_built, condition, quality, living_area, bedrooms, baths
- Total land val / total imprv val summary row
- Accordion per improvement → expand to show details via `usePacsImprovementDetails(propId, imprvId)`

---

## WAVE 2: Integration (2 Parallel Lanes)

### Phase 138: ParcelDossierPACS
**File**: `src/components/pacs/ParcelDossierPACS.tsx`
**Depends on**: Phases 135, 136, 137 (Wave 1 components)
**Parallel**: Yes — independent of Phase 139

**Component spec**:
- Props: `{ propId: number; geoId?: string; hoodCd?: string }`
- Layout: Tabbed panel (shadcn/ui Tabs)
  - Tab 1: **Ownership** → `<PacsOwnerPanel propId={propId} />`
  - Tab 2: **Sales** → `<PacsSalesPanel propId={propId} hoodCd={hoodCd} />`
  - Tab 3: **Property** → `<PacsPropertyPanel propId={propId} />`
- Header: prop_id display + geo_id + situs (from assessment roll)
- Integration point: WorkbenchContext provides propId when parcel is selected
- Lazy-load each tab panel (only query when tab is active)
- Export to: AppLayout module registry as `pacs-dossier` view

### Phase 139: QualityGateDashboard
**File**: `src/components/pacs/QualityGateDashboard.tsx`
**Service**: `src/services/qualityGateRunner.ts` (NEW)
**Hook**: `src/hooks/usePacsQualityGateRunner.ts` (NEW)
**Depends on**: Wave 0 hooks (any — for data fetching)
**Parallel**: Yes — independent of Phase 138

**Service spec** (`qualityGateRunner.ts`):
```typescript
import { supabase } from "@/integrations/supabase/client";
import { runQualityGates, BENTON_QUALITY_GATES } from "@/config/pacsQualityGates";
import type { QualityGateReport, SyncProductData } from "@/config/pacsQualityGates";

// Fetch a sample of rows from a PACS table and run quality gates
export async function runGatesForProduct(
  productId: string,
  tableName: string,
  sampleSize: number = 1000
): Promise<QualityGateReport> {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .limit(sampleSize);
  if (error) throw error;
  return runQualityGates({
    year: new Date().getFullYear(),
    productId,
    records: data ?? [],
  });
}
```

**Hook spec** (`usePacsQualityGateRunner.ts`):
```typescript
import { useQuery } from "@tanstack/react-query";
import { runGatesForProduct } from "@/services/qualityGateRunner";

const PACS_PRODUCTS = [
  { productId: "pacs_current_year_owners", table: "pacs_owners" },
  { productId: "pacs_qualified_sales", table: "pacs_sales" },
  { productId: "pacs_land_details", table: "pacs_land_details" },
  { productId: "pacs_improvements", table: "pacs_improvements" },
  { productId: "pacs_improvement_details", table: "pacs_improvement_details" },
  { productId: "pacs_assessment_roll", table: "pacs_assessment_roll" },
];

export function usePacsQualityGateRunner() {
  return useQuery({
    queryKey: ["pacs-quality-gates"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        PACS_PRODUCTS.map(p => runGatesForProduct(p.productId, p.table))
      );
      return results.map((r, i) => ({
        product: PACS_PRODUCTS[i],
        report: r.status === "fulfilled" ? r.value : null,
        error: r.status === "rejected" ? String(r.reason) : null,
      }));
    },
    staleTime: 300000, // 5 min — gates are expensive
  });
}
```

**Dashboard spec**:
- Overall status banner: green/yellow/red based on rollup of all gate reports
- Per-product card: product name, gate count, pass/warn/fail counts, expand for details
- Gate detail row: gate name, severity badge, status pill, actual vs threshold, message
- Refresh button to re-run gates
- Wire into AppLayout as `pacs-quality-gates` admin view

---

## WAVE 3: Wiring + Validation (Sequential)

### Phase 140: Integration + Tests
**Depends on**: Waves 0–2

**Tasks**:
1. **AppLayout registration** — Add lazy imports for `ParcelDossierPACS` and `QualityGateDashboard`
2. **Navigation** — Add "PACS Dossier" and "PACS Quality" entries to sidebar/module registry
3. **WorkbenchContext bridge** — Connect parcel selection → propId extraction → PACS panels
4. **TypeScript** — `npx tsc --noEmit` must return 0 errors
5. **Vitest** — Add test file `src/hooks/usePacsHooks.test.ts` with:
   - Type assertions for all 5 hook return types
   - Mock Supabase queries for basic load/error/empty states
6. **Snyk scan** — Per security instructions

---

## EXECUTION MATRIX — Agent Assignment

```
┌───────────┬────────────────────────────────────────────────┬──────────┐
│   Wave    │  Files                                         │  Agent   │
├───────────┼────────────────────────────────────────────────┼──────────┤
│ 0A (130)  │ src/hooks/usePacsOwnerLookup.ts               │ Agent A  │
│ 0B (131)  │ src/hooks/usePacsSalesHistory.ts              │ Agent B  │
│ 0C (132)  │ src/hooks/usePacsLandDetails.ts               │ Agent C  │
│ 0D (133)  │ src/hooks/usePacsImprovements.ts              │ Agent D  │
│ 0E (134)  │ src/hooks/usePacsAssessmentRoll.ts            │ Agent E  │
│           │                                                │          │
│ 1A (135)  │ src/components/pacs/PacsOwnerPanel.tsx        │ Agent A  │
│ 1B (136)  │ src/components/pacs/PacsSalesPanel.tsx        │ Agent B  │
│ 1C (137)  │ src/components/pacs/PacsPropertyPanel.tsx     │ Agent C  │
│           │                                                │          │
│ 2A (138)  │ src/components/pacs/ParcelDossierPACS.tsx     │ Agent A  │
│ 2B (139)  │ src/services/qualityGateRunner.ts             │ Agent B  │
│           │ src/hooks/usePacsQualityGateRunner.ts          │ Agent B  │
│           │ src/components/pacs/QualityGateDashboard.tsx   │ Agent B  │
│           │                                                │          │
│ 3  (140)  │ src/components/layout/AppLayout.tsx (edit)    │ Integr.  │
│           │ src/hooks/usePacsHooks.test.ts                 │ Integr.  │
│           │ npx tsc --noEmit                               │ Integr.  │
│           │ npx vitest run                                 │ Integr.  │
└───────────┴────────────────────────────────────────────────┴──────────┘
```

### Parallelism Summary

| Wave | Lanes | Dependency | Total New Files |
|------|-------|------------|-----------------|
| 0    | 5 parallel | None | 5 hook files |
| 1    | 3 parallel | Wave 0 | 3 component files |
| 2    | 2 parallel | Wave 1 | 4 files (1 service + 1 hook + 2 components) |
| 3    | 1 sequential | Wave 2 | 1 test file + 1 edit |

**Total**: 14 new files + 1 edit, **10 parallel execution slots** across 4 waves

---

## FILES TOUCHED (Complete Manifest)

### Created (new files):
1. `src/hooks/usePacsOwnerLookup.ts` — owner queries
2. `src/hooks/usePacsSalesHistory.ts` — sales + neighborhood queries
3. `src/hooks/usePacsLandDetails.ts` — land segment queries
4. `src/hooks/usePacsImprovements.ts` — improvement + detail queries
5. `src/hooks/usePacsAssessmentRoll.ts` — assessment roll queries
6. `src/components/pacs/PacsOwnerPanel.tsx` — owner + assessment display
7. `src/components/pacs/PacsSalesPanel.tsx` — sales + ratio display
8. `src/components/pacs/PacsPropertyPanel.tsx` — land + improvements display
9. `src/components/pacs/ParcelDossierPACS.tsx` — unified tabbed dossier
10. `src/services/qualityGateRunner.ts` — gate execution service
11. `src/hooks/usePacsQualityGateRunner.ts` — gate runner hook
12. `src/components/pacs/QualityGateDashboard.tsx` — gate status dashboard
13. `src/hooks/usePacsHooks.test.ts` — hook tests

### Modified (existing files):
14. `src/components/layout/AppLayout.tsx` — add lazy imports + route cases

---

## SUCCESS CRITERIA

1. `npx tsc --noEmit` passes with zero errors
2. All 5 PACS hooks export typed query functions
3. All 3 domain panels render with loading/error/empty states
4. ParcelDossierPACS is accessible via AppLayout navigation
5. QualityGateDashboard runs gates against all 6 PACS tables
6. Vitest tests pass
7. No raw `supabase.from()` calls in any component file

---

## RISK REGISTER

| Risk | Severity | Mitigation |
|------|----------|------------|
| Supabase types not generated for pacs_* tables | HIGH | Use explicit interfaces (defined in hooks) instead of generated types |
| RLS blocks queries for non-authenticated users | MEDIUM | All hooks guarded by `enabled: !!propId`; components behind ProtectedRoute |
| Large table scans (411K improvement_details) | MEDIUM | All queries filter by prop_id (indexed); limit() on search hooks |
| Quality gate sample not representative | LOW | Default 1000-row sample; configurable via parameter |
| WorkbenchContext doesn't have propId (uses parcelId UUID) | MEDIUM | Bridge function: query parcels table by UUID → extract prop_id integer |

---

*Execution begins with Wave 0. All 5 hooks can be created simultaneously.*

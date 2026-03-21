# Phase 83: Benton County Bootstrap & End-to-End Seeding Execution Plan
> **Codex**: TerraFusion OS Phase 83
> **Status**: 🟡 READY FOR EXECUTION
> **Created**: 2026-03-20
> **Architect**: GitHub Copilot + Solo Founder
> **Ralph Says**: "I seeded the county. Then the county seeded requirements back into me."

---

## Executive Summary

This phase turns Benton County, WA into the primary end-to-end development county.

The goal is not just GIS ingest or PACS sync in isolation. The goal is a **repeatable Benton bootstrap** that can:

1. Create or select the Benton county tenant.
2. Seed Benton GIS layers end to end.
3. Seed Benton PACS data products end to end.
4. Join GIS + PACS + situs/address data into usable county operations.
5. Validate the full county with quality gates.
6. Reset and rerun the seed flow safely in development.

This plan assumes the active Benton sources are:

- `E:\Benton_County_Assessor.gdb`
- `E:\Exports\Exports\taxing_jurisdiction_detail.csv`
- `E:\Exports\Exports\dataextract\property_val.csv`
- `E:\Exports\Exports\dataextract\situs.csv`
- `E:\Benton Assewssor Files\Sales.csv`

---

## Architecture: The Parallel Execution Topology

```
┌──────────────────────────────────────────────────────────────────────────────┐
│               PHASE 83 BENTON BOOTSTRAP DEPENDENCY GRAPH                    │
│                                                                              │
│ TRACK 0: DISCOVERY + CONTRACT FREEZE                                         │
│  ┌───────────────┐                                                           │
│  │ 83.1 FGDB Map │  exact layer names, parcel key, district layer map       │
│  └──────┬────────┘                                                           │
│         │                                                                    │
│ TRACK A: GIS INGEST CORE                                                     │
│  ┌──────▼────────┐    ┌──────────────┐                                       │
│  │ 83.2 Polygon  │───►│ 83.5 GIS Seed│                                       │
│  │ Ingest Gen.   │    │ Orchestration│                                       │
│  └───────────────┘    └──────┬───────┘                                       │
│                               │                                               │
│ TRACK B: UX + OPERATOR CONTROLS                                              │
│  ┌───────────────┐    ┌──────────────┐                                       │
│  │ 83.3 Benton   │───►│ 83.6 Bootstrap│                                      │
│  │ GIS Presets   │    │ Command UI    │                                      │
│  └───────────────┘    └──────┬───────┘                                       │
│                               │                                               │
│ TRACK C: PACS + COUNTY DATA                                                  │
│  ┌───────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ 83.4 PACS     │───►│ 83.7 Benton  │───►│ 83.8 Quality │                   │
│  │ Seed Runner   │    │ Full Seed    │    │ & Burn-In    │                   │
│  └───────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
│ PARALLELISM:                                                                 │
│ • 83.1 starts first and produces the Benton GIS truth table.                 │
│ • 83.2, 83.3, and 83.4 can run in parallel once 83.1 is clear enough.       │
│ • 83.5 and 83.6 can run in parallel after their upstream tracks land.        │
│ • 83.7 integrates all tracks into one bootstrap flow.                        │
│ • 83.8 is the hard validation gate and must run last.                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Agent / Subagent Execution Model

This phase is designed for a lead implementation agent coordinating parallel sub-workstreams.

### Lead Agent

- **Bootstrap Orchestrator**
- Owns sequencing, merge discipline, shared contracts, and final burn-in.

### Parallel Subagent Lanes

- **GIS Agent**
  - Owns FGDB inspection, dataset-aware polygon ingest, and GIS seeding.
- **PACS Agent**
  - Owns Benton PACS extraction, sync-product execution, and identity joins.
- **UI Agent**
  - Owns Benton GIS presets, import affordances, and operator-facing workflow controls.
- **QA/Validation Agent**
  - Owns seed verification, join-rate checks, fixture comparisons, and reset/reseed tests.

### Explore Subagent Usage

Use the `Explore` subagent in parallel for read-only discovery while the main implementation agent edits code.

Recommended `Explore` tasks:

1. FGDB layer-name inspection and classification.
2. PACS schema/product verification against Benton extracts.
3. Existing migration and table-capability checks.
4. Post-implementation verification of route wiring, function coverage, and missing joins.

---

## Existing Infrastructure Inventory

Before execution, inventory what already exists and can be reused.

| Component | Status | Location |
|-----------|--------|----------|
| Benton PACS contract | ✅ EXISTS | `src/config/pacsBentonContract.ts` |
| Benton source lane registry | ✅ EXISTS | `src/services/sync/registry.ts` |
| Contract sync runtime | ✅ EXISTS | `src/services/sync/runtime.ts` |
| Batch parcel/assessment/permit/exemption upserts | ✅ EXISTS | `src/services/ingestService.ts` |
| ArcGIS polygon ingest | ✅ EXISTS | `supabase/functions/arcgis-polygon-ingest/index.ts` |
| ArcGIS parcel sync | ✅ EXISTS | `supabase/functions/arcgis-parcel-sync/index.ts` |
| GIS parse/upload flow | ✅ EXISTS | `supabase/functions/gis-parse/index.ts`, `src/components/geoequity/GISImportDialog.tsx` |
| Benton GIS source map | ✅ EXISTS | `docs/benton-gis-source-map.md`, `src/config/bentonGISSources.ts` |
| County setup/onboarding | ✅ EXISTS | `supabase/functions/county-setup/index.ts`, `src/components/onboarding/*` |
| Synthetic sales tooling | ✅ EXISTS | `src/components/admin/SyntheticSalesPanel.tsx`, `supabase/functions/synthetic-sales-gen/*` |
| End-to-end Benton bootstrap orchestrator | ❌ MISSING | not yet implemented |
| County reset/reseed utility | ❌ MISSING | not yet implemented |
| Dataset-aware polygon ingest | ✅ EXISTS | parcel and boundary Benton datasets now share the same ingest engine |
| Benton GIS presets in live UI | ✅ EXISTS | selectable in import dialogs and GIS Ops ingest controls |

---

## Hard Gates

Phase 83 is not complete until all hard gates pass.

1. Benton county can be created or selected in a clean environment.
2. Benton parcel polygons can be ingested and stored as county-scoped GIS features.
3. Benton jurisdictions, taxing districts, and neighborhoods can be loaded or explicitly marked as provisional with documented fallback.
4. Benton PACS sync products load for current-year parcel core, valuations, neighborhood dimension, permits, appeals, and exemptions.
5. Situs/address enrichment is joined onto parcels.
6. GIS ↔ PACS join rate is at least 95% for the seeded dataset or the variance is explained in the final report.
7. A single dev command or guided workflow can bootstrap Benton end to end.
8. The dev environment can reset Benton and reseed without manual table cleanup.

---

## Phase Breakdown

### 83.1 — Benton FGDB Layer Map & Source Freeze
**Goal**: Resolve exact Benton GIS feature classes and freeze the first-pass source contract.
**Complexity**: M
**Dependencies**: None

#### Deliverables

- Exact FGDB layer-name map for:
  - Parcel polygons
  - Jurisdictions
  - Taxing districts
  - Neighborhoods
  - Any situs/address point layer if present
- Confirmed join-key doctrine:
  - `geo_id` preferred GIS parcel bridge
  - `prop_id` PACS bridge
  - `hood_cd` neighborhood bridge
  - `tax_district_id` / `levy_cd` taxation bridge
- Update `docs/benton-gis-source-map.md` with exact layer names once identified.

#### Suggested Subagent Work

- `Explore`: inspect Benton FGDB and summarize candidate feature classes.

#### Current Evidence

- Sync now exposes an executable Benton bootstrap preflight runner that reports county, parcel spine, GIS source, GIS layer, study-period, and pipeline readiness gaps.
- That runner is read-only/orchestration-safe today; it does not silently switch counties or execute PACS/GIS seed jobs.
- Sync now also exposes a Benton bootstrap initializer that can create or join the Benton tenant and ensure a Benton study period is active.
- PACS product execution and GIS layer seeding are still not part of a single one-click runner yet; they remain the next executor gap after tenant initialization.

- Python 3.12 with Fiona/Pyogrio and `OpenFileGDB` support now provides authoritative Benton FGDB inspection in this environment.
- Confirmed Benton parcel source: `Parcel` (`MultiPolygon`, `72,513` features, `EPSG:2927`) with `ParcelsAndAssess` as the strongest fallback/overlay companion.
- Confirmed Benton jurisdiction source: `CityLimits` (`MultiPolygon`, `5` features, includes `City`).
- Confirmed Benton taxing-boundary candidates: `FireDistrict`, `SchoolDistrict`, `PortDistrict`, `IrrigationDistrict`, `PublicHospitalDistrict`, `Mosquito_District`, with `CommissionerDistrict`, `ElectionDistrict`, and `LegislativeDistrict` available as governing overlays.
- Confirmed Benton appraisal-area proxies: `RevalArea` and `RevalArea_1` (`MultiPolygon`, `7` features each, include `RevalNum`).
- Confirmed Benton address-point candidates include `Spreadsheet_GeocodeAddresses1`, `pacs_oltp_XYTableToPoint`, `Parcel_XYTableToPoint`, `Parcel_Point_XYTableToPoint`, `Parcel_MJ_Locations`, and `SurveyAddressPoint_SpatialJo`.
- The remaining uncertainty is field-level semantic validation, not feature-class discovery.

#### Success Criteria

- Every Benton GIS dataset has a named primary source.
- Every seed dataset has a documented join key.
- Unknown or provisional layers are explicitly called out.

---

### 83.2 — Dataset-Aware ArcGIS Polygon Ingest
**Goal**: Generalize polygon ingest so Benton parcel and non-parcel polygon datasets use the same engine.
**Complexity**: L
**Dependencies**: 83.1 source freeze

#### Current Problem

`arcgis-polygon-ingest` currently builds parcel-centric bulk rows and assumes a parcel identifier is always present.

#### Target Changes

- Add dataset-specific mapping configuration for:
  - `benton-parcels`
  - `benton-jurisdictions`
  - `benton-taxing-districts`
  - `benton-neighborhoods`
- Split row builders by dataset role:
  - parcel polygon rows
  - boundary polygon rows
- Preserve richer per-feature properties in `gis_features.properties`.
- Ensure `gis_layers.properties_schema` captures source metadata, dataset type, and key fields.

#### Likely Files

- `supabase/functions/arcgis-polygon-ingest/index.ts`
- `src/config/bentonGISSources.ts`
- any supporting migration or RPC files if needed for non-parcel feature upserts

#### Success Criteria

- Parcel layers still ingest cleanly.
- Boundary layers no longer need to masquerade as parcels.
- County-scoped GIS features can be seeded for all four Benton polygon datasets.

---

### 83.3 — Benton GIS Presets In Operator UI
**Goal**: Make Benton GIS datasets selectable in the product, not just documented.
**Complexity**: M
**Dependencies**: 83.1 source freeze

#### Target Changes

- Surface Benton GIS preset entries in operator-facing dialogs.
- Add guided hints for Benton join keys:
  - parcel: `geo_id`, `prop_id`
  - neighborhood: `hood_cd`
  - taxation: `tax_district_id`, `levy_cd`
- Distinguish three flows clearly:
  - parcel centroid sync
  - polygon ingest
  - file import / GeoJSON upload

#### Likely Files

- `src/components/geoequity/ArcGISImportDialog.tsx`
- `src/components/geoequity/GISImportDialog.tsx`
- GIS admin/source registration surfaces
- `src/config/bentonGISSources.ts`

#### Success Criteria

- Benton presets are user-selectable.
- UI language matches backend capabilities.
- Operators do not need to guess which ingest path to use.

---

### 83.4 — Benton PACS Seed Runner
**Goal**: Seed Benton PACS data end to end using the existing contract-driven runtime.
**Complexity**: L
**Dependencies**: Benton county tenant exists

#### Scope

Run the existing Benton sync products through a repeatable seed path, at minimum:

- property core
- property valuations
- neighborhood dimension
- appeals
- permits
- exemptions

#### Likely Files

- `src/config/pacsBentonContract.ts`
- `src/services/sync/runtime.ts`
- `src/services/sync/registry.ts`
- `src/services/ingestService.ts`
- any Benton-specific bootstrap service added in this phase

#### Success Criteria

- Benton PACS seed runs without ad hoc SQL.
- Sync output is county-scoped and repeatable.
- Quality gates report pass/fail by product.

---

### 83.5 — Benton GIS Seed Orchestration
**Goal**: Seed Benton GIS layers from either a live ArcGIS service or exported FGDB layers.
**Complexity**: M
**Dependencies**: 83.2

#### Seed Order

1. Parcel polygons
2. Jurisdictions
3. Taxing districts
4. Neighborhoods
5. Optional address points if an authoritative geometry layer exists

#### Enrichment Order

1. `taxing_jurisdiction_detail.csv` enriches tax district semantics.
2. `situs.csv` enriches parcel address presentation.
3. `Sales.csv` may backfill missing parcel coordinates in development only.

#### Success Criteria

- Benton polygon layers exist as GIS layers/features.
- Boundary layers retain source metadata.
- Enrichment tables are joined after geometry load, not used as geometry replacements.

---

### 83.6 — Bootstrap Command / Guided Seed UI
**Goal**: Give devs and operators one reproducible Benton bootstrap entry point.
**Complexity**: M
**Dependencies**: 83.3, 83.4, 83.5

#### Scope

- Add a guided Benton bootstrap path that can:
  - ensure county exists
  - register GIS sources/presets
  - run GIS seed
  - run PACS seed
  - report status and failures

#### Forms This Can Take

- admin panel action
- county pipeline command surface
- dedicated bootstrap dialog
- backend orchestration function with UI wrapper

#### Current Evidence

- Benton bootstrap order is now codified in the onboarding next-steps flow.
- Sync now exposes a live Benton bootstrap status panel driven by county, parcel, GIS, and pipeline signals.
- A true one-click runner still does not exist; the orchestration state is now visible, but execution remains split across existing county setup, GIS Ops, and PACS runtime surfaces.

#### Success Criteria

- Dev bootstrap is one guided flow instead of manual scattered actions.
- Failures are resumable and visible.

---

### 83.7 — Full Benton Seed Integration
**Goal**: Orchestrate county bootstrap, GIS seed, PACS seed, and enrichment into one end-to-end run.
**Complexity**: L
**Dependencies**: 83.4, 83.5, 83.6

#### Required Outputs

- county exists and is assigned
- GIS parcel and boundary layers seeded
- PACS products seeded
- neighborhoods and addresses join correctly
- audit/progress logs written for operators

#### Success Criteria

- A new dev environment can reach Benton-ready state without bespoke manual data loading.

---

### 83.8 — Quality Gate, Burn-In, Reset, Reseed
**Goal**: Prove Benton can be destroyed and recreated safely in development.
**Complexity**: M
**Dependencies**: 83.7

#### Scope

- Add reset utility or reset workflow if missing.
- Run full burn-in:
  - seed Benton
  - inspect sample parcel workflows
  - reset Benton
  - reseed Benton
- Generate post-seed quality report:
  - row counts
  - join rates
  - missing geometry
  - missing neighborhoods
  - failed PACS products

#### Success Criteria

- Benton bootstrap is reproducible.
- Reset/reseed leaves no orphaned county-scoped data.
- Validation report can be used as go/no-go evidence.

---

## Parallel Work Allocation

### Track A — GIS Foundation

**Owner**: GIS Agent

Tasks:

1. FGDB layer-name mapping.
2. Dataset-aware polygon ingest.
3. GIS seed runner for parcel + boundary datasets.

Key outputs:

- reliable Benton geometry ingestion
- county-scoped layer metadata
- reusable ingest configuration

### Track B — Product UX

**Owner**: UI Agent

Tasks:

1. Benton GIS presets in dialogs.
2. Clear operator path for centroid sync vs polygon ingest vs GeoJSON upload.
3. Bootstrap flow surface.

Key outputs:

- reduced operator ambiguity
- Benton-first dev affordances

### Track C — PACS Seed Runtime

**Owner**: PACS Agent

Tasks:

1. Verify Benton seed product set.
2. Wire repeatable PACS seed command or workflow.
3. Join enrichment flows after PACS load.

Key outputs:

- contract-driven Benton PACS seeding
- auditable product-by-product seed status

### Track D — QA / Reset / Burn-In

**Owner**: QA Agent

Tasks:

1. Reset utility.
2. Quality report.
3. Seed → verify → reset → reseed burn-in.

Key outputs:

- proof that Benton can be reseeded safely in dev

---

## Exact File Touchpoints

### GIS Core

- `supabase/functions/arcgis-polygon-ingest/index.ts`
- `supabase/functions/arcgis-parcel-sync/index.ts`
- `supabase/functions/gis-parse/index.ts`
- `src/hooks/useGISData.ts`
- `src/config/bentonGISSources.ts`
- `docs/benton-gis-source-map.md`

### PACS / Seeding

- `src/config/pacsBentonContract.ts`
- `src/services/sync/runtime.ts`
- `src/services/sync/registry.ts`
- `src/services/ingestService.ts`
- `src/lib/pacsETL.ts`

### UI / Operator Workflow

- `src/components/geoequity/ArcGISImportDialog.tsx`
- `src/components/geoequity/GISImportDialog.tsx`
- GIS/admin source registration surfaces
- county bootstrap or pipeline shell surfaces

### County Bootstrap / Reset

- `supabase/functions/county-setup/index.ts`
- onboarding hooks/components
- new reset/reseed workflow files to be introduced in this phase

---

## Recommended Order Of Execution

### Week 1

1. Finish FGDB layer-name inspection.
2. Start dataset-aware polygon ingest generalization.
3. Start Benton GIS presets in UI.
4. Verify Benton PACS seed path against current contract set.

### Week 2

1. Land parcel + boundary ingest changes.
2. Land Benton presets and bootstrap operator flow.
3. Land PACS seed runner.

### Week 3

1. Run Benton GIS seed.
2. Run Benton PACS seed.
3. Add post-seed address/tax enrichment.
4. Build reset/reseed workflow.

### Week 4

1. Run full end-to-end Benton bootstrap.
2. Measure join rate and county health.
3. Burn-in reset + reseed.
4. Publish go/no-go report.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| FGDB layer names not yet resolved | Blocks precise GIS mapping | 83.1 first hard gate |
| Polygon ingest remains parcel-centric | Boundary layers ingest poorly | 83.2 generalization before full GIS seed |
| Benton ArcGIS service may not exist | Live sync path unavailable | Export FGDB layers to GeoJSON and use `gis-parse` |
| PACS source connectivity varies by environment | Seed runtime unstable | keep seed runner contract-driven and idempotent |
| Dev reseed leaves orphaned data | unsafe dev iteration | build reset utility before sign-off |

---

## Definition Of Done

Phase 83 is done when a developer can:

1. Bootstrap Benton County in a clean environment.
2. Seed Benton PACS data end to end.
3. Seed Benton GIS data end to end.
4. Confirm parcel, neighborhood, district, and jurisdiction layers are usable.
5. Reset the Benton tenant and repeat the process without manual DB cleanup.

If any of those require undocumented manual intervention, Phase 83 is not complete.
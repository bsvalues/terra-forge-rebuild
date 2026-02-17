# TerraFusion Data Constitution

> Non-negotiable rules governing how data flows through TerraFusion OS.  
> Violations are architectural defects, not style preferences.

---

## The Five Rules

### Rule 1 — No component calls `supabase.from()` directly

UI components consume hooks. Hooks consume query functions.  
Only files in `src/hooks/` and `src/services/` may reference the Supabase client.

**Enforcement:** Lint / code review.

### Rule 2 — One Source of Truth per Data Shape

If two screens show the same concept, they **must** come from the same hook and query key.

| Shape | Hook | Query Key |
|-------|------|-----------|
| County-wide counts & health | `useCountyVitals()` | `["county-vitals"]` |
| Single-parcel snapshot | `useParcel360(parcelId)` | `["p360-*", parcelId]` |
| Domain analytics | Specialized hooks | `["factory", ...]`, `["vei", ...]` |

### Rule 3 — Reads are Cached; Writes Invalidate

After any write through a domain service, the correct caches are invalidated via `src/lib/queryInvalidation.ts`:

- `invalidateCountyVitals(qc)` — after any county-level change
- `invalidateParcelData(qc, parcelId)` — after any parcel-scoped change
- `invalidateWorkflows(qc)` — after workflow state transitions

No manual "refresh buttons" as a crutch.

### Rule 4 — Query Keys are a Public API

Treat them like database table names: stable, documented, consistent.

| Key Pattern | Purpose |
|-------------|---------|
| `["county-vitals"]` | Global counts & health |
| `["p360-identity", id]` | Parcel identity snapshot |
| `["p360-valuation", id]` | Parcel valuation snapshot |
| `["p360-workflows", id]` | Parcel workflow snapshot |
| `["hub-parcel-search", term]` | Ephemeral search |
| `["factory", "calibration", nbhd]` | Neighborhood calibration |
| `["vei", "ratio", studyPeriodId]` | Ratio study |
| `["system-bar-county"]` | County metadata (long cache) |

### Rule 5 — Every Number on Screen Has Provenance

Use the `<ProvenanceBadge>` component. Every KPI card and vital metric must show:

- **Source** (query key name)
- **As-of time** (fetch timestamp)
- **Cache policy** (stale time)

---

## The 3-Layer Architecture

```
Layer 1: County Vitals (global counts & health)
  Hook:  useCountyVitals()
  Key:   ["county-vitals"]
  Stale: 60s
  Consumers: SuiteHub, TopSystemBar, CommandBriefing,
             FactoryDashboardHeader, RollReadiness

Layer 2: Parcel 360 (single-parcel truth)
  Hook:  useParcel360(parcelId)
  Key:   ["p360-*", parcelId]
  Stale: 30-120s
  Consumers: All Workbench tabs

Layer 3: Domain Analytics (specialized, expensive)
  Hooks: useRatioAnalysis, useRegressionAnalysis, etc.
  Keys:  ["factory", ...], ["vei", ...], etc.
  Consumers: Their respective studio screens
```

---

## Write-Lane Governance (unchanged)

Writes are owned by domain services, enforced by `writeLane.ts`:

| Domain | Owner Service | Invalidation |
|--------|---------------|--------------|
| Parcel characteristics | `forgeService` | `invalidateParcelData` |
| Valuations / models | `forgeService` | `invalidateParcelData` + `invalidateFactory` |
| Permits / appeals / exemptions | `daisService` | `invalidateWorkflows` |
| Documents / narratives / packets | `dossierService` | `invalidateParcelData` |
| GIS boundaries / annotations | `atlasService` | `invalidateParcelData` |

---

## Trust UI Primitives

| Component | Purpose | Required On |
|-----------|---------|-------------|
| `<ProvenanceBadge>` | Shows source + cache age + policy | Every KPI card, every vital |
| `<ScopeHeader>` | Declares County/Neighborhood/Parcel/Run | Every screen header |
| `<ChangeReceipt>` | Before→after diff + reason + actor | Every mutation toast |

---

## Definitions & Counting Rules

| Metric | Definition |
|--------|------------|
| `parcels.total` | `count(*)` from parcels table |
| `parcels.withCoords` | parcels where `latitude IS NOT NULL` |
| `parcels.withClass` | parcels where `property_class IS NOT NULL` |
| `quality.overall` | average of coords%, class%, neighborhood% |
| `assessments.certRate` | `certified / total` for current tax year assessments |
| `workflows.total` | pendingAppeals + openPermits + pendingExemptions |

---

## How to Add New Data Safely

1. **Define the query key** in this document first
2. **Create or extend a hook** in `src/hooks/`
3. **Never duplicate** — check if the data already exists in County Vitals or P360
4. **Add invalidation** — wire the appropriate invalidator in the domain service
5. **Add provenance** — use `<ProvenanceBadge>` on any new metric display
6. **Update this document** with the new key and definition

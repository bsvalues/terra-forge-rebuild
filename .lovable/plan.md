

# Parcel 360 Foundation: Event Spine + Write Lanes + Snapshot Contracts

## What We Are Building

Three foundational layers that transform the Property Workbench from "a screen with tabs" into a **governed operational cockpit** where every action is auditable, every write is lane-enforced, and every parcel's state is composable from authoritative sources.

**Build order: Trace (foundation) -> Write Lanes (enforcement) -> Snapshot (composition) -> Route + UX wiring**

---

## Phase A: TerraTrace Event Spine

The immutable audit backbone. Without this, nothing else is provable.

### Database

Create a `trace_events` table:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK, default gen_random_uuid) | Unique event ID |
| created_at | timestamptz (default now) | Immutable timestamp |
| county_id | uuid (FK counties, NOT NULL) | Tenant isolation |
| parcel_id | uuid (FK parcels, nullable) | Parcel scope (null for system events) |
| actor_id | uuid (NOT NULL, default auth.uid) | Who did it |
| source_module | text (NOT NULL) | "forge", "atlas", "dais", "dossier", "pilot", "os" |
| event_type | text (NOT NULL) | Registry-controlled event name |
| event_data | jsonb (default '{}') | Structured payload (before/after, reason codes, artifact refs) |
| correlation_id | uuid (nullable) | Groups related events into a logical operation |
| causation_id | uuid (nullable) | Points to the event that caused this one |
| artifact_type | text (nullable) | "assessment", "appeal", "permit", "exemption", "document", "model_receipt" |
| artifact_id | uuid (nullable) | FK to the specific record |

**Indexes**: `(parcel_id, created_at DESC)`, `(county_id, created_at DESC)`, `(correlation_id)`

**RLS**: Users can INSERT (auto-enriched with county_id via `get_user_county_id()`). Users can SELECT only their county's events. No UPDATE or DELETE (append-only).

**Realtime**: Enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE public.trace_events` for live activity feeds.

### TypeScript Service (`src/services/terraTrace.ts`)

- `emitTraceEvent(params)` -- inserts into `trace_events` with automatic actor_id from session
- Typed `TraceEventParams` interface with discriminated unions per event_type
- Event taxonomy (minimum set):
  - `parcel_updated` -- characteristic edits
  - `value_override_created` -- manual value change with reason
  - `workflow_state_changed` -- appeal/permit/exemption status transitions
  - `document_added` / `evidence_attached`
  - `notice_generated`
  - `model_run_completed`
  - `review_completed` / `review_skipped` (queue actions)
  - `parcel_viewed` (tab navigation, optional)
  - `pilot_tool_invoked` / `pilot_tool_completed`

### Activity Feed Upgrade

Refactor `TerraTraceActivityFeed` to read from `trace_events` (with fallback to `model_receipts` for legacy data). Richer event icons, filtering by source_module, and realtime subscription for live updates.

---

## Phase B: Write-Lane Enforcement

The "traffic lights" that ensure Workbench orchestrates while suites execute.

### Contracts (`src/services/writeLane.ts`)

- `WRITE_LANE_MATRIX` constant mapping each data domain to its owning module:
  - Parcel characteristics, valuations, comps, models -> "forge"
  - GIS layers, boundaries, spatial annotations -> "atlas"
  - Permits, exemptions, appeals, notices, workflows -> "dais"
  - Documents, narratives, packets -> "dossier"
  - Trace events, user prefs -> "os"
  - Pilot profile -> "pilot"

- `WriteIntent` type: `{ domain, action, sourceModule, parcelId, payload }`
- `resolveWriteLane(domain)` -- returns owning module
- `assertWriteLane(domain, sourceModule)` -- throws if mismatch (dev-time safety)

### Suite Services (`src/services/suites/`)

Four service modules, each wrapping domain writes + trace emission:

- **forgeService.ts**: `updateParcelCharacteristics()`, `createValueOverride()`, `recordModelRun()` -- each performs the DB write AND calls `emitTraceEvent` with `source_module: "forge"`
- **daisService.ts**: `updateAppealStatus()`, `updatePermitStatus()`, `decideExemption()`, `generateNotice()` -- emits with `source_module: "dais"`
- **dossierService.ts**: `addDocument()`, `createNarrative()`, `assemblePacket()` -- emits with `source_module: "dossier"`
- **atlasService.ts**: `updateBoundary()`, `addSpatialAnnotation()` -- emits with `source_module: "atlas"`

### Refactor Existing Mutations

- `useParcelMutations.ts` -- wrap `useUpdateParcel` through `forgeService.updateParcelCharacteristics()` so every parcel edit automatically emits a trace event with before/after diff
- Review queue actions (complete/skip) -- emit `review_completed` / `review_skipped` trace events

---

## Phase C: Parcel360 Snapshot (Read Contract)

The composed read model that answers "what is this parcel's complete state?"

### Types (`src/types/parcel360.ts`)

```text
Parcel360Snapshot
  identity: { parcelNumber, address, city, state, zip, countyId, propertyClass, neighborhoodCode }
  characteristics: { yearBuilt, bedrooms, bathrooms, buildingArea, landArea, lat, lng }
  valuation: { assessedValue, landValue, improvementValue, latestAssessment, history[] }
  sales: { recentSales[], qualifiedCount }
  workflows: { pendingAppeals[], activeExemptions[], openPermits[], certificationStatus }
  evidence: { modelReceiptCount, lastModelRun, recentTraceEvents[] }
  freshness: { identityAsOf, valuationAsOf, workflowsAsOf, evidenceAsOf }
  missingDomains: string[]  -- graceful degradation
  isComplete: boolean
```

### Composed Hook (`src/hooks/useParcel360.ts`)

- Orchestrates parallel queries to parcels, assessments, sales, appeals, exemptions, permits, model_receipts, trace_events
- Each domain query is independent -- if one fails, others render with explicit "not loaded" state
- Returns typed `Parcel360Snapshot` with per-domain loading/error states
- Auto-invalidates when new trace_events arrive (realtime subscription)

### SummaryTab Upgrade

- Consume `useParcel360` instead of individual hooks
- Show domain freshness indicators (small timestamps per section)
- Explicit "Not loaded" / "No data" states per domain (never silent failures)
- Operational blockers section: "What blocks certification?" (pending appeals, missing docs, uncertified assessments)

---

## Phase D: Direct Parcel Route + Parcel Lens

### Route (`/property/:parcelId`)

- New protected route in `App.tsx`
- `src/pages/Property.tsx` -- reads parcelId from URL, fetches parcel record, passes to `PropertyWorkbench` as `initialParcel`
- Loading state while fetching, 404 if not found
- Enables deep-linking and bookmarking of specific parcels

### Parcel Lens Contract

Each suite tab is parcel-scoped when in Workbench mode:
- Forge: only valuation artifacts for this parcel
- Atlas: only spatial context for this parcel
- Dais: only workflow state for this parcel
- Dossier: only evidence for this parcel
- Pilot: operates inside parcel scope, never bulk actions

"Open in Factory Mode" drill-out links for cross-parcel views (explicit context exit).

---

## Files Created

| File | Purpose |
|------|---------|
| `src/types/parcel360.ts` | Parcel360Snapshot, TraceEvent, WriteIntent interfaces |
| `src/services/terraTrace.ts` | emitTraceEvent + event taxonomy constants |
| `src/services/writeLane.ts` | WRITE_LANE_MATRIX + assertWriteLane + resolveWriteLane |
| `src/services/suites/forgeService.ts` | Forge domain writes with trace |
| `src/services/suites/daisService.ts` | Dais domain writes with trace |
| `src/services/suites/dossierService.ts` | Dossier domain writes with trace |
| `src/services/suites/atlasService.ts` | Atlas domain writes with trace |
| `src/hooks/useParcel360.ts` | Composed snapshot hook |
| `src/pages/Property.tsx` | /property/:parcelId route handler |

## Files Modified

| File | Change |
|------|--------|
| Database migration | Create `trace_events` table + RLS + indexes + realtime |
| `src/App.tsx` | Add `/property/:parcelId` protected route |
| `src/components/proof/TerraTraceActivityFeed.tsx` | Read from `trace_events` with `model_receipts` fallback |
| `src/hooks/useParcelMutations.ts` | Route through forgeService |
| `src/components/workbench/tabs/SummaryTab.tsx` | Consume useParcel360, show freshness + blockers |
| `src/components/workbench/ReviewQueueContext.tsx` | Emit trace events on review actions |

## Implementation Sequence

1. Database migration (trace_events table with RLS, indexes, realtime)
2. TypeScript types (parcel360.ts -- all contracts in one file)
3. TerraTrace emission service (terraTrace.ts)
4. Write-lane matrix + assertion utility (writeLane.ts)
5. Suite services (forge, dais, dossier, atlas)
6. useParcel360 composed hook
7. Refactor useParcelMutations through forgeService
8. Upgrade TerraTraceActivityFeed to read trace_events
9. Upgrade SummaryTab to use Parcel360 snapshot
10. Add /property/:parcelId route
11. End-to-end verification


# Phases 92–97: TerraFusion OS — Multi-Agent Parallel Execution Plan
> **Codex**: TerraFusion OS Phases 92–97  
> **Status**: 🟡 READY FOR EXECUTION  
> **Created**: 2026-03-21  
> **Architect**: Cloud Coach + Solo Founder  
> **Ralph Says**: "Six phases walked into a dependency graph. Three walked out in parallel."

---

## Architecture: The Parallel Execution Topology

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASES 92–97 DEPENDENCY GRAPH                        │
│                                                                          │
│  WAVE 1: ACTIVATION SPRINT (all independent — max 3-way parallelism)    │
│                                                                          │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                         │
│  │ Phase 92 │     │ Phase 93 │     │ Phase 94 │                         │
│  │ Sketch   │     │ Smart    │     │ AxiomFS  │                         │
│  │ Workbench│     │ Views    │     │ Storage  │                         │
│  │ Integr.  │     │ Engine   │     │ Layer    │                         │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘                         │
│       │                │                │                                │
│  WAVE 2: INTELLIGENCE LAYER (depends on Wave 1 stability)               │
│       │                │                │                                │
│       └────────────────┼────────────────┘                                │
│                        │                                                 │
│                   ┌────▼─────┐                                           │
│                   │ Phase 95 │  TerraPilot knows about                   │
│                   │ TerraPilot│  Sketch + SmartViews + AxiomFS           │
│                   │ Tool     │  + PACS + Alerts                          │
│                   │ Expansion│                                           │
│                   └────┬─────┘                                           │
│                        │                                                 │
│  WAVE 3: SCALE & PUBLIC SURFACE (depends on Wave 2 tooling)             │
│       ┌────────────────┼────────────────┐                                │
│  ┌────▼─────┐                      ┌────▼─────┐                         │
│  │ Phase 96 │                      │ Phase 97 │                         │
│  │ Multi-   │                      │ Owner    │                         │
│  │ County   │                      │ Portal   │                         │
│  │ Expansion│                      │ Enhance  │                         │
│  └──────────┘                      └──────────┘                         │
│                                                                          │
│  PARALLELISM WINDOWS:                                                    │
│  • 92 + 93 + 94 — full parallel (zero shared files)                     │
│  • 95 — sequential gate (must read 92/93/94 outputs)                    │
│  • 96 + 97 — parallel after 95 (different domains)                      │
│                                                                          │
│  AGENT ASSIGNMENTS:                                                      │
│  • Phase 92 → Workbench Agent (tab wiring, context plumbing)            │
│  • Phase 93 → Sentinel Agent (saved_views table, filter engine)         │
│  • Phase 94 → Librarian Agent (storage API, file management)            │
│  • Phase 95 → Router Agent (tool manifest expansion)                    │
│  • Phase 96 → TrafficCop Agent (RLS isolation, county bootstrap)        │
│  • Phase 97 → Workbench Agent (public surface, PWA, DATA_CONSTITUTION)  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Existing Infrastructure Inventory

Before execution, inventory what exists and what it touches:

| Component | Status | Location | Needed By |
|-----------|--------|----------|-----------|
| `SketchModule` (3 tiers: measure/sketch/plan_trace) | ✅ BUILT | `src/components/sketch/SketchModule.tsx` | Phase 92 |
| `SketchBuilderPanel` + `MeasurementPlanPanel` + `PlanTracePanel` | ✅ BUILT | `src/components/sketch/` | Phase 92 |
| Sketch ADR ("Sketch-as-Observation") | ✅ ACCEPTED | `docs/adr-sketch-module.md` | Phase 92 |
| `fieldStore.ts` (IndexedDB event-source) | ✅ BUILT | `src/services/fieldStore.ts` | Phase 92 |
| `PropertyWorkbench` tabs: summary/forge/atlas/dais/dossier/pilot | ✅ WIRED | `src/components/workbench/PropertyWorkbench.tsx` | Phase 92 |
| `SuiteTab` type union | ✅ EXISTS | `src/components/workbench/types.ts` | Phase 92 |
| `SavedFiltersPanel` → `smart-views` case in AppLayout | ✅ WIRED | `src/components/filters/SavedFiltersPanel.tsx` | Phase 93 |
| `useSmartActions.ts` (24 detection rules) | ✅ BUILT | `src/hooks/useSmartActions.ts` | Phase 93 |
| `AxiomFSDashboard` + `FileLatticeCanvas` (3D canvas) | ✅ BUILT | `src/components/axiomfs/` | Phase 94 |
| `dossier-files` storage bucket | ✅ EXISTS | Supabase Storage | Phase 94 |
| `DefensePacketGenerator` → PDF generation | ✅ BUILT | `src/components/proof/DefensePacketGenerator.tsx` | Phase 94 |
| `terrapilot-router` (`TOOL_AGENT_MAP`, `TOOL_WRITE_LANE`) | ✅ BUILT | `supabase/functions/terrapilot-router/index.ts` | Phase 95 |
| `terrapilot-chat` (sub-agent execution) | ✅ BUILT | `supabase/functions/terrapilot-chat/index.ts` | Phase 95 |
| `notification-alerts` edge function (3 rules) | ✅ BUILT | `supabase/functions/notification-alerts/index.ts` | Phase 95 |
| `useRunAlerts` hook | ✅ BUILT | `src/hooks/useRunAlerts.ts` | Phase 95 |
| `usePACSDelta` hook | ✅ BUILT | `src/hooks/usePACSDelta.ts` | Phase 95 |
| `CountySwitcher` component | ✅ BUILT | `src/components/admin/CountySwitcher.tsx` | Phase 96 |
| `county-setup` edge function | ✅ BUILT | `supabase/functions/county-setup/index.ts` | Phase 96 |
| `OnboardingWizard` (5-step) | ✅ BUILT | `src/components/onboarding/` | Phase 96 |
| RLS policies (county-scoped) | ✅ BUILT | 143 migration files | Phase 96 |
| `OwnerPortal.tsx` (4-step: search/review/appeal/submitted) | ✅ BUILT | `src/pages/OwnerPortal.tsx` | Phase 97 |
| `owner-portal-lookup` edge function | ✅ BUILT | `supabase/functions/owner-portal-lookup/` | Phase 97 |
| `useOwnerPortalLookup` hook | ✅ BUILT | `src/hooks/useOwnerPortalLookup.ts` | Phase 97 |

---

## WAVE 1: ACTIVATION SPRINT

> Three fully-built features with zero UI entry points. Fix all three in parallel.

---

### Phase 92: Sketch → Workbench Integration

> **Goal**: Wire the complete SketchModule into PropertyWorkbench as a 7th tab  
> **Agent**: Workbench Agent  
> **Complexity**: S (3 files modified, 0 files created)  
> **Dependencies**: None  
> **Parallel Group**: WAVE 1A

#### What Exists
- `SketchModule` — 3-tier (Measurement/Sketch/Plan Trace), GPS fetch, GLA delta detection, 15% flag-for-review, saves via `addObservation()` to IndexedDB
- `PropertyWorkbench` — 6 tabs (`summary|forge|atlas|dais|dossier|pilot`), `TAB_COMPONENTS` record, `SuiteTab` type union
- `SuiteTabNavigation` — renders tab bar from `SuiteTab` type
- ADR: "Sketch-as-Observation" — sketches are routed observations, Field Studio owns zero tables

#### What's Missing
- `"sketch"` not in `SuiteTab` union type
- `SketchModule` not imported in `PropertyWorkbench.tsx`
- No tab trigger in `SuiteTabNavigation`
- `SketchModule` requires `assignmentId` + `parcelId` + `currentGLA` + `onBack` + `onSaved` — need to bridge these from `WorkbenchContext`

#### Sub-Phases

##### 92.1 — Extend SuiteTab Type
**File**: `src/components/workbench/types.ts`

```typescript
// Add "sketch" to existing SuiteTab union
export type SuiteTab = "summary" | "forge" | "atlas" | "dais" | "dossier" | "pilot" | "sketch";
```

##### 92.2 — Wire SketchModule into PropertyWorkbench
**File**: `src/components/workbench/PropertyWorkbench.tsx`

```typescript
import { SketchModule } from "@/components/sketch/SketchModule";

// Add sketch to TAB_COMPONENTS with a wrapper that bridges WorkbenchContext → SketchModule props
// SketchModule needs: assignmentId (use parcel.id as fallback), parcelId, currentGLA (from parcel context)
// onBack → setActiveTab("forge"), onSaved → invalidate parcel-observations query
```

##### 92.3 — Add Sketch Tab Trigger to SuiteTabNavigation
**File**: `src/components/workbench/SuiteTabNavigation.tsx`

```typescript
// Add sketch entry with PenTool icon from lucide-react
// Position: after "dossier", before "pilot"
```

#### Acceptance Criteria
- [ ] Sketch tab appears in Workbench when a parcel is loaded
- [ ] All 3 sketch tiers (Measure/Sketch/Plan Trace) functional
- [ ] Saving a sketch observation creates a local IndexedDB entry via `addObservation()`
- [ ] GLA >15% delta auto-flags for review with toast notification
- [ ] "Back" button returns to Forge tab
- [ ] 0 TypeScript errors

---

### Phase 93: Smart Views Engine

> **Goal**: Transform SavedFiltersPanel from a static filter list into a query-builder with persistence  
> **Agent**: Sentinel Agent  
> **Complexity**: M (1 migration, 1 hook, 1 component, 2 modified files)  
> **Dependencies**: None  
> **Parallel Group**: WAVE 1B

#### What Exists
- `SavedFiltersPanel` — basic saved filter UI (already wired at `smart-views` case in AppLayout)
- `useSmartActions.ts` — 24 anomaly detection rules with provenance metadata
- IA_MAP `smart-views` view under Home module
- No `saved_views` table — filters exist only in component state

#### What's Missing
- **Persistence**: No database table for saved view definitions
- **Query Builder**: No visual filter chip builder (property class, value range, neighborhood, flag state)
- **Live Preview**: No debounced count preview
- **Alert Integration**: No "notify me when count changes" toggle
- **Sharing**: No deep-link `?view=<id>`

#### Sub-Phases

##### 93.1 — saved_views Migration
**File**: `supabase/migrations/20260322000001_phase93_saved_views.sql`

```sql
CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid REFERENCES public.counties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}',  -- { property_class: [], value_min: N, ... }
  sort_by text DEFAULT 'parcel_number',
  sort_dir text DEFAULT 'asc',
  last_result_count integer,
  last_run_at timestamptz,
  alert_on_change boolean DEFAULT false,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users see own views + shared views in their county
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own + shared views" ON public.saved_views
  FOR SELECT USING (
    auth.uid() = user_id 
    OR (is_shared = true AND county_id IN (
      SELECT county_id FROM public.profiles WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users manage own views" ON public.saved_views
  FOR ALL USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER set_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

##### 93.2 — useSavedViews Hook
**File**: `src/hooks/useSavedViews.ts`

```typescript
// CRUD operations for saved_views table
// useQuery: list views for current user/county
// useMutation: create, update, delete, execute (count preview)
// Execute: builds dynamic supabase query from filter JSON → returns count + sample rows
// Filter schema:
//   { property_class: string[], value_min: number, value_max: number,
//     neighborhood_code: string[], has_flag: string[], permit_status: string[],
//     year_built_min: number, year_built_max: number }
```

##### 93.3 — SmartViewsPanel Component
**File**: `src/components/smart-views/SmartViewsPanel.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ Smart Views                                    [+ New View]  │
├─────────────────────────────────────────────────────────────┤
│ Filter Builder:                                              │
│ [Property Class ▼] [Value Range ▬▬▬] [Neighborhood ▼]      │
│ [Flags: ⚠️ zero-improvement ✓] [Permits: active ▼]         │
│ [Year Built: 1950 — 2020]                                   │
│                                                              │
│ Preview: 847 parcels match  [Save View] [Alert ☐]          │
├─────────────────────────────────────────────────────────────┤
│ Saved Views:                                                 │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ ★ Zero-Improvement Properties  │ 234 parcels │ 2h ago │   │
│ │ ★ High-Value Outliers          │  47 parcels │ 1d ago │   │
│ │ ★ Uncalibrated Neighborhoods   │  12 nbhds  │ 3d ago │   │
│ └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

##### 93.4 — Replace SavedFiltersPanel in AppLayout
**File**: `src/components/layout/AppLayout.tsx`

```typescript
// Change: case "smart-views": return <SavedFiltersPanel />;
// To:     case "smart-views": return <SmartViewsPanel />;
```

#### Acceptance Criteria
- [ ] Visual filter builder with property class, value range, neighborhood, flag, permit, year-built chips
- [ ] Debounced live count preview (fires 500ms after last filter change)
- [ ] Save/load named views with CRUD
- [ ] "Alert on change" toggle persisted in DB
- [ ] Shared views visible to county colleagues
- [ ] Deep-link: `?view=<uuid>` pre-loads saved filters
- [ ] 0 TypeScript errors

---

### Phase 94: AxiomFS Real Storage Layer

> **Goal**: Connect AxiomFSDashboard from hardcoded sampleFiles to the real `dossier-files` Supabase bucket  
> **Agent**: Librarian Agent  
> **Complexity**: M (1 hook, 3 files modified)  
> **Dependencies**: None  
> **Parallel Group**: WAVE 1C

#### What Exists
- `AxiomFSDashboard` — 5 sub-components (`AxiomFSActions`, `FileLatticeCanvas`, `FileListPanel`, `FileDetailsPanel`, `AxiomFSMetrics`)
- `FileNode` interface (id, name, type, size, modified, tags, children, position)
- `dossier-files` storage bucket (created Phase 35)
- `DefensePacketGenerator` — generates PDFs but doesn't write to bucket
- `sampleFiles[]` hardcoded array with 4 folders and 8 mock files

#### What's Missing
- **Storage hook**: No `useAxiomFS` hook querying `supabase.storage.from("dossier-files")`
- **Real data**: `sampleFiles` is hardcoded, not from bucket
- **Upload/Download**: `AxiomFSActions` has no real file operations
- **File details**: `FileDetailsPanel` shows mock metadata
- **Write integration**: `DefensePacketGenerator` doesn't save to bucket

#### Sub-Phases

##### 94.1 — useAxiomFS Hook
**File**: `src/hooks/useAxiomFS.ts`

```typescript
// useQuery: recursively list dossier-files bucket → map StorageObject[] to FileNode[]
// useMutation: upload (via supabase.storage.upload), download (signed URL), delete (admin-only)
// File type mapping: .pdf→document, .csv/.json→data, .jpg/.png→image, .geojson→data, etc.
// Tags: derived from path prefix (e.g., "defense-packets/", "field-photos/", "gis-exports/")
// Refresh: invalidate on upload/delete
```

##### 94.2 — Replace sampleFiles in AxiomFSDashboard
**File**: `src/components/axiomfs/AxiomFSDashboard.tsx`

```typescript
// Replace: const files = sampleFiles;
// With:    const { data: files = [], isLoading } = useAxiomFS();
// Add loading state, empty state ("No files yet. Upload your first document.")
```

##### 94.3 — Wire AxiomFSActions for Real Operations
**File**: `src/components/axiomfs/AxiomFSActions.tsx`

```typescript
// Upload: file input → supabase.storage.upload("dossier-files", path, file)
// Download: supabase.storage.createSignedUrl("dossier-files", path, 3600) → window.open
// Delete: admin-only guard via useUserRole(), supabase.storage.remove()
// Toast feedback on success/error
```

##### 94.4 — Defense Packet → AxiomFS Pipeline
**File**: `src/components/proof/DefensePacketGenerator.tsx`

```typescript
// After PDF generation, upload to dossier-files/defense-packets/<parcelNumber>_<timestamp>.pdf
// Emit TerraTrace event: { event_type: "defense_packet_stored", source_module: "dossier" }
// Invalidate AxiomFS query cache
```

##### 94.5 — Wire AxiomFS into IA_MAP + AppLayout
**Files**: `src/config/IA_MAP.ts`, `src/components/layout/AppLayout.tsx`

```typescript
// Add view { id: "axiomfs", label: "File System", icon: FolderTree, scope: "county" } to Registry module
// Add lazy import + case "axiomfs": return <AxiomFSDashboard />;
```

#### Acceptance Criteria
- [ ] AxiomFS shows real files from `dossier-files` bucket (no hardcoded data)
- [ ] Upload files via drag-and-drop or file picker
- [ ] Download via signed URL (1 hour expiry)
- [ ] Delete restricted to admin role
- [ ] Defense packets auto-saved to AxiomFS after generation
- [ ] File type icons and tags derived from storage path
- [ ] Accessible from Registry → "File System" view
- [ ] 0 TypeScript errors

---

## WAVE 2: INTELLIGENCE LAYER

> Wire everything from Wave 1 into the AI command surface.

---

### Phase 95: TerraPilot Tool Expansion

> **Goal**: Expand the TerraPilot swarm tool registry with Phase 90-94 capabilities  
> **Agent**: Router Agent  
> **Complexity**: M (2 files modified, 1 edge function updated)  
> **Dependencies**: Phases 92, 93, 94 (needs their exports to exist)

#### What Exists
- `terrapilot-router/index.ts` — `TOOL_AGENT_MAP` (20 tools), `TOOL_WRITE_LANE` (20 entries), topological sort, router system prompt
- `terrapilot-chat/index.ts` — sub-agent execution with tool calling
- Phase 90: `usePACSDelta` hook (connection status, drift products)
- Phase 91: `useRunAlerts` hook (invokes notification-alerts edge function)
- Phase 93: `useSavedViews` hook (query builder)
- `SketchModule` props interface

#### What's Missing
- **New tools not in TOOL_AGENT_MAP**: `run_alerts`, `get_pacs_delta`, `create_smart_view`, `open_sketch`, `upload_document`, `get_file_list`
- **Router system prompt** doesn't describe new tool capabilities
- **terrapilot-chat** tool execution doesn't handle the new tool functions

#### Sub-Phases

##### 95.1 — Expand TOOL_AGENT_MAP + TOOL_WRITE_LANE
**File**: `supabase/functions/terrapilot-router/index.ts`

```typescript
// Add to TOOL_AGENT_MAP:
run_alerts: "os",             // Triggers notification-alerts edge function
get_pacs_delta: "os",         // Returns PACS drift report
create_smart_view: "os",      // Saves a filter set as a named view
open_sketch: "os",            // Navigation hint → Workbench/Sketch tab
upload_document: "dossier",   // Upload file to AxiomFS
get_file_list: "dossier",     // List files in AxiomFS

// Add to TOOL_WRITE_LANE:
run_alerts: "read",           // Alert engine is read + notify
get_pacs_delta: "read",       // Read-only drift check
create_smart_view: "read",    // Views are user-scoped, not constitutional
open_sketch: "read",          // Navigation only
upload_document: "documents", // Dossier write-lane
get_file_list: "read",        // Read-only listing
```

##### 95.2 — Tool Implementations in terrapilot-chat
**File**: `supabase/functions/terrapilot-chat/index.ts`

```typescript
// run_alerts:        invoke("notification-alerts") → return { notifications_created, ids }
// get_pacs_delta:    SELECT from pacs connector health → return drift summary
// create_smart_view: INSERT into saved_views → return { view_id, name }
// open_sketch:       return { action: "navigate", target: "workbench", tab: "sketch", parcelId }
// upload_document:   storage.upload("dossier-files", ...) → return { path, size }
// get_file_list:     storage.list("dossier-files") → return FileNode[]
```

##### 95.3 — Update Router System Prompt
**File**: `supabase/functions/terrapilot-router/index.ts`

```
Add tool descriptions to router prompt so AI can discover:
- "run_alerts" — Run the county alert engine (deadlines, DQ regression, assignments)
- "get_pacs_delta" — Check PACS SQL Server sync drift across all products
- "create_smart_view" — Save a parcel filter set as a named view
- "open_sketch" — Navigate user to Sketch tab for a specific parcel
- "upload_document" — Store a file in the document management system
- "get_file_list" — List all documents in the file system
```

#### Acceptance Criteria
- [ ] TerraPilot can respond to "Run alert checks" → invokes `run_alerts` tool
- [ ] TerraPilot can respond to "How's the PACS sync?" → invokes `get_pacs_delta`
- [ ] TerraPilot can respond to "Save a view of all zero-improvement parcels" → `create_smart_view`
- [ ] TerraPilot can respond to "Open the sketch tool for this parcel" → `open_sketch`
- [ ] Router decomposes compound requests with new tools into parallel sub-tasks
- [ ] All new tools have correct constitutional write-lane assignments
- [ ] 0 TypeScript errors in edge functions

---

## WAVE 3: SCALE & PUBLIC SURFACE

> Multi-county validation + public-facing owner portal hardening.

---

### Phase 96: Multi-County Expansion

> **Goal**: Validate the multi-county RLS model with a second county and upgrade the county switching UX  
> **Agent**: TrafficCop Agent  
> **Complexity**: M (1 migration, 2 components modified, 1 hook)  
> **Dependencies**: Phase 95 (tools should work before scaling)

#### What Exists
- `counties` table with FIPS, name, state, config
- `county_id` FK on parcels, assessments, sales, appeals, trace_events, notifications, etc.
- RLS policies scoped via `county_id` + `auth.uid()`
- `CountySwitcher` component in TopSystemBar
- `county-setup` edge function (creates county tenant + default study period)
- `OnboardingWizard` detects county_id absence → forces setup
- Active county: Benton County WA (FIPS 53005) — only county with infrastructure

#### What's Missing
- **Second county**: No other county exists to validate RLS isolation
- **County UX**: `CountySwitcher` is dropdown-only — no status cards, no invitation flow
- **Invitation**: No way to add a user to a county they don't own
- **Analytics isolation**: AdminDashboard has no county context — shows all data
- **localStorage persistence**: Switching counties doesn't persist across sessions

#### Sub-Phases

##### 96.1 — Yakima County Bootstrap Migration
**File**: `supabase/migrations/20260322000002_phase96_yakima_county.sql`

```sql
-- Insert Yakima County WA as validation tenant
-- FIPS: 53077, State: WA
-- Creates: county record, default study period, sample config
-- Does NOT create any parcels (those come from future ingest)
```

##### 96.2 — County Switcher UX Upgrade
**File**: `src/components/admin/CountySwitcher.tsx`

```
┌───────────────────────────────────────────────┐
│ Active County                                 │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│ │ 🟢 Benton County, WA                    │  │
│ │ FIPS 53005 · 188,706 parcels · Active    │  │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │
│                                               │
│ Available:                                    │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│ │ ⚪ Yakima County, WA                    │  │
│ │ FIPS 53077 · 0 parcels · New            │  │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │
└───────────────────────────────────────────────┘
```

##### 96.3 — useCountyList Hook
**File**: `src/hooks/useCountyList.ts`

```typescript
// useQuery: SELECT * FROM counties ORDER BY name
// Includes: parcel_count (subquery), study_period_count, last_activity
// Used by: CountySwitcher, AdminDashboard county selector
// Persists last_selected_county_id to localStorage
```

##### 96.4 — RLS Isolation Audit
**Scope**: Manual verification in Supabase SQL editor

```sql
-- Verify cross-county isolation for key tables:
-- 1. parcels: Benton user cannot SELECT Yakima parcels
-- 2. trace_events: Events scoped per county
-- 3. notifications: Alerts scoped per county
-- 4. saved_views: Views scoped per user+county
-- 5. appeals: Appeals scoped per county
```

##### 96.5 — AdminDashboard County Context
**File**: `src/components/admin/AdminDashboard.tsx`

```typescript
// Add county selector at top of admin dashboard
// All admin sub-panels already use useActiveCountyId() — verify they filter correctly
// PACSLiveMonitor + AlertEngineDashboard should show county-specific data
```

#### Acceptance Criteria
- [ ] Yakima County exists as a tenant (FIPS 53077, study period, empty parcel set)
- [ ] CountySwitcher shows both counties with status badges
- [ ] Switching counties updates all dashboard data
- [ ] RLS blocks Benton users from seeing Yakima data (and vice versa)
- [ ] Last-used county persists across page reloads
- [ ] AdminDashboard panels filter by active county
- [ ] 0 TypeScript errors

---

### Phase 97: Owner Portal Enhancement

> **Goal**: Harden the public `/portal` route for production — DATA_CONSTITUTION compliance, real-time tracking, document upload, mobile-first  
> **Agent**: Workbench Agent  
> **Complexity**: M (1 page rewrite, 1 hook enhanced, 1 edge function rule added)  
> **Dependencies**: Phase 95 (notification rule for portal submissions)

#### What Exists
- `src/pages/OwnerPortal.tsx` — 4-step flow (search/review/appeal/submitted)
- `owner-portal-lookup` edge function — public parcel search
- `useOwnerPortalLookup` hook — wraps edge function call
- Direct `supabase.from("parcels")` and `supabase.from("appeals")` calls IN the page component — **violates DATA_CONSTITUTION**
- `/portal` route in `App.tsx` — unprotected (correct, it's public-facing)

#### What's Missing
- **DATA_CONSTITUTION violation**: Direct supabase calls in `OwnerPortal.tsx` must move to hooks
- **Realtime tracking**: No live appeal status subscription
- **Document upload**: No way for owners to attach evidence (PDFs, photos)
- **Hearing display**: `appeals.hearing_date` exists but isn't shown
- **Notification**: No alert to county staff when a portal appeal is filed
- **Mobile CSS**: Page not optimized for phone viewport
- **PDF export**: No "My Assessment Summary" download

#### Sub-Phases

##### 97.1 — Extract Supabase Calls to useOwnerPortal Hook
**File**: `src/hooks/useOwnerPortal.ts`

```typescript
// Move from OwnerPortal.tsx into dedicated hook:
// - searchParcels(query: string) → parcels[]
// - getParcelDetails(parcelId: string) → ParcelDetail
// - submitAppeal(data: AppealFormData) → appeal record
// - useAppealStatus(appealId: string) → realtime subscription
// All supabase.from() calls consolidated here
// Emit TerraTrace event on submission
```

##### 97.2 — Real-time Appeal Status Tracking
**Hook**: `src/hooks/useOwnerPortal.ts`

```typescript
// After appeal submission, subscribe to appeals row via supabase.channel()
// Status changes (submitted → under_review → hearing_scheduled → resolved)
// Display hearing_date when status = hearing_scheduled
// Unsubscribe on unmount
```

##### 97.3 — Document Upload for Appeal Evidence
**File**: `src/pages/OwnerPortal.tsx`

```
┌─────────────────────────────────────────────────┐
│ Support Your Appeal                              │
│                                                  │
│ [📎 Attach Evidence Files]                       │
│ ┌──────────────────────────────────────────┐    │
│ │ comparable_sales.pdf  (245 KB)     [✕]  │    │
│ │ property_photos.zip   (1.2 MB)     [✕]  │    │
│ └──────────────────────────────────────────┘    │
│ Max 5 files, 10 MB each · PDF, JPG, PNG, ZIP    │
└─────────────────────────────────────────────────┘
```

```typescript
// Upload to: dossier-files/owner-evidence/<countyId>/<parcelNumber>/<filename>
// Storage RLS: public INSERT allowed (owner uploads), admin SELECT only
// Attach file paths to appeal record via appeal.evidence_urls JSONB
```

##### 97.4 — Portal Submission Notification Rule
**File**: `supabase/functions/notification-alerts/index.ts`

```typescript
// NEW RULE 4: Owner Portal Appeal Submission
// Trigger: new appeal with source = "owner_portal" in last 1 hour
// Notify: all admin+analyst users for the county
// Severity: "warning"
// Dedup: per appeal ID (one notification per submission)
```

##### 97.5 — Mobile-First CSS + PWA Polish
**File**: `src/pages/OwnerPortal.tsx`

```css
/* Touch targets ≥44px, readable font sizes, single-column layout */
/* Progress stepper responsive: horizontal on desktop, vertical on mobile */
/* Form inputs: full-width on mobile, max-w-md on desktop */
/* Appeal status card: prominent hearing date with calendar icon */
```

##### 97.6 — Assessment Summary PDF Export
**File**: `src/pages/OwnerPortal.tsx`

```typescript
// "Download My Assessment Summary" button on review step
// Generates single-page PDF with: parcel number, address, assessed value,
// land value, improvement value, property class, tax year, neighborhood
// Uses browser print API (window.print() with print-only CSS)
// No server-side PDF generation needed
```

#### Acceptance Criteria
- [ ] Zero `supabase.from()` calls in `OwnerPortal.tsx` — all in `useOwnerPortal.ts`
- [ ] Realtime appeal status updates via Supabase channel subscription
- [ ] Document upload (max 5 files, 10 MB each, PDF/JPG/PNG/ZIP)
- [ ] Hearing date displayed when appeal status = `hearing_scheduled`
- [ ] County staff notified when portal appeal is submitted (notification rule 4)
- [ ] Mobile viewport renders clean single-column layout
- [ ] All touch targets ≥44px per WCAG 2.1
- [ ] "Download Summary" generates printable assessment summary
- [ ] 0 TypeScript errors

---

## Cross-Phase Integration Points

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW ACROSS PHASES                           │
│                                                                      │
│  SketchModule ─[observation]→ fieldStore ─[sync]→ forgeService      │
│       ↑ (92)                                          ↓              │
│  TerraPilot ─[open_sketch]→ navigation hint    TerraTrace audit     │
│       ↑ (95)                                          ↓              │
│  SmartViews ─[create_smart_view]→ saved_views table  trace_events   │
│       ↑ (93)                                          ↓              │
│  AxiomFS ─[upload_document]→ dossier-files bucket    lineage        │
│       ↑ (94)                    ↓                                    │
│  DefensePacket ──────────► dossier-files/defense-packets/            │
│       ↑                         ↓                                    │
│  OwnerPortal ─[evidence]→ dossier-files/owner-evidence/ (97)        │
│                                 ↓                                    │
│  notification-alerts ─────► rule 4: owner_portal_submission (97)     │
│                                 ↓                                    │
│  CountySwitcher ─[switch]→ useActiveCountyId ─→ ALL queries (96)    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Agent Assignment Matrix

| Phase | Agent | Scope | Files Created | Files Modified | Estimated Effort |
|-------|-------|-------|---------------|----------------|-----------------|
| 92 | Workbench | Tab wiring | 0 | 3 | S (30 min) |
| 93 | Sentinel | Filter engine + DB | 3 (migration, hook, panel) | 2 (AppLayout, IA_MAP) | M (90 min) |
| 94 | Librarian | Storage binding | 1 (hook) | 4 (dashboard, actions, details, defense) | M (90 min) |
| 95 | Router | Tool manifest | 0 | 2 (router, chat) | M (60 min) |
| 96 | TrafficCop | RLS + UX | 2 (migration, hook) | 2 (switcher, admin) | M (90 min) |
| 97 | Workbench | Public surface | 1 (hook) | 2 (portal page, notification-alerts) | M (90 min) |

---

## The Operational Gate

> **Before Phase 96 can fully validate multi-county RLS**, these operational steps must execute:

```powershell
# 1. Push all pending migrations (including new Phase 93/96 migrations)
supabase db push

# 2. Deploy all edge functions
supabase functions deploy --all

# 3. Seed Benton County GIS (188,706 parcels from E:\Benton_County_Assessor.gdb)
py -3.12 scripts/seed_benton_gis.py

# 4. Seed Benton County assessment data
.\scripts\seed_benton.ps1

# 5. Deploy pacs-query with SQL Server credentials
supabase functions deploy pacs-query --env-file scripts/.env.seed
```

**These are operational steps, not code phases.** Code is complete; execution unlocks live data.

---

## Summary: The 92–97 Arc

| Wave | Phases | Theme | Key Metric |
|------|--------|-------|------------|
| 1 | 92 + 93 + 94 | **Activate dormant features** | 3 built-but-unwired features go live |
| 2 | 95 | **AI awareness** | TerraPilot gains 6 new tools |
| 3 | 96 + 97 | **Scale + public surface** | Multi-county isolation + citizen portal hardened |

**Total new deliverables**: 7 hooks, 3 components, 2 migrations, 1 edge function update, 6 new TerraPilot tools.  
**Total files modified**: ~15.  
**Zero new edge functions created** — all extension of existing infrastructure.

> *"The best phase is the one where you stop building new things and wire up the things you already built."* — Ralph, Phase 92

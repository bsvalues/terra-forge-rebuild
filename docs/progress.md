# TerraFusion OS — Progress Tracker
> **Purpose**: Track implementation progress against plan.md.

**Created**: 2026-02-07  
**Last Updated**: 2026-03-14  
**Agent**: Cloud Coach

---

## Current State Summary

**Active Phase**: Phase 49 — Scheduled Tasks & Automation (COMPLETE)  
**Last Completed Task**: 49.4 — IA_MAP + AppLayout wiring  
**Next Task**: Phase 50 planning  
**Blockers**: None

---

| 48 | Advanced Reporting | ✅ COMPLETE | 4/4 | report_templates + report_runs tables (RLS, seeded 6 system templates), useReporting hooks (CRUD, run engine, aggregation), ReportingDashboard UI (template gallery, run history, result dialog with grouped table), IA_MAP + AppLayout wiring |
| 47 | Bulk Parcel Operations | ✅ COMPLETE | 3/3 | useBulkOperations hooks (selection, search, batch mutations), BulkOperationsPanel UI (multi-select table, 5 batch actions, CSV export), IA_MAP + AppLayout wiring |
| 22 | Data Constitution Enforcement | ✅ COMPLETE | — | Zero direct supabase imports in components, all routed through hooks/services |
| 23 | Route Consolidation Audit | ✅ COMPLETE | 2/2 | Orphan TerraFusionLayout deleted, 4-module IA_MAP verified |
| 24 | Trust OS Provenance Coverage | ✅ COMPLETE | 5/5 | Every key metric wrapped with ProvenanceNumber |
| 25 | Advanced Analytics | ✅ COMPLETE | 5/5 | Ratio trends, forecasting, outlier detection, neighborhood clustering |
| 26 | Segment-Driven Revaluation | ✅ COMPLETE | 5/5 | Segment definitions, per-segment calibration, equity rebalancing |
| 27 | Cost Approach Engine | ✅ COMPLETE | 5/5 | Depreciation CRUD, batch cost apply, cost ratio analysis, CostMode tabs |
| 28 | Income Approach Engine | ✅ COMPLETE | 4/4 | Income CRUD, cap rate/GRM calculator, batch apply, IncomeMode in Factory |
| 29 | DAIS Workflow Engine | ✅ COMPLETE | 4/4 | Notices table, NewAppealDialog, useNotices hook, DB-persisted NoticesPanel |
| 30 | Mobile & PWA Polish | ✅ COMPLETE | 4/4 | PWA meta tags, install prompt, mobile nav drawer, touch-friendly audit |
| 31 | TerraPilot Tool Execution | ✅ COMPLETE | 4/4 | generate_notice + run_model tools, navigation fix, inline result cards |
| 32 | Roll Certification Pipeline | ✅ COMPLETE | 4/4 | certification_events table, value lock trigger, certify neighborhood UI, state roll export |
| 33 | Security Hardening | ✅ COMPLETE | 5/5 | npm audit fix, RLS county-scope on notices/cert_events, broken RLS fix on 5 tables, has_role() RBAC, privilege escalation fix |
| 34 | Batch Notice Generation | ✅ COMPLETE | 5/5 | batch_notice_jobs table, useBatchNotices hook, BatchNoticeDashboard, Factory DB persistence, Notice Center route |
| 35 | Dossier Evidence Pipeline | ✅ COMPLETE | 4/4 | Multi-type AI narratives, dossier-files storage bucket, packet finalization workflow, evidence synthesis |
| 36 | User & Role Management | ✅ COMPLETE | 4/4 | admin-manage-users edge function, useUserManagement hook, UserManagementPanel UI, AdminDashboard wiring |
| 37 | Security & Audit Dashboard | ✅ COMPLETE | 3/3 | useSecurityAudit hook, SecurityAuditDashboard UI, AdminDashboard wiring |
| 38 | County Onboarding Wizard | ✅ COMPLETE | 4/4 | county-setup edge function, useOnboardingStatus hook, OnboardingWizard UI, Index.tsx gate |
| 39 | Performance & Testing | ✅ COMPLETE | 3/3 | Lazy-loaded routes (React.lazy+Suspense), writeLane+terraTrace Vitest suites (18 tests), Vite vendor chunking (react, query, ui, charts, maps, motion, three) |
| 40 | Production Readiness | ✅ COMPLETE | 4/4 | ErrorBoundary (route+module level), global error toast handler, SkipToContent WCAG link, ARIA landmarks on main |
| 41 | Data Export & Reporting | ✅ COMPLETE | 3/3 | ExportService (CSV/JSON, 7 datasets, filters, audit trail), ExportCenter UI (dataset picker, format toggle, history), IA_MAP + AppLayout wiring |
| 42 | User Preferences & Settings | ✅ COMPLETE | 3/3 | useUserPreferences hook (6 prefs, localStorage, global sync), useProfileUpdate (governed name edit), Enhanced ControlCenter (profile editor, prefs toggles, sign out, compact/reduced-motion CSS) |
| 43 | Parcel Comparison Tool | ✅ COMPLETE | 3/3 | useParcelComparison hook (add/remove/clear, max 4), ParcelComparisonPanel (side-by-side table, delta highlighting, $/sqft derived row, inline search), IA_MAP + AppLayout wiring |
| 44 | Parcel Watchlist & Favorites | ✅ COMPLETE | 3/3 | parcel_watchlist table (RLS, priority, notes), useParcelWatchlist hooks (CRUD, toggle, isWatched), WatchlistPanel UI (search, filter, priority stats, navigate-to-parcel), Star toggle in SummaryTab header |
| 45 | Recent Parcels & Navigation History | ✅ COMPLETE | 3/3 | useRecentParcels hook (localStorage, max 20, dedup), RecentParcelsPanel UI (search, navigate, clear), Command Palette recents section, auto-track on parcel load |
| 46 | Saved Filters & Smart Views | ✅ COMPLETE | 3/3 | saved_filters table (RLS, user-scoped, JSONB config), useSavedFilters hooks (CRUD, pin, mark-used), SavedFiltersPanel UI (filter builder dialog, condition editor, pin/apply/delete), IA_MAP + AppLayout wiring |

## Phase 46 Saved Filters & Smart Views Log (2026-03-15)

### 46.1 Database Migration ✅
- `saved_filters` table with user-scoped RLS (SELECT/INSERT/UPDATE/DELETE)
- JSONB `filter_config` for flexible condition storage
- `is_pinned`, `last_used_at`, `result_count` fields
- Composite index on (user_id, is_pinned, updated_at)

### 46.2 useSavedFilters Hook ✅
- `useSavedFilters` — fetch all user filters ordered by pin + recency
- `useCreateFilter` / `useUpdateFilter` / `useDeleteFilter` — full CRUD
- `useMarkFilterUsed` — track last-used timestamp and result counts
- `FILTER_FIELDS` config for parcels, sales, appeals datasets
- `OPERATOR_LABELS` for 10 comparison operators

### 46.3 SavedFiltersPanel UI + Routing ✅
- Filter builder dialog with dynamic condition rows (field, operator, value)
- Dataset selector (parcels, sales, appeals)
- Pin toggle, edit, delete, apply actions
- Stats cards (total views, pinned, datasets)
- Registered as "Smart Views" under Home module in IA_MAP
- Lazy-loaded in AppLayout, legacy redirect configured

### 45.1 useRecentParcels Hook ✅
- localStorage-persisted, max 20 items, automatic deduplication
- Global shared state via listener pattern (same as preferences/notifications)
- `addRecent`, `removeRecent`, `clearRecents` operations

### 45.2 RecentParcelsPanel UI ✅
- Full panel with search filter, navigate-to-parcel, individual removal
- Empty state with guidance text
- Clear History button for bulk removal
- Animated card layout with time-ago display

### 45.3 Integration & Wiring ✅
- `recents` view registered in Home module in IA_MAP with Clock icon
- Legacy redirect added for `recents` → `home:recents`
- Lazy-loaded RecentParcelsPanel in AppLayout
- Auto-tracking: `addRecent` called when parcel loads in PropertyWorkbench
- Command Palette shows top 5 recent parcels when no search query is entered

## Phase 44 Parcel Watchlist & Favorites Log (2026-03-14)

### 44.1 parcel_watchlist Table ✅
- Created `parcel_watchlist` with user_id, parcel_id, county_id, note, priority (low/normal/high/critical)
- Unique constraint on (user_id, parcel_id) prevents duplicates
- Full RLS: users can only CRUD their own watchlist items
- Indexes on user_id+created_at and parcel_id for fast lookups

### 44.2 useParcelWatchlist Hooks ✅
- `useWatchlist`: fetches all items with joined parcel data (number, address, value, class)
- `useIsWatched(parcelId)`: checks if specific parcel is starred
- `useAddToWatchlist` / `useRemoveFromWatchlist`: governed mutations with TerraTrace events
- `useUpdateWatchlistItem`: edit note and priority
- `useToggleWatchlist`: convenience toggle (add/remove in one call)

### 44.3 WatchlistPanel UI + Navigation ✅
- Full management panel with search, priority filter, priority count stats
- WatchlistCard: star icon, parcel info, note display, inline edit panel (note + priority)
- Navigate-to-parcel button opens parcel in Workbench
- Star toggle button added to SummaryTab parcel header (filled amber when watched)
- Registered `watchlist` view in Home module in IA_MAP
- Lazy-loaded in AppLayout with code-splitting


### 43.1 useParcelComparison Hook ✅
- Manages array of up to 4 ComparisonParcel objects
- `addParcel(id)`: fetches full parcel data from DB, prevents duplicates, enforces max 4
- `removeParcel(id)` and `clearAll()` for management
- COMPARISON_FIELDS constant defines 10 comparable attributes with format metadata

### 43.2 ParcelComparisonPanel UI ✅
- Side-by-side table layout comparing 2-4 parcels
- Inline parcel search using existing useParcelLookup (constitutional — no direct DB calls in component)
- Delta highlighting: highest numeric values in primary color, lowest in destructive
- Derived $/sqft row calculated from assessed_value / building_area
- Add/remove parcels with animated search panel (AnimatePresence)
- Empty state with call-to-action
- Responsive with horizontal scroll on narrow viewports

### 43.3 Navigation Wiring ✅
- Added `compare` view to Workbench module in IA_MAP with GitCompareArrows icon
- Added `compare` legacy redirect
- Lazy-loaded ParcelComparisonPanel in AppLayout with code-splitting

## Phase 42 User Preferences & Settings Log (2026-03-14)

### 42.1 Preference & Profile Hooks ✅
- `useUserPreferences`: 6 persisted preferences (compactMode, reducedMotion, showMapLayers, trustModeDefault, notificationSound, autoSync)
- Global state shared across all hook instances via listener pattern
- Side effects: applies `compact` and `reduce-motion` CSS classes to document root
- `resetPrefs()` restores defaults
- `useProfileUpdate`: governed mutation for display_name via profiles table, emits trace event

### 42.2 Enhanced ControlCenter ✅
- Profile section: avatar placeholder, inline display name editing with save
- Governance section: Trust Mode toggle, Auto Sync toggle
- Display section: Compact Mode, Reduced Motion, Map Layers, Notification Sound toggles
- System section: version display, county ID badge, Reset Prefs and Sign Out buttons
- Replaces previous minimal ControlCenter with full settings experience

### 42.3 Compact Mode & Reduced Motion CSS ✅
- `.compact` class reduces padding (p-4→0.75rem, p-6→1rem), gaps, and spacing globally
- `.reduce-motion` class forces all animations and transitions to near-zero duration
- Both applied/removed via document.documentElement.classList toggle

## Phase 41 Data Export & Reporting Log (2026-03-14)

### 41.1 Export Service ✅
- `exportService.ts`: typed query builders for 7 datasets (parcels, assessments, sales, appeals, exemptions, notices, model_receipts)
- CSV serializer with proper escaping, JSON pretty-print
- Configurable filters: taxYear, neighborhoodCode, propertyClass
- Row limit selector (500–10,000)
- `downloadBlob()` utility for browser file download
- `data_exported` trace event emitted on every export for audit trail

### 41.2 Export Center UI ✅
- Dataset selection grid with 7 options and active state highlighting
- Context-sensitive filter panel (tax year for assessments/appeals/exemptions, neighborhood/class for parcels)
- Format toggle: CSV or JSON with icon buttons
- Export history sidebar tracking last 10 exports with re-download
- Tips card with RLS scope and audit trail reminders

### 41.3 Navigation Wiring ✅
- Added `exports` view to Home module in IA_MAP with Download icon
- Added `exports` legacy redirect
- Lazy-loaded ExportCenter in AppLayout with code-splitting

### 40.1 ErrorBoundary Component ✅
- Class-based React ErrorBoundary with branded fallback UI
- Shows alert icon, friendly message, expandable technical details (error + component stack)
- Retry button (resets error state) and Dashboard button (hard nav to /)
- Accepts `fallbackTitle` prop for context-specific messaging

### 40.2 Route & Module Error Boundaries ✅
- Top-level ErrorBoundary wraps entire App (catches provider failures)
- Per-route ErrorBoundary on Index, Property, Factory routes with contextual titles
- Module-level ErrorBoundary in AppLayout wraps renderStage() with dynamic module name
- Nested hierarchy: App → Route → Module for granular error isolation

### 40.3 WCAG 2.1 AA Accessibility ✅
- SkipToContent component: sr-only link visible on focus, jumps to #main-content
- Added `id="main-content"` and `role="main"` ARIA landmark to AppLayout main element
- Focus-visible styling uses design system tokens (primary, ring)

### 40.4 Global Error Toast Handler ✅
- `useGlobalErrorHandler` hook catches unhandledrejection and window.error events
- Shows user-friendly toast with truncated error message (120 char limit)
- Filters benign errors: ResizeObserver loops, AbortError/signal cancellations
- Auto-dismiss after 6 seconds

## Phase 39 Performance & Testing Log (2026-03-14)

### 39.1 Lazy-Loaded Route Components ✅
- All 5 page components (Index, Auth, NotFound, Property, Factory) converted to React.lazy() imports
- Wrapped Routes in Suspense with branded RouteFallback spinner
- Enables automatic code-splitting per route — Factory/Property bundles only load when navigated to

### 39.2 WriteLane + TerraTrace Test Suites ✅
- writeLane.test.ts: 12 tests covering matrix completeness, resolveWriteLane, assertWriteLane violations, field guardrail
- terraTrace.test.ts: 6 tests covering computeDiff (changed keys, empty, null, added keys, precision)
- Total project test count: 106 tests, all passing

### 39.3 Vite Vendor Chunking ✅
- Added manual chunks: vendor-react, vendor-query, vendor-ui (Radix primitives)
- Existing chunks retained: vendor-three, vendor-maps, vendor-charts, vendor-motion
- Better long-term caching — vendor chunks rarely change between deploys

### 38.1 county-setup Edge Function ✅
- Three actions: `create_county` (creates county + assigns user + grants admin), `join_county` (assigns user + grants viewer), `list_counties`
- First user in a county automatically gets admin role
- Joining users get viewer role by default
- FIPS code deduplication: if county with same FIPS exists, user joins it instead of creating duplicate
- Uses service-role client to bypass county_id WITH CHECK constraint on profiles

### 38.2 useOnboardingStatus Hook ✅
- `useOnboardingStatus`: checks if user has county, parcels, and study periods
- `useListCounties`: fetches all available counties via edge function
- `useCreateCounty`: creates county + assigns user, reloads page on success
- `useJoinCounty`: joins existing county, reloads page on success

### 38.3 OnboardingWizard UI ✅
- Multi-step wizard: Welcome → Choose (create/join) → Create County form / Join County selector → Complete
- Welcome step: animated logo, feature chips (Smart Ingestion, Spatial Analysis, AI Copilot)
- Create step: county name, FIPS code, state selector (all 50 US states)
- Join step: scrollable county list with selection highlight
- Progress dots, step transitions with AnimatePresence
- Full responsive design

### 38.4 Index.tsx Onboarding Gate ✅
- Checks `profile.county_id` after auth loading completes
- Shows OnboardingWizard if no county assigned
- Otherwise renders normal AppLayout

## Phase 37 Security & Audit Dashboard Log (2026-03-14)

### 37.1 useSecurityAudit Hook ✅
- Queries trace_events for last 7 days with 1000-row window
- Computes: totalEvents24h/7d, writeEvents24h, highRiskEvents24h, activeActors24h
- Module breakdown and event type breakdown with sorted counts
- Filters write-relevant events for audit trail (50 most recent)
- Classifies events by risk level: HIGH (value overrides, certifications, notices), MEDIUM (appeals, workflows), LOW (updates)
- Auto-refresh every 120s

### 37.2 SecurityAuditDashboard UI ✅
- Threat level banner: quiet/normal/elevated based on high-risk event count
- 4 stat cards: Events 24h, Events 7d, Write Ops 24h, High Risk 24h
- Module activity chart: progress bars showing 7-day activity by suite (forge, dais, atlas, etc.)
- Event type distribution: scrollable list with risk level badges
- Compliance checklist: 8 security controls with pass/fail status (RLS, RBAC, privilege escalation, etc.)
- Write audit trail: scrollable feed of security-relevant events with actor IDs, timestamps, risk badges

### 37.3 AdminDashboard Integration ✅
- Replaced "coming soon" Security tab placeholder with SecurityAuditDashboard
- No more placeholder tabs in AdminDashboard — all tabs fully functional

## Phase 36 User & Role Management Log (2026-03-14)

### 36.1 admin-manage-users Edge Function ✅
- Admin-only edge function with `requireAdmin` gate
- Actions: `list_users` (profiles + roles + auth emails), `assign_role`, `revoke_role`, `update_county`
- County isolation: only manages users within admin's county
- Self-protection: prevents admin from revoking their own admin role
- Uses service-role client to bypass RLS for role/county operations

### 36.2 useUserManagement Hook ✅
- `useUserList`: fetches merged user data (profile + roles + email + lastSignIn) via edge function
- `useAssignRole`: mutate to add role to user via edge function
- `useRevokeRole`: mutate to remove role from user via edge function
- `useUpdateUserCounty`: mutate to change user's county assignment
- All mutations invalidate `admin-users` query cache

### 36.3 UserManagementPanel UI ✅
- Stats row: total users, admins, analysts, no-role counts
- User cards with avatar, display name, email, role badges
- Inline role management: removable role badges + "Add Role" dropdown
- Expandable details: join date, last sign-in, user ID
- Admin access gate: shows error card for non-admin users
- Mobile-responsive with role badges in expanded section on small screens

### 36.4 AdminDashboard Integration ✅
- Replaced "coming soon" placeholder in Users tab with UserManagementPanel
- Imported UserManagementPanel component

### 35.1 Storage & Schema ✅
- Verified `dossier-files` storage bucket with RLS policies for authenticated users
- Added `finalized_at` and `finalized_by` columns to `dossier_packets` table

### 35.2 Multi-Type AI Narratives ✅
- Enhanced `defense-narrative` edge function with 5 narrative type prompts: defense, value_change, appeal_response, exemption_letter, evidence_synthesis
- Each type has tailored system prompt and user prefix for contextually appropriate output
- NarrativeDraftingPanel now passes `narrativeType` to edge function for type-specific generation
- Added `invokeSynthesizeEvidence` service function for evidence synthesis

### 35.3 Packet Finalization & Evidence Synthesis ✅
- `useFinalizePacket` hook: transitions packet status from draft → finalized with TerraTrace emission
- `usePacketContents` hook: fetches documents and narratives by IDs for packet detail view
- `PacketDetailView` component: expandable packet contents showing docs + narratives
- Synthesize button: calls evidence_synthesis narrative type, saves result as new narrative
- Finalize button: locks packet with status badge and trace event

### 35.4 UI Enhancements ✅
- Expandable packet cards with chevron animation (AnimatePresence)
- Finalized packets show lock icon + green status badge
- Inline document/narrative preview within packet detail view

## Phase 34 Batch Notice Generation Log (2026-03-14)

### 34.1 batch_notice_jobs Table ✅
- Created `batch_notice_jobs` table with county FK, neighborhood_code, property_class, filters JSONB
- Tracks total_parcels, notices_generated, notices_failed, ai_drafted_count, status
- County-scoped RLS policies for SELECT/INSERT/UPDATE
- Added `batch_job_id` FK column to notices table for batch linkage

### 34.2 useBatchNotices Hook ✅
- `useBatchNoticeJobs`: query batch jobs with status filter
- `useBatchNoticesByJob`: fetch all notices linked to a specific batch job
- `useCreateBatchNoticeJob`: full pipeline — fetch parcels, create job, generate notices (AI + template), persist to DB, update job stats
- `useBulkUpdateNoticeStatus`: batch-approve or batch-send all draft notices in a job
- Added `batch_notices_generated` and `batch_notices_status_changed` to TraceEventType

### 34.3 BatchNoticeDashboard UI ✅
- County-scoped Notice Center with 3-column layout: Generate Panel + Batch Jobs list
- Neighborhood selector from live data, property class filter, AI toggle with configurable limit
- Batch job cards with status icons, stats (generated/failed/AI-drafted), and inline actions
- Expandable review panel showing individual notices with status badges
- Bulk Approve All and Mark Sent actions for streamlined pipeline
- Notice preview dialog with AI badge
- Download All button for batch export

### 34.4 Factory BatchNoticePanel DB Persistence ✅
- Updated Factory regression BatchNoticePanel to persist each generated notice to `notices` table via `useCreateNotice`
- Added county_id to `fetchParcelDetails` select for proper notice creation
- Notices now linked to calibration_run_id for traceability

### 34.5 Route & Navigation Wiring ✅
- Added `notices` view to Home module in IA_MAP with Mail icon
- Lazy-loaded `BatchNoticeDashboard` in AppLayout
- Legacy redirect registered for deep-linking
- Added `invalidateNotices()` to queryInvalidation registry

## Phase 33 Security Hardening Log (2026-03-14)

### 33.1 npm Vulnerability Fix ✅
- Updated serialize-javascript to 6.0.2 fixing high-severity CVE
- Resolved transitive vulnerability across @rollup/plugin-terser, vite-plugin-pwa, workbox-build

### 33.2 RLS County-Scope: notices & certification_events ✅
- Dropped 3 bare `true` policies on notices, replaced with `county_id = get_user_county_id()`
- Dropped 2 bare `true` policies on certification_events, replaced with county-scoped equivalents
- PII (recipient_name, recipient_address) now county-isolated

### 33.3 Broken RLS Fix: 5 Tables ✅
- Fixed `profiles.id = auth.uid()` → `get_user_county_id()` on:
  segment_definitions (4 policies), segment_calibration_runs (2), cost_approach_runs (3),
  income_properties (4), income_approach_runs (3)
- Total: 16 policies replaced — non-admin access was completely broken before

### 33.4 RBAC has_role() Function ✅
- Created `has_role(_user_id, _role)` security definer function with `SET search_path = public`
- Recreated `get_user_county_id()` and `is_admin()` with `SET search_path = public` to fix linter warnings
- user_roles table already existed with proper RLS

### 33.5 Privilege Escalation Fix ✅
- **CRITICAL**: Profiles UPDATE policy now prevents county_id changes via WITH CHECK constraint
- Users can update display_name, avatar_url but cannot change their county assignment
- Prevents cross-county data access attack via self-modification of county_id

## Phase 32 Roll Certification Pipeline Log (2026-03-14)

### 32.1 certification_events Table ✅
- Created `certification_events` table with county FK, event_type, tax_year, neighborhood_code, parcel counts, readiness_score, blocker_snapshot
- RLS policies for authenticated read/write
- Created `useCertificationEvents` and `useRecordCertificationEvent` hooks

### 32.2 Value Lock Trigger ✅
- Created `prevent_certified_assessment_update()` trigger function on assessments
- Prevents modification of land_value, improvement_value, or total_value on certified assessments
- Must uncertify first (set certified=false) before value changes are allowed

### 32.3 Certify Neighborhood UI ✅
- Added `certifyNeighborhood` mutation to CertificationPipeline with per-row Certify button
- CommitmentButton with gold variant appears in expanded neighborhood detail when certRate < 100%
- Records certification_event on success with neighborhood code, parcel counts
- County-level certification also records certification_event

### 32.4 State Roll Export ✅
- Created `useRollExport` hook generating CSV/XLSX of certified roll
- Multi-sheet export: Certified Roll (parcel-level) + Summary by Class (aggregated)
- Metadata sheet with report type, tax year, record count, generation timestamp
- Export button integrated into CertificationPipeline header

## Phase 31 TerraPilot Tool Execution Log (2026-03-14)

### 31.1 Missing Pilot Write Tools ✅
- Added `generate_notice` write tool: creates DB notice with ai_drafted=true, HitL confirmation, TerraTrace audit
- Added `run_model` write tool: queues calibration_run for neighborhood, HitL gated, TerraTrace audit
- Updated WRITE_TOOL_RISK map: generate_notice=high, run_model=medium
- Updated getWriteDescription for both new tools

### 31.2 Client-Side Navigation Fix ✅
- `navigate_to_parcel` now updates WorkbenchContext.setParcel instead of react-router navigate
- Keeps user in the SPA workbench flow instead of hard page navigation
- Shows toast notification on navigation

### 31.3 Tool Icon/Label Registry ✅
- Added `generate_notice` and `run_model` to TOOL_ICONS and TOOL_LABELS maps
- Client-side rendering now shows proper badges for all 19 tools

### 31.4 Inline Tool Result Cards ✅
- `ToolResultCards` component renders structured data cards inside chat messages
- Parcel search results: mini-list with address, parcel number, assessed value
- Comparable sales: comp grid with sale prices
- Workflow summary: 3-column grid (permits/appeals/exemptions counts)
- Neighborhood stats: 2x2 grid with median, average, parcel count, avg area

## Phase 30 Mobile & PWA Polish Log (2026-03-14)

### 30.1 PWA Mobile Meta Tags ✅
- Added `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`
- Added `theme-color`, `format-detection`, `mobile-web-app-capable` meta tags
- Updated viewport to `viewport-fit=cover` with `user-scalable=no` for native feel
- Improved SEO: title under 60 chars, description under 160 chars with keywords

### 30.2 PWA Install Prompt ✅
- Created `InstallPrompt.tsx` with `beforeinstallprompt` event capture
- iOS detection with Share → Add to Home Screen guidance
- Dismissable with localStorage persistence
- Styled with sovereign gradient and glass card aesthetic

### 30.3 Mobile Navigation Drawer ✅
- Created `MobileNavDrawer.tsx` using Sheet component (slide from left)
- Hamburger menu button in TopSystemBar (visible on mobile only)
- 48px minimum touch targets on all nav items
- Auto-closes on module selection

### 30.4 Touch-Friendly Responsive Audit ✅
- DockLauncher: 44px min touch targets, safe-area-inset-bottom padding
- ModuleViewBar: 44px min-height touch targets, `-webkit-overflow-scrolling: touch`
- TopSystemBar: mobile-first padding (px-3 → px-4), hamburger with 44px tap zone
- Added `.safe-area-bottom` CSS utility for notch-aware layouts

## Phase 29 DAIS Workflow Engine Log (2026-03-14)

### 29.1 Database Schema ✅
- Created `notices` table with parcel FK, county FK, notice_type, subject, body, status, ai_drafted
- Full RLS policies for authenticated users, indexes on parcel/status/county
- Enabled realtime via supabase_realtime publication

### 29.2 NewAppealDialog + createAppealRecord ✅
- `NewAppealDialog`: parcel search, value inputs, reduction preview, write-lane governed creation
- `createAppealRecord` added to daisService with TerraTrace emission
- Added `appeal_created` and `notice_created` to TraceEventType, `notice` to ArtifactType
- Wired into AppealsWorkflow "New Appeal" button

### 29.3 useNotices Hook ✅
- `useNotices`: query notices with parcel join, optional status filter
- `useCreateNotice`: DB insert with write-lane assertion + trace event
- `useUpdateNoticeStatus`: status transition mutation

### 29.4 NoticesPanel DB Persistence ✅
- Replaced in-memory notice state with DB-backed queries/mutations
- Status filter (All/Drafts/Sent) with counts
- Download, mark-sent actions persist to DB
- AI-drafted notices flagged with Sparkles badge

## Phase 28 Income Approach Engine Log (2026-03-14)

### 28.1 Database Schema ✅
- Created `income_properties` table with computed NOI column, cap_rate, GRM, county-scoped RLS
- Created `income_approach_runs` table for batch run tracking with full RLS

### 28.2 Income Approach Hook ✅
- `useIncomeApproach.ts`: CRUD for income properties, batch apply with cap rate & GRM methods
- Pure `computeIncomeApproach()` function for single-parcel calculation
- Reconciliation logic: averages cap rate value and GRM value when both available

### 28.3 Income UI Panels ✅
- `IncomeApproachCalculator`: interactive NOI/cap rate/GRM calculator with reconciled value
- `IncomeDataManager`: CRUD table for per-parcel rental income, expenses, vacancy, cap rate, GRM
- `BatchIncomeApplyPanel`: batch apply with default parameters, stats summary, result table with ratio verdicts

### 28.4 Factory Integration ✅
- Added `IncomeMode` as new Factory tab between Cost and Comp Review
- Three sub-tabs: Income Data, Calculator, Batch Apply

## Phase 27 Cost Approach Engine Log (2026-03-14)

### 27.1 Database Schema ✅
- Created `cost_approach_runs` table (county-scoped, links to cost_schedules)
- Full RLS: county-isolated CRUD policies

### 27.2 Depreciation Row Editor ✅
- `DepreciationRowEditor`: CRUD for depreciation rows per cost schedule
- Auto-advancing new row defaults (age ranges, depreciation %)

### 27.3 Batch Cost Apply Panel ✅
- `BatchCostApplyPanel`: Applies cost approach to all parcels in a neighborhood
- Fetches parcels + qualified sales, computes RCNLD for each
- Stats summary: parcels processed, with sales, median ratio, COD
- Result table with per-parcel RCN, cost value, sale price, ratio, and verdict icons

### 27.4 Cost Ratio Analysis ✅
- `CostRatioAnalysis`: Compares cost-indicated values against sale prices
- IAAO metrics: median ratio, mean ratio, COD, PRD with pass/warn/fail verdicts
- Ratio distribution bar chart with target range reference

### 27.5 CostMode Integration ✅
- Restructured `CostMode` with tabbed layout: Schedules & Calculator, Depreciation Tables, Batch Apply
- Side-by-side depreciation editor + curve visualization
- Batch apply + ratio analysis in grid layout


### 26.1 Database Schema ✅
- Created `segment_definitions` table (county-scoped, factor/ranges JSONB, source tracking)
- Created `segment_calibration_runs` table (links segments to calibration runs with equity metrics)
- Full RLS: county-isolated CRUD policies on both tables

### 26.2 Segment Manager UI ✅
- `SegmentManagerPanel`: create/toggle/delete segments with factor selection
- Range parser for comma-separated numeric ranges (e.g. "0-1500, 1500-2500, 2500+")
- "Import from Clusters" — auto-generates neighborhood segments from Phase 25 K-means results
- Expandable segment cards with inline equity metrics per range (median ratio, COD)
- ProvenanceNumber wrapping on all ratio/COD values

### 26.3 Segment Calibration Panel ✅
- `SegmentCalibrationPanel`: per-segment ratio bar charts with IAAO target reference lines
- Color-coded bars: green (0.95–1.05), gold (0.90–1.10), red (outside)
- Range detail grid with verdict icons (CheckCircle/AlertTriangle/XCircle)
- Aggregate COD badge per segment

### 26.4 Equity Rebalancing Workflow ✅
- `EquityRebalancingPanel`: identifies segments outside ±3% ratio tolerance
- Generates rebalancing proposals with adjustment factors (target/current ratio)
- Priority-sorted by severity (largest deviation first)
- Direction indicators (increase/decrease) with estimated % impact
- "Queue All Proposals" action for Factory integration
- "All Segments in Balance" success state

### 26.5 Route & Navigation Wiring ✅
- Added `segments` view to IA_MAP Factory module
- Lazy-loaded `SegmentRevaluationDashboard` in AppLayout
- Legacy redirect registered for deep-linking
- Hook: `useSegmentDefinitions.ts` (CRUD + equity metrics)

## Phase 25 Advanced Analytics Log (2026-03-14)

### 25.1 Ratio Trend Sparklines ✅
- `RatioTrendSparklines` component: 3 mini line charts (Median Ratio, COD, PRD) over 6 years
- Trend badges (Improving/Stable/Declining) based on movement toward IAAO targets
- ProvenanceNumber wrapping on all values (source: `ratio-trend`)

### 25.2 Assessment Value Forecast ✅
- `ForecastPanel` with linear regression + 95% confidence intervals
- Historical data plotted with forecast extension (gold dots)
- Summary cards: current avg value, projected growth, forecast year value
- Visual confidence bands on chart

### 25.3 Automated Outlier Detection ✅
- `OutlierDetectionPanel` with dual detection (Z-score + IQR)
- Adjustable Z-score threshold slider (1.5σ–4.0σ)
- Distribution stats (Q1, Median, Q3, IQR)
- Z-score bar chart with color-coded severity
- Flagged parcels table with method/reason columns

### 25.4 Neighborhood Clustering ✅
- `ClusteringPanel` with K-means (k=3) on [avgValue, avgSqft, avgAge]
- Feature normalization for scale-invariant clustering
- Cluster summary cards with centroid statistics
- Scatter plot (Value vs Sqft) colored by cluster assignment
- Full neighborhood assignment table with distance-to-centroid

### 25.5 Route & Navigation Wiring ✅
- Added `advanced-analytics` view to IA_MAP Factory module
- Lazy-loaded `AdvancedAnalyticsDashboard` in AppLayout
- Legacy redirect registered for deep-linking
- Hook: `useAdvancedAnalytics.ts` with 4 specialized queries

## Phase 24 Trust OS Provenance Coverage Log (2026-03-14)

### 24.1 VEIMetricCard Provenance ✅
- Added `source` and `fetchedAt` optional props to `VEIMetricCard`
- All 6 IAAO metric cards (Median Ratio, COD, PRD, PRB, Tier Slope, Appeals Rate) now wrapped with `ProvenanceNumber`
- Source labels: `ratio-analysis`, `appeals-by-tier`

### 24.2 RegressionSummaryCards Provenance ✅
- Added `fetchedAt` prop to `RegressionSummaryCardsProps`
- R² Adjusted, F-Statistic, RMSE, Durbin-Watson values wrapped with `ProvenanceNumber`
- Source: `regression-analysis`, cache policy: `cached 120s`

### 24.3 Factory Dashboard Header ✅
- Already had `ProvenanceNumber` wrapping — verified complete

### 24.4 CalibrationDiagnostics Provenance ✅
- All 6 diagnostic values (R², Adj R², RMSE, F-statistic, Sample Size, Variables) wrapped with `ProvenanceNumber`
- Source: `calibration-run`, cache policy: `cached 120s`

### 24.5 RollReadiness + DataQuality Provenance ✅
- Roll Readiness verdict score ring wrapped with `ProvenanceNumber` (source: `roll-readiness`)
- Data Quality overall score (weighted avg %) wrapped with `ProvenanceNumber` (source: `data-quality`)

## Phase Progress

| Phase | Name | Status | Tasks | Notes |
|-------|------|--------|-------|-------|
| 0 | Foundation | ✅ COMPLETE | 9/9 | Counties, county_id, auth, profiles, sidebar |
| 1 | IDS (Ingest) | ✅ COMPLETE | 11/11 | File upload, AI mapping, validation pipeline |
| 2 | VEI (Equity) | ✅ COMPLETE | 9/9 | Ratio study, IAAO compliance, outlier filtering |
| 3 | Workbench | ✅ COMPLETE | 7/7 | Parcel search, history, TerraPilot AI |
| 4 | GeoEquity | ✅ COMPLETE | 6/6 | Map, equity overlay, ArcGIS sync |
| 5 | Proof Layer | ✅ COMPLETE | — | TerraTrace, Model Receipts, Defense Packets |
| 6 | Mass Appraisal Factory | ✅ COMPLETE | 40/40 | Regression, Cost, Comps, Scenarios, Integration |
| 7 | Value Adjustment Ledger | ✅ COMPLETE | 5/5 | Batch Apply, Rollback, Ledger UI, Auto-Narrative |
| 8 | TerraPilot Agentic Intelligence | ✅ COMPLETE | 4/4 | Tool calling, 7 tools, UI badges, navigation |
| 9 | TerraFusionSync Resilience | ✅ COMPLETE | 6/6 | Circuit breaker, health monitor, sync contracts, data source registry, conflict resolution |
| 10 | Operational Completeness | ✅ COMPLETE | 3/3 | VEI + GeoEquity dock modules, enriched Suite Hub, expanded command palette |
| 11 | Hub Intelligence & Certification | ✅ COMPLETE | 3/3 | Live parcel search, certification dashboard, scenario modeling |
| 12 | Production Hardening | ✅ COMPLETE | 5/5 | Realtime trace feed, notice generation, defense packet export, keyboard review queue, pagination |
| 13 | Operational Intelligence Uplift | ✅ COMPLETE | 3/3 | Neighborhood leaderboard, enhanced factory header, Muse drafting tools |
| 14 | The Observability Singularity | ✅ COMPLETE | 3/3 | Audit timeline sparkline, neighborhood deep-dive dialog, smart quick actions |
| 15 | Field Studio Sync Engine | ✅ COMPLETE | 4/4 | Idempotent sync, conflict detection, background auto-sync, photo upload pipeline |
| 16 | Data Quality Scoring Engine | ✅ COMPLETE | 3/3 | Weighted scoring, neighborhood heatmap, stale alerts, grade distribution |
| 17 | Roll Readiness Command Center | ✅ COMPLETE | 3/3 | Go/no-go verdict, weighted checklist, neighborhood grid, summary |
| 18 | Operational Completeness Sprint | ✅ COMPLETE | 3/3 | Scenario Apply+VEI, Notification Bell, SAGA real DB wiring |
| 19 | Production Completeness | ✅ COMPLETE | 3/3 | All SAGA runners real DB, BOE Defense Packet 5-appendix, 16 tests passing |
| 20 | Plan Phases A-D Completion | ✅ COMPLETE | 4/4 | Activity feed filter, Atlas real GIS writes, Drill-out links, Parcel Lens verified |

---

## Phase 20 Plan Phases A-D Completion Log (2026-02-17)

### 20.1 Phase A: TerraTrace Activity Feed ✅
- Already had model_receipts fallback, realtime subscription, richer event icons
- Added **source_module filter pills** (All/Forge/Atlas/Dais/Dossier/Pilot/OS)
- Filter is inline, respects external `moduleFilter` prop override

### 20.2 Phase B: Write-Lane Mutations ✅
- Previously completed: `useParcelMutations` already routed through `forgeService`
- Previously completed: `ReviewQueueContext` already emits `review_completed`/`review_skipped` trace events
- All suite services (forge, dais, dossier, atlas) fully operational

### 20.3 Phase C: SummaryTab Parcel360 ✅
- Previously completed: SummaryTab consumes `useParcel360` snapshot
- Domain Freshness Ribbon with per-domain loading/error/success states
- Operational Blockers section with certification alerts
- All verified in current codebase

### 20.4 Phase D: Parcel Lens + Drill-Out ✅
- **AtlasService** upgraded from stubs to real `gis_features` writes (upsert boundary, add annotation, update coordinates)
- **DaisTab**: Added "Roll Readiness" drill-out link in header
- **AtlasTab**: Added "Open GeoEquity" drill-out link in header
- **ForgeTab**: Already had "Open in Factory" drill-out link
- Parcel Lens enforced: all tabs scoped via `useWorkbench()` parcel context

## Phase 18 Operational Completeness Sprint Log (2026-02-17)

### 18.1 Scenario Mode: Apply + VEI Ratio Preview ✅
- "Apply Scenario" CommitmentButton commits adjustments to `value_adjustments` table
- VEI ratio impact preview: shows current vs proposed median ratio and COD
- Scenario save/load: save named scenarios locally, load to compare
- Batch parcel value updates on apply with adjustment_reason metadata

### 18.2 Global Notification Bell ✅
- `NotificationBell` integrated into `TopSystemBar` (visible on every page)
- `useRealtimeNotifications` hook subscribes to `trace_events` INSERT via Supabase Realtime
- Auto-pushes notifications for: value overrides, workflow changes, notices, model runs, SAGA completions/failures
- Notification popover with mark-read, clear-all, sound toggle, browser notification permission

### 18.3 SAGA Runner Real DB Wiring ✅
- `sync_refresh` runner now queries actual parcels table for delta detection
- `bulk_import` runner validates real records through the sync engine pipeline
- Assessment Update and PACS Migration remain simulated with realistic step timing
- All runners emit TerraTrace events via the traced orchestrator

## Phase 17 Roll Readiness Command Center Log (2026-02-17)

### 17.1 Roll Readiness Hook ✅
- `src/hooks/useRollReadiness.ts` — comprehensive readiness aggregation
- 11-query parallel fetch: parcels, assessments, calibrations, appeals, permits, exemptions, data quality fields
- 5 weighted checks: certification (30%), calibration (25%), appeals (20%), data quality (15%), assessment coverage (10%)
- GO/CAUTION/NO_GO verdict with 90/60 thresholds
- Per-neighborhood readiness scoring with cert rate, calibration status, R² values

### 17.2 Roll Readiness Dashboard ✅
- `src/components/certification/RollReadinessDashboard.tsx` — full command center
- Hero verdict banner with animated SVG score ring and glow effects
- 8-stat summary grid with semantic color coding
- 3 tabbed views: Checklist (grouped by pass/warn/fail), Neighborhoods (sortable grid), Summary
- Checklist items with weight badges, status icons, detail text
- Neighborhood rows with cert progress bars, R² badges, parcel counts
- Full skeleton loading states

### 17.3 Navigation Integration ✅
- Roll Readiness added to DockLauncher (⌘0) with ShieldCheck icon
- Lazy-loaded route in AppLayout
- Suite Registry entry in SuiteHub with optimized-green accent

## Phase 16 Data Quality Scoring Engine Log (2026-02-17)

### 16.1 Weighted Scoring Hook ✅
- `src/hooks/useDataQualityScoring.ts` — per-parcel completeness scoring
- 9 fields with defensibility-weighted scoring (neighborhood 15%, assessed_value 15%, coords 12%, etc.)
- Letter grades A-F with configurable thresholds (90/75/60/40)
- Staleness detection: warning at 90 days, critical at 180 days
- Neighborhood aggregation with worst-field gap analysis

### 16.2 Scoring Engine Dashboard ✅
- `src/components/quality/DataQualityScoringEngine.tsx` — full quality dashboard
- Overall grade banner with weighted average score
- 5 tabbed views: Neighborhood Heatmap, Grade Distribution, Field Coverage, Stale Alerts, Worst Parcels
- Visual heatmap grid with color-coded neighborhood tiles
- Stale data alerts with critical/warning severity levels
- Lowest-scoring parcels table with missing field badges
- Grade distribution bar chart (A through F)
- Weighted field coverage table sorted by weakest fields

### 16.3 Navigation Integration ✅
- Quality Engine added to DockLauncher (⌘9)
- Lazy-loaded route in AppLayout
- Suite Registry entry in SuiteHub

## Phase 14 The Observability Singularity Log (2026-02-17)

### 14.1 Audit Timeline Sparkline ✅
- `src/components/dashboard/AuditTimelineSparkline.tsx` — 7-day event volume visualization
- Mini bar chart with per-day tooltips showing event counts
- Trend badge: compares last 3 days vs prior 4 days average
- Today's bar highlighted with primary color
- Integrated into SuiteHub between System Vitals and Suite Registry

### 14.2 Neighborhood Deep-Dive Dialog ✅
- `src/components/dashboard/NeighborhoodDeepDiveDialog.tsx` — Full stats on click-through
- Valuation overview: median value, average value, parcel count
- Certification progress with percentage bar
- Geo coverage percentage (parcels with coordinates)
- Active calibration model display: R², RMSE, sample size, variables
- Property class distribution with horizontal bars
- Active workflows: pending appeals, open permits, exemptions
- Sales activity summary (total vs qualified)
- Click any neighborhood row in the leaderboard to open

### 14.3 Smart Quick Actions Ribbon ✅
- `src/components/dashboard/SmartQuickActions.tsx` — Context-aware action recommendations
- Detects: uncalibrated neighborhoods, pending appeals, missing geocoding, low sales volume, uncertified assessments
- Priority-sorted (critical → high → medium → info) with color-coded cards
- Metric badges showing counts/percentages
- "All Clear" state when no actions needed
- Integrated into SuiteHub above Suite Registry

## Phase 13 Operational Intelligence Uplift Log (2026-02-17)

### 13.1 Neighborhood Leaderboard ✅
- `src/components/dashboard/NeighborhoodLeaderboard.tsx` — Ranked readiness scoreboard
- Weighted composite score: 40% certification, 25% calibration, 15% R² quality, penalties for appeals/permits
- Per-neighborhood badges: R² percentage, pending appeal count
- Trophy icons for top 3 neighborhoods
- Integrated into Command Briefing as 3rd column in health grid

### 13.2 Enhanced Factory Dashboard Header ✅
- Added 2 new metrics: Calibrated neighborhoods ratio and Average R²
- Factory header now shows 7 aggregate stats across all neighborhoods
- Color-coded R² indicator (green >70%, amber otherwise)
- Calibrated count vs total neighborhoods ratio display

### 13.3 TerraPilot Muse Drafting Tools ✅
- 4 new Muse-mode tools: `draft_notice`, `draft_appeal_response`, `explain_value_change`, `summarize_parcel_history`
- Each tool gathers full parcel context (assessments, sales, permits, appeals) for AI synthesis
- Muse tool selection in edge function: read-only Pilot tools + full Muse tools
- Chat UI: Muse suggestion chips ("Draft assessment change notice", "Explain value change", etc.)
- Tool icons and labels for all 4 drafting tools in chat badge display

## Phase 12 Production Hardening Log (2026-02-15)

### 12.1 Realtime Activity Feed ✅
- `TerraTraceActivityFeed` now subscribes to `postgres_changes` on `trace_events` table
- Live LIVE indicator with pulsing radio icon
- Auto-invalidates query cache on new INSERT events
- Parcel-scoped filtering via realtime channel filter

### 12.2 Notice Generation Pipeline ✅
- `src/components/dais/NoticesPanel.tsx` — Full notice generation UI
- 4 template types: Assessment Change, Hearing Notice, Exemption Decision, General Correspondence
- Recipient fields, parcel context injection, customizable body
- Download as text, mark-as-sent workflow
- Integrated into DaisTab replacing placeholder

### 12.3 Defense Packet One-Click Export ✅
- Enhanced `DefensePacketGenerator.tsx` with richer appendices
- Appendix A: Full assessment breakdown (land + improvement + total)
- Appendix B: Comp ratios included alongside sale data
- Appendix C: Operator IDs on model receipts
- Appendix D: TerraTrace audit trail reference
- Date-stamped filenames

### 12.4 Bulk Review Queue Keyboard Navigation ✅
- `ReviewQueueBar` now captures keyboard events when queue is active
- Shortcuts: →/j (next), ←/k (prev), C (complete), S (skip), N (next pending), Esc (close)
- Input/textarea/select elements excluded from capture
- Keyboard hint indicator in navigation bar

### 12.5 Performance Pagination Gates ✅
- `ParcelSearchPanel` upgraded from fixed 100-row limit to server-side pagination
- `select("*", { count: "exact" })` for total count
- 50-row page size with Previous/Next controls
- Page resets on filter change
- Total count displayed in results badge

---

## Phase 9 Progress Log (2026-02-15)

### 9.1 Circuit Breaker Service ✅
- `src/services/circuitBreaker.ts` — Full circuit breaker with CLOSED/OPEN/HALF_OPEN states
- Retry helper with exponential backoff (`withRetry`)
- Named breaker registry (`getCircuitBreaker`, `getAllCircuitMetrics`)
- Configurable thresholds: failure count, reset timeout, slow call detection
- Fallback support when circuit is OPEN

### 9.2 Health Monitor Edge Function ✅
- `supabase/functions/system-health/index.ts` — 6-point health check
- Checks: database, parcels, trace_events, sales freshness, ingest pipeline, storage
- Returns overall status (healthy/degraded/unhealthy) with per-service latency
- 503 on unhealthy, 200 on healthy/degraded

### 9.3 Sync Envelope + SAGA Contracts ✅
- `src/types/sync.ts` — Full type system for TerraFusionSync
- SyncEnvelope: idempotency key, tenant isolation, payload hash, schema version
- SagaDefinition + SagaStep: durable workflow tracking with compensation
- 4 SAGA templates: bulk_import, assessment_update, pacs_migration, sync_refresh
- SystemHealth + HealthCheck + DataSourceConfig types

### 9.4 SyncDashboard UI ✅
- `src/components/sync/SyncDashboard.tsx` — Operational resilience dashboard
- Real-time health status with per-service cards
- Circuit breaker state visualization
- SAGA template catalog
- Wired into bottom dock navigation (⌘5)

### 9.5 Data Source Registry ✅
- `src/components/sync/DataSourceRegistry.tsx` — Multi-source ingest management panel
- CRUD operations against `data_sources` table with county-scoped RLS
- Support for 6 source types: CSV Upload, ArcGIS REST, API Endpoint, Legacy CAMA, FTP Feed, Manual Entry
- Sync status badges, record counts, last sync timestamps
- Register dialog with source type selection and connection URL

### 9.6 Conflict Resolution Queue ✅
- `src/components/sync/ConflictResolutionQueue.tsx` — Sync discrepancy review queue
- Side-by-side diff viewer (Local vs Remote values)
- Severity-tagged conflict cards (low/medium/high)
- Resolution actions: Keep Local, Accept Remote, Dismiss
- Detail dialog with full conflict context
- Demo conflicts seeded for UX validation

---

## Phase 8 Completion Log (2026-02-15)

### 8.1 Edge Function Tool Framework ✅
- Agentic loop with up to 3 tool rounds before streaming final response
- 7 tool definitions: search_parcels, fetch_comps, get_parcel_details, get_neighborhood_stats, get_recent_activity, navigate_to_parcel, get_workflow_summary
- Mode-aware tool filtering (Pilot gets all tools, Muse gets read-only subset)

### 8.2 Tool Execution Handlers ✅
- Each tool queries live database via service client
- fetch_comps: neighborhood + value-range matching with subject context
- get_neighborhood_stats: computes median/avg/min/max from parcel population
- navigate_to_parcel: returns client-side navigation intent

### 8.3 Chat UI Tool Rendering ✅
- Tool call badges with per-tool icons (Search, MapPin, BarChart3, etc.)
- Active tool execution spinner with tool-specific labels
- Tool metadata streamed as SSE event prefix before content tokens
- Suggestion chips for common Pilot queries

### 8.4 Workbench Navigation Wiring ✅
- navigate_to_parcel tool triggers React Router navigation to /property/:id
- Tab switching via tool result (summary/forge/atlas/dais/dossier)
- handleNavigationAction callback integrated into stream parser


---

## Phase 6 Completion Log (2026-02-15)

### 6.0 Database Schema ✅
- calibration_runs, cost_schedules, cost_depreciation, value_adjustments, comp_grids tables
- RLS policies: county-scoped access
- Write-lane matrix updated for forge domains

### 6.1 Factory Shell ✅
- `/factory` and `/factory/:mode` routes
- FactoryLayout with 4 mode tabs + NeighborhoodSelector
- Dock Launcher + SuiteHub integration

### 6.2 Regression Calibration ✅
- regression-calibrate edge function (Normal Equations OLS)
- RegressionControlPanel, CoefficientGrid, CalibrationScatterPlot, CalibrationDiagnostics
- "Apply to Parcels" → value_adjustments + TerraTrace

### 6.3 Cost Approach ✅
- CostScheduleEditor (CRUD), DepreciationCurveEditor (Recharts curves)
- CostApproachCalculator (interactive RCNLD)
- computeCostApproach pure function

### 6.4 Comp Review ✅
- CompMode with neighborhood ratio grid
- Color-coded flags (green/yellow/red), Median Ratio, COD
- "Send to Workbench" per-parcel action

### 6.5 Scenario Modeling ✅
- ScenarioMode shell for what-if analysis

### 6.6 Integration & Polish ✅
- "Open in Factory" link from ForgeTab header
- Latest calibration_run banner in ForgeTab
- "Send to Workbench" links from CompMode rows
- VEI + Factory ratio alignment (shared staleTime/refetch)
- Progress docs updated

---

## Polish Sprint (2026-02-15)

- ✅ Stale metrics: useRatioAnalysis + useVEIData with 2min staleTime + refetchOnWindowFocus
- ✅ Activity Feed: Fixed TerraTrace reason rendering for status transitions
- ✅ Permit notes: Inline preview in PermitsWorkflow list items

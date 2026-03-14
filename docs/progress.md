# TerraFusion OS — Progress Tracker
> **Purpose**: Track implementation progress against plan.md.

**Created**: 2026-02-07  
**Last Updated**: 2026-03-14  
**Agent**: Cloud Coach

---

## Current State Summary

**Active Phase**: Phase 32 — Roll Certification Pipeline (COMPLETE)  
**Last Completed Task**: 32.4 — State roll export  
**Next Task**: Phase 33 planning  
**Blockers**: None

---

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

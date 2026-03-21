# TerraFusion OS — Implementation Plan
> **Purpose**: Comprehensive phased plan synthesized from discovery.md and research.md. This is the engineering blueprint — every code change traces to a task here.

**Created**: 2026-02-07  
**Updated**: 2026-02-08  
**Status**: 🟡 READY FOR EXECUTION  
**Agent**: Cloud Coach

---

## Executive Summary

Build order: **Phase 0 (Foundation) → Phase 1 (IDS) → Phase 2 (VEI) → Phase 3 (Workbench) → Phase 4 (GeoEquity)**

Strategy: **Keep UI shell, rebuild data layer.** Existing components provide navigation, layout, and visual design. The data hooks, state management, and backend integration need rebuilding from real data contracts.

Current county focus: **Benton County, WA**. Salt Lake County work should be treated as reusable prototype infrastructure unless a task explicitly targets SLCO.

---

## Phase 0: Foundation
**Goal**: Establish multi-county schema, authentication, and core infrastructure  
**Depends on**: Nothing  
**Estimated complexity**: L  

### Tasks:
- [ ] **0.1** — Create `counties` table with FIPS code, name, state, config
- [ ] **0.2** — Add `county_id` column to `parcels`, `assessments`, `sales`, `appeals`, `data_sources`
- [ ] **0.3** — Create `profiles` table (user_id, display_name, county_id, avatar_url)
- [ ] **0.4** — Update RLS policies: county-scoped access using session context + `county_id`
- [ ] **0.5** — Implement thin auth (login/signup page, session management, role-based access)
- [ ] **0.6** — Create county selector component + persist active county in context
- [ ] **0.7** — Rebuild `WorkbenchContext` to include county context
- [ ] **0.8** — Add `updated_at` triggers on all tables missing them
- [ ] **0.9** — Restore FK constraints between parcels↔assessments, parcels↔sales, etc.

### Acceptance Criteria:
- User can sign up, log in, and be assigned to a county
- All queries are automatically scoped to the user's county
- RLS prevents cross-county data access
- `county_id` exists on all tenant-owned tables

### Schema Changes:
```sql
-- counties table
-- profiles table  
-- county_id on parcels, assessments, sales, appeals, data_sources
-- FK constraints restoration
-- RLS policy updates
-- updated_at triggers
```

---

## Phase 1: IDS (Intelligent Data Suite)
**Goal**: Real file-based data ingestion with fingerprinting, AI field mapping, and audit trail  
**Depends on**: Phase 0  
**Estimated complexity**: XL  

### Tasks:
- [ ] **1.1** — Create `ingest_runs` table (id, county_id, file_name, file_hash, status, field_mappings, record_count, errors, created_by, timestamps)
- [ ] **1.2** — Create `field_mapping_memory` table (county_id, source_field, canonical_field, confidence, learned_from_run_id)
- [ ] **1.3** — Create storage bucket `ingest-uploads` for CSV/Excel files
- [ ] **1.4** — Build edge function `ingest-upload`: receive file → hash → store → parse headers → return column list
- [ ] **1.5** — Build edge function `ingest-map`: AI field mapping using Lovable AI (match source columns to canonical schema)
- [ ] **1.6** — Build edge function `ingest-validate`: join quality check, value range validation, duplicate detection
- [ ] **1.7** — Build edge function `ingest-publish`: merge staging data into canonical tables (parcels, assessments, sales)
- [ ] **1.8** — Rebuild `IngestPillar` with real file upload, column mapping UI, validation report, preview/diff, publish confirmation
- [ ] **1.9** — Rebuild `InventoryPillar` with county-scoped record counts, data freshness tracking, health grade
- [ ] **1.10** — Rebuild `QualityPillar` with real join match rates from ingest runs
- [ ] **1.11** — Rebuild `VersionsPillar` with ingest run history and audit trail

### Acceptance Criteria:
- User can upload a CSV file and see AI-suggested field mappings
- Holy Trinity (Parcel ID, Total Value, Situs Address) requires explicit confirmation
- File is SHA256 fingerprinted and stored
- Data flows through validate → preview → publish pipeline
- Inventory shows real county-scoped data health metrics
- Ingest history is fully auditable

---

## Phase 2: VEI (Vertical Equity Index)
**Goal**: Production-quality ratio study dashboard with real data integration  
**Depends on**: Phase 0, Phase 1 (data must exist to analyze)  
**Estimated complexity**: M  

### Tasks:
- [ ] **2.1** — Consolidate VEI paths: merge `VEIDashboard` and `ForgeTab` equity view into single authoritative component
- [ ] **2.2** — Fix `compute_ratio_statistics` PRB calculation (replace simplified approximation with proper regression)
- [ ] **2.3** — Add real trend data: query historical ratio statistics across multiple tax years (not hardcoded arrays)
- [ ] **2.4** — Fix appeals data: replace hardcoded tier distribution with real tier-classified appeal counts
- [ ] **2.5** — Add county-scoping to all VEI queries
- [ ] **2.6** — Add neighborhood-level ratio comparison view (heatmap of COD/PRD by neighborhood)
- [ ] **2.7** — Add IAAO compliance indicators (pass/fail badges against standard thresholds)
- [ ] **2.8** — Add CSV/PDF export for ratio study reports
- [ ] **2.9** — Build "Valuation Command Briefing" landing dashboard (Day 1 UX from Discovery)

### Acceptance Criteria:
- COD/PRD/PRB calculated from real data with IAAO-standard thresholds
- Trend charts show actual historical data across tax years
- Neighborhood comparison identifies regressivity patterns
- Export produces IAAO-compliant ratio study report
- Dashboard answers "Are we safe to trust the data?" in 10 seconds

---

## Phase 3: Workbench
**Goal**: Property Workbench with real parcel drill-down and context synchronization  
**Depends on**: Phase 0, Phase 2  
**Estimated complexity**: M  

### Tasks:
- [ ] **3.1** — Rebuild `SummaryTab` with real parcel data (assessment history, sales, characteristics from DB)
- [ ] **3.2** — Build parcel search with autocomplete (parcel number, address, owner)
- [ ] **3.3** — Add assessment history timeline (all tax years for selected parcel)
- [ ] **3.4** — Add sales history for selected parcel
- [ ] **3.5** — Integrate TerraPilot with Lovable AI (context-aware AI using active parcel + suite data)
- [ ] **3.6** — Rebuild Context Ribbon with county selector, parcel search, and active context display
- [ ] **3.7** — Implement Work Queue: flagged outliers, invalid sales candidates, review items

### Acceptance Criteria:
- User can search for any parcel and see complete dossier
- Assessment history spans all available tax years
- TerraPilot provides contextual AI assistance
- Work queue surfaces actionable items from VEI analysis

---

## Phase 4: GeoEquity
**Goal**: Spatial visualization with equity overlay  
**Depends on**: Phase 0, Phase 2  
**Estimated complexity**: M  

### Tasks:
- [ ] **4.1** — Parcel centroid map with ratio/equity color coding
- [ ] **4.2** — Neighborhood boundary overlay
- [ ] **4.3** — COD/PRD heat map by area
- [ ] **4.4** — Click-parcel → populate WorkbenchContext flow
- [ ] **4.5** — ArcGIS REST sync for parcel geometry (rebuild existing edge function with county scoping)
- [ ] **4.6** — Parcel search integration with map centering

### Acceptance Criteria:
- Map displays all parcels color-coded by equity status
- Clicking a parcel navigates to its Workbench view
- Neighborhoods show aggregate equity metrics
- ArcGIS sync works for configured county data sources

---

## Phase 5+ (Future): Advanced Analytics & Operational Workflows
**Goal**: AVM, Regression, Segments, Appeals/Permits/Exemptions  
**Status**: ⬜ NOT STARTED — blocked on Phases 0-4  

---

## Architecture Decisions

### Multi-County Isolation
- **Approach**: Row-level isolation with `county_id` column + RLS
- **Session context**: `SET app.county_id` on each request
- **Composite unique keys**: `UNIQUE(county_id, parcel_number)` etc.

### Authentication
- **Thin Phase 1**: Email/password signup + login
- **Roles**: `admin`, `analyst`, `viewer` (existing `app_role` enum)
- **County assignment**: Via `profiles.county_id`

### Data Flow
```
CSV/Excel Upload → Ingest Edge Function → Storage Bucket
→ AI Field Mapping (Lovable AI) → Validation → Preview
→ Publish to canonical tables (parcels, assessments, sales)
→ VEI auto-recomputes on-demand via compute_ratio_statistics
```

### Existing Code Strategy
- **Keep**: Navigation, layout, design system, glass morphism CSS, suite tab architecture, WorkbenchContext pattern
- **Rebuild**: Data hooks (useVEIData, useRatioAnalysis), IDS pillars, ingest pipeline, auth flow
- **Remove from sidebar**: Out-of-scope modules (CostForge, AVM, Regression, Segments, AxiomFS, Anatomy)

---

*Plan is READY FOR EXECUTION. Begin with Phase 0: Foundation.*

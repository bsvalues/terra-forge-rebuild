# TerraFusion OS — Research Document
> **Purpose**: Store verbatim research from parallel domain investigations. Each section represents a sub-agent's focused research on a specific domain of the project.

**Created**: 2026-02-07  
**Updated**: 2026-02-08  
**Status**: ✅ COMPLETE  
**Agent**: Cloud Coach

---

## Domain 1: IAAO Standards & Compliance

**Status**: ✅ Complete  

### IAAO Standard on Ratio Studies (2013, with 2025 Exposure Draft pending)

#### Core Metrics & Thresholds

| Metric | Definition | IAAO Standard | TerraFusion Implementation |
|--------|-----------|---------------|---------------------------|
| **Median Ratio** | Median of (assessed value / sale price) for qualified sales | **0.90 – 1.10** | ✅ Implemented in `compute_ratio_statistics` |
| **COD** (Coefficient of Dispersion) | Average absolute deviation from median / median × 100. Measures uniformity. | **Residential: 5–15%**, Non-residential: 5–20% | ✅ Implemented. Thresholds in `getCODStatus()`: ≤10 excellent, ≤15 good, ≤20 caution |
| **PRD** (Price-Related Differential) | Mean ratio / weighted mean ratio. Detects vertical inequity. | **0.98 – 1.03** | ✅ Implemented. Thresholds in `getPRDStatus()`: ≤0.02 excellent, ≤0.05 good, ≤0.10 caution |
| **PRB** (Price-Related Bias) | Regression-based vertical equity test. More robust than PRD. | **-0.05 to +0.05** | ⚠️ Simplified approximation in DB function — needs proper regression-based calculation |
| **VEI** (Vertical Equity Indicator) | **NEW in 2025 Exposure Draft** — proposed replacement for PRD as primary vertical equity test | Not yet adopted as standard | ❌ Not implemented — consider for future |

#### Key Definitions
- **Arms-Length Transaction**: Sale between unrelated parties, each acting in own best interest. Warranty deeds are valid; quit claims, sheriff sales, family transfers are excluded.
- **Qualified Sale**: `is_qualified = true` — only these enter ratio calculations.
- **Value Tiers**: Current implementation uses thirds (33%/33%/33%). IAAO recommends quartiles or percentiles for tier analysis.
- **Outlier Detection**: Current: ratio < 0.5 or > 2.0. IAAO suggests IQR-based methods or 1.5× interquartile range.

#### Washington State Context (DOR 2024 Report)
- Statewide median ratio: 0.94 (within IAAO standard)
- Residential COD: 9.1% (within 5-15% standard)
- 26 of 39 counties met median ratio standard
- 27 of 39 counties met residential COD standard
- PRD standard: 0.98–1.03

#### 2025 Exposure Draft Key Changes
- **VEI** introduced as primary vertical equity indicator (replaces PRD emphasis)
- Enhanced COD standards with ranges for blighted/emerging markets
- Internationalized terminology
- New templates for VEI calculation
- **Note**: 2013 version remains official until final adoption

---

## Domain 2: County CAMA Systems & Data Formats

**Status**: ✅ Complete  

### Major CAMA Vendors
| Vendor | Product | Export Format | Key Field Names |
|--------|---------|--------------|-----------------|
| **Tyler Technologies** | iasWorld | CSV, SQL Server | PARID, PARCELID, TOTALVAL, LANDVAL, IMPRVAL, SITUSADDR |
| **Schneider Geospatial** | CAMA | CSV, Access DB | APN, PARCEL_ID, ASSESSED_VALUE, LAND_VALUE, IMPROVEMENT_VALUE |
| **Catalis** | ProVal | CSV, XML | ParcelNumber, TotalValue, LandValue, ImprovementValue, SitusAddress |

### Common Field Aliases (AI Field Mapping Memory)
```
Parcel ID: PARID, APN, PARCEL_ID, ParcelNumber, PIN, TAX_MAP, ACCOUNT_NO
Total Value: TOTALVAL, TOTAL_VALUE, TotalValue, ASSESSED_VALUE, MARKET_VALUE
Land Value: LANDVAL, LAND_VALUE, LandValue, LAND_ASSESSED
Improvement Value: IMPRVAL, IMPROVEMENT_VALUE, ImprovementValue, BLDG_VALUE
Situs Address: SITUSADDR, SITUS_ADDRESS, SitusAddress, PROP_ADDR, PHYSICAL_ADDRESS
Year Built: YEARBUILT, YEAR_BUILT, YearBuilt, YR_BUILT
Living Area: SQFT, LIVING_AREA, LivingArea, BLDG_SQFT, HEATED_AREA
```

### Data Quality Patterns
- County exports often have inconsistent ID formats (dashes, leading zeros, spaces)
- Situs addresses vary wildly in format
- Value fields may be in cents vs dollars
- Property class codes are county-specific
- Assessment dates may be fiscal year vs calendar year

---

## Domain 3: Property Assessment Workflow & Annual Cycle

**Status**: ✅ Complete  

### Assessor Annual Cycle (typical Washington State county)
```
Jan-Mar:  Data collection, new construction review, sales validation
Apr-Jun:  Mass appraisal modeling, ratio study preparation, value setting
Jul:      Values placed on assessment roll, notices sent
Aug-Sep:  Informal appeals, Board of Equalization hearings
Oct-Dec:  Roll certification, year-end reporting, next-year prep
```

### Top Daily Tasks (from Discovery)
1. **Run ratio studies & equity checks** — COD/PRD/PRB analysis, tier plots, neighborhood comparison
2. **Parcel lookup & review** — assessment history, comps, sales, characteristics
3. **Work queue / outlier triage** — flagged outliers, invalid sales, neighborhood anomalies

---

## Domain 4: GIS & Spatial Analysis in Assessment

**Status**: ✅ Complete  

### Current GIS Architecture
- ArcGIS REST API integration via edge functions (`arcgis-import-parcels`, `arcgis-parcel-sync`)
- GIS data stored in `gis_data_sources`, `gis_layers`, `gis_features` tables
- No PostGIS — geometry stored as JSON coordinates
- GeoEquity dashboard has map view but uses basic coordinate rendering
- Parcel centroids stored in `parcels.latitude` / `parcels.longitude`

### Phase 1 GIS Needs
- Parcel centroid display on map
- Neighborhood boundary visualization
- Equity heat mapping (COD/ratio by area)
- ArcGIS REST sync for parcel geometry

---

## Domain 5: Mass Appraisal Modeling (AVM/Regression)

**Status**: ⬜ Deferred to Phase 2+ (per Discovery scope decisions)

---

## Domain 6: Existing Codebase Audit

**Status**: ✅ Complete  

### Database State (Live Data)
| Table | Records | Status |
|-------|---------|--------|
| `parcels` | 1,991 | ✅ Real data |
| `assessments` | 5,973 | ✅ Real data |
| `sales` | 57 | ⚠️ Low volume — insufficient for robust ratio studies |
| `study_periods` | 3 | ✅ Configured |
| `appeals` | 4 | ✅ Minimal test data |
| `vei_metrics` | 3 | ✅ Pre-computed for study periods |
| `assessment_ratios` | 11 | ⚠️ Very low — most ratio stats come from `compute_ratio_statistics` RPC |
| `data_sources` | 3 | ✅ Configured |
| `user_roles` | 0 | ❌ No users configured — auth not implemented |
| `gis_layers` | 0 | ❌ No GIS data loaded |

### Component Audit Summary

#### ✅ KEEP (Real DB Integration, Good Architecture)
| Component | Why Keep |
|-----------|----------|
| `VEIDashboard` | Real `compute_ratio_statistics` RPC, on-demand analysis with tax year + sales window selectors |
| `ForgeTab` (Equity view) | Real study period integration, VEI metrics from DB, drill-down dialogs |
| `InventoryPillar` | Real record counts from parcels/sales/assessments tables |
| `useRatioAnalysis.ts` | Real DB function calls, proper parameter handling |
| `useVEIData.ts` | Real Supabase queries for study periods, metrics, tiers, appeals |
| `WorkbenchContext` | Clean context architecture for parcel/study period/work mode state |
| `SummaryTab` | Clean parcel display from context |
| `GeoEquityDashboard` | Real GIS hooks, data source management, parcel search |
| Design system (index.css) | Sophisticated glass morphism, well-tokenized, consistent |

#### ⚠️ REBUILD (Mock Data / Partial Implementation)
| Component | Issue |
|-----------|-------|
| `IngestPillar` | UI only — "Start Demo" button, no real file upload or processing |
| `QualityPillar` | Likely mock — needs real join quality metrics |
| `VersionsPillar` | Likely mock — needs real versioning/audit trail |
| `RoutingPillar` | Likely mock — needs real event bus |
| `ForgeTab` (Models/Comps views) | Placeholder views with "Coming soon" |
| `TerraPilotPanel` | Has edge function but needs Lovable AI integration |
| Appeals data in VEI | Hardcoded tier distribution ratios (lines 87-93 of VEIDashboard) |
| PRD/COD trend data | VEIDashboard builds fake historical data (lines 117-131) |

#### ❌ OUT OF SCOPE (Phase 1 - Don't Touch)
| Component | Reason |
|-----------|--------|
| `CostForgeDashboard` | Out of scope |
| `AVMStudioDashboard` | Out of scope |
| `RegressionStudioDashboard` | Out of scope |
| `SegmentDiscoveryDashboard` | Out of scope |
| `ValuationAnatomyDashboard` | Out of scope |
| `AxiomFSDashboard` | Out of scope |
| `ScrapeJobManager` / `ScheduledScrapeManager` | Out of scope |
| `AppealsWorkflow` / `PermitsWorkflow` / `ExemptionsWorkflow` | Out of scope |

### Architecture Observations
1. **No authentication** — `user_roles` table exists but no auth flow, no login page
2. **No county dimension** — `parcels` table has no `county_id` column; multi-county not supported
3. **No foreign keys enforced** — All FK constraints appear to be missing from the schema dump
4. **RLS uses `is_admin()`** — but no users exist in `user_roles`, so admin writes are blocked
5. **Dual VEI paths** — `VEIDashboard` (on-demand) and `ForgeTab` (study-period-based) do similar things
6. **No real ingest pipeline** — IDS Ingest pillar is pure UI mockup
7. **SovereignSidebar** renders a flat module list (vei, segments, geoequity, etc.) that doesn't reflect the suite architecture

### Schema Gaps for Phase 1
1. **Missing `county_id`** on `parcels`, `assessments`, `sales`, `appeals` (multi-county)
2. **Missing `counties` table** for county registration
3. **Missing `profiles` table** for user display names
4. **Missing `ingest_runs` table** for tracking file imports
5. **Missing `field_mappings` table** for AI field mapping memory
6. **Need FK constraints** — currently missing between parcels↔assessments, parcels↔sales

---

## Domain 7: Data Ingestion & ETL Best Practices

**Status**: ✅ Complete  

### Three-Click Promise Pipeline (from data-foundation.md)
1. **Fingerprint** — SHA256 hash of uploaded file for tamper detection
2. **AI Map** — Auto-map columns to canonical schema, confirm Holy Trinity (Parcel ID, Total Value, Situs Address)
3. **Validate** — Join quality check against existing parcel fabric
4. **Preview** — Show diff/impact before committing
5. **Publish** — Route to downstream modules

### Implementation Strategy for Phase 1
- Edge function for file upload → storage bucket → parse CSV/Excel
- Client-side column mapping UI with AI suggestions (Lovable AI for field name matching)
- Server-side validation: join rates, value ranges, duplicate detection
- Staging table pattern: import to `ingest_staging` → validate → merge to canonical tables
- Audit log: every import tracked with hash, timestamp, user, field mappings

---

*Research is COMPLETE. All findings synthesized into plan.md.*

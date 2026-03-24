# Phase 181–195 Execution Plan: Multi-County Open Data Expansion

## Strategic Context

Benton County (Phase 104–180) established the full TerraFusion stack with
Catalis/PACS direct DB access. The next wave seeds additional WA counties
from public open data — giving every county baseline parcel coverage _before_
CAMA negotiation begins.

**Why this matters:**
- 39 WA counties; most publish ArcGIS parcel data publicly
- 3 dominant CAMA vendors (Tyler iasWorld, Schneider APEX, Catalis/PACS)
- Schema similarity across vendor families → adapters generalise quickly
- Open-data seeds become validation tools when real DB access arrives

---

## Phase Group 1 (181–183): Open Data Infrastructure ✅

### Phase 181 — ArcGIS Feature Service Adapter (`scripts/arcgis_adapter.py`)
- Generic paginating ArcGIS REST client (resultOffset pagination)
- Automatic retry with backoff (requests.adapters.HTTPAdapter)
- Field normalisation via `CANONICAL_ALIAS` dict
- `probe_service()` — fetch layer metadata + field list
- `detect_parcel_id_field()` — heuristic PK detection
- `WA_COUNTY_PARCEL_ENDPOINTS` — known-good WA county URLs
- CLI: `python scripts/arcgis_adapter.py --county yakima --probe`
- CLI: `python scripts/arcgis_adapter.py --county yakima --limit 500`

### Phase 182 — WA DNR Statewide Parcel Baseline (`scripts/seed_wa_dnr.py`)
- Sources from WA DNR statewide ArcGIS Feature Service (39 counties)
- `WHERE COUNTY_NM = 'Yakima'` style filtering per county
- Maps to `parcels` table via `_row_to_parcel()` with `data_source='wa_dnr_statewide'`
- Batch upsert with `on_conflict="county_id,geo_id"`
- CLI: `python scripts/seed_wa_dnr.py --county yakima --dry-run --limit 100`
- CLI: `python scripts/seed_wa_dnr.py --probe` (service metadata)

### Phase 183 — Field Alias Dictionary (`scripts/field_alias_dict.json` + `field_alias_loader.py`)
- JSON dictionary: 20 canonical fields × 5 vendors (Tyler, PACS, Schneider, WA DNR, generic)
- `FieldAliasLoader.resolve(raw, vendor?)` → canonical name
- `FieldAliasLoader.suggest_vendor(fields)` → best-fit vendor detection
- `FieldAliasLoader.schema_diff(fields)` → coverage report with missing + unmatched
- Module-level shortcuts: `resolve()`, `suggest_vendor()`, `schema_diff()`
- CLI: `python scripts/field_alias_loader.py diff "PARCEL_NO,TOTALVALUE,USECODE"`

### County Registry Expansion (Phases 180 → 183 update)
- Added 5 new counties: Yakima, Franklin, Thurston, Clark, King, Snohomish
- New fields: `cama_vendor`, `open_data_url`, `wa_dnr_name`
- `get_open_data_counties()` — slugs with public ArcGIS URLs
- Tier annotations: Tier 1 (CAMA direct), Tier 2 (ArcGIS open data), Tier 3 (WA DNR fallback)

---

## Phase Group 2 (184–187): County-by-County Seeds

### Phase 184 — Franklin County Seed
**Priority: HIGHEST — likely same PACS schema as Benton**
- `seed_franklin.py`: use `arcgis_adapter.fetch_all()` + `field_alias_loader.resolve_row(vendor='catalis_pacs')`  
- Compare field coverage vs. Benton PACS schema
- Franklin validation will confirm whether PACS adapter generalises

### Phase 185 — Yakima County Seed (Schneider APEX)
- `seed_yakima.py`: ArcGIS adapter + Schneider APEX alias mapping
- First test of the non-PACS vendor path
- If Schneider fields align: King/Spokane follow automatically

### Phase 186 — Thurston + Clark Counties (Generic ArcGIS)
- Unknown vendor; use `suggest_vendor()` to auto-detect
- Validates generic_arcgis fallback path

### Phase 187 — King County Seed (Tyler iasWorld)
- Largest county; Tyler iasWorld schema
- End-to-end validation of the Tyler adapter

---

## Phase Group 3 (188–189): Schema Analysis Tools

### Phase 188 — County Schema Diff UI Component
- React component: `src/components/analytics/SchemaDiffPanel.tsx`
- Calls `field_alias_loader.schema_diff()` via a Supabase Edge Function or Python API
- Displays: matched fields (green), unmatched raw fields (yellow), missing canonical (red)
- Coverage % gauge using Recharts `RadialBarChart`

### Phase 189 — County Compatibility Scorecard
- Composite score: coverage_pct × 0.4 + parcel_count_ratio × 0.3 + key_fields_present × 0.3
- Key fields: parcel_id, owner_name, market_value, situs_address, hood_cd
- `src/components/analytics/CountyCompatibilityScore.tsx`
- Used in the 3-click onboarding wizard (Phase 190)

---

## Phase Group 4 (190–193): Multi-County UI

### Phase 190 — County Selector (navbar)
- Add `CountySelector` dropdown to `AppHeader` / navbar
- Reads from `counties` Supabase table
- Sets `selectedCountyId` in context; all hooks/queries already accept `countyId`
- Shows provisioned badge vs. "open data only" vs. "stub"

### Phase 191 — 3-Click County Onboarding Wizard
- Step 1: Select county (registry dropdown)
- Step 2: Auto-probe ArcGIS URL → run `schema_diff` → show compatibility score
- Step 3: Confirm seed + provision county row in Supabase
- Uses `seed_wa_dnr.py` or county-specific seed in background Edge Function

### Phase 192 — Cross-County Ratio Benchmarks Dashboard
- Compare COD / PRD / median ratios across all seeded counties
- `src/pages/CrossCountyBenchmarks.tsx`
- Recharts grouped bar chart (one bar per county per metric)

### Phase 193 — Ingest Audit Trail
- Log every seed run to `seed_audit_log` table: county, source, rows_upserted, timestamp
- `src/components/analytics/IngestAuditLog.tsx`

---

## Phase Group 5 (194–195): CAMA Vendor Adapters

### Phase 194 — Tyler iasWorld Direct Adapter
- Mirror of `seed_benton_pacs.py` but with Tyler iasWorld table names
- Tables: `prop`, `land`, `imprv`, `sale`, `owner`, `chg_of_owner_prop_assoc`
- Field mapping from `field_alias_dict.json` vendor: `tyler_iasworld`

### Phase 195 — County Readiness Report
- Full markdown/PDF report per county: schema coverage, parcel count, value distribution
- Auto-generated from seed run + schema diff
- Input to county sales conversations (shows what TF can do with their data)

---

## Open Data URL Registry

| County    | Vendor          | ArcGIS URL (configured in county_registry.py)        | Status  |
|-----------|-----------------|------------------------------------------------------|---------|
| Benton    | Catalis/PACS    | Direct FGDB                                          | ✅ Live  |
| Yakima    | Schneider APEX  | gis.yakimacounty.us/.../AssessorParcels/FeatureServer/0 | 🔧 Stub |
| Franklin  | Catalis/PACS    | gis.co.franklin.wa.us/.../Parcels/FeatureServer/0    | 🔧 Stub |
| Thurston  | Unknown         | services.arcgis.com/qBoSerlfXyYNdJYP/...             | 🔧 Stub |
| Clark     | Unknown         | gis.clark.wa.gov/giserv/.../Parcels/MapServer/0      | 🔧 Stub |
| King      | Tyler iasWorld  | gismaps.kingcounty.gov/arcgis/.../KingCo_Parcel/...  | 🔧 Stub |
| Snohomish | Tyler iasWorld  | services2.arcgis.com/.../SnohomishCountyParcels/...  | 🔧 Stub |
| All 39 WA | WA DNR          | services.arcgis.com/jsIt88o09Q0r1j8h/.../FeatureServer/0 | 🔧 Tier 3 |

---

## Files Delivered (Phases 181–183)

```
scripts/
  arcgis_adapter.py          Phase 181 — ArcGIS REST paginator + field normaliser
  seed_wa_dnr.py             Phase 182 — WA DNR statewide parcel seed
  field_alias_dict.json      Phase 183 — Multi-vendor field alias dictionary
  field_alias_loader.py      Phase 183 — Python loader + schema diff API
  county_registry.py         Updated — 7 counties, open_data_url, cama_vendor
  test_phases_181_183.py     Tests — 40 unit tests across all three phases
```

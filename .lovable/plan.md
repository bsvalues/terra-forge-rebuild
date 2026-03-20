

## Problem

The GeoEquity dashboard currently exposes raw data ingestion tooling (Import GIS, Sync Coords, Scrape Assessor, Import Parcels, Polygon Ingest tab, Statewide Jobs tab) directly in the client-facing UI. This is engineering infrastructure, not assessor workflow. The client should log in to a pre-loaded, ready-to-use environment where data syncs silently in the background.

## Architecture Shift: Pre-loaded + Background Sync

```text
CURRENT (wrong)                    TARGET (right)
─────────────────                  ──────────────────
User clicks "Import"  ──►         Data pre-loaded at onboarding
User clicks "Scrape"  ──►         Background sync on schedule
User watches job logs ──►         Health status in admin-only view
8 tabs in GeoEquity   ──►         4 tabs: Heatmap, Map, Search, Quality
```

## Plan

### 1. Clean GeoEquity Dashboard — Remove Ingestion UI

Strip the client-facing dashboard down to what assessors actually use:

- **Keep tabs**: Equity Heatmap, Map, Parcel Search, Data Quality
- **Remove tabs**: Polygon Ingest, Statewide Jobs, Data Sources, Layers
- **Remove header buttons**: Import GIS, Sync Coords, Scrape Assessor, Import Parcels
- **Remove dialogs**: GISImportDialog, ArcGISImportDialog, AssessorScrapeDialog, ParcelImportWizard
- **Keep**: Export button, NotificationBell, Study Period selector

### 2. Move Ingestion to Admin-Only Settings Page

Create a new `DataOpsPanel` under the existing Settings/Admin area (role-gated):

- Consolidate: IngestControlPanel, ScrapeJobsDashboard, DataSourcesPanel, GISLayersPanel
- Only visible to users with `admin` role
- Shows sync health, last-run timestamps, and manual trigger buttons
- This is where **we** (the ops team) manage data, not the assessor

### 3. Background Sync Status Indicator

Replace the removed ingestion UI with a simple, non-intrusive sync status:

- Small "Last synced: 2h ago" badge in the GeoEquity header
- Green dot = healthy, amber = stale (>24h), red = failed
- Clicking it shows a minimal popover with sync timestamps per source — no action buttons for non-admins

### 4. Simplify Stats Row

Update the 4 stats cards to reflect assessor-relevant metrics:

- **Total Parcels** (count from county vitals)
- **Geocoded** (parcels with coordinates — spatial healing progress)
- **Neighborhoods** (keep)
- **Data Completeness** (% with building_area + year_built filled)

Remove: "Data Sources" count, "GIS Layers" count, "Sync Status" fraction — these are ops metrics.

## Files Changed

| File | Change |
|------|--------|
| `src/components/geoequity/GeoEquityDashboard.tsx` | Remove 4 tabs, 4 dialogs, 4 header buttons; add sync badge; update stats row |
| `src/components/admin/DataOpsPanel.tsx` | New — consolidates ingestion controls for admin users |
| `src/config/IA_MAP.ts` | Add admin route for DataOps |
| `src/components/geoequity/SyncStatusBadge.tsx` | New — minimal "last synced" indicator |

Components like `IngestControlPanel`, `ScrapeJobsDashboard`, `DataSourcesPanel`, `GISLayersPanel`, `ParcelImportWizard`, etc. are preserved but relocated behind the admin gate.


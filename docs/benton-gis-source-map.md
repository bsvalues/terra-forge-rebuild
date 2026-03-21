# Benton GIS Source Map

## Goal

Define the Benton County GIS source of truth for:

- Parcel layer
- Jurisdictions
- Taxing districts
- Neighborhoods
- Situs / address context

This document maps the Benton file drops to the current TerraFusion GIS ingestion stack.

## Source Map

| Dataset | Best Source | Geometry Status | Join Keys | Current Best Ingest Path |
| --- | --- | --- | --- | --- |
| Parcel layer | `E:\Benton_County_Assessor.gdb` (`Parcel`) | Authoritative polygon candidate | `geo_id`, `prop_id`, parcel number | `arcgis-polygon-ingest` for polygons; `arcgis-parcel-sync` for centroids |
| Jurisdictions | `E:\Benton_County_Assessor.gdb` (`CityLimits`) | Boundary candidate | city/jurisdiction labels first; `tax_district_id`, `levy_cd` where available | `arcgis-polygon-ingest` |
| Taxing districts | `E:\Benton_County_Assessor.gdb` (`FireDistrict`, `SchoolDistrict`, `PortDistrict`, `IrrigationDistrict`, `PublicHospitalDistrict`, `Mosquito_District`) + `E:\Exports\Exports\taxing_jurisdiction_detail.csv` | Geometry + semantic join | `tax_district_id`, `levy_cd`, `prop_id` | `arcgis-polygon-ingest` + post-ingest CSV enrichment |
| Neighborhoods | `E:\Benton_County_Assessor.gdb` (`RevalArea` / `RevalArea_1`) or appraisal shapefiles | Appraisal-area boundary proxy | `hood_cd`, `prop_id`, `geo_id` | `arcgis-polygon-ingest` or `gis-parse` after export to GeoJSON |
| Situs | `E:\Exports\Exports\dataextract\situs.csv` + Benton FGDB address-point candidates | Tabular first, point fallback | `prop_id`, `geo_id` | Tabular join after parcel identity load |

## What The Data Drops Tell Us

### 1. Parcel Layer

Primary candidate:

- `E:\Benton_County_Assessor.gdb`

Supporting parcel identity and attributes:

- `E:\Exports\Exports\dataextract\property_val.csv`
- `E:\Exports\Exports\dataextract\situs.csv`
- `E:\Benton Assewssor Files\Sales.csv`

Observed keys:

- `property_val.csv` contains `prop_id`, `geo_id`, `hood_cd`
- `situs.csv` contains `prop_id`, address components, and `situs_display`
- `Sales.csv` contains `prop_id`, `geo_id`, `hood_cd`, `tax_area`, and coordinate columns `XCoord`, `YCoord`, `x`, `y`

Interpretation:

- `geo_id` is the best Benton parcel identity bridge when a GIS parcel layer also carries PACS-style parcel identifiers.
- `prop_id` is the strongest PACS-side business key.
- `Sales.csv` can backfill coordinates, but it should not replace authoritative parcel polygons.

Authoritative FGDB layer confirmation from OpenFileGDB inspection:

- `Parcel` is the authoritative parcel polygon layer.
- `ParcelsAndAssess` is the strongest parcel fallback and overlay companion.
- `Parcel` geometry type is `MultiPolygon` with `72,513` features in `EPSG:2927`.
- Confirmed parcel fields include `Parcel_ID`, `Prop_ID`, `CENTROID_X`, `CENTROID_Y`, `Shape_Length`, `Shape_Area`.

Current confidence note:

- These parcel findings are now confirmed through Python 3.12 plus Fiona/Pyogrio with `OpenFileGDB` support.
- ArcGIS Pro or `ogrinfo` is no longer required on this machine just to confirm Benton parcel layer names.

### 2. Jurisdictions And Taxing Districts

Best sources:

- `E:\Benton_County_Assessor.gdb`
- `E:\Exports\Exports\taxing_jurisdiction_detail.csv`

Observed fields in `taxing_jurisdiction_detail.csv`:

- `prop_id`
- `levy_cd`
- `levy_description`
- `tax_district_id`

Interpretation:

- The CSV is not geometry. It is a semantic fact table tying parcels to levy and tax district records.
- The geometry almost certainly needs to come from the geodatabase or an ArcGIS service backed by that geodatabase.

Authoritative FGDB boundary findings from OpenFileGDB inspection:

- `CityLimits` is the best current jurisdiction boundary layer and contains `5` features in `EPSG:2927`.
- `CityLimits` includes a `City` field and is the strongest first-pass TerraFusion jurisdiction layer.
- `CommissionerDistrict`
- `ElectionDistrict`
- `FireDistrict`
- `IrrigationDistrict`
- `LegislativeDistrict`
- `PortDistrict`
- `PublicHospitalDistrict`
- `SchoolDistrict`
- `Mosquito_District`

Current confidence note:

- These are confirmed FGDB feature classes, not string artifacts.
- `FireDistrict`, `SchoolDistrict`, `PortDistrict`, `IrrigationDistrict`, `PublicHospitalDistrict`, and `Mosquito_District` are the strongest first-pass taxing-district layers.
- `CommissionerDistrict`, `ElectionDistrict`, and `LegislativeDistrict` are governing-boundary overlays rather than direct tax-district replacements.

### 3. Neighborhoods

Best sources:

- `E:\Benton_County_Assessor.gdb`
- Named appraisal-area shapefiles inside `E:\Files of Appraisal`
- `hood_cd` in `property_val.csv` and `Sales.csv`

Interpretation:

- `hood_cd` is the Benton neighborhood/appraisal-area join key.
- If the FGDB contains neighborhood polygons, use that.
- If it does not, use appraisal shapefiles as provisional boundaries and join parcels by `hood_cd`.

Observed FGDB finding:

- OpenFileGDB inspection confirms `RevalArea` and `RevalArea_1` as real `MultiPolygon` layers with `7` features each in `EPSG:2927`.
- Both `RevalArea` layers include a `RevalNum` field and appear to be appraisal-area boundaries.
- These are the best current Benton neighborhood and appraisal-area proxies until the `hood_cd` bridge is field-verified against PACS exports.

### 4. Situs

Best source:

- `E:\Exports\Exports\dataextract\situs.csv`

Confirmed FGDB point candidates:

- `Spreadsheet_GeocodeAddresses1`
- `pacs_oltp_XYTableToPoint`
- `Parcel_XYTableToPoint`
- `Parcel_Point_XYTableToPoint`
- `Parcel_MJ_Locations`
- `SurveyAddressPoint_SpatialJo`

Interpretation:

- This is address enrichment, not geometry.
- It should be joined onto parcels after parcel identity and geometry are loaded.
- Benton does have point and address layers in the FGDB, but `situs.csv` remains the safer first-pass address doctrine because the PACS-side join keys are already known.

## How To Plug Benton Into The Current GIS Stack

### Option A: Benton exposes ArcGIS services

Use this when Benton has a `FeatureServer` or `MapServer` endpoint.

#### Parcel centroid sync

Code path:

- `src/services/ingestService.ts` → `invokeArcGISSync()`
- `supabase/functions/arcgis-parcel-sync/index.ts`

Request body:

```json
{
  "arcgisUrl": "https://.../FeatureServer/0",
  "parcelNumberField": "geo_id",
  "sourceId": "optional-gis-data-source-id",
  "maxFeatures": 5000
}
```

Use this only for:

- Backfilling `parcels.latitude` / `parcels.longitude`
- Fast centroid alignment for Benton parcels

Do not use it for:

- Authoritative parcel polygon ingestion
- Jurisdiction, taxing district, or neighborhood boundaries

#### Parcel polygons and boundary layers

Code path:

- `supabase/functions/arcgis-polygon-ingest/index.ts`

Start request body:

```json
{
  "action": "start",
  "featureServerUrl": "https://.../FeatureServer/0",
  "dataset": "benton-parcels",
  "parcelIdField": "geo_id",
  "pageSize": 2000
}
```

Recommended Benton datasets:

- `benton-parcels`
- `benton-jurisdictions`
- `benton-taxing-districts`
- `benton-neighborhoods`

Important behavior:

- The ingester stores county-scoped job state in `gis_ingest_jobs`
- It writes ingest events to `gis_ingest_job_events`
- It registers or reuses a `gis_layers` row using `properties_schema`
- It bulk upserts polygon features through `upsert_gis_features_bulk`

Current limitation:

- The ingest engine is now dataset-aware for parcel and boundary layers.
- The remaining Benton gap is dataset-specific field mapping and post-ingest enrichment for district and appraisal-area semantics, not parcel-only ingest.

### Option B: Only local geodatabase exists

Use this when the Benton source of truth is the local `.gdb` and there is no live ArcGIS service.

#### Recommended path

1. Use OpenFileGDB tooling to read the confirmed Benton classes directly from `E:\Benton_County_Assessor.gdb`.
2. Export each needed layer to GeoJSON.
3. Upload GeoJSON through the existing file import flow.
4. Validate parcel, appraisal, and tax joins against PACS keys after load.

What we verified in this environment:

- The FGDB is populated and accessible.
- Python 3.12 with Fiona/Pyogrio can read the FGDB authoritatively via `OpenFileGDB`.
- Confirmed Benton classes now include `Parcel`, `CityLimits`, `RevalArea`, `RevalArea_1`, and multiple district layers.
- The remaining uncertainty is no longer layer discovery; it is the exact field-level bridge from appraisal areas to `hood_cd` and from district polygons to PACS tax facts.

Code path:

- `src/components/geoequity/GISImportDialog.tsx`
- `src/hooks/useGISData.ts` → `useParseGISFile()`
- `supabase/functions/gis-parse/index.ts`

Current supported upload formats:

- GeoJSON / JSON
- CSV with latitude and longitude

Current unsupported direct uploads:

- Shapefile sidecar bundles
- KML
- Raw file geodatabases

That means Benton FGDB data should currently be exported before ingestion.

## Development Gaps We Should Improve Next

### 1. Make polygon ingest layer-aware

Current issue:

- `arcgis-polygon-ingest` is built around parcel-number matching.

Enhancement:

- Add dataset-specific field mapping so Benton jurisdictions, taxing districts, and neighborhoods can be ingested without pretending they are parcel layers.

### 2. Add FGDB / shapefile conversion workflow

Current issue:

- The UI previously implied shapefile support while the backend rejects it.

Enhancement:

- Support zipped shapefile bundles or a server-side conversion pipeline.
- Add a Benton-focused import path for exported FGDB layers.

### 3. Register Benton GIS presets in the app

Current issue:

- Benton GIS sources are known, but not codified in UI presets.

Enhancement:

- Use `src/config/bentonGISSources.ts` as the seed catalog for Benton dataset setup and import helpers.

## Exact Benton Recommendation

1. Use `E:\Benton_County_Assessor.gdb` layer `Parcel` as the Benton parcel geometry source of truth.
2. Use `ParcelsAndAssess` only as a parcel fallback and overlay companion, not as the primary parcel contract.
3. Use `CityLimits` as the first-pass Benton jurisdiction layer.
4. Use district layers such as `FireDistrict`, `SchoolDistrict`, `PortDistrict`, `IrrigationDistrict`, `PublicHospitalDistrict`, and `Mosquito_District` for taxing-boundary overlays.
5. Use `RevalArea` and `RevalArea_1` as Benton appraisal-area and neighborhood proxies until `hood_cd` field bridging is fully verified.
6. Use `geo_id` as the first Benton parcel join candidate, with `prop_id` as the PACS-side bridge.
7. Use `taxing_jurisdiction_detail.csv` to enrich taxing district polygons after geometry ingest.
8. Use `situs.csv` only for address enrichment after parcel identity is stable, with FGDB point layers as secondary reference sources.
7. Treat district classes such as `CommissionerDistrict`, `FireDistrict`, `SchoolDistrict`, and `PortDistrict` as the current Benton boundary candidates.
8. Treat neighborhood polygons as provisional until a true FGDB reader confirms a matching layer, otherwise use appraisal-area shapefiles as fallback.
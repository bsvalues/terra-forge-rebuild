# TerraFusion Sync 2.0 — One Governed Path from Source Record to Product

## Goal

Replace today's separate ways of loading data (scrapers, PACS sync, CSV uploads, GIS jobs, Redfin, UGRC, statewide scrape) with **one engine**. Every county, every source and every record goes through the same stages. Each value on screen can be traced back to the original record it came from.

Guiding rule: **no silent data loss, no invented authority, no second version of the truth, and no calling it done until the real screens work on real data.**

Scope boundary: the current WACO release keeps shipping on today's tables. Sync 2.0 is built alongside the existing tables and switched over county by county. It does not stop current work.

## The pipeline (same for every county and source)

```text
SOURCE            PACS export / live PACS / GIS service / CSV / public records / API
  |
1 CONNECT         Registered source + connector (read-only), credentials scoped to county
  |
2 LAND            Immutable evidence: original file/rows stored as-is, SHA-256 hashed, never edited
  |
3 MAP             Source fields -> canonical fields (remembered per county, AI suggests, human confirms)
  |
4 RESOLVE         Source IDs -> stable TerraFusion parcel ID (survives vendor/ID changes)
  |
5 VALIDATE        Rules + cross-source reconciliation; failures quarantined, never dropped
  |
6 PUBLISH         Versioned canonical records, one owner per field, lineage to the evidence row
  |
CONSUMERS         Workbench, TerraForge/WACO, Atlas, Dais, Dossier, County Vitals, AI agents
```

## Source-of-truth policy (resolves "I'm not sure")

No single source wins everything. Each **field** has a ranked list of trusted sources per county, for example:

| Field group | Benton ranking |
|---|---|
| Identity, ownership, legal | PACS > state parcels |
| Characteristics (area, year built, beds/baths) | PACS improvements > field capture > public assessor pages |
| Values, certification | PACS only |
| Sales | PACS sales > county recorder > Redfin (labelled as market data) |
| Geometry, coordinates | County GIS > state parcels |
| Neighborhood | PACS hood code > GIS polygon assignment |

The published value is taken from the highest-ranked source that holds a valid value. Values from other sources are kept as competing evidence. When sources disagree beyond a set tolerance, a reconciliation item is raised; the system does not pick one silently. Rankings are configuration, not code, so each county can have its own.

## Data model (new, additive; existing tables untouched until cutover)

- **sync_sources**: a registered source per county (kind, connector, schedule, trust rank).
- **sync_runs**: one row per load (source, started/finished, counts landed/mapped/resolved/quarantined/published, status).
- **sync_evidence**: immutable raw records (run, source row key, raw payload, payload hash). Append-only, enforced the same way as TerraTrace.
- **sync_field_maps**: county + source field → canonical field, with confidence and who confirmed it (replaces ingest_mapping_rules/profiles).
- **parcel_identity_links**: source system + source ID → parcel UUID, with validity dates (builds on the existing parcel spine).
- **canonical_field_values**: parcel, field, value, source, evidence row, version, valid-from. This is the lineage record behind every published number.
- **reconciliation_items**: disagreements between sources and their resolution.
- **data_quarantine** (existing): reused for validation failures.
- `parcels`, `sales`, `assessments` stay in place as **published views/projections**. Every current screen keeps working.

## Phases

### Phase 0 — Foundation (no visible change)
- Create the tables above with county-scoped access rules.
- Lock evidence as append-only and enforce hash chaining.
- A single "run" service that every connector must use; it writes progress to sync_runs.
- Tests: evidence cannot be updated or deleted; a run cannot publish without lineage.

### Phase 1 — Benton end to end (the proof)
- Connectors: PACS CSV/backup extract (property, imprv, imprv_detail, sales, land), Benton GIS.
- Field maps for Benton confirmed once, then reused.
- Identity resolution from PACS prop_id to parcel UUID.
- Publish characteristics, sales, values, neighborhoods and coordinates with full lineage.
- Success check: neighborhood 13010 gets building area and year built from PACS improvements, and calibration runs on it. County Vitals numbers match a direct count. Every Workbench value opens to its source record.

### Phase 2 — Trust visible in the product
- A "where did this come from" view on any value: source, run, original record, competing values.
- Reconciliation queue in Admin, next to Quarantine.
- Sync runs page: each run with counts at every stage and failures listed.

### Phase 3 — Retire the parallel paths
- Move the scrapers, Redfin, UGRC and statewide imports onto the same engine as ordinary connectors.
- Stop old paths writing straight into parcels/sales; old functions are deprecated and do not stay as a second route.
- Multi-county: SLCO and the other WA counties become configuration (sources + rankings + field maps), not custom code.

### Phase 4 — Continuous refresh and export
- Scheduled incremental refresh using watermarks (sync_watermarks exists).
- County-owned export: canonical data + lineage in an open format.

## Technical details

- Every stage is idempotent and keyed by payload hash, so re-running a load never creates duplicates.
- Publishing goes through write-lane checks: canonical fields keep their single domain owner (OS core for identity, TerraForge for characteristics/valuation, TerraAtlas for geometry, TerraDais for workflow).
- Large loads are processed in batches with 12–30 s timeouts, and IN-clause lookups in groups of 50.
- PostGIS/native Postgres only: reprojection with ST_Transform, fuzzy matching with pg_trgm.
- Connectors are read-only against county systems.
- Cutover runs one county at a time behind a per-county flag, and `useParcel360` / County Vitals switch to the published projections only after a parity check passes.

## Decisions needed before Phase 1

- Confirm the Benton source rankings above.
- Upload the Benton PACS extracts (property_val, imprv, imprv_detail, sales, land detail), or confirm the server backup in `public/uploads` is the source.

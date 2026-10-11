# TerraFusion Sync 2.0: Foundation Slice (revised with the architecture review)

## Direction

One engine, one governed path from source record to publication, and one canonical authority per domain and effective context. One preserved chain of evidence, with acceptance tested on the real product.

- The existing WACO release keeps shipping on today's canonical tables. It gets no new county or connector requirements.
- Sync 2.0 starts as a **shadow path** next to the current data. It is not a competing source of truth.
- We do **not** restart Benton's conversion, rebuild working PACS infrastructure or replace settled identity decisions.
- This slice is the additive evidence/run/publication boundary only. It does not add a new frontend, 39 connectors or another planner.

## Pipeline

```text
1 CONNECT       authorized source + dataset capability, county, credential scope, extraction contract
2 LAND          original files/records, source keys, hashes, extraction evidence (restricted writes)
3 PROFILE & MAP approved, versioned mappings; AI may only propose
4 RESOLVE       governed identities: property, improvement, assessment, sale, instrument, split/merge
5 VALIDATE      semantic rules, overlaps, exceptions preserved, every record accounted for
6 REVIEW        authorized disposition of material ambiguity before affected facts are promoted
7 PUBLISH       atomic, immutable, versioned publication with lineage
8 SERVE/VERIFY  prove the real screens read that publication and show correct values
```

## Corrections built into the design

| Area | Rule |
|---|---|
| Canonical truth | The typed tables (parcels, sales, assessments, geometry) stay the product contract. `sync_assertions` records claims and provenance behind them and is never a second EAV database. |
| Idempotency | The replay key is source scope + logical source identity + batch/version + effective period. The payload hash proves content only, never record identity. |
| Authority | Authority is resolved per field meaning, effective year, jurisdiction, certification and source. A highest rank never means automatic publication. |
| Identity | Separate governed identities for property, improvement, assessment `(prop_id, year, supplement)`, sale and instrument, plus split/merge history. |
| Evidence integrity | Restricted writes, plus a run manifest whose hash is anchored in TerraTrace, plus recovery checks. Append-only alone is not enough. |
| Publishing | A run commits one coherent publication version. Consumers never see a mix of source generations. |
| Performance | Checkpointed durable jobs, bulk operations, bounded calls, and limits based on observed performance. No universal 12–30 s or 50-row rules for Sync jobs. |
| Lineage | Many-to-many: one observation can support many facts, and one fact or calculation can depend on many observations. |
| Privacy | Evidence views respect record- and field-level permissions. There is no universal "open raw record" button. |
| Cutover | Scoped by county + domain + publication version. The previous publication is kept for rollback, then the old direct-write route is retired. |

## Benton authority (inherits accepted PACS/GIS crosswalk)

- **Identity:** PACS `prop_id` is primary. The GIS `Prop_ID` links through the approved crosswalk. `geo_id` and `Parcel_ID` are kept as aliases.
- **Ownership:** PACS for roll owner. Recorded instruments are kept separately as conveyance evidence.
- **Characteristics:** official PACS property and improvement records. Field capture is retained with its own date and authority.
- **Certified values:** PACS, scoped by year, certification and supplement. Never "pick the highest".
- **Sales:** official county sales and recorded evidence, with qualification governed separately. Redfin is reference data only.
- **Geometry:** county GIS. State datasets are labelled as reference.
- **Neighborhood:** effective-dated PACS `hood_cd`. GIS membership is an explicitly derived relationship.

Only genuinely ungoverned conflicts are escalated to the founder.

## This slice: what gets built

1. **Schema (additive, county-scoped access rules, grants):**
   - `sync_sources` (+ dataset capabilities, authority scope)
   - `sync_runs` (checkpoints, terminal state, mapping version, publication id, manifest hash)
   - `sync_evidence` (source record key distinct from payload hash, replay key unique, restricted writes)
   - `sync_mapping_versions` (adapts existing ingest_mapping_profiles/rules, does not replace them)
   - `sync_entity_links` (entity type, source system/id → governed id, effective dates, split/merge relation)
   - `sync_assertions` (claim → canonical entity/field, many-to-many to evidence)
   - `sync_reconciliation_items` (typed conflict, owner domain, decision, decision evidence)
   - `sync_publications` (county, domain, version, status, immutable once published, previous version for rollback)
   - `data_quarantine` is reused.
2. **Run engine service:** start, checkpoint, land, account for every record, finish, with TerraTrace receipts for start, completion and failure, and the manifest hash.
3. **Benton inventory check (read-only):** establish which approved source artifacts and canonical records already exist and are complete. New extracts are requested only for gaps it proves.
4. **Security fix:** the Benton PACS archives and sales CSV in `public/uploads` are downloadable by anyone from the published site. Move them out of the public folder into private storage, and switch the one IngestWizard sample loader to private storage.

## Acceptance for this slice

- Replaying the same batch creates no duplicates. Two distinct records with identical payloads are both kept.
- Evidence rows cannot be updated or deleted by app users.
- A publication cannot be marked published without lineage and a manifest. A published version is immutable.
- A failed or restarted run leaves no partial publication.
- The inventory report lists Benton source artifacts and record counts by domain with clear cohorts.
- The archives in `public/uploads` are no longer reachable at a public web address.
- No current screen changes behavior: existing tests stay green, and Workbench and `/forge` read exactly what they read today.

## Later slices (not in this one)

- Benton shadow processing and parity (identities, improvement aggregation for area/year built, year-specific neighborhoods, sales and valuations), with 13010 as a regression case.
- Review UI and evidence view with permissions.
- Controlled per-domain cutover, verified on Workbench, County Vitals and TerraForge `/forge` (the WACO acceptance surface). Calibration stays TerraForge's job.
- Retiring the parallel ingest paths, onboarding other counties as configuration, county-owned export.

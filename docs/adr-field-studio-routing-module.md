# ADR: Field Studio Is a Routing Module, Not a Write-Lane Owner

**Status:** Accepted  
**Date:** 2026-02-16  
**Authors:** TerraFusion Engineering (Swarm: Sentinel + Traffic Cop)

## Context

Field Studio was introduced as an offline-first PWA module for field inspectors to capture
observations (condition ratings, quality assessments, measurements, photos, notes, anomalies)
during property inspections. The question arose whether Field Studio should own any database
tables or write lanes.

## Decision

**Field Studio owns ZERO tables and ZERO write lanes.**

It is classified as a **routing module**: it captures events locally (IndexedDB) and routes
them through the appropriate domain services upon sync.

| Observation Type | Routed Through | Write-Lane Owner |
|------------------|---------------|-----------------|
| condition, quality, measurement | `forgeService.updateParcelCharacteristics()` | TerraForge |
| photo | `emitTraceEvent()` → future TerraDossier upload | TerraDossier |
| note | `emitTraceEvent()` | TerraTrace (OS) |
| anomaly | `emitTraceEvent()` | TerraTrace (OS) → future TerraAtlas |

## Enforcement

1. **Compile-time**: `SourceModule` type includes `"field"` but no `WriteDomain` maps to it.
2. **Runtime**: `assertWriteLane()` in `writeLane.ts` contains a dedicated guardrail that
   rejects any write attempt where `sourceModule === "field"` for all domains except
   `trace_events`.
3. **Architecture**: `fieldSync.ts` routes observations exclusively through domain service
   APIs — never direct Supabase writes.

## Consequences

- Field Studio can never cause a constitutional write-lane violation.
- All field data enters the canonical system through governed, audited domain services.
- Every observation is immutably recorded in TerraTrace for complete accountability.
- Future enhancements (photo upload, spatial annotation) must extend domain service APIs,
  not bypass them.

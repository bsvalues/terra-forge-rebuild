# ADR: Sketch Module Architecture — "Sketch-as-Observation"

**Status:** Accepted  
**Date:** 2026-02-17  
**Authors:** TerraFusion Engineering

## Context

Field inspectors need geometry capture capabilities (measurements, building sketches,
plan tracing) to improve GLA accuracy, support cost approach inputs, and strengthen
defensibility. The question: how to add sketching without violating Field Studio's
"zero-table" routing model.

## Decision

**Sketches are observations, not canonical building records.**

All sketch data flows through the existing `FieldObservation` pipeline as `type: "measurement"`
with a `_sketchObservation: true` flag. Domain services decide whether to update canonical
improvement records.

### Three Tiers

| Tier | Name | Capability |
|------|------|-----------|
| 0 | Measurement Plan | Exterior wall lengths + auto-footprint estimate |
| 1 | Sketch Builder | Orthogonal wall drawing, snap-to-grid, area computation |
| 2 | Plan Trace | PDF overlay with 2-point scale, polygon tracing |

### Provenance Model

Every sketch carries:
- `method`: manual_entry, pencil_draw, plan_trace_vector, plan_trace_raster, ar_measure, lidar_mesh
- `confidence`: high/medium/low with reason
- `planProvenance`: source type, file hash, scale method, scale value (plan trace only)
- `deviceModel`: hardware identifier (for future AR/LiDAR)

### QA Integration

- GLA delta >15% from record → auto-flagged for supervisor review
- Sketch trace events emitted to TerraTrace for audit trail
- Flagged observations surface as Factory recalibration cohorts

### Native Capabilities (Capacitor)

Capacitor is scaffolded for future iPad sensor access:
- Phase 1: AR Tape + Pencil Trace (ARKit)
- Phase 2: LiDAR scan-to-footprint
- Phase 3: RoomPlan interior capture

PWA remains the core runtime; Capacitor adds sensor superpowers where hardware allows.

## Consequences

- Field Studio still owns zero tables — sketches are routed observations
- All geometry enters the system through governed domain service APIs
- Provenance + confidence scoring makes sketches appeal-defensible
- Future sensor modes (AR/LiDAR) extend the same observation pipeline

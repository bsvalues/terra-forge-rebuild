# TerraFusion OS — Discovery Document
> **Purpose**: Capture all questions, answers, and intent clarifications from the discovery phase. This is the project's "north star" — every planning decision traces back here.

**Created**: 2026-02-07  
**Status**: 🟡 IN PROGRESS  
**Agent**: Cloud Coach (TerraFusion Elite Government OS Engineering Agent)

---

## 1. Project Identity

| Question | Answer |
|----------|--------|
| What is TerraFusion OS in one sentence? | A multi-county property assessment platform that combines data ingestion intelligence, equity analysis, AI-powered valuation, and modern UX into one sovereign system. |
| Who is the primary user persona? | County assessors and assessment analysts across multiple counties. |
| What problem does this solve that nothing else does? | ALL of: zero-engineering data import, superior equity/defensibility, AI valuation, and unified modern UX — replacing fragmented legacy tools. |
| What is the "minimum deployable unit" — the smallest version that delivers real value? | **VEI (Equity Analysis)** — ratio study dashboard with COD/PRD/PRB analysis on assessments vs sales. |
| What does "done" look like for Phase 1? | A functional VEI dashboard that a county assessor can use with real data to run defensible ratio studies. |

---

## 2. Architecture & Technical Vision

| Question | Answer |
|----------|--------|
| What is the core data model hierarchy (County → Parcel → Assessment → Sale)? | **County → Parcel → Assessment + Sale** — relational model with independent assessment records per tax year and sale transaction history. Add `county_id` to parcels for multi-county isolation. |
| Which modules are MVP vs aspirational? | **MVP**: VEI → IDS → Workbench. **Aspirational**: CostForge, AVM, Regression, Segments, AxiomFS. |
| What is the real-world data flow from county CAMA to TerraFusion? | **CSV/Excel exports** from Tyler/Schneider/Catalis uploaded manually + **ArcGIS REST API** for spatial/parcel data. Direct CAMA DB and State DOR feeds deferred to Phase 2+. |
| How should the IDS (Intelligent Data Suite) relate to the Property Workbench? | *Pending discovery* |
| What is TerraPilot AI's actual job? | **Autonomous Agent with human-in-the-loop guardrails.** Executes: ratio studies, diagnostics, comp audits, sales validation, change-impact simulations. Generates: draft recommendations, equity reports, appeal packets. **Never commits roll values** — produces recommended actions + evidence + expected impacts, then routes for sign-off with audit trail. Proactive AND reactive, but defining feature is execution, not Q&A. |
| What is the CAMA relationship? | **Gradual migration path.** Phase 1: complement legacy (ingest, analyze). Phase 2+: migrate workflows. End-state: TerraFusion becomes the valuation operating system. |
| What is the deployment model? | **Multi-County Platform** — shared platform serving multiple counties with data isolation. |
| What is the timeline philosophy? | **Building it right, no rush** — quality and architecture over speed. |

---

## 3. User Experience & Workflow

| Question | Answer |
|----------|--------|
| Describe the Day 1 user journey for a county assessor opening TerraFusion | *Pending discovery* |
| What are the top 3 daily tasks an assessor does that TerraFusion must nail? | *Pending discovery* |
| How does the "one parcel, one screen" philosophy work with batch operations? | *Pending discovery* |
| What existing tools (Tyler, Schneider, Catalis) are we replacing vs integrating with? | *Pending discovery* |
| What does the assessor's annual cycle look like and how does TerraFusion map to it? | *Pending discovery* |

---

## 4. Data & Integration

| Question | Answer |
|----------|--------|
| What are the actual data sources (file formats, APIs, manual entry)? | *Pending discovery* |
| How many parcels does a typical target county have? | *Pending discovery* |
| What is the data freshness requirement (real-time, daily, weekly)? | *Pending discovery* |
| What compliance/audit standards must the system meet (IAAO, state-specific)? | *Pending discovery* |
| What is the defensibility requirement for legal challenges? | *Pending discovery* |

---

## 5. Scope & Prioritization

| Question | Answer |
|----------|--------|
| Rank the modules by importance: VEI, GeoEquity, IDS, Workbench, CostForge, AVM, Regression | *Pending discovery* |
| What features exist today that are working vs placeholder/mock? | *Pending discovery* |
| What is the deployment target (SaaS multi-tenant, single county, state-wide)? | *Pending discovery* |
| What is the timeline pressure? | *Pending discovery* |
| What is off-limits or out of scope for the next phase? | *Pending discovery* |

---

## 6. Discovery Session Log

### Session 1 — 2026-02-07
*Awaiting responses...*

---

*This document is append-only during discovery. Answers are never deleted, only refined.*

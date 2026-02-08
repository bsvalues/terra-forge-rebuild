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
| What is the core data model hierarchy? | **County → Parcel → Assessment + Sale** — relational model with independent assessment records per tax year and sale transaction history. Add `county_id` to parcels for multi-county isolation. |
| Which modules are MVP vs aspirational? | **MVP**: VEI → IDS → Workbench. **Aspirational**: CostForge, AVM, Regression, Segments, AxiomFS. |
| What is the real-world data flow from county CAMA to TerraFusion? | **CSV/Excel exports** from Tyler/Schneider/Catalis uploaded manually + **ArcGIS REST API** for spatial/parcel data. Direct CAMA DB and State DOR feeds deferred to Phase 2+. |
| How should the IDS relate to the Property Workbench? | *Pending discovery* |
| What is TerraPilot AI's actual job? | **Autonomous Agent with human-in-the-loop guardrails.** Executes: ratio studies, diagnostics, comp audits, sales validation, change-impact simulations. Generates: draft recommendations, equity reports, appeal packets. **Never commits roll values** — produces recommended actions + evidence + expected impacts, then routes for sign-off with audit trail. |
| What is the CAMA relationship? | **Gradual migration path.** Phase 1: complement legacy (ingest, analyze). Phase 2+: migrate workflows. End-state: TerraFusion becomes the valuation operating system. |
| What is the deployment model? | **Multi-County Platform** — shared platform serving multiple counties with data isolation. |
| What is the timeline philosophy? | **Building it right, no rush** — quality and architecture over speed. |
| Multi-county data isolation approach? | **Row-level isolation (county_id + RLS).** All counties share tables filtered by `county_id` + RLS policies. Session tenant context via `SET app.county_id`. Composite unique keys include `county_id` (e.g., `UNIQUE(county_id, apn)`). Partitioning by `county_id` can be added later if volumes demand it. |
| Existing codebase strategy? | **Keep UI shell, rebuild data layer.** Preserve: navigation, layout, design system, routing, page scaffolds, table/map/modal shells. Replace: mock-driven hooks, ad-hoc state, fake services, inconsistent types. Build real typed domain layer with canonical DTOs. |

---

## 3. User Experience & Workflow

| Question | Answer |
|----------|--------|
| Describe the Day 1 user journey | **County selector → Dashboard overview.** Single-county users skip picker. Dashboard answers in 10 seconds: "Are we safe to trust the data, and where should I look first?" **Top row**: Data Freshness (green/yellow/red), Equity Snapshot (median ratio, COD, PRD, sample size), Work Queue (outliers, invalid sales, drift). **Middle**: Priority alerts ranked by impact + one-click recommended actions. **Bottom**: Recent activity (audit-friendly) + "continue where you left off." The first screen is a **valuation command briefing**. |
| What are the top 3 daily tasks an assessor does that TerraFusion must nail? | *Pending discovery* |
| How does the "one parcel, one screen" philosophy work with batch operations? | *Pending discovery* |
| What existing tools are we replacing vs integrating with? | **Gradual migration**: complement Tyler/Schneider/Catalis initially (import their data, provide superior analytics), architect toward full replacement over time. |
| What does the assessor's annual cycle look like? | *Pending discovery* |

---

## 4. Data & Integration

| Question | Answer |
|----------|--------|
| What are the actual data sources? | **Phase 1**: CSV/Excel file uploads (manual export from CAMA) + ArcGIS REST API (spatial data). **Phase 2+**: Direct CAMA database connections, State DOR feeds. |
| How many parcels does a typical target county have? | **50,000 – 200,000 parcels** — moderate indexing and query optimization needed. |
| What is the data freshness requirement? | *Pending discovery* |
| What compliance/audit standards must the system meet? | *Pending discovery* |
| What is the defensibility requirement for legal challenges? | *Pending discovery* |

---

## 5. Scope & Prioritization

| Question | Answer |
|----------|--------|
| Rank the modules by importance | *Pending discovery* |
| What features exist today that are working vs placeholder/mock? | Most components contain mock data. UI shell is sound; data layer needs full rebuild. |
| What is the deployment target? | **Multi-County Platform** — shared infrastructure with row-level data isolation. |
| What is the timeline pressure? | **Building it right, no rush** — quality and architecture over speed. |
| What is off-limits or out of scope for the next phase? | *Pending discovery* |

---

## 6. Discovery Session Log

### Session 1 — 2026-02-07
- Established project identity: multi-county property assessment platform
- MVP module: VEI (Equity Analysis)
- Deployment: Multi-County Platform
- Timeline: Building it right, no rush

### Session 2 — 2026-02-08
- Data model: County → Parcel → Assessment + Sale (relational, add county_id)
- TerraPilot: Autonomous Agent with human-in-the-loop guardrails
- Data sources v1: CSV/Excel + ArcGIS REST API
- CAMA relationship: Gradual migration path
- Day 1 UX: County selector → Valuation Command Briefing dashboard
- Multi-county isolation: Row-level (county_id + RLS)
- Parcel scale: 50k–200k per county
- Codebase strategy: Keep UI shell, rebuild data layer

---

*This document is append-only during discovery. Answers are never deleted, only refined.*

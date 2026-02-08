# TerraFusion OS — Discovery Document
> **Purpose**: Capture all questions, answers, and intent clarifications from the discovery phase. This is the project's "north star" — every planning decision traces back here.

**Created**: 2026-02-07  
**Status**: ✅ COMPLETE  
**Agent**: Cloud Coach (TerraFusion Elite Government OS Engineering Agent)

---

## 1. Project Identity

| Question | Answer |
|----------|--------|
| What is TerraFusion OS in one sentence? | A multi-county property assessment platform that combines data ingestion intelligence, equity analysis, AI-powered valuation, and modern UX into one sovereign system. |
| Who is the primary user persona? | County assessors and assessment analysts across multiple counties. |
| What problem does this solve that nothing else does? | ALL of: zero-engineering data import, superior equity/defensibility, AI valuation, and unified modern UX — replacing fragmented legacy tools. |
| What is the "minimum deployable unit"? | **VEI (Equity Analysis)** — ratio study dashboard with COD/PRD/PRB analysis on assessments vs sales. |
| What does "done" look like for Phase 1? | A functional VEI dashboard that a county assessor can use with real data to run defensible ratio studies. |

---

## 2. Architecture & Technical Vision

| Question | Answer |
|----------|--------|
| Core data model hierarchy? | **County → Parcel → Assessment + Sale** — relational model with independent assessment records per tax year and sale transaction history. `county_id` on parcels for multi-county isolation. |
| MVP vs aspirational modules? | **MVP**: IDS → VEI → Workbench → GeoEquity. **Aspirational**: CostForge, AVM, Regression, Segments, AxiomFS. |
| Real-world data flow? | **CSV/Excel exports** from Tyler/Schneider/Catalis uploaded manually + **ArcGIS REST API** for spatial/parcel data. Direct CAMA DB and State DOR feeds deferred to Phase 2+. |
| TerraPilot AI's actual job? | **Autonomous Agent with human-in-the-loop guardrails.** Executes: ratio studies, diagnostics, comp audits, sales validation, change-impact simulations. Generates: draft recommendations, equity reports, appeal packets. **Never commits roll values** — produces recommended actions + evidence + expected impacts, then routes for sign-off with audit trail. |
| CAMA relationship? | **Gradual migration path.** Phase 1: complement legacy (ingest, analyze). Phase 2+: migrate workflows. End-state: TerraFusion becomes the valuation operating system. |
| Deployment model? | **Multi-County Platform** — shared platform serving multiple counties with data isolation. |
| Timeline philosophy? | **Building it right, no rush** — quality and architecture over speed. |
| Multi-county isolation? | **Row-level isolation (county_id + RLS).** All counties share tables filtered by `county_id` + RLS policies. Session tenant context via `SET app.county_id`. Composite unique keys include `county_id`. Partitioning deferred until volumes demand it. |
| Existing codebase strategy? | **Keep UI shell, rebuild data layer.** Preserve: navigation, layout, design system, routing, page scaffolds, table/map/modal shells. Replace: mock-driven hooks, ad-hoc state, fake services, inconsistent types. Build real typed domain layer with canonical DTOs. |

---

## 3. User Experience & Workflow

| Question | Answer |
|----------|--------|
| Day 1 user journey? | **County selector → Valuation Command Briefing dashboard.** Single-county users skip picker. Dashboard answers in 10 seconds: "Are we safe to trust the data, and where should I look first?" **Top row**: Data Freshness (green/yellow/red), Equity Snapshot (median ratio, COD, PRD, sample size), Work Queue (outliers, invalid sales, drift). **Middle**: Priority alerts ranked by impact + one-click recommended actions. **Bottom**: Recent activity (audit-friendly) + "continue where you left off." |
| Top daily tasks? | **1. Run ratio studies & equity checks** (COD/PRD/PRB, tier plots, neighborhood comparison, regressivity identification). **2. Parcel lookup & review** (assessment history, comps, sales, characteristics). **3. Work queue / outlier triage** (flagged outliers, invalid sales, neighborhood anomalies). |
| CAMA tools relationship? | **Gradual migration**: complement Tyler/Schneider/Catalis initially (import data, provide superior analytics), architect toward full replacement. |

---

## 4. Data & Integration

| Question | Answer |
|----------|--------|
| Actual data sources? | **Phase 1**: CSV/Excel file uploads + ArcGIS REST API. **Phase 2+**: Direct CAMA DB, State DOR feeds. |
| Parcel count per county? | **50,000 – 200,000 parcels** — moderate indexing and query optimization needed. |
| Data freshness requirement? | *Periodic batch* — import-driven, not real-time. |

---

## 5. Scope & Prioritization

| Question | Answer |
|----------|--------|
| Module build order? | **IDS → VEI → Workbench → GeoEquity → AVM → Regression** |
| Phase 1 OUT OF SCOPE? | CostForge, AxiomFS, 3D visualizations, scraping/notifications, admin workflows (appeals/permits/exemptions). |
| Phase 1 IN SCOPE? | IDS (ingest), VEI (equity), Workbench (parcel drill), GeoEquity (map), **thin Auth & roles** (login, county-scoped access, 2-3 roles, audit trail). |
| Existing code status? | Most components contain mock data. UI shell is sound; data layer needs full rebuild. |
| Deployment target? | **Multi-County Platform** — shared infrastructure with row-level data isolation. |

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
- Module build order: IDS → VEI → Workbench → GeoEquity
- Phase 1 scope: IDS + VEI + Workbench + GeoEquity + thin Auth
- Out of scope: CostForge, AxiomFS, 3D, scraping, admin workflows

---

*Discovery is COMPLETE. Proceeding to Research and Planning phases.*

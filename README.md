# TerraForge — Benton County Assessment Platform

> AI-native property assessment operating system for Washington State counties.  
> Built on Supabase + React + TypeScript. Part of the TerraFusion OS ecosystem.

## Data Foundation (Benton County)

| Dataset | Count | Source |
|---------|-------|--------|
| Parcels | 84,920 | Harris PACS 9.0 via seed pipeline |
| Assessments (2026) | 84,905 | PACS current-year extract |
| Historical Assessments | 162,264 | PACS certified rolls (2019-2025) |
| Qualified Sales | 91,781 | PACS arms-length transactions |
| Unqualified Sales | 114,083 | PACS excluded transactions |
| GIS Layers | 4 | Benton County FGDB (Parcel, CityLimits, FireDistrict, RevalArea) |

## Architecture

```
terra-forge/
├── src/                    # React 18 + TypeScript frontend
│   ├── components/         # 50+ lazy-loaded views
│   ├── hooks/              # 130+ custom React hooks
│   ├── services/           # Write-lane enforcement, TerraTrace, sync engine
│   └── config/             # IA_MAP (43 views), PACS contract, field mappings
├── supabase/
│   ├── functions/          # 32 edge functions (TerraPilot, GIS, AVM, PACS)
│   └── migrations/         # 147 migrations (schema + RLS + data)
├── scripts/                # Seed pipelines (PACS, GIS)
└── docs/                   # Phase plans, ADRs, research
```

### Module Map (4 Primary Modules)

| Module | Views | Scope |
|--------|-------|-------|
| **Home** | 26 views (Dashboard, Sync, Data Doctor, Webhooks, Smart Views, ...) | County |
| **Workbench** | 3 views (Property 360, Field Studio, Compare) | Parcel |
| **Factory** | 8 views (Calibration, VEI, GeoEquity, AVM, IAAO Compliance, ...) | Neighborhood/Run |
| **Registry** | 6 views (Audit Log, Audit Timeline, Value Ledger, Catalog, Models, AxiomFS) | Run |

### Routes

| Path | Description | Auth |
|------|-------------|------|
| `/` | Command Briefing (dashboard) | Protected |
| `/property/:parcelId` | Property Workbench (7 suite tabs) | Protected |
| `/factory` | Valuation Factory | Protected |
| `/factory/:mode` | Factory sub-mode | Protected |
| `/portal` | Owner Portal (public) | Open |
| `/auth` | Login | Open |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (144 tests across 9 files)
npx vitest run

# Type-check
npx tsc --noEmit
```

## Key Systems

- **Write-Lane Enforcement** — 22 domains, each with exactly 1 write owner. Cross-lane violations blocked in dev, logged in prod.
- **TerraTrace** — Append-only audit spine with hash-chain verification.
- **TerraPilot** — 26-tool agentic copilot (5 agent domains: forge, dais, dossier, atlas, os).
- **PACS Connector** — Read-only SQL Server integration with 6 sync products.
- **IA_MAP** — Single source of truth for all navigation (43 views + 30 legacy redirects).

## Test Suite

```
9 test files, 144 tests:
├── pacsBentonContract.test.ts    — PACS contract + quality gates
├── writeLane.test.ts             — Constitutional write-lane matrix
├── terraTrace.test.ts            — computeDiff pure function
├── sagaOrchestrator.test.ts      — Workflow saga engine
├── syncEngine.test.ts            — Sync engine state machine
├── sync.test.ts                  — Sync lifecycle
├── smoke.test.ts                 — IA_MAP integrity, route legality
├── hooks-contract.test.ts        — Hook export shapes, SuiteTab contract
└── write-lane-audit.test.ts      — Cross-lane violation detection
```

## Tech Stack

React 18 · TypeScript 5 · Vite · Supabase (Postgres + Edge Functions + Storage) · TanStack Query · Leaflet · Recharts · shadcn/ui · Vitest
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/436ae12b-15e8-4310-a2be-ccf3f55d8ade) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

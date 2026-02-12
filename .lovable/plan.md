

# TerraFusion OS: From App to Operating Environment
## Strategic Implementation Plan — The "Engineering Certainty" Transformation

---

## Executive Summary

The uploaded documents define a clear architectural vision: TerraFusion must transition from a "sidebar app" (2016-era) to a **Valuation Operating Environment** (2026-era). After auditing every component against the six strategy documents and two visual decks, the current codebase has significant structural gaps that must be addressed in phases.

### Current State vs. Vision

```text
+--------------------------------------------------+
|  CURRENT (2016-Era Sidebar App)                  |
|                                                  |
|  +----------+  +-----------------------------+   |
|  | Sidebar  |  | Header (basic)              |   |
|  | (tree)   |  +-----------------------------+   |
|  |          |  |                             |   |
|  | Dashboard|  |  Module Content             |   |
|  | IDS      |  |  (glass-card everywhere)    |   |
|  | VEI      |  |                             |   |
|  | Workbench|  |  No Context Mode            |   |
|  | GeoEquity|  |  No Model Receipts          |   |
|  | Settings |  |  No Quality Gates           |   |
|  +----------+  +-----------------------------+   |
+--------------------------------------------------+

+--------------------------------------------------+
|  VISION (2026-Era Operating Environment)         |
|                                                  |
|  +--------------------------------------------+ |
|  | Top System Bar (County | Year | Role | Sync)| |
|  +--------------------------------------------+ |
|  | Command Palette (Cmd+K) — Universal Teleport| |
|  +--------------------------------------------+ |
|  |                                            | |
|  |  STAGE (Canonical Scenes via Context Mode)  | |
|  |  +------+ +------+ +------+               | |
|  |  |Bento | |Bento | |Bento |  Attention    | |
|  |  |Card  | |Card  | |Card  |  Allocators   | |
|  |  +------+ +------+ +------+               | |
|  |                                            | |
|  +----+-----------+-----------+---------------+ |
|  | Dock Launcher  | Control Center (drawer)   | |
|  +----------------+---------------------------+ |
+--------------------------------------------------+
```

---

## Phase 1: The OS Shell (Layout Primitives)
**Goal:** Replace the sidebar-tree navigation with the 5 spatial primitives.

### 1.1 Top System Bar
Replace `SovereignHeader.tsx` with a persistent context bar showing:
- **County context** (e.g., "Benton County, WA")
- **Tax Year** selector (persistent, not per-module)
- **User Role** badge (Assessor, Deputy, Analyst)
- **Sync Status** indicator (real-time data freshness)
- **Cmd+K** shortcut hint

**Technical:** New component `TopSystemBar.tsx` using `context-ribbon` CSS class (already defined in `index.css`). Solid background with subtle border, no heavy glass.

### 1.2 Dock Launcher (Replace Sidebar)
Replace the vertical `SovereignSidebar.tsx` with a horizontal **Dock** anchored to the bottom of the screen (macOS-style):
- Suite icons with labels on hover
- Active suite indicator with subtle glow
- Collapses to icon-only by default
- Keyboard shortcuts (Cmd+1 through Cmd+5)

**Technical:** New component `DockLauncher.tsx`. Uses `glass-panel` for the dock container (approved OS chrome surface). Spring animations for icon hover (stiffness: 300, damping: 25).

### 1.3 Stage (Main Workspace)
The `renderModule()` switch in `AppLayout.tsx` becomes the "Stage" — the full-width workspace where Canonical Scenes render. Remove the sidebar margin calculation entirely.

### 1.4 Control Center (Drawer)
New slide-over drawer component for quick toggles:
- Map layer controls
- Parcel filters
- Model version selector
- Audit Mode toggle

**Technical:** New component `ControlCenter.tsx` using Radix Sheet, triggered from the Top System Bar.

### 1.5 Global Command Palette
Move `CommandPalette.tsx` from being Workbench-scoped to **OS-level** in `AppLayout.tsx`:
- Search parcels globally
- Jump to any suite
- Switch work modes
- Navigate to any parcel by PIN

**Technical:** Lift the Cmd+K listener to `AppLayout.tsx`. Add parcel search via database query.

---

## Phase 2: The 4-Layer Material System (CSS Governance)

### 2.1 Layer 1 — Liquid Glass (Shell Only)
**Current violation:** `glass-card` is used on VEI metric cards, data tables, ingest wizard cards, and dense grids. The documents explicitly forbid this.

**Fix:** Create distinct material classes:
- `.material-shell` — Glass with blur (Top System Bar, Dock, Command Palette, modals ONLY)
- `.material-bento` — Solid elevated surface for data cards (no blur, no backdrop-filter)
- `.material-interactive` — Reserved for commitment action buttons
- `.material-signal` — Neon/kinetic type for alerts

**Replace** all `glass-card` usage in data-dense components (VEIDashboard, IngestWizard, CommandBriefing) with `.material-bento`.

### 2.2 Layer 2 — Bento Grids (Attention Allocators)
Ensure all dashboard grids use **transform-based animations only** (no layout shift). Current Framer Motion `y: 20` animations are acceptable, but add the Zero CLS rule:
- Grid containers use `will-change: transform`
- No dynamic height changes on load
- Bento cards promote the "next required step" (e.g., "QA Gate Failed: 15 parcels missing")

### 2.3 Layer 3 — Tactile Maximalism (Commitment Actions Only)
Create a new `CommitmentButton` component with "stiff + bouncy" spring physics:
- Spring config: `stiffness: 400, damping: 10`
- Scale on press: `0.95` with bounce recovery
- Reserved ONLY for: Run, Publish, Certify, Export, Lock Model, Generate Defense Packet, Approve Calibration

**Current violation:** Regular buttons and navigation use whileTap scale effects. These must be removed from non-commitment actions.

### 2.4 Layer 4 — Signal (Neon Alerts)
Create a `SignalBadge` component for critical system states:
- "Audit Mode Active" — cyan neon glow
- "Model Locked" — gold pulse
- "COD Exceeded Target" — red kinetic text
- "Roll Certification" — green celebration effect

All signal text must include a tint layer for WCAG AA contrast on glass surfaces.

---

## Phase 3: Quality Gates (Performance + Accessibility)

### 3.1 Hardware Detection
Add a `useQualityGates` hook that detects:
- `navigator.hardwareConcurrency < 4` (low cores)
- `navigator.deviceMemory < 4` (low RAM)
- `CSS.supports('backdrop-filter', 'blur(1px)')` (capability check)
- `prefers-reduced-motion` media query
- `prefers-reduced-transparency` media query

### 3.2 Liquid Frost Fallback
When quality gates trigger, replace all `backdrop-filter: blur()` with solid frosted fills:
- `.material-shell` becomes `.material-frost` (solid `hsl(var(--tf-glass))` with no blur)
- Disable spring animations, use simple opacity transitions
- Disable kinetic type / neon glow effects

### 3.3 CSS Custom Properties for Gate Control
```text
:root {
  --enable-glass: 1;      /* 0 on low-power */
  --enable-motion: 1;     /* 0 on prefers-reduced-motion */
  --enable-signal: 1;     /* 0 on prefers-reduced-transparency */
}
```

---

## Phase 4: The Proof Layer (Model Receipts + Defend Loop)

### 4.1 Model Receipt Component
Every valuation run, ratio study computation, or calibration produces a **Model Receipt** containing:
- Inputs (all data points used)
- Model Version (algorithm identifier)
- Timestamp + Operator ID
- Outputs (resulting values and statistics)

**Technical:** New `ModelReceipt.tsx` component. Receipts are stored in a `model_receipts` database table and displayed as expandable cards in the Dossier tab.

### 4.2 TerraTrace Activity Feed
Surface TerraTrace audit events in the Property Workbench Summary tab as a real-time activity feed. Every TerraPilot tool execution, VEI computation, and IDS publish action appears as a trace event.

### 4.3 Defense Packet Generator
A "Generate Defense Packet" commitment action button (Tactile Maximalism layer) that assembles:
- Model Receipts for the parcel
- Comparable sales data
- Narrative (auto-generated via TerraGPT)
- Ratio study excerpt

---

## Phase 5: Context Mode (Canonical Scenes)

### 5.1 Scene Library (Initial 6 Scenes)
Rather than static module switching, the Stage renders **Canonical Scenes** based on user intent:

| Scene | Trigger | Primary Components |
|-------|---------|-------------------|
| Ingestion Gate | User navigates to IDS | QA checklists, data health, ingest wizard |
| Ratio Study Cockpit | User opens VEI | COD/PRD metrics, tier plots, drift warnings |
| Neighborhood Review | User opens GeoEquity | Map, parcel details, sales data |
| Property Workbench | User selects a parcel | Summary, Forge, Atlas, Dais, Dossier tabs |
| Calibration Run | User runs a model | Parameters, distributions, impact analysis |
| Appeal Defense Pack | User enters Case mode | Comps, narrative builder, audit trail |

### 5.2 Context Mode Processor
A `useContextMode` hook that selects the correct scene arrangement based on:
- Current work mode (Overview, Valuation, Mapping, Admin, Case)
- Active parcel context
- Workflow stage in the annual cycle

This is "Agentic UX" — the system selects known component arrangements, never generating new UI.

---

## Implementation Sequence

| Order | Deliverable | Estimated Complexity |
|-------|-------------|---------------------|
| 1 | Material System CSS refactor (Layer 1-4 classes) | Medium |
| 2 | Top System Bar + Dock Launcher (replace sidebar) | High |
| 3 | Global Command Palette (Cmd+K everywhere) | Medium |
| 4 | Quality Gates hook + Liquid Frost fallback | Medium |
| 5 | CommitmentButton + SignalBadge components | Low |
| 6 | Control Center drawer | Medium |
| 7 | Model Receipt component + database table | High |
| 8 | TerraTrace Activity Feed in Summary tab | Medium |
| 9 | Context Mode processor + Scene library | High |
| 10 | Defense Packet Generator | High |

---

## Non-Negotiable Standards (From Documents)

1. **3 Clicks to Value** — Every action reachable via Dock, Stage, or Cmd+K
2. **Zero Ad-Hoc CSS** — All surfaces use material system tokens
3. **60fps Performance** — Quality Gates enforce hardware-aware degradation
4. **WCAG AA Compliance** — Tint layers on all glass surfaces
5. **Zero CLS** — All Bento transitions use transforms, never re-layout
6. **Audit as First-Class Material** — Model Receipts visible at the point of action

This plan transforms TerraFusion from a "sidebar app that looks nice" into a **Valuation Operating Environment that manufactures certainty**.


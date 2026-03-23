# PACS Legacy Knowledge → TerraForge Data Layer — Execution Plan
# ═══════════════════════════════════════════════════════════════
# Multi-Agent Parallel Execution Strategy
# Created: 2026-03-22
# Workspace: terra-forge-rebuild (Supabase + React)

## Problem Statement

The PACS connector currently has **6 sync products** — but the legacy SQL patterns in
`docs/legacy/` reveal **12+ critical data domains** that are missing. The existing
products cover only property identity, valuations, neighborhoods, appeals, permits,
and exemptions. Missing: **owners, sales, land details, improvements, land schedules,
assessment roll monitors, and sales ratio analysis**.

## Architecture Rule

All SQL must originate from contract config files — never ad-hoc in runtime.
Extension path: `pacsFieldMappings.ts` → `pacsBentonContract.ts` → `runtime.ts`

---

## PHASE MAP (5 Parallel Lanes)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LANE A: SQL Contracts (Config Layer)             │
│  Agent: forge-stats   Writes: src/config/pacs*                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐             │
│  │OwnerSQL  │ │SalesSQL  │ │LandSQL    │ │ImprvSQL  │             │
│  │Templates │ │Templates │ │Templates  │ │Templates │             │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘             │
│       └─────────────┴─────────────┴─────────────┘                  │
│                          ↓                                         │
├─────────────────────────────────────────────────────────────────────┤
│                    LANE B: Supabase Schema (Migration Layer)       │
│  Agent: Explore (read) + tf-writer pattern   Writes: supabase/     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐             │
│  │owners    │ │sales     │ │land_detail│ │improvmts │             │
│  │migration │ │migration │ │migration  │ │migration │             │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘             │
│       └─────────────┴─────────────┴─────────────┘                  │
│                          ↓                                         │
├─────────────────────────────────────────────────────────────────────┤
│              LANE C: Quality Gates + Field Mappings                 │
│  Agent: forge-stats   Writes: src/config/pacsQualityGates.ts       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│  │OwnerGates   │ │SalesGates   │ │LandGates    │                  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘                  │
│         └───────────────┴───────────────┘                          │
│                          ↓                                         │
├─────────────────────────────────────────────────────────────────────┤
│              LANE D: Sync Runtime + Registry                       │
│  Agent: integrator   Writes: src/services/sync/runtime.ts          │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │resolveSQL   │ │ProductDefs   │ │IngestUpsert  │                │
│  │extension    │ │registration  │ │extension     │                │
│  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘                │
│         └───────────────┴────────────────┘                         │
│                          ↓                                         │
├─────────────────────────────────────────────────────────────────────┤
│              LANE E: Tests + Validation                             │
│  Agent: integrator   Writes: src/config/*.test.ts                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ContractTests│ │GateTests     │ │RuntimeTests  │                │
│  └─────────────┘ └──────────────┘ └──────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## SLICE 1: Owner Domain (Legacy → TerraForge)
**Source Pattern**: `docs/legacy/ownership.sql`
**Priority**: CRITICAL — owners are FK root for exemptions, appeals, sales

### 1A. SQL Contract (pacsFieldMappings.ts)
Add `PACS_OWNER_QUERIES` object:
```typescript
export const PACS_OWNER_QUERIES = {
  currentYearOwners: (year: number) => `
    WITH substantive_year AS (
      SELECT TOP 1 owner_tax_yr
      FROM dbo.owner
      GROUP BY owner_tax_yr
      HAVING COUNT(*) >= 1000
      ORDER BY owner_tax_yr DESC
    )
    SELECT
      o.prop_id,
      o.owner_id,
      a.file_as_name AS owner_name,
      o.pct_ownership,
      o.owner_tax_yr,
      o.sup_num
    FROM dbo.owner o
    JOIN dbo.account a ON a.acct_id = o.owner_id
    JOIN dbo.property p ON p.prop_id = o.prop_id
    CROSS JOIN substantive_year sy
    WHERE o.owner_tax_yr = sy.owner_tax_yr
      AND p.prop_inactive_dt IS NULL
  `,
  fractionalOwners: (year: number) => `
    -- From legacy ownership.sql: fractional interest detection
    SELECT o.prop_id, o.owner_id, a.file_as_name, o.pct_ownership
    FROM dbo.owner o
    JOIN dbo.account a ON a.acct_id = o.owner_id
    JOIN dbo.property_val pv ON pv.prop_id = o.prop_id
      AND pv.prop_val_yr = o.owner_tax_yr AND pv.sup_num = o.sup_num
    JOIN dbo.prop_supp_assoc psa ON psa.prop_id = pv.prop_id
      AND psa.owner_tax_yr = pv.prop_val_yr AND psa.sup_num = pv.sup_num
    JOIN dbo.property p ON p.prop_id = pv.prop_id
    WHERE pv.prop_val_yr = ${year}
      AND ISNULL(o.pct_ownership, 0) <> 100
      AND p.prop_inactive_dt IS NULL
  `,
};
```

### 1B. Supabase Migration
```sql
-- 20260322100001_pacs_owners_table.sql
CREATE TABLE IF NOT EXISTS pacs_owners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  owner_id integer NOT NULL,
  owner_name text,
  pct_ownership numeric(5,2),
  owner_tax_yr integer,
  sup_num integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, owner_id, owner_tax_yr, sup_num)
);

ALTER TABLE pacs_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON pacs_owners
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_owners_prop ON pacs_owners(county_id, prop_id);
CREATE INDEX idx_pacs_owners_name ON pacs_owners(county_id, owner_name);
```

### 1C. Quality Gate
```typescript
const gateOwnerCoverage: QualityGateDefinition = {
  id: "owner_coverage",
  name: "Owner Coverage",
  severity: "hard",
  evaluate: (data) => {
    const missing = data.records.filter(r => !r.owner_name || !r.owner_id);
    const rate = missing.length / data.records.length;
    return {
      gateId: "owner_coverage", name: "Owner Coverage",
      severity: "hard",
      status: rate <= 0.01 ? "pass" : "fail",
      actual: rate, threshold: 0.01,
      message: rate <= 0.01
        ? `${(100 - rate * 100).toFixed(1)}% owner coverage`
        : `${(rate * 100).toFixed(1)}% missing owners exceeds 1% threshold`,
    };
  },
};
```

### 1D. Product Registration (pacsBentonContract.ts)
```typescript
{
  id: "pacs_current_year_owners",
  name: "Property Owners (Current Year)",
  sourceTables: ["dbo.owner", "dbo.account"],
  targetTable: "pacs_owners",
  identityMode: PACS_IDENTITY_MODES.CURRENT_YEAR,
  requiredFields: ["prop_id", "owner_id", "owner_name"],
  optionalFields: ["pct_ownership", "owner_tax_yr", "sup_num"],
  deltaStrategies: ["hash_diff", "full_refresh"],
  qualityGates: ["pacs_current_year_owners"],
  piiRedactedColumns: [],
  provenance: "dbo.owner JOIN dbo.account ON owner_id = acct_id",
}
```

---

## SLICE 2: Sales Domain (Legacy → TerraForge)
**Source Pattern**: `docs/legacy/Queries/Sales Ratio.txt`, `docs/legacy/Queries/Land Sales.txt`
**Priority**: HIGH — sales ratios are IAAO compliance primitive

### 2A. SQL Contract (pacsFieldMappings.ts)
Add `PACS_SALES_QUERIES` object:
```typescript
export const PACS_SALES_QUERIES = {
  qualifiedSales: (year: number) => `
    -- From legacy Sales Ratio query: qualified arm's-length transactions
    SELECT
      s.chg_of_owner_id,
      copa.prop_id,
      p.geo_id,
      s.sl_price,
      s.sl_dt,
      s.sl_type_cd,
      s.sl_county_ratio_cd,
      s.sl_ratio_type_cd,
      pv.total_val AS market_value,
      pv.hood_cd,
      CASE WHEN pv.total_val <> 0
        THEN CAST(pv.total_val AS FLOAT) / NULLIF(s.sl_price, 0)
        ELSE NULL
      END AS ratio
    FROM dbo.sale s
    JOIN dbo.chg_of_owner_prop_assoc copa ON copa.chg_of_owner_id = s.chg_of_owner_id
      AND copa.prop_id = s.prop_id
    JOIN dbo.property p ON p.prop_id = copa.prop_id
    JOIN dbo.property_val pv ON pv.prop_id = copa.prop_id AND pv.prop_val_yr = ${year}
    WHERE s.sl_county_ratio_cd IN ('01','02')
      AND s.sl_price > 100
      AND YEAR(s.sl_dt) >= ${year} - 2
      AND p.prop_inactive_dt IS NULL
  `,
  recentSaleByProp: (year: number) => `
    -- Most recent qualified sale per property
    WITH ranked AS (
      SELECT
        copa.prop_id, s.sl_price, s.sl_dt, s.sl_type_cd,
        ROW_NUMBER() OVER (PARTITION BY copa.prop_id ORDER BY s.sl_dt DESC) AS rn
      FROM dbo.sale s
      JOIN dbo.chg_of_owner_prop_assoc copa ON copa.chg_of_owner_id = s.chg_of_owner_id
        AND copa.prop_id = s.prop_id
      WHERE s.sl_price > 0 AND YEAR(s.sl_dt) >= ${year} - 3
    )
    SELECT prop_id, sl_price, sl_dt, sl_type_cd
    FROM ranked WHERE rn = 1
  `,
};
```

### 2B. Supabase Migration
```sql
-- 20260322100002_pacs_sales_table.sql
CREATE TABLE IF NOT EXISTS pacs_sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  chg_of_owner_id integer,
  prop_id integer NOT NULL,
  geo_id text,
  sale_price numeric(14,2),
  sale_date date,
  sale_type_cd text,
  ratio_cd text,
  ratio_type_cd text,
  market_value numeric(14,2),
  hood_cd text,
  ratio numeric(8,4),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, chg_of_owner_id, prop_id)
);

ALTER TABLE pacs_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON pacs_sales
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_sales_prop ON pacs_sales(county_id, prop_id);
CREATE INDEX idx_pacs_sales_date ON pacs_sales(county_id, sale_date);
CREATE INDEX idx_pacs_sales_hood ON pacs_sales(county_id, hood_cd);
```

### 2C. Quality Gates
```typescript
const gateSalesPriceRange: QualityGateDefinition = {
  id: "sales_price_range",
  name: "Sales Price Sanity",
  severity: "hard",
  // reject if >5% of sales have price ≤ $100 (suggests unqualified data leaked through)
};

const gateRatioDistribution: QualityGateDefinition = {
  id: "ratio_distribution",
  name: "IAAO Ratio Distribution",
  severity: "soft",
  // warn if median ratio outside 0.90–1.10 band (IAAO Standard)
};
```

---

## SLICE 3: Land Details Domain
**Source Pattern**: `docs/legacy/land and ag schedules.txt`
**Priority**: HIGH — land is 40-60% of total assessed value

### 3A. SQL Contract
Add `PACS_LAND_QUERIES` object:
```typescript
export const PACS_LAND_QUERIES = {
  landDetails: (year: number) => `
    -- From legacy land and ag schedules pattern
    WITH substantive_year AS (
      SELECT TOP 1 prop_val_yr
      FROM dbo.land_detail
      GROUP BY prop_val_yr
      HAVING COUNT(*) >= 1000
      ORDER BY prop_val_yr DESC
    )
    SELECT
      ld.prop_id, ld.prop_val_yr, ld.sup_num,
      ld.land_seg_id, ld.land_type_cd, ld.land_class_code,
      ld.land_soil_code, ld.land_acres, ld.land_sqft,
      ld.land_adj_factor, ld.num_lots,
      ld.land_unit_price, ld.land_val,
      ld.ag_val, ld.ag_use_val,
      ls_mkt.ls_code AS market_schedule,
      ls_ag.ls_code AS ag_schedule
    FROM dbo.land_detail ld
    CROSS JOIN substantive_year sy
    LEFT JOIN dbo.land_sched ls_mkt ON ls_mkt.ls_id = ld.ls_mkt_id
      AND ls_mkt.ls_year = ld.prop_val_yr
    LEFT JOIN dbo.land_sched ls_ag ON ls_ag.ls_id = ld.ls_ag_id
      AND ls_ag.ls_year = ld.prop_val_yr
    WHERE ld.prop_val_yr = sy.prop_val_yr
      AND (ld.sale_id = 0 OR ld.sale_id IS NULL)
  `,
};
```

### 3B. Supabase Migration
```sql
-- 20260322100003_pacs_land_details_table.sql
CREATE TABLE IF NOT EXISTS pacs_land_details (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  prop_val_yr integer NOT NULL,
  sup_num integer DEFAULT 0,
  land_seg_id integer,
  land_type_cd text,
  land_class_code text,
  land_soil_code text,
  land_acres numeric(12,4),
  land_sqft numeric(14,2),
  land_adj_factor numeric(8,4),
  num_lots integer DEFAULT 1,
  land_unit_price numeric(14,2),
  land_val numeric(14,2),
  ag_val numeric(14,2),
  ag_use_val numeric(14,2),
  market_schedule text,
  ag_schedule text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, prop_val_yr, sup_num, land_seg_id)
);

ALTER TABLE pacs_land_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON pacs_land_details
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_land_prop ON pacs_land_details(county_id, prop_id);
```

---

## SLICE 4: Improvement Domain
**Source Pattern**: `docs/legacy/Res_withPopulation.sql`, `docs/legacy/res_condensed.sql`
**Priority**: HIGH — improvements are 40-60% of total assessed value

### 4A. SQL Contract
Add `PACS_IMPROVEMENT_QUERIES` object:
```typescript
export const PACS_IMPROVEMENT_QUERIES = {
  improvements: (year: number) => `
    -- From legacy res_condensed + Res_withPopulation patterns
    WITH substantive_year AS (
      SELECT TOP 1 prop_val_yr
      FROM dbo.imprv
      GROUP BY prop_val_yr
      HAVING COUNT(*) >= 1000
      ORDER BY prop_val_yr DESC
    )
    SELECT
      i.prop_id, i.prop_val_yr, i.sup_num, i.imprv_id,
      i.imprv_type_cd, i.imprv_desc,
      i.imprv_val, i.flat_val, i.imprv_val_source,
      i.economic_pct, i.physical_pct, i.functional_pct
    FROM dbo.imprv i
    CROSS JOIN substantive_year sy
    WHERE i.prop_val_yr = sy.prop_val_yr
      AND (i.sale_id = 0 OR i.sale_id IS NULL)
      AND i.imprv_desc NOT LIKE '%SOH%'
  `,
  improvementDetails: (year: number) => `
    WITH substantive_year AS (
      SELECT TOP 1 prop_val_yr
      FROM dbo.imprv_detail
      GROUP BY prop_val_yr
      HAVING COUNT(*) >= 1000
      ORDER BY prop_val_yr DESC
    )
    SELECT
      id2.prop_id, id2.prop_val_yr, id2.sup_num,
      id2.imprv_id, id2.imprv_det_id,
      id2.imprv_det_type_cd, id2.imprv_det_class_cd,
      id2.imprv_det_area, id2.imprv_det_val,
      id2.yr_built AS actual_year_built,
      id2.yr_remodel, id2.condition_cd,
      id2.imprv_det_quality_cd,
      id2.living_area,
      id2.num_bedrooms, id2.total_bath
    FROM dbo.imprv_detail id2
    CROSS JOIN substantive_year sy
    WHERE id2.prop_val_yr = sy.prop_val_yr
      AND (id2.sale_id = 0 OR id2.sale_id IS NULL)
  `,
};
```

### 4B. Supabase Migrations
```sql
-- 20260322100004_pacs_improvements_table.sql
CREATE TABLE IF NOT EXISTS pacs_improvements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  prop_val_yr integer NOT NULL,
  sup_num integer DEFAULT 0,
  imprv_id integer NOT NULL,
  imprv_type_cd text,
  imprv_desc text,
  imprv_val numeric(14,2),
  flat_val numeric(14,2),
  imprv_val_source text,
  economic_pct numeric(5,2),
  physical_pct numeric(5,2),
  functional_pct numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, prop_val_yr, sup_num, imprv_id)
);

-- 20260322100005_pacs_improvement_details_table.sql
CREATE TABLE IF NOT EXISTS pacs_improvement_details (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  prop_val_yr integer NOT NULL,
  sup_num integer DEFAULT 0,
  imprv_id integer NOT NULL,
  imprv_det_id integer NOT NULL,
  imprv_det_type_cd text,
  imprv_det_class_cd text,
  imprv_det_area numeric(12,2),
  imprv_det_val numeric(14,2),
  actual_year_built integer,
  yr_remodel integer,
  condition_cd text,
  quality_cd text,
  living_area numeric(12,2),
  num_bedrooms integer,
  total_bath numeric(4,1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, prop_val_yr, sup_num, imprv_id, imprv_det_id)
);
```

---

## SLICE 5: Assessment Roll Monitor
**Source Pattern**: `docs/legacy/Real_Prop_Monitor.txt`
**Priority**: MEDIUM — DOR compliance reporting

### 5A. SQL Contract
Add `PACS_ROLL_QUERIES` object:
```typescript
export const PACS_ROLL_QUERIES = {
  assessmentRoll: (year: number) => `
    -- From legacy Real_Prop_Monitor stored procedure pattern
    SELECT
      pv.prop_id,
      p.geo_id,
      o.owner_id,
      a.file_as_name AS owner_name,
      wpov.imprv_hstd_val, wpov.imprv_non_hstd_val,
      wpov.land_hstd_val, wpov.land_non_hstd_val,
      wpov.timber_market, wpov.ag_market,
      wpov.appraised_classified, wpov.appraised_non_classified,
      wpov.taxable_classified, wpov.taxable_non_classified,
      ta.tax_area_id, ta.tax_area_desc,
      s.situs_display,
      pp.property_use_cd, pp.state_cd
    FROM dbo.property_val pv
    JOIN dbo.prop_supp_assoc psa ON psa.prop_id = pv.prop_id
      AND psa.owner_tax_yr = pv.prop_val_yr AND psa.sup_num = pv.sup_num
    JOIN dbo.property p ON p.prop_id = pv.prop_id
    JOIN dbo.owner o ON o.prop_id = pv.prop_id
      AND o.owner_tax_yr = pv.prop_val_yr AND o.sup_num = pv.sup_num
    JOIN dbo.account a ON a.acct_id = o.owner_id
    LEFT JOIN dbo.wash_prop_owner_val wpov ON wpov.prop_id = pv.prop_id
      AND wpov.prop_val_yr = pv.prop_val_yr AND wpov.sup_num = pv.sup_num
      AND wpov.owner_id = o.owner_id
    LEFT JOIN dbo.wash_prop_owner_tax_area_assoc wptaa ON wptaa.prop_id = pv.prop_id
      AND wptaa.prop_val_yr = pv.prop_val_yr AND wptaa.sup_num = pv.sup_num
      AND wptaa.owner_id = o.owner_id
    LEFT JOIN dbo.tax_area ta ON ta.tax_area_id = wptaa.tax_area_id
    LEFT JOIN dbo.situs s ON s.prop_id = pv.prop_id AND s.primary_situs = 'Y'
    LEFT JOIN dbo.property_profile pp ON pp.prop_id = pv.prop_id
      AND pp.prop_val_yr = pv.prop_val_yr AND pp.sup_num = pv.sup_num
    WHERE pv.prop_val_yr = ${year}
      AND pv.prop_inactive_dt IS NULL
      AND p.prop_type_cd IN ('R', 'MH')
  `,
};
```

---

## SLICE 6: Neighborhood Hood Analysis
**Source Pattern**: `docs/legacy/appraise_hoods.sql`
**Priority**: MEDIUM — extends existing neighborhood_dim product

### 6A. SQL Contract
Add to `PACS_NEIGHBORHOOD_QUERIES`:
```typescript
  hoodAnalysis: (year: number) => `
    -- From legacy appraise_hoods.sql — full hood profile with valuations
    SELECT
      pv.hood_cd,
      n.hood_name,
      COUNT(DISTINCT pv.prop_id) AS parcel_count,
      AVG(pv.total_val) AS avg_total_val,
      AVG(pv.land_val) AS avg_land_val,
      AVG(pv.total_imprv_val) AS avg_imprv_val,
      SUM(CASE WHEN i.imprv_val_source = 'F' THEN 1 ELSE 0 END) AS flat_value_count,
      COUNT(DISTINCT s.chg_of_owner_id) AS sale_count,
      AVG(CASE WHEN s.sl_price > 100 AND s.sl_county_ratio_cd IN ('01','02')
        THEN CAST(pv.total_val AS FLOAT) / NULLIF(s.sl_price, 0) END) AS avg_ratio
    FROM dbo.property_val pv
    JOIN dbo.property p ON p.prop_id = pv.prop_id
    JOIN dbo.neighborhood n ON n.hood_cd = pv.hood_cd AND n.hood_yr = pv.prop_val_yr
    LEFT JOIN dbo.imprv i ON i.prop_id = pv.prop_id AND i.prop_val_yr = pv.prop_val_yr
      AND i.sup_num = pv.sup_num AND (i.sale_id = 0 OR i.sale_id IS NULL)
    LEFT JOIN dbo.chg_of_owner_prop_assoc copa ON copa.prop_id = pv.prop_id
    LEFT JOIN dbo.sale s ON s.chg_of_owner_id = copa.chg_of_owner_id
      AND s.prop_id = copa.prop_id
    WHERE pv.prop_val_yr = ${year}
      AND p.prop_inactive_dt IS NULL
    GROUP BY pv.hood_cd, n.hood_name
  `,
```

---

## EXECUTION STRATEGY: Multi-Agent Parallel Deployment

### Wave 1 — Parallel (Slices 1 + 2 + 3 + 4 simultaneously)

| Lane | Files Modified | Agent | Parallel? |
|------|---------------|-------|-----------|
| A: SQL Contracts | `src/config/pacsFieldMappings.ts` | Main agent | Yes |
| A: SQL Contracts | `src/config/pacsWorkflowMappings.ts` | Main agent | Yes |
| B: Migrations | `supabase/migrations/20260322100001_*.sql` (×5) | Main agent | Yes |
| C: Quality Gates | `src/config/pacsQualityGates.ts` | Main agent | Yes |
| D: Product Defs | `src/config/pacsBentonContract.ts` | Main agent | Yes |

### Wave 2 — Sequential (depends on Wave 1)

| Lane | Files Modified | Agent | Depends On |
|------|---------------|-------|------------|
| D: Runtime | `src/services/sync/runtime.ts` | Main agent | Wave 1 A+D |
| D: Ingest | `src/services/ingestService.ts` | Main agent | Wave 1 B |

### Wave 3 — Sequential (depends on Wave 2)

| Lane | Files Modified | Agent | Depends On |
|------|---------------|-------|------------|
| E: Tests | `src/config/pacsBentonContract.test.ts` | integrator | Wave 2 |
| E: Type-check | `npx tsc --noEmit` | integrator | Wave 2 |

---

## FILES TOUCHED (Complete Manifest)

### Modified (existing files):
1. `src/config/pacsFieldMappings.ts` — add PACS_OWNER_QUERIES, PACS_SALES_QUERIES, PACS_LAND_QUERIES, PACS_IMPROVEMENT_QUERIES, PACS_ROLL_QUERIES, extend PACS_NEIGHBORHOOD_QUERIES
2. `src/config/pacsBentonContract.ts` — add 6 new SyncProductDefinition entries
3. `src/config/pacsQualityGates.ts` — add 5 new quality gate implementations + wire into BENTON_QUALITY_GATES
4. `src/services/sync/runtime.ts` — extend resolveProductSQL() with 6 new product cases
5. `src/services/ingestService.ts` — add upsert functions for new tables

### Created (new files):
6. `supabase/migrations/20260322100001_pacs_owners_table.sql`
7. `supabase/migrations/20260322100002_pacs_sales_table.sql`
8. `supabase/migrations/20260322100003_pacs_land_details_table.sql`
9. `supabase/migrations/20260322100004_pacs_improvements_table.sql`
10. `supabase/migrations/20260322100005_pacs_improvement_details_table.sql`

### Validation:
11. `npx tsc --noEmit` — zero errors
12. Vitest contract tests — all pass

---

## LEGACY SQL PATTERN → CONTRACT CROSSWALK

| Legacy File | Domain | Contract Function | Status |
|------------|--------|-------------------|--------|
| `ownership.sql` | Owners | `PACS_OWNER_QUERIES.currentYearOwners()` | NEW |
| `ownership.sql` | Owners | `PACS_OWNER_QUERIES.fractionalOwners()` | NEW |
| `Queries/Sales Ratio.txt` | Sales | `PACS_SALES_QUERIES.qualifiedSales()` | NEW |
| `Queries/Land Sales.txt` | Sales | `PACS_SALES_QUERIES.recentSaleByProp()` | NEW |
| `land and ag schedules.txt` | Land | `PACS_LAND_QUERIES.landDetails()` | NEW |
| `res_condensed.sql` | Improvements | `PACS_IMPROVEMENT_QUERIES.improvements()` | NEW |
| `Res_withPopulation.sql` | Improvements | `PACS_IMPROVEMENT_QUERIES.improvementDetails()` | NEW |
| `Real_Prop_Monitor.txt` | Roll | `PACS_ROLL_QUERIES.assessmentRoll()` | NEW |
| `appraise_hoods.sql` | Neighborhoods | `PACS_NEIGHBORHOOD_QUERIES.hoodAnalysis()` | NEW |
| `Queries/Value Change.txt` | Valuations | Already covered by `currentYearValues()` | EXISTING |
| `Queries/Permit Status Check.txt` | Permits | Already covered by `permits()` | EXISTING |

---

## RISK REGISTER

| Risk | Severity | Mitigation |
|------|----------|------------|
| MSSQL sale/imprv tables empty in current PACS instance | HIGH | Quality gates allow 0-row pass for known-empty sources; log + don't fail |
| Year sparsity (stub years) | HIGH | HAVING COUNT(*) >= 1000 pattern on all temporal queries |
| SQL injection via year parameter | CRITICAL | All year params are integers, validated before string interpolation |
| PII in owner names | MEDIUM | owner_name is NOT PII per FISMA definition (public record); SSN/DOB never extracted |
| Schema drift in PACS updates | LOW | Schema expectations in pacsQualityGates.ts detect drift on first sync run |

---

## SUCCESS CRITERIA

1. `npx tsc --noEmit` passes with zero errors
2. All 6 new sync products registered in pacsBentonContract.ts
3. All 9 new SQL template functions implemented in config layer
4. 5 new Supabase migrations created with RLS + county isolation
5. Quality gates defined for owners, sales, land, improvements
6. resolveProductSQL() handles all 12 products (6 existing + 6 new)
7. No ad-hoc SQL in runtime.ts — all SQL from contract config

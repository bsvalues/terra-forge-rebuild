import { describe, it, expect } from "vitest";
import { validateContract, getContractSummary, SYNC_PRODUCTS, IDENTITY_DOCTRINE, BENTON_COUNTY } from "@/config/pacsBentonContract";
import { runQualityGates, detectSchemaDrift, BENTON_QUALITY_GATES, type SyncProductData } from "@/config/pacsQualityGates";
import {
  PACS_OWNER_QUERIES,
  PACS_SALES_QUERIES,
  PACS_LAND_QUERIES,
  PACS_IMPROVEMENT_QUERIES,
  PACS_ROLL_QUERIES,
  PACS_NEIGHBORHOOD_QUERIES,
} from "@/config/pacsFieldMappings";
import { pickOneRowPerKey, safeIntCast, declareAppraisalYear } from "@/config/sqlServerHelpers";
import {
  validateReadOnlySQL,
  validateReadOnlyPermissions,
  BENTON_CONNECTOR_CONFIG,
} from "@/services/pacsConnector";

describe("PACS Benton Contract", () => {
  it("contract self-validates without errors", () => {
    const result = validateContract();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.productCount).toBe(13);
  });

  it("all products have delta strategies", () => {
    for (const p of SYNC_PRODUCTS) {
      expect(p.deltaStrategies.length).toBeGreaterThan(0);
    }
  });

  it("exemption products have PII redaction", () => {
    const exemptionProducts = SYNC_PRODUCTS.filter((p) => p.id.includes("exemption"));
    for (const p of exemptionProducts) {
      expect(p.piiRedactedColumns.length).toBeGreaterThan(0);
    }
  });

  it("identity doctrine is correctly defined", () => {
    expect(IDENTITY_DOCTRINE.currentYear.keyFields).toEqual(["prop_id"]);
    expect(IDENTITY_DOCTRINE.certifiedYears.keyFields).toEqual(["prop_id", "sup_num", "year"]);
    expect(IDENTITY_DOCTRINE.apnColumn).toBe("geo_id");
  });

  it("county metadata is correct", () => {
    expect(BENTON_COUNTY.countyName).toBe("Benton");
    expect(BENTON_COUNTY.countyState).toBe("WA");
    expect(BENTON_COUNTY.connectionMethod).toBe("direct_sql");
    expect(BENTON_COUNTY.accessPosture).toBe("read_only");
    expect(BENTON_COUNTY.allowedStatements).toContain("SELECT");
  });

  it("getContractSummary returns valid shape", () => {
    const summary = getContractSummary();
    expect(summary.county.countyName).toBe("Benton");
    expect(summary.products).toHaveLength(13);
    expect(summary.validation.valid).toBe(true);
  });
});

describe("Quality Gates", () => {
  it("passes clean data through all gates", () => {
    const data: SyncProductData = {
      year: 2025,
      productId: "pacs_current_year_property_val",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        hood_cd: `H${(i % 10) + 1}`,
        geo_id: `53005-${i}`,
        total_val: 200000 + i * 1000,
        land_val: 80000 + i * 500,
        imprv_val: 120000 + i * 500,
      })),
    };
    const report = runQualityGates(data);
    expect(report.publishable).toBe(true);
    expect(report.overallStatus).toBe("pass");
  });

  it("fails on duplicate prop_ids (sup_num ghosts)", () => {
    const records = Array.from({ length: 100 }, (_, i) => ({
      prop_id: String(i < 20 ? 1 : i), // 20% duplicates
      hood_cd: "H1",
      geo_id: `53005-${i}`,
      total_val: 200000,
      land_val: 80000,
      imprv_val: 120000,
    }));
    const report = runQualityGates({
      year: 2025, productId: "pacs_current_year_property_val", records,
    });
    expect(report.publishable).toBe(false);
    const ghost = report.gates.find((g) => g.gateId === "one_row_per_prop_id");
    expect(ghost?.status).toBe("fail");
  });

  it("fails on value sanity violations", () => {
    const records = Array.from({ length: 100 }, (_, i) => ({
      prop_id: String(i + 1),
      hood_cd: "H1",
      geo_id: `53005-${i}`,
      total_val: i < 10 ? 50000 : 200000, // 10 records where total < land
      land_val: 100000,
      imprv_val: 100000,
    }));
    const report = runQualityGates({
      year: 2025, productId: "pacs_current_year_property_val", records,
    });
    expect(report.publishable).toBe(false);
  });

  it("detects permit cast failures", () => {
    const records = Array.from({ length: 100 }, (_, i) => ({
      prop_id: i < 5 ? null : String(i), // 5% cast failures
      bldg_permit_id: String(i),
      bldg_permit_status: "active",
    }));
    const report = runQualityGates({
      year: 2025, productId: "pacs_workflow_permits_open", records,
    });
    expect(report.publishable).toBe(false);
  });
});

describe("Schema Drift Detection", () => {
  it("detects breaking change when required column missing", () => {
    const result = detectSchemaDrift("dbo.property_val", [
      "prop_id", "prop_val_yr", "sup_num", "total_val", "land_val",
      // hood_cd is MISSING — required!
    ]);
    expect(result.status).toBe("breaking_change");
    expect(result.missingRequired).toContain("hood_cd");
  });

  it("detects drift when optional column missing", () => {
    const result = detectSchemaDrift("dbo.property_val", [
      "prop_id", "prop_val_yr", "hood_cd", "sup_num", "total_val", "land_val",
      // total_imprv_val is MISSING — optional
    ]);
    expect(result.status).toBe("drift_detected");
    expect(result.missingOptional).toContain("total_imprv_val");
  });

  it("passes valid schema", () => {
    const result = detectSchemaDrift("dbo.property_val", [
      "prop_id", "prop_val_yr", "hood_cd", "sup_num", "total_val", "land_val", "total_imprv_val",
      "some_extra_column",
    ]);
    expect(result.status).toBe("valid");
    expect(result.unexpected).toContain("some_extra_column");
  });
});

describe("SQL Server Helpers", () => {
  it("generates ROW_NUMBER CTE", () => {
    const sql = pickOneRowPerKey({
      from: "dbo.property_val pv",
      partitionBy: "pv.prop_id",
      orderBy: "pv.sup_num ASC",
      selectColumns: ["pv.prop_val_yr AS [year]", "pv.hood_cd", "pv.prop_id"],
      where: "pv.prop_val_yr = 2025",
    });
    expect(sql).toContain("ROW_NUMBER()");
    expect(sql).toContain("PARTITION BY pv.prop_id");
    expect(sql).toContain("WHERE rn = 1");
    expect(sql).not.toContain("DISTINCT ON");
  });

  it("generates safe int cast", () => {
    expect(safeIntCast("bp.bldg_permit_import_prop_id", "prop_id"))
      .toBe("TRY_CONVERT(int, bp.bldg_permit_import_prop_id) AS prop_id");
  });

  it("generates appraisal year preamble", () => {
    expect(declareAppraisalYear(2025)).toBe("DECLARE @yr int = 2025;");
    expect(declareAppraisalYear()).toContain("pacs_system");
  });
});

// ============================================================
// Read-Only Connector Governance Tests
// ============================================================

describe("Read-Only SQL Connector", () => {
  it("allows SELECT statements", () => {
    expect(validateReadOnlySQL("SELECT * FROM dbo.property").valid).toBe(true);
  });

  it("allows WITH...SELECT (CTEs)", () => {
    const sql = `WITH ranked AS (
      SELECT prop_id, ROW_NUMBER() OVER (PARTITION BY prop_id ORDER BY sup_num) AS rn
      FROM dbo.property_val
    ) SELECT * FROM ranked WHERE rn = 1;`;
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("allows DECLARE @yr preamble", () => {
    const sql = `DECLARE @yr int = (SELECT appr_yr FROM dbo.pacs_system);
    SELECT prop_id, hood_cd FROM dbo.property_val WHERE prop_val_yr = @yr;`;
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("blocks INSERT statements", () => {
    const result = validateReadOnlySQL("INSERT INTO dbo.property (prop_id) VALUES (1)");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("must start with SELECT");
  });

  it("blocks UPDATE statements", () => {
    const result = validateReadOnlySQL("UPDATE dbo.property SET geo_id = 'X' WHERE prop_id = 1");
    expect(result.valid).toBe(false);
  });

  it("blocks DELETE statements", () => {
    const result = validateReadOnlySQL("DELETE FROM dbo.property WHERE prop_id = 1");
    expect(result.valid).toBe(false);
  });

  it("blocks DROP/ALTER", () => {
    expect(validateReadOnlySQL("DROP TABLE dbo.property").valid).toBe(false);
    expect(validateReadOnlySQL("ALTER TABLE dbo.property ADD col INT").valid).toBe(false);
  });

  it("blocks EXEC/xp_ injection", () => {
    expect(validateReadOnlySQL("EXEC sp_executesql N'SELECT 1'").valid).toBe(false);
  });

  it("blocks sneaky multi-statement injection", () => {
    const sql = "SELECT 1; DELETE FROM dbo.property";
    const result = validateReadOnlySQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("sub-statement");
  });

  it("blocks embedded blocked keywords in SELECT", () => {
    const sql = "SELECT * FROM dbo.property; INSERT INTO dbo.hack VALUES(1)";
    expect(validateReadOnlySQL(sql).valid).toBe(false);
  });

  it("rejects empty/null input", () => {
    expect(validateReadOnlySQL("").valid).toBe(false);
    expect(validateReadOnlySQL(null as any).valid).toBe(false);
  });

  it("connector config is hardcoded read-only", () => {
    expect(BENTON_CONNECTOR_CONFIG.canWrite).toBe(false);
    expect(BENTON_CONNECTOR_CONFIG.method).toBe("direct_sql");
    expect(BENTON_CONNECTOR_CONFIG.allowedSchemas).toEqual(["dbo"]);
  });

  it("validates read-only permissions correctly", () => {
    // All zeros = read-only
    const clean = validateReadOnlyPermissions({
      can_insert: 0, can_update: 0, can_delete: 0, can_alter: 0, can_execute: 0,
    });
    expect(clean.readOnly).toBe(true);
    expect(clean.violations).toHaveLength(0);

    // Has INSERT = violation
    const dirty = validateReadOnlyPermissions({
      can_insert: 1, can_update: 0, can_delete: 0, can_alter: 0, can_execute: 0,
    });
    expect(dirty.readOnly).toBe(false);
    expect(dirty.violations).toContain("INSERT");
  });
});

// ============================================================
// Lane E: New PACS Domain Products — Contract Tests
// ============================================================

describe("PACS Domain Products — Contract Registration", () => {
  const productIds = SYNC_PRODUCTS.map((p) => p.id);

  it("registers all 6 new domain products", () => {
    expect(productIds).toContain("pacs_current_year_owners");
    expect(productIds).toContain("pacs_qualified_sales");
    expect(productIds).toContain("pacs_land_details");
    expect(productIds).toContain("pacs_improvements");
    expect(productIds).toContain("pacs_improvement_details");
    expect(productIds).toContain("pacs_assessment_roll");
  });

  it("owner product has correct source tables and target", () => {
    const p = SYNC_PRODUCTS.find((p) => p.id === "pacs_current_year_owners")!;
    expect(p.sourceTables).toContain("dbo.owner");
    expect(p.sourceTables).toContain("dbo.account");
    expect(p.targetTable).toBe("pacs_owners");
    expect(p.requiredFields).toContain("prop_id");
    expect(p.requiredFields).toContain("owner_id");
    expect(p.requiredFields).toContain("owner_name");
  });

  it("sales product references chg_of_owner tables", () => {
    const p = SYNC_PRODUCTS.find((p) => p.id === "pacs_qualified_sales")!;
    expect(p.sourceTables).toContain("dbo.sale");
    expect(p.targetTable).toBe("pacs_sales");
    expect(p.requiredFields).toContain("prop_id");
  });

  it("land details product references land_detail table", () => {
    const p = SYNC_PRODUCTS.find((p) => p.id === "pacs_land_details")!;
    expect(p.sourceTables).toContain("dbo.land_detail");
    expect(p.targetTable).toBe("pacs_land_details");
  });

  it("improvement products reference imprv tables", () => {
    const pI = SYNC_PRODUCTS.find((p) => p.id === "pacs_improvements")!;
    expect(pI.sourceTables).toContain("dbo.imprv");
    expect(pI.targetTable).toBe("pacs_improvements");

    const pD = SYNC_PRODUCTS.find((p) => p.id === "pacs_improvement_details")!;
    expect(pD.sourceTables).toContain("dbo.imprv_detail");
    expect(pD.targetTable).toBe("pacs_improvement_details");
  });

  it("assessment roll product references property_val and owner", () => {
    const p = SYNC_PRODUCTS.find((p) => p.id === "pacs_assessment_roll")!;
    expect(p.sourceTables).toContain("dbo.property_val");
    expect(p.sourceTables).toContain("dbo.owner");
    expect(p.targetTable).toBe("pacs_assessment_roll");
  });

  it("all new products have delta strategies", () => {
    const newIds = [
      "pacs_current_year_owners", "pacs_qualified_sales", "pacs_land_details",
      "pacs_improvements", "pacs_improvement_details", "pacs_assessment_roll",
    ];
    for (const id of newIds) {
      const p = SYNC_PRODUCTS.find((p) => p.id === id)!;
      expect(p.deltaStrategies.length).toBeGreaterThan(0);
    }
  });

  it("all new products have quality gate references", () => {
    const newIds = [
      "pacs_current_year_owners", "pacs_qualified_sales", "pacs_land_details",
      "pacs_improvements", "pacs_improvement_details", "pacs_assessment_roll",
    ];
    for (const id of newIds) {
      const p = SYNC_PRODUCTS.find((p) => p.id === id)!;
      expect(p.qualityGates.length).toBeGreaterThan(0);
      // Each referenced gate must exist in BENTON_QUALITY_GATES
      for (const gateKey of p.qualityGates) {
        expect(BENTON_QUALITY_GATES[gateKey]).toBeDefined();
      }
    }
  });
});

// ============================================================
// Lane E: New Quality Gates — Domain Tests
// ============================================================

describe("Quality Gates — Owner Domain", () => {
  it("passes clean owner data", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_current_year_owners",
      records: Array.from({ length: 50 }, (_, i) => ({
        prop_id: String(i + 1),
        owner_id: String(i + 100),
        owner_name: `Owner ${i}`,
        pct_ownership: 100,
      })),
    });
    expect(report.publishable).toBe(true);
  });

  it("fails when owner_name is mostly missing", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_current_year_owners",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        owner_id: i < 5 ? null : String(i + 100),
        owner_name: i < 5 ? null : `Owner ${i}`,
      })),
    });
    const ownerGate = report.gates.find((g) => g.gateId === "owner_coverage");
    expect(ownerGate).toBeDefined();
    // 5% missing exceeds 1% threshold → fail
    expect(ownerGate?.status).toBe("fail");
  });
});

describe("Quality Gates — Sales Domain", () => {
  it("passes qualified sales data", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_qualified_sales",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        sl_price: 200000 + i * 1000,
        sale_price: 200000 + i * 1000,
        ratio: 0.95 + (i % 20) * 0.005,
      })),
    });
    expect(report.publishable).toBe(true);
  });

  it("fails when too many low-price sales leak through", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_qualified_sales",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        sl_price: i < 10 ? 50 : 200000, // 10% ≤ $100
        sale_price: i < 10 ? 50 : 200000,
        ratio: 1.0,
      })),
    });
    const priceGate = report.gates.find((g) => g.gateId === "sales_price_sanity");
    expect(priceGate?.status).toBe("fail");
  });

  it("warns when ratio median is outside IAAO band", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_qualified_sales",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        sl_price: 200000,
        sale_price: 200000,
        ratio: 0.75, // all ratios below 0.90
      })),
    });
    const ratioGate = report.gates.find((g) => g.gateId === "ratio_distribution");
    expect(ratioGate?.status).toBe("warn");
  });
});

describe("Quality Gates — Land Domain", () => {
  it("passes land data with values", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_land_details",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        land_val: 50000 + i * 100,
        land_seg_id: 1,
      })),
    });
    expect(report.publishable).toBe(true);
  });

  it("warns when too many land segments have zero value", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_land_details",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        land_val: i < 20 ? 0 : 50000, // 20% zero
        land_seg_id: 1,
      })),
    });
    const landGate = report.gates.find((g) => g.gateId === "land_segment_coverage");
    expect(landGate?.status).toBe("warn");
  });
});

describe("Quality Gates — Improvement Domain", () => {
  it("passes improvements with valid year_built", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_improvements",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        actual_year_built: 1990 + (i % 35),
        imprv_val: 100000,
      })),
    });
    expect(report.publishable).toBe(true);
  });

  it("warns on out-of-range year_built", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_improvements",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        actual_year_built: i < 5 ? 1500 : 2000, // 5% out of range
        imprv_val: 100000,
      })),
    });
    const yrGate = report.gates.find((g) => g.gateId === "imprv_year_built");
    expect(yrGate?.status).toBe("warn");
  });
});

describe("Quality Gates — Assessment Roll Domain", () => {
  it("passes clean assessment roll data", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_assessment_roll",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i + 1),
        owner_id: String(i + 100),
        owner_name: `Owner ${i}`,
        total_val: 300000,
        land_val: 100000,
        imprv_val: 200000,
      })),
    });
    expect(report.publishable).toBe(true);
  });

  it("fails on duplicate prop_ids in assessment roll", () => {
    const report = runQualityGates({
      year: 2025,
      productId: "pacs_assessment_roll",
      records: Array.from({ length: 100 }, (_, i) => ({
        prop_id: String(i < 30 ? 1 : i), // 30% duplicates
        owner_id: String(i + 100),
        owner_name: `Owner ${i}`,
        total_val: 300000,
        land_val: 100000,
        imprv_val: 200000,
      })),
    });
    const ghostGate = report.gates.find((g) => g.gateId === "one_row_per_prop_id");
    expect(ghostGate?.status).toBe("fail");
  });
});

// ============================================================
// Lane E: Runtime SQL Resolver Tests
// ============================================================

describe("SQL Template Functions", () => {
  const year = 2025;

  it("owner queries return valid SELECT SQL", () => {
    const sql = PACS_OWNER_QUERIES.currentYearOwners(year);
    expect(sql).toContain("SELECT");
    expect(sql).toContain("dbo.owner");
    expect(sql).toContain("dbo.account");
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("fractional owners query is read-only", () => {
    const sql = PACS_OWNER_QUERIES.fractionalOwners(year);
    expect(sql).toContain("pct_ownership");
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("sales queries return valid SELECT SQL", () => {
    const sql = PACS_SALES_QUERIES.qualifiedSales(year);
    expect(sql).toContain("SELECT");
    expect(sql).toContain("dbo.sale");
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("recent sale by prop query is read-only", () => {
    const sql = PACS_SALES_QUERIES.recentSaleByProp(year);
    expect(sql).toContain("ROW_NUMBER");
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("land detail query is read-only and references land_detail", () => {
    const sql = PACS_LAND_QUERIES.landDetails(year);
    expect(sql).toContain("dbo.land_detail");
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("improvement queries are read-only", () => {
    const sqlI = PACS_IMPROVEMENT_QUERIES.improvements(year);
    expect(sqlI).toContain("dbo.imprv");
    expect(validateReadOnlySQL(sqlI).valid).toBe(true);

    const sqlD = PACS_IMPROVEMENT_QUERIES.improvementDetails(year);
    expect(sqlD).toContain("dbo.imprv_detail");
    expect(validateReadOnlySQL(sqlD).valid).toBe(true);
  });

  it("assessment roll query is read-only and joins owner", () => {
    const sql = PACS_ROLL_QUERIES.assessmentRoll(year);
    expect(sql).toContain("dbo.property_val");
    expect(sql).toContain("dbo.owner");
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("hood analysis query is read-only and aggregates", () => {
    const sql = PACS_NEIGHBORHOOD_QUERIES.hoodAnalysis(year);
    expect(sql).toContain("GROUP BY");
    expect(sql).toContain("hood_cd");
    expect(validateReadOnlySQL(sql).valid).toBe(true);
  });

  it("no SQL template contains write keywords", () => {
    const allSQL = [
      PACS_OWNER_QUERIES.currentYearOwners(year),
      PACS_OWNER_QUERIES.fractionalOwners(year),
      PACS_SALES_QUERIES.qualifiedSales(year),
      PACS_SALES_QUERIES.recentSaleByProp(year),
      PACS_LAND_QUERIES.landDetails(year),
      PACS_IMPROVEMENT_QUERIES.improvements(year),
      PACS_IMPROVEMENT_QUERIES.improvementDetails(year),
      PACS_ROLL_QUERIES.assessmentRoll(year),
      PACS_NEIGHBORHOOD_QUERIES.hoodAnalysis(year),
    ];
    const blocked = ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER"];
    for (const sql of allSQL) {
      for (const kw of blocked) {
        expect(sql.toUpperCase()).not.toContain(` ${kw} `);
      }
    }
  });
});

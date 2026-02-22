import { describe, it, expect } from "vitest";
import { validateContract, getContractSummary, SYNC_PRODUCTS, IDENTITY_DOCTRINE, BENTON_COUNTY } from "@/config/pacsBentonContract";
import { runQualityGates, detectSchemaDrift, type SyncProductData } from "@/config/pacsQualityGates";
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
    expect(result.productCount).toBe(6);
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
    expect(summary.products).toHaveLength(6);
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

// TerraFusion OS — Multi-Lane Sync Kernel Tests
// Tests: connectors, registry, runtime, PII redaction, schema drift, quality gates, capability negotiation, year doctrine

import { describe, it, expect } from "vitest";
import { SqlServerReadOnlyConnector } from "./connectors/sqlServerConnector";
import { OdbcReadOnlyConnector } from "./connectors/odbcConnector";
import {
  SourceLaneRegistry,
  createBentonRegistry,
} from "./registry";
import { runContractSync, runContractSyncFromRegistry } from "./runtime";
import type { ReadOnlyConnector, QueryResult, SourceCapabilities } from "./connectors/types";
import { connectorSatisfiesRequirements, BENTON_PRODUCT_REQUIREMENTS } from "./connectors/types";
import { inferDoctrine, resolveYear, type YearDoctrine } from "./yearDoctrine";

// ============================================================
// Helper: full capabilities object
// ============================================================

function mockCapabilities(overrides?: Partial<SourceCapabilities>): SourceCapabilities {
  return {
    readonly: true,
    supportsParameterizedQueries: true,
    supportsIntrospection: false,
    supportsIncrementalWatermarks: false,
    supportsYearScopedHood: false,
    supportsWorkflows: false,
    supportsSqlServerDialect: false,
    ...overrides,
  };
}

// ============================================================
// SQL Server Connector
// ============================================================

describe("SqlServerReadOnlyConnector", () => {
  it("has full read-only capabilities", () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    expect(conn.capabilities.readonly).toBe(true);
    expect(conn.capabilities.supportsYearScopedHood).toBe(true);
    expect(conn.capabilities.supportsWorkflows).toBe(true);
    expect(conn.capabilities.supportsSqlServerDialect).toBe(true);
    expect(conn.kind).toBe("sqlserver");
  });

  it("rejects write SQL", async () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    await expect(conn.query("INSERT INTO x VALUES (1)")).rejects.toThrow();
    await expect(conn.query("DELETE FROM parcels")).rejects.toThrow();
    await expect(conn.query("UPDATE parcels SET x=1")).rejects.toThrow();
  });

  it("allows SELECT queries", async () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    const result = await conn.query("SELECT 1 AS test");
    expect(result.source).toBe("test_sql");
    expect(result.rows).toEqual([]);
  });

  it("allows WITH CTE queries", async () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    const result = await conn.query("WITH cte AS (SELECT 1 AS x) SELECT * FROM cte");
    expect(result.source).toBe("test_sql");
  });

  it("blocks EXEC at connector layer (defense-in-depth)", async () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    await expect(conn.query("EXEC sp_help")).rejects.toThrow();
    await expect(conn.query("EXECUTE sp_who")).rejects.toThrow();
  });
});

// ============================================================
// ODBC Connector
// ============================================================

describe("OdbcReadOnlyConnector", () => {
  it("has limited capabilities by default", () => {
    const conn = new OdbcReadOnlyConnector({
      name: "proval_test",
      connectionString: "Driver={Microsoft Access Driver};DBQ=test.mdb;ReadOnly=1",
    });
    expect(conn.capabilities.readonly).toBe(true);
    expect(conn.capabilities.supportsIncrementalWatermarks).toBe(false);
    expect(conn.capabilities.supportsYearScopedHood).toBe(false);
    expect(conn.capabilities.supportsWorkflows).toBe(false);
    expect(conn.capabilities.supportsSqlServerDialect).toBe(false);
    expect(conn.kind).toBe("odbc");
  });

  it("accepts capability overrides", () => {
    const conn = new OdbcReadOnlyConnector({
      name: "custom",
      connectionString: "test",
      capabilityOverrides: { supportsWorkflows: true },
    });
    expect(conn.capabilities.supportsWorkflows).toBe(true);
    expect(conn.capabilities.readonly).toBe(true); // always true
  });

  it("rejects write SQL", async () => {
    const conn = new OdbcReadOnlyConnector({ name: "proval_test", connectionString: "test" });
    await expect(conn.query("DROP TABLE properties")).rejects.toThrow();
  });

  it("blocks EXEC at ODBC layer", async () => {
    const conn = new OdbcReadOnlyConnector({ name: "test", connectionString: "test" });
    await expect(conn.query("EXEC sp_tables")).rejects.toThrow("EXEC");
  });

  it("blocks multi-statement at ODBC layer", async () => {
    const conn = new OdbcReadOnlyConnector({ name: "test", connectionString: "test" });
    await expect(conn.query("SELECT 1; DROP TABLE x")).rejects.toThrow("Multi-statement");
  });
});

// ============================================================
// Capability Negotiation
// ============================================================

describe("Capability Negotiation", () => {
  it("SQL Server satisfies all Benton product requirements", () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test" });
    for (const req of BENTON_PRODUCT_REQUIREMENTS) {
      expect(connectorSatisfiesRequirements(conn, req)).toBe(true);
    }
  });

  it("ODBC connector fails workflow product requirements", () => {
    const conn = new OdbcReadOnlyConnector({ name: "odbc", connectionString: "test" });
    const workflowReq = BENTON_PRODUCT_REQUIREMENTS.find(
      (r) => r.productId === "pacs_workflow_appeals_current_year"
    )!;
    expect(connectorSatisfiesRequirements(conn, workflowReq)).toBe(false);
  });

  it("ODBC connector fails property_val requirements (needs yearScopedHood)", () => {
    const conn = new OdbcReadOnlyConnector({ name: "odbc", connectionString: "test" });
    const valReq = BENTON_PRODUCT_REQUIREMENTS.find(
      (r) => r.productId === "pacs_current_year_property_val"
    )!;
    expect(connectorSatisfiesRequirements(conn, valReq)).toBe(false);
  });

  it("custom ODBC with overrides can pass specific requirements", () => {
    const conn = new OdbcReadOnlyConnector({
      name: "custom_odbc",
      connectionString: "test",
      capabilityOverrides: {
        supportsYearScopedHood: true,
        supportsSqlServerDialect: true,
      },
    });
    const valReq = BENTON_PRODUCT_REQUIREMENTS.find(
      (r) => r.productId === "pacs_current_year_property_val"
    )!;
    expect(connectorSatisfiesRequirements(conn, valReq)).toBe(true);
  });
});

// ============================================================
// Source Lane Registry
// ============================================================

describe("SourceLaneRegistry", () => {
  it("registers and lists lanes sorted by priority", () => {
    const registry = new SourceLaneRegistry();
    registry.register({
      id: "pacs_benton_sql",
      name: "PACS SQL",
      connector: null,
      priority: 100,
      products: ["p1"],
      active: true,
    });
    registry.register({
      id: "proval_access",
      name: "ProVal",
      connector: null,
      priority: 50,
      products: ["p1"],
      active: false,
    });

    const all = registry.list();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("pacs_benton_sql");
    expect(all[1].id).toBe("proval_access");
  });

  it("lists only active lanes", () => {
    const registry = new SourceLaneRegistry();
    registry.register({
      id: "pacs_benton_sql",
      name: "PACS",
      connector: null,
      priority: 100,
      products: [],
      active: true,
    });
    registry.register({
      id: "asend_access",
      name: "Asend",
      connector: null,
      priority: 40,
      products: [],
      active: false,
    });

    expect(registry.listActive()).toHaveLength(1);
    expect(registry.listActive()[0].id).toBe("pacs_benton_sql");
  });

  it("reports health with capability coverage", () => {
    const registry = createBentonRegistry();
    const health = registry.getHealth();
    expect(health.totalLanes).toBe(5);
    expect(health.activeLanes).toBe(1);
    expect(health.capabilityCoverage).toBeDefined();
    expect(health.capabilityCoverage.length).toBe(5);
  });
});

// ============================================================
// Default Benton Registry
// ============================================================

describe("createBentonRegistry", () => {
  it("creates registry with PACS as primary active lane", () => {
    const registry = createBentonRegistry();
    const pacs = registry.get("pacs_benton_sql");
    expect(pacs).toBeDefined();
    expect(pacs!.active).toBe(true);
    expect(pacs!.priority).toBe(100);
    expect(pacs!.products.length).toBeGreaterThan(0);
  });

  it("has ProVal/Asend/Manatron as inactive lanes", () => {
    const registry = createBentonRegistry();
    expect(registry.get("proval_access")?.active).toBe(false);
    expect(registry.get("asend_access")?.active).toBe(false);
    expect(registry.get("manatron_access")?.active).toBe(false);
    expect(registry.get("pacs_api")?.active).toBe(false);
  });

  it("lazy-inits connector via factory with capability check", async () => {
    const registry = createBentonRegistry();
    const result = await registry.getConnectorForProduct("pacs_current_year_property_val");
    expect(result).not.toBeNull();
    expect(result!.connector.kind).toBe("sqlserver");
    expect(result!.connector.capabilities.supportsYearScopedHood).toBe(true);
  });
});

// ============================================================
// Contract-Driven Sync Runtime
// ============================================================

function createMockConnector(rowsPerQuery: Record<string, unknown>[] = []): ReadOnlyConnector {
  return {
    kind: "sqlserver",
    name: "mock_connector",
    capabilities: mockCapabilities({
      supportsYearScopedHood: true,
      supportsWorkflows: true,
      supportsSqlServerDialect: true,
    }),
    query: async <Row = Record<string, unknown>>(_sql: string): Promise<QueryResult<Row>> => ({
      rows: rowsPerQuery as Row[],
      fetchedAt: new Date().toISOString(),
      source: "mock_connector",
      rowCount: rowsPerQuery.length,
      executionMs: 5,
      truncated: false,
    }),
    close: async () => {},
  };
}

describe("runContractSync", () => {
  it("runs all products and returns success with empty rows", async () => {
    const conn = createMockConnector();
    const result = await runContractSync(conn, 2025);

    expect(result.county).toBe("Benton");
    expect(result.year).toBe(2025);
    expect(result.sourceLane).toBe("mock_connector");
    expect(result.products.length).toBe(13);
    expect(result.status).toBe("success");
  });

  it("can filter to specific products", async () => {
    const conn = createMockConnector();
    const result = await runContractSync(conn, 2025, {
      productIds: ["pacs_current_year_property_val"],
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0].productId).toBe("pacs_current_year_property_val");
  });

  it("declares PII redaction columns for exemptions product", async () => {
    const conn = createMockConnector();
    const result = await runContractSync(conn, 2025, {
      productIds: ["pacs_workflow_exemptions_pending"],
    });

    const exemptionResult = result.products[0];
    expect(exemptionResult.status).toBe("success");
    expect(exemptionResult.productId).toBe("pacs_workflow_exemptions_pending");
  });

  it("handles connector errors gracefully", async () => {
    const conn: ReadOnlyConnector = {
      kind: "sqlserver",
      name: "failing_connector",
      capabilities: mockCapabilities({
        supportsYearScopedHood: true,
        supportsWorkflows: true,
        supportsSqlServerDialect: true,
      }),
      query: async () => {
        throw new Error("Connection refused");
      },
      close: async () => {},
    };

    const result = await runContractSync(conn, 2025, {
      productIds: ["pacs_current_year_property_core"],
    });

    expect(result.status).toBe("failed");
    expect(result.products[0].status).toBe("failed");
    expect(result.products[0].error).toContain("Connection refused");
  });
});

describe("runContractSyncFromRegistry", () => {
  it("returns failed when no active lanes", async () => {
    const registry = new SourceLaneRegistry();
    const result = await runContractSyncFromRegistry(registry, 2025);
    expect(result.status).toBe("failed");
    expect(result.sourceLane).toBe("none");
  });

  it("uses the Benton registry to run sync", async () => {
    const registry = createBentonRegistry();
    const result = await runContractSyncFromRegistry(registry, 2025);
    expect(result.county).toBe("Benton");
    expect(result.products.length).toBe(13);
  });
});

// ============================================================
// Year Doctrine Tests
// ============================================================

describe("Year Doctrine — inferDoctrine", () => {
  it("detects control_table mode when year column is on a control table", () => {
    const doctrine = inferDoctrine(
      [{ table: "dbo.pacs_system", column: "appr_yr", type: "int" }],
      [{ table: "dbo.property_val", column: "total_val", type: "decimal" }],
      [],
      ["dbo.pacs_system"],
      20
    );
    expect(doctrine.mode).toBe("control_table");
    expect(doctrine.confidence).toBe("high");
    expect(doctrine.controlTable).toBe("dbo.pacs_system");
    expect(doctrine.controlColumn).toBe("appr_yr");
  });

  it("detects valuation_join mode when year only on value tables", () => {
    const doctrine = inferDoctrine(
      [{ table: "dbo.property_val", column: "prop_val_yr", type: "int" }],
      [{ table: "dbo.property_val", column: "total_val", type: "decimal" }],
      [],
      [],
      20
    );
    expect(doctrine.mode).toBe("valuation_join");
    expect(doctrine.confidence).toBe("high");
    expect(doctrine.valuationTables).toContain("dbo.property_val");
    expect(doctrine.valuationYearColumn).toBe("prop_val_yr");
  });

  it("detects column_per_table when year is on many tables", () => {
    const yearHits = Array.from({ length: 8 }, (_, i) => ({
      table: `dbo.table_${i}`,
      column: "tax_yr",
      type: "int",
    }));
    const doctrine = inferDoctrine(yearHits, [], [], [], 10);
    expect(doctrine.mode).toBe("column_per_table");
    expect(doctrine.yearColumnName).toBe("tax_yr");
  });

  it("detects dated_rows when only date columns present", () => {
    const doctrine = inferDoctrine(
      [],
      [],
      [{ table: "dbo.valuations", column: "eff_date", type: "datetime" }],
      [],
      15
    );
    expect(doctrine.mode).toBe("dated_rows");
    expect(doctrine.dateColumn).toBe("eff_date");
  });

  it("falls back to implicit_current when nothing found", () => {
    const doctrine = inferDoctrine([], [], [], [], 10);
    expect(doctrine.mode).toBe("implicit_current");
    expect(doctrine.confidence).toBe("medium");
  });
});

describe("Year Doctrine — resolveYear", () => {
  it("returns fallback for implicit_current", async () => {
    const connector = createMockConnector();
    const doctrine: YearDoctrine = {
      mode: "implicit_current",
      confidence: "medium",
      yearColumnHits: [],
      controlTableCandidates: [],
      summary: "No year columns",
      discoveredAt: new Date().toISOString(),
    };
    const year = await resolveYear(connector, doctrine, 2025);
    expect(year).toBe(2025);
  });

  it("returns current year for implicit_current with no fallback", async () => {
    const connector = createMockConnector();
    const doctrine: YearDoctrine = {
      mode: "implicit_current",
      confidence: "medium",
      yearColumnHits: [],
      controlTableCandidates: [],
      summary: "No year columns",
      discoveredAt: new Date().toISOString(),
    };
    const year = await resolveYear(connector, doctrine);
    expect(year).toBe(new Date().getFullYear());
  });

  it("queries control table for control_table mode", async () => {
    const connector = createMockConnector([{ resolved_year: 2025 }]);
    const doctrine: YearDoctrine = {
      mode: "control_table",
      confidence: "high",
      controlTable: "dbo.pacs_system",
      controlColumn: "appr_yr",
      yearColumnHits: [],
      controlTableCandidates: [],
      summary: "Control table",
      discoveredAt: new Date().toISOString(),
    };
    const year = await resolveYear(connector, doctrine);
    expect(year).toBe(2025);
  });

  it("queries max year for valuation_join mode", async () => {
    const connector = createMockConnector([{ resolved_year: 2024 }]);
    const doctrine: YearDoctrine = {
      mode: "valuation_join",
      confidence: "high",
      valuationTables: ["dbo.property_val"],
      valuationYearColumn: "prop_val_yr",
      yearColumnHits: [],
      controlTableCandidates: [],
      summary: "Valuation join",
      discoveredAt: new Date().toISOString(),
    };
    const year = await resolveYear(connector, doctrine);
    expect(year).toBe(2024);
  });
});

describe("Year Doctrine — registry integration", () => {
  it("legacy lanes have expectedYearMode set", () => {
    const registry = createBentonRegistry();
    const proval = registry.get("proval_access");
    expect(proval?.expectedYearMode).toBe("implicit_current");
    const asend = registry.get("asend_access");
    expect(asend?.expectedYearMode).toBe("implicit_current");
  });

  it("PACS lane has no expectedYearMode (uses control_table via contract)", () => {
    const registry = createBentonRegistry();
    const pacs = registry.get("pacs_benton_sql");
    expect(pacs?.expectedYearMode).toBeUndefined();
  });
});

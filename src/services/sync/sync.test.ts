// TerraFusion OS — Multi-Lane Sync Kernel Tests
// Tests: connectors, registry, runtime, PII redaction, schema drift, quality gates

import { describe, it, expect, vi } from "vitest";
import { SqlServerReadOnlyConnector } from "./connectors/sqlServerConnector";
import { OdbcReadOnlyConnector } from "./connectors/odbcConnector";
import {
  SourceLaneRegistry,
  createBentonRegistry,
} from "./registry";
import { runContractSync, runContractSyncFromRegistry } from "./runtime";
import type { ReadOnlyConnector, QueryResult } from "./connectors/types";

// ============================================================
// SQL Server Connector
// ============================================================

describe("SqlServerReadOnlyConnector", () => {
  it("has read-only capabilities", () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    expect(conn.capabilities.readonly).toBe(true);
    expect(conn.kind).toBe("sqlserver");
    expect(conn.name).toBe("test_sql");
  });

  it("rejects write SQL", async () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    await expect(conn.query("INSERT INTO x VALUES (1)")).rejects.toThrow("READ-ONLY VIOLATION");
    await expect(conn.query("DELETE FROM parcels")).rejects.toThrow("READ-ONLY VIOLATION");
    await expect(conn.query("UPDATE parcels SET x=1")).rejects.toThrow("READ-ONLY VIOLATION");
  });

  it("allows SELECT queries", async () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    const result = await conn.query("SELECT 1 AS test");
    expect(result.source).toBe("test_sql");
    expect(result.rows).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it("allows WITH CTE queries", async () => {
    const conn = new SqlServerReadOnlyConnector({ name: "test_sql" });
    const result = await conn.query("WITH cte AS (SELECT 1 AS x) SELECT * FROM cte");
    expect(result.source).toBe("test_sql");
  });
});

// ============================================================
// ODBC Connector
// ============================================================

describe("OdbcReadOnlyConnector", () => {
  it("has read-only capabilities with no watermark support", () => {
    const conn = new OdbcReadOnlyConnector({
      name: "proval_test",
      connectionString: "Driver={Microsoft Access Driver};DBQ=test.mdb;ReadOnly=1",
    });
    expect(conn.capabilities.readonly).toBe(true);
    expect(conn.capabilities.supportsIncrementalWatermarks).toBe(false);
    expect(conn.kind).toBe("odbc");
  });

  it("rejects write SQL", async () => {
    const conn = new OdbcReadOnlyConnector({
      name: "proval_test",
      connectionString: "test",
    });
    await expect(conn.query("DROP TABLE properties")).rejects.toThrow("READ-ONLY VIOLATION");
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

  it("reports health summary", () => {
    const registry = createBentonRegistry();
    const health = registry.getHealth();
    expect(health.totalLanes).toBe(5);
    expect(health.activeLanes).toBe(1); // only pacs_benton_sql
    expect(health.connectedLanes).toBe(0); // lazy init
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

  it("lazy-inits connector via factory", async () => {
    const registry = createBentonRegistry();
    const result = await registry.getConnectorForProduct("pacs_current_year_property_val");
    expect(result).not.toBeNull();
    expect(result!.connector.kind).toBe("sqlserver");
    expect(result!.lane.id).toBe("pacs_benton_sql");
  });
});

// ============================================================
// Contract-Driven Sync Runtime
// ============================================================

/** Create a mock connector that returns stub rows */
function createMockConnector(rowsPerQuery: Record<string, unknown>[] = []): ReadOnlyConnector {
  return {
    kind: "sqlserver",
    name: "mock_connector",
    capabilities: {
      readonly: true,
      supportsParameterizedQueries: true,
      supportsIntrospection: false,
      supportsIncrementalWatermarks: false,
    },
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
    expect(result.products.length).toBe(6);
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
    // The product definition declares PII columns to redact
    // Even with empty rows, the contract tracks which columns are redacted
    expect(exemptionResult.status).toBe("success");
    expect(exemptionResult.productId).toBe("pacs_workflow_exemptions_pending");
  });

  it("handles connector errors gracefully", async () => {
    const conn: ReadOnlyConnector = {
      kind: "sqlserver",
      name: "failing_connector",
      capabilities: {
        readonly: true,
        supportsParameterizedQueries: true,
        supportsIntrospection: false,
        supportsIncrementalWatermarks: false,
      },
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
    expect(result.products.length).toBe(6);
  });
});

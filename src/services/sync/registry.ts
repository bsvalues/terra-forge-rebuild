// TerraFusion OS — Source Lane Registry
// ═══════════════════════════════════════════════════════════
// One registry, multiple source lanes, zero chaos.
// Each source lane has a priority; higher priority wins when
// multiple lanes provide the same product.
//
// NEW: Capability negotiation — the registry now checks that
// a lane's connector actually satisfies a product's capability
// requirements before selecting it.
//
// 🧃 It's like a lunch menu for databases. With allergen labels.
// ═══════════════════════════════════════════════════════════

import type { ReadOnlyConnector, ConnectorFactory } from "./connectors/types";
import {
  BENTON_PRODUCT_REQUIREMENTS,
  connectorSatisfiesRequirements,
} from "./connectors/types";
import type { YearDoctrine, YearDoctrineMode } from "./yearDoctrine";

// ============================================================
// Source Lane IDs (exhaustive for Benton County)
// ============================================================

export type BentonSourceLaneId =
  | "pacs_benton_sql"       // Current: PACS SQL Server (read-only)
  | "proval_access"         // Legacy: ProVal via ODBC
  | "asend_access"          // Legacy: Asend via ODBC
  | "manatron_access"       // Legacy: Manatron GIS via ODBC
  | "pacs_api";             // Future: TrueAutomation PACSService API

export interface SourceLaneRegistration {
  /** Unique lane identifier */
  id: BentonSourceLaneId;
  /** Human-readable name */
  name: string;
  /** The connector instance (lazy or eager) */
  connector: ReadOnlyConnector | null;
  /** Factory to create connector on demand (lazy init) */
  factory?: ConnectorFactory;
  /** Priority: higher wins if multiple lanes provide same product */
  priority: number;
  /** Which sync product IDs this lane can provide */
  products: string[];
  /** Whether this lane is currently active */
  active: boolean;
  /** Year doctrine for this lane (discovered or configured) */
  yearDoctrine?: YearDoctrine;
  /** Expected year doctrine mode (for validation before discovery) */
  expectedYearMode?: YearDoctrineMode;
  /** Notes about this source */
  notes?: string[];
}

/**
 * Source Lane Registry — manages all data source connectors.
 *
 * Key behaviors:
 *   - All connectors are read-only (enforced by interface)
 *   - Multiple lanes can provide the same product (priority wins)
 *   - Capability negotiation: checks connector capabilities vs product requirements
 *   - Lazy initialization via factory functions
 *   - Health checks report connector status + capability coverage
 */
export class SourceLaneRegistry {
  private lanes = new Map<BentonSourceLaneId, SourceLaneRegistration>();

  /** Register a source lane */
  register(registration: SourceLaneRegistration): void {
    this.lanes.set(registration.id, registration);
  }

  /** Get a specific lane */
  get(id: BentonSourceLaneId): SourceLaneRegistration | undefined {
    return this.lanes.get(id);
  }

  /** List all registered lanes (sorted by priority, highest first) */
  list(): SourceLaneRegistration[] {
    return [...this.lanes.values()].sort((a, b) => b.priority - a.priority);
  }

  /** List only active lanes */
  listActive(): SourceLaneRegistration[] {
    return this.list().filter((l) => l.active);
  }

  /**
   * Get the best connector for a given product ID.
   * Returns the highest-priority active lane that:
   *   1. Declares the product in its product list
   *   2. Satisfies the product's capability requirements
   *   3. Can be initialized successfully
   */
  async getConnectorForProduct(
    productId: string
  ): Promise<{ lane: SourceLaneRegistration; connector: ReadOnlyConnector } | null> {
    const candidates = this.listActive().filter((l) =>
      l.products.includes(productId)
    );

    // Find capability requirements for this product
    const requirements = BENTON_PRODUCT_REQUIREMENTS.find(
      (r) => r.productId === productId
    );

    for (const lane of candidates) {
      // Lazy init if needed
      if (!lane.connector && lane.factory) {
        try {
          lane.connector = await lane.factory();
        } catch (err) {
          console.warn(
            `[Registry] Failed to init connector for lane '${lane.id}':`,
            err
          );
          continue;
        }
      }

      if (!lane.connector) continue;

      // Capability negotiation: check if connector can serve this product
      if (requirements && !connectorSatisfiesRequirements(lane.connector, requirements)) {
        console.info(
          `[Registry] Lane '${lane.id}' skipped for '${productId}' — capabilities insufficient.`
        );
        continue;
      }

      return { lane, connector: lane.connector };
    }

    return null;
  }

  /**
   * Get capability coverage report — which products each lane can actually serve.
   */
  getCapabilityCoverage(): Array<{
    laneId: string;
    laneName: string;
    active: boolean;
    connected: boolean;
    canServe: string[];
    cannotServe: Array<{ productId: string; reason: string }>;
  }> {
    return this.list().map((lane) => {
      const canServe: string[] = [];
      const cannotServe: Array<{ productId: string; reason: string }> = [];

      for (const req of BENTON_PRODUCT_REQUIREMENTS) {
        if (!lane.products.includes(req.productId)) {
          cannotServe.push({ productId: req.productId, reason: "Not declared in product list" });
          continue;
        }
        if (lane.connector && !connectorSatisfiesRequirements(lane.connector, req)) {
          const missing = Object.entries(req.requires)
            .filter(([key, val]) => val && !(lane.connector!.capabilities as any)[key])
            .map(([key]) => key);
          cannotServe.push({
            productId: req.productId,
            reason: `Missing capabilities: ${missing.join(", ")}`,
          });
          continue;
        }
        canServe.push(req.productId);
      }

      return {
        laneId: lane.id,
        laneName: lane.name,
        active: lane.active,
        connected: lane.connector !== null,
        canServe,
        cannotServe,
      };
    });
  }

  /** Get registry health summary */
  getHealth(): {
    totalLanes: number;
    activeLanes: number;
    connectedLanes: number;
    capabilityCoverage: ReturnType<SourceLaneRegistry["getCapabilityCoverage"]>;
    lanes: Array<{
      id: string;
      active: boolean;
      connected: boolean;
      priority: number;
      products: number;
    }>;
  } {
    const all = this.list();
    return {
      totalLanes: all.length,
      activeLanes: all.filter((l) => l.active).length,
      connectedLanes: all.filter((l) => l.connector !== null).length,
      capabilityCoverage: this.getCapabilityCoverage(),
      lanes: all.map((l) => ({
        id: l.id,
        active: l.active,
        connected: l.connector !== null,
        priority: l.priority,
        products: l.products.length,
      })),
    };
  }

  /** Close all active connectors */
  async closeAll(): Promise<void> {
    for (const lane of this.lanes.values()) {
      if (lane.connector) {
        await lane.connector.close();
        lane.connector = null;
      }
    }
  }
}

// ============================================================
// Default Benton County Registry
// ============================================================

import { SqlServerReadOnlyConnector } from "./connectors/sqlServerConnector";
import { OdbcReadOnlyConnector } from "./connectors/odbcConnector";
import { SYNC_PRODUCTS } from "@/config/pacsBentonContract";

/**
 * Create the default Benton County source lane registry.
 * PACS SQL Server is the primary active lane.
 * ProVal/Asend/Manatron are registered but inactive (future).
 */
export function createBentonRegistry(): SourceLaneRegistry {
  const registry = new SourceLaneRegistry();
  const allProductIds = SYNC_PRODUCTS.map((p) => p.id);

  // Primary: PACS SQL Server (read-only)
  registry.register({
    id: "pacs_benton_sql",
    name: "Benton County PACS (SQL Server, Read-Only)",
    connector: null,
    factory: async () => new SqlServerReadOnlyConnector({ name: "pacs_benton_sql" }),
    priority: 100,
    products: allProductIds,
    active: true,
    notes: ["Primary lane. Quadruple read-only enforcement."],
  });

  // Legacy: ProVal (Access .mdb, inactive)
  registry.register({
    id: "proval_access",
    name: "ProVal Legacy (Access .mdb)",
    connector: null,
    factory: async () =>
      new OdbcReadOnlyConnector({
        name: "proval_access",
        connectionString: "Driver={Microsoft Access Driver (*.mdb)};DBQ=C:\\legacy\\Real_tables1.mdb;ReadOnly=1;",
        capabilityOverrides: {
          supportsYearScopedHood: false,
          supportsWorkflows: false,
          supportsSqlServerDialect: false,
        },
      }),
    priority: 50,
    products: [
      "pacs_current_year_property_core",
      "pacs_current_year_property_val",
    ],
    active: false,
    expectedYearMode: "implicit_current",
    notes: ["Legacy lane. Requires Windows extractor agent with ODBC driver.", "No workflow or hood support.", "Year doctrine TBD — run discoverYearDoctrine() on first connect."],
  });

  // Legacy: Asend (Access .mdb, inactive)
  registry.register({
    id: "asend_access",
    name: "Asend Legacy (Access .mdb)",
    connector: null,
    factory: async () =>
      new OdbcReadOnlyConnector({
        name: "asend_access",
        connectionString: "Driver={Microsoft Access Driver (*.mdb)};DBQ=C:\\legacy\\asend.mdb;ReadOnly=1;",
        capabilityOverrides: {
          supportsYearScopedHood: false,
          supportsWorkflows: false,
          supportsSqlServerDialect: false,
        },
      }),
    priority: 40,
    products: [
      "pacs_current_year_property_core",
      "pacs_current_year_property_val",
    ],
    active: false,
    expectedYearMode: "implicit_current",
    notes: ["Legacy lane. Requires Windows extractor agent with ODBC driver.", "Year doctrine TBD."],
  });

  // Legacy: Manatron GIS (Access .mdb, inactive)
  registry.register({
    id: "manatron_access",
    name: "Manatron GIS 2000 (Access .mdb)",
    connector: null,
    factory: async () =>
      new OdbcReadOnlyConnector({
        name: "manatron_access",
        connectionString: "Driver={Microsoft Access Driver (*.mdb)};DBQ=C:\\legacy\\gis_manatron_2000.mdb;ReadOnly=1;",
        capabilityOverrides: {
          supportsYearScopedHood: false,
          supportsWorkflows: false,
          supportsSqlServerDialect: false,
          supportsIncrementalWatermarks: false,
        },
      }),
    priority: 30,
    products: [],
    active: false,
    notes: ["GIS-only legacy data. Schema discovery pending."],
  });

  // Future: PACSService API (inactive)
  registry.register({
    id: "pacs_api",
    name: "PACS TrueAutomation API",
    connector: null,
    priority: 90,
    products: allProductIds,
    active: false,
    notes: ["Alternative lane via PACSService API. Cleaner governance."],
  });

  return registry;
}

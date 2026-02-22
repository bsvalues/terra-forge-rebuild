// TerraFusion OS — Source Lane Registry
// ═══════════════════════════════════════════════════════════
// One registry, multiple source lanes, zero chaos.
// Each source lane has a priority; higher priority wins when
// multiple lanes provide the same product.
//
// 🧃 It's like a lunch menu for databases.
// ═══════════════════════════════════════════════════════════

import type { ReadOnlyConnector, ConnectorFactory } from "./connectors/types";

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
  /** Notes about this source */
  notes?: string[];
}

/**
 * Source Lane Registry — manages all data source connectors.
 *
 * Key behaviors:
 *   - All connectors are read-only (enforced by interface)
 *   - Multiple lanes can provide the same product (priority wins)
 *   - Lazy initialization via factory functions
 *   - Health checks report connector status
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
   * Returns the highest-priority active lane that provides this product.
   */
  async getConnectorForProduct(
    productId: string
  ): Promise<{ lane: SourceLaneRegistration; connector: ReadOnlyConnector } | null> {
    const candidates = this.listActive().filter((l) =>
      l.products.includes(productId)
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

      if (lane.connector) {
        return { lane, connector: lane.connector };
      }
    }

    return null;
  }

  /** Get registry health summary */
  getHealth(): {
    totalLanes: number;
    activeLanes: number;
    connectedLanes: number;
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
    notes: ["Primary lane. Triple read-only enforcement."],
  });

  // Legacy: ProVal (Access .mdb, inactive)
  registry.register({
    id: "proval_access",
    name: "ProVal Legacy (Access .mdb)",
    connector: null,
    priority: 50,
    products: [
      "pacs_current_year_property_core",
      "pacs_current_year_property_val",
    ],
    active: false,
    notes: ["Legacy lane. Requires Windows extractor agent with ODBC driver."],
  });

  // Legacy: Asend (Access .mdb, inactive)
  registry.register({
    id: "asend_access",
    name: "Asend Legacy (Access .mdb)",
    connector: null,
    priority: 40,
    products: [
      "pacs_current_year_property_core",
      "pacs_current_year_property_val",
    ],
    active: false,
    notes: ["Legacy lane. Requires Windows extractor agent with ODBC driver."],
  });

  // Legacy: Manatron GIS (Access .mdb, inactive)
  registry.register({
    id: "manatron_access",
    name: "Manatron GIS 2000 (Access .mdb)",
    connector: null,
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

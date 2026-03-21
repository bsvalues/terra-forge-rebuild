// TerraFusion OS — Benton PACS Contract Seed Runner
// ═══════════════════════════════════════════════════════════
// Drives the Benton PACS contract sync for all six products:
//   property_core · property_val · neighborhood_dim ·
//   appeals · permits · exemptions
//
// Uses the existing SourceLaneRegistry + runContractSyncFromRegistry
// pipeline. When PACS SQL connector is stubbed, all products
// complete with 0 rows (validated, not errored). When the
// SQL Server is wired the same hook carries live data.
// ═══════════════════════════════════════════════════════════

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createBentonRegistry } from "@/services/sync/registry";
import { runContractSyncFromRegistry, type SyncRunResult } from "@/services/sync/runtime";
import { SYNC_PRODUCTS } from "@/config/pacsBentonContract";
import { invalidateBentonBootstrap } from "@/lib/queryInvalidation";

// ────────────────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────────────────

export interface BentonPACSSeedOptions {
  /** Appraisal year to seed (defaults to current calendar year) */
  year?: number;
  /** Subset of product IDs to run; all six if omitted */
  productIds?: string[];
  /** If true, ignore watermarks and re-fetch all rows */
  forceFullRefresh?: boolean;
  /** If true, validate only — no data is written */
  dryRun?: boolean;
}

export interface BentonPACSSeedResult {
  syncResult: SyncRunResult;
  seedYear: number;
  productsRun: number;
  productsSucceeded: number;
  productsFailed: number;
  productsSkipped: number;
  totalRows: number;
  durationMs: number;
}

// ────────────────────────────────────────────────────────────
// Core runner
// ────────────────────────────────────────────────────────────

async function runBentonPACSSeed(
  options: BentonPACSSeedOptions = {}
): Promise<BentonPACSSeedResult> {
  const seedYear = options.year ?? new Date().getFullYear();
  const start = Date.now();

  const registry = createBentonRegistry();

  const syncResult = await runContractSyncFromRegistry(registry, seedYear, {
    productIds: options.productIds,
    forceFullRefresh: options.forceFullRefresh ?? false,
    dryRun: options.dryRun ?? false,
  });

  // Always close the registry regardless of outcome to release any held resources
  await registry.closeAll();

  const productsSucceeded = syncResult.products.filter((p) => p.status === "success").length;
  const productsFailed = syncResult.products.filter(
    (p) => p.status === "failed" || p.status === "schema_drift" || p.status === "gate_failed"
  ).length;
  const productsSkipped = syncResult.products.filter((p) => p.status === "skipped").length;

  return {
    syncResult,
    seedYear,
    productsRun: syncResult.products.length,
    productsSucceeded,
    productsFailed,
    productsSkipped,
    totalRows: syncResult.totalRows,
    durationMs: Date.now() - start,
  };
}

// ────────────────────────────────────────────────────────────
// React hooks
// ────────────────────────────────────────────────────────────

/**
 * Hook: run the full Benton PACS contract seed for all six products.
 *
 * While the PACS connector is stubbed, this reports 0 rows per
 * product (not a failure). Boot this hook from BentonBootstrapPanel
 * to validate the pipeline topology before real SQL Server data is live.
 */
export function useRunBentonPACSSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: BentonPACSSeedOptions) => runBentonPACSSeed(options ?? {}),

    onSuccess: (result) => {
      invalidateBentonBootstrap(queryClient);

      const { productsSucceeded, productsFailed, productsSkipped, totalRows, seedYear } = result;

      if (productsFailed === 0) {
        toast.success(
          `Benton PACS seed complete — ${productsSucceeded} products, ${totalRows} rows (${seedYear})`,
          {
            description:
              productsSkipped > 0
                ? `${productsSkipped} product(s) skipped (no SQL resolver).`
                : undefined,
          }
        );
      } else {
        toast.warning(
          `Benton PACS seed finished with ${productsFailed} failure(s)`,
          {
            description: `${productsSucceeded} succeeded · ${productsFailed} failed · ${productsSkipped} skipped`,
          }
        );
      }
    },

    onError: (error: Error) => {
      toast.error("Benton PACS seed runner failed", { description: error.message });
    },
  });
}

/**
 * Human-readable label for a PACS product ID.
 */
export function getPACSSeedProductLabel(productId: string): string {
  return SYNC_PRODUCTS.find((p) => p.id === productId)?.name ?? productId;
}

/**
 * All PACS product IDs available for the Benton seed.
 */
export const BENTON_PACS_SEED_PRODUCT_IDS = SYNC_PRODUCTS.map((p) => p.id);

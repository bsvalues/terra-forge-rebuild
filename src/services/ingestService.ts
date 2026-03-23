// TerraFusion OS — Ingest Service (Constitutional: DB writes only in services)
// Handles parcel imports, PACS multi-table publishing, and field assignment pulls.

import { supabase } from "@/integrations/supabase/client";

/** Batch insert parcels (for ParcelImportWizard) */
export async function batchInsertParcels(
  parcels: Record<string, unknown>[],
  batchSize = 50,
  onProgress?: (pct: number) => void
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < parcels.length; i += batchSize) {
    const batch = parcels.slice(i, i + batchSize);
    const { error } = await supabase.from("parcels").insert(batch as any);
    if (error) {
      console.error("Insert error:", error);
      failed += batch.length;
    } else {
      success += batch.length;
    }
    onProgress?.(Math.round(((i + batchSize) / parcels.length) * 100));
  }

  return { success, failed };
}

/** Upsert parcels with conflict handling (for PACS import) */
export async function upsertParcels(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("parcels").upsert(batch as any[], {
      onConflict: "county_id,parcel_number",
    });
    if (error) {
      console.error("Parcel batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Upsert permits (for PACS import) */
export async function upsertPermits(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("permits").upsert(batch as any[]);
    if (error) {
      console.error("Permit batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Upsert assessments (for PACS import) */
export async function upsertAssessments(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("assessments").upsert(batch as any[], {
      onConflict: "parcel_id,tax_year",
    });
    if (error) {
      console.error("Assessment batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Upsert exemptions (for PACS import) */
export async function upsertExemptions(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("exemptions").upsert(batch as any[]);
    if (error) {
      console.error("Exemption batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

// ────────────────────────────────────────────────────────────
// NEW PACS Domain Upserts — Legacy Knowledge Integration
// ────────────────────────────────────────────────────────────

/** Upsert PACS owners */
export async function upsertPacsOwners(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("pacs_owners").upsert(batch as any[], {
      onConflict: "county_id,prop_id,owner_id,owner_tax_yr,sup_num",
    });
    if (error) {
      console.error("Owner batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Upsert PACS qualified sales */
export async function upsertPacsSales(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("pacs_sales").upsert(batch as any[], {
      onConflict: "county_id,chg_of_owner_id,prop_id",
    });
    if (error) {
      console.error("Sales batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Upsert PACS land details */
export async function upsertPacsLandDetails(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("pacs_land_details").upsert(batch as any[], {
      onConflict: "county_id,prop_id,prop_val_yr,sup_num,land_seg_id",
    });
    if (error) {
      console.error("Land detail batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Upsert PACS improvements */
export async function upsertPacsImprovements(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("pacs_improvements").upsert(batch as any[], {
      onConflict: "county_id,prop_id,prop_val_yr,sup_num,imprv_id",
    });
    if (error) {
      console.error("Improvement batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Upsert PACS improvement details */
export async function upsertPacsImprovementDetails(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("pacs_improvement_details").upsert(batch as any[], {
      onConflict: "county_id,prop_id,prop_val_yr,sup_num,imprv_id,imprv_det_id",
    });
    if (error) {
      console.error("Improvement detail batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Upsert PACS assessment roll */
export async function upsertPacsAssessmentRoll(
  records: Record<string, unknown>[],
  batchSize = 500,
  onProgress?: (pct: number) => void
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("pacs_assessment_roll").upsert(batch as any[], {
      onConflict: "county_id,prop_id,roll_year",
    });
    if (error) {
      console.error("Assessment roll batch error:", error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.round(((i + batch.length) / records.length) * 100));
  }

  return { imported, failed };
}

/** Resolve parcel IDs by parcel_number for a county (for PACS import) */
export async function resolveParcelIds(countyId: string): Promise<Record<string, string>> {
  const lookup: Record<string, string> = {};
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from("parcels")
      .select("id, parcel_number")
      .eq("county_id", countyId)
      .range(offset, offset + 999);
    if (data && data.length > 0) {
      for (const p of data) lookup[p.parcel_number] = p.id;
      offset += data.length;
      hasMore = data.length === 1000;
    } else {
      hasMore = false;
    }
  }

  return lookup;
}

/** Backfill assessments RPC */
export async function backfillAssessments(countyId: string, taxYear: number): Promise<void> {
  const { error } = await supabase.rpc("backfill_assessments" as any, {
    p_county_id: countyId,
    p_tax_year: taxYear,
  });
  if (error) {
    console.warn("Assessment backfill skipped:", error.message);
  }
}

/** Pull field assignments from parcels table */
export async function pullFieldAssignments(limit = 20) {
  const { data, error } = await supabase
    .from("parcels")
    .select("id, parcel_number, address, city, latitude, longitude, assessed_value, property_class")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/** Fetch parcels for batch preview (BatchApplyPanel) */
export async function fetchNeighborhoodParcels(neighborhoodCode: string) {
  const { data, error } = await supabase
    .from("parcels")
    .select("id, address, assessed_value, building_area, land_area, year_built, bedrooms, bathrooms")
    .eq("neighborhood_code", neighborhoodCode)
    .limit(500);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("No parcels in this neighborhood");
  return data;
}

/** Fetch value adjustments for batch notice generation */
export async function fetchActiveAdjustments(calibrationRunId: string) {
  const { data, error } = await supabase
    .from("value_adjustments")
    .select("parcel_id, previous_value, new_value")
    .eq("calibration_run_id", calibrationRunId)
    .is("rolled_back_at", null);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("No active adjustments found — apply batch first");
  return data;
}

/** Fetch parcel details by IDs (for notice generation) */
export async function fetchParcelDetails(parcelIds: string[]) {
  const { data } = await supabase
    .from("parcels")
    .select("id, parcel_number, address, county_id")
    .in("id", parcelIds.slice(0, 500));
  return data || [];
}

/** Fetch parcels needing enrichment (for AssessorScrapeDialog) */
export async function fetchParcelsForEnrichment(
  filters: Record<string, any>,
  batchSize: number
): Promise<{ parcels: string[]; total: number }> {
  let query = supabase
    .from("parcels")
    .select("parcel_number", { count: "exact" })
    .or("building_area.is.null,year_built.is.null,bedrooms.is.null");

  if (filters.neighborhood) query = query.eq("neighborhood_code", filters.neighborhood);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.propertyClass) query = query.eq("property_class", filters.propertyClass);
  if (filters.minSqft) query = query.gte("building_area", filters.minSqft);
  if (filters.maxSqft) query = query.lte("building_area", filters.maxSqft);
  if (filters.minYear) query = query.gte("year_built", filters.minYear);
  if (filters.maxYear) query = query.lte("year_built", filters.maxYear);
  if (filters.minBeds) query = query.gte("bedrooms", filters.minBeds);
  if (filters.maxBeds) query = query.lte("bedrooms", filters.maxBeds);

  const { data, error, count } = await query.limit(batchSize);
  if (error) throw error;

  return {
    parcels: data?.map((p) => p.parcel_number) || [],
    total: count || 0,
  };
}

/** Invoke ArcGIS parcel sync edge function */
export async function invokeArcGISSync(params: {
  arcgisUrl: string;
  parcelNumberField: string;
  sourceId?: string;
}) {
  const { data, error } = await supabase.functions.invoke("arcgis-parcel-sync", {
    body: params,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Invoke assessor scrape edge function */
export async function invokeAssessorScrape(params: {
  assessorUrl: string;
  parcelIds: string[];
  action: string;
}) {
  const { data, error } = await supabase.functions.invoke("assessor-scrape", {
    body: params,
  });
  if (error) throw error;
  return data;
}

/** Invoke defense narrative edge function (supports multiple narrative types) */
export async function invokeDefenseNarrative(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("defense-narrative", {
    body,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { narrative: string; narrativeType?: string };
}

/** Synthesize evidence for a packet — calls defense-narrative with evidence_synthesis type */
export async function invokeSynthesizeEvidence(body: {
  parcelNumber: string;
  address: string;
  assessedValue: number;
  documents: { fileName: string; documentType: string }[];
  narratives: { title: string; contentPreview: string }[];
  ratioStats?: Record<string, unknown>;
}) {
  return invokeDefenseNarrative({
    ...body,
    narrativeType: "evidence_synthesis",
    additionalContext: `Documents: ${JSON.stringify(body.documents)}\nNarratives: ${JSON.stringify(body.narratives)}`,
  });
}

/** Invoke draft notice edge function */
export async function invokeDraftNotice(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("draft-notice", {
    body,
  });
  if (error) throw error;
  return data;
}

/** Download file from dossier storage */
export async function downloadDossierFile(filePath: string): Promise<Blob | null> {
  const { data } = await supabase.storage.from("dossier-files").download(filePath);
  return data;
}

/** Fetch parcels for sync runner */
export async function fetchParcelsForSync(limit = 200) {
  const { data } = await supabase.from("parcels").select("*").limit(limit);
  return (data || []) as Record<string, unknown>[];
}

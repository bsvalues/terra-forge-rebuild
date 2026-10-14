import { supabase } from "@/integrations/supabase/client";

/** Batch size keeps PostgREST IN-lists well under URL length limits. */
export const PARCEL_LOOKUP_BATCH = 50;

/**
 * Resolve parcel numbers to parcel ids within one county, fetching only the
 * numbers the import actually contains (never the whole county roll).
 */
export async function resolveParcelIds(countyId: string, parcelNumbers: Iterable<string>): Promise<Record<string, string>> {
  const unique = [...new Set([...parcelNumbers].map(n => String(n).trim()).filter(Boolean))];
  const lookup: Record<string, string> = {};
  for (let i = 0; i < unique.length; i += PARCEL_LOOKUP_BATCH) {
    const chunk = unique.slice(i, i + PARCEL_LOOKUP_BATCH);
    const { data, error } = await supabase
      .from("parcels")
      .select("id, parcel_number")
      .eq("county_id", countyId)
      .in("parcel_number", chunk);
    if (error) throw new Error(`Parcel lookup failed: ${error.message}`);
    for (const p of data ?? []) lookup[p.parcel_number] = p.id;
  }
  return lookup;
}

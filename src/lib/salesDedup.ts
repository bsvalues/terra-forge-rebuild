/**
 * Sales identity: one recorded instrument per parcel per county
 * (matches DB constraint sales_county_parcel_instrument_key).
 * Rows without an instrument number have no identity and are kept as-is.
 */
export const SALES_CONFLICT_KEY = "county_id,parcel_id,instrument_number";

/** Collapse rows sharing a recorded instrument (last one wins) so a batch upsert never hits the same row twice. */
export function dedupeSalesRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  const keyed = new Map<string, T>();
  const unkeyed: T[] = [];
  for (const row of rows) {
    const inst = row.instrument_number;
    if (inst === null || inst === undefined || String(inst).trim() === "") {
      unkeyed.push(row);
      continue;
    }
    keyed.set(`${row.county_id}|${row.parcel_id}|${String(inst).trim()}`, row);
  }
  return [...keyed.values(), ...unkeyed];
}

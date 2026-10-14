import { describe, it, expect } from "vitest";
import { dedupeSalesRows } from "./salesDedup";

describe("dedupeSalesRows", () => {
  it("keeps one row per county+parcel+recording number", () => {
    const rows = [
      { county_id: "c", parcel_id: "p", instrument_number: "R1", sale_price: 100 },
      { county_id: "c", parcel_id: "p", instrument_number: "R1", sale_price: 200 },
      { county_id: "c", parcel_id: "p", instrument_number: "R2", sale_price: 300 },
    ];
    const out = dedupeSalesRows(rows);
    expect(out).toHaveLength(2);
    expect(out.find(r => r.instrument_number === "R1")!.sale_price).toBe(200);
  });

  it("never merges sales without a recording number", () => {
    const rows = [
      { county_id: "c", parcel_id: "p", instrument_number: null, sale_price: 1 },
      { county_id: "c", parcel_id: "p", instrument_number: "", sale_price: 2 },
    ];
    expect(dedupeSalesRows(rows)).toHaveLength(2);
  });
});

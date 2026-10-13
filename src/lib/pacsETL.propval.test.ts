import { describe, it, expect } from "vitest";
import { selectCertifiedActivePropVal } from "./pacsETL";

describe("selectCertifiedActivePropVal", () => {
  it("keeps the latest valuation year regardless of row order", () => {
    const out = selectCertifiedActivePropVal([
      { prop_id: "1", prop_val_yr: "2026", sup_num: "0", hood_cd: "15191" },
      { prop_id: "1", prop_val_yr: "2025", sup_num: "0", hood_cd: "15190" },
    ]);
    expect(out.map((r) => r.hood_cd)).toEqual(["15191"]);
  });
  it("ignores supplement rows", () => {
    const out = selectCertifiedActivePropVal([
      { prop_id: "1", prop_val_yr: "2026", sup_num: "0", hood_cd: "A" },
      { prop_id: "1", prop_val_yr: "2026", sup_num: "3", hood_cd: "B" },
    ]);
    expect(out.map((r) => r.hood_cd)).toEqual(["A"]);
  });
  it("ignores inactive accounts", () => {
    const out = selectCertifiedActivePropVal([
      { prop_id: "2", prop_val_yr: "2026", sup_num: "0", prop_inactive_dt: "2026-02-01", hood_cd: "X" },
    ]);
    expect(out).toEqual([]);
  });
});

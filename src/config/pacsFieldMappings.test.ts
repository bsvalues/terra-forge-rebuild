// Regression guards for the Benton 2026 neighborhood correction.
import { describe, it, expect } from "vitest";
import {
  PACS_TABLE_MAPPINGS,
  PACS_EXPORT_GUIDE,
  PACS_NEIGHBORHOOD_QUERIES,
} from "./pacsFieldMappings";

describe("PACS neighborhood mapping", () => {
  it("never reads hood_cd from the property table", () => {
    const property = PACS_TABLE_MAPPINGS.find((m) => m.sourceTable === "property")!;
    expect(property.fields.some((f) => f.sourceColumn === "hood_cd")).toBe(false);
  });

  it("reads hood_cd from the year-scoped property_val table", () => {
    const pv = PACS_TABLE_MAPPINGS.find((m) => m.sourceTable === "property_val")!;
    expect(pv.fields.find((f) => f.sourceColumn === "hood_cd")?.targetColumn).toBe("neighborhood_code");
  });

  it("current-year assignment uses the certified-active roll (sup_num = 0, active only)", () => {
    const sql = PACS_NEIGHBORHOOD_QUERIES.parcelAssignment(2026, "CURRENT_YEAR");
    expect(sql).toContain("pv.prop_val_yr = 2026");
    expect(sql).toContain("pv.sup_num = 0");
    expect(sql).toContain("pv.prop_inactive_dt IS NULL");
    expect(sql).not.toMatch(/LIKE/i);
  });
});

describe("PACS parcel export living-area rule", () => {
  const sql = PACS_EXPORT_GUIDE.queryTemplates.parcels;
  it("uses imprv_detail MA variants for one year with sale_id = 0", () => {
    expect(sql).toContain("d.prop_val_yr = @yr");
    expect(sql).toContain("d.sale_id = 0");
    expect(sql).toContain("('MA','MA-Split','MA-1.5 Sty','MA-2 Sty')");
  });
  it("never uses the empty imprv.living_area_up column", () => {
    expect(sql).not.toMatch(/living_area_up\b(?!\))/);
    expect(sql).not.toContain("i.living_area,");
  });
  it("selects the certified-active roll", () => {
    expect(sql).toContain("pv.sup_num = 0");
    expect(sql).toContain("pv.prop_inactive_dt IS NULL");
  });
});

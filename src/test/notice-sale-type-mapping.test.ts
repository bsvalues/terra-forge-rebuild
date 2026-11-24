// Guards: PACS ratio codes (sl_ratio_type_cd) are not sale types.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("sale type field matching", () => {
  it("never auto-matches the PACS ratio code column to Sale Type", () => {
    for (const f of ["src/hooks/useIngestPipeline.ts", "src/config/pacsFieldMappings.ts"]) {
      const line = readFileSync(f, "utf8").split("\n").find((l) => /^\s*sale_type: \[/.test(l))!;
      expect(line).toBeDefined();
      expect(line).not.toContain("sl_ratio_type_cd");
    }
  });
});

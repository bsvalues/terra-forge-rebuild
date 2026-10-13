import { describe, expect, it } from "vitest";
import { getViewEntry } from "./VIEW_COMPONENT_MAP";
import { IA_MODULES } from "./IA_MAP";

describe("registered view resolution", () => {
  it("resolves all registered views", () => {
    for (const module of IA_MODULES) {
      expect(getViewEntry(module.id, null)).not.toBeNull();
      for (const view of module.views) expect(getViewEntry(module.id, view.id)).not.toBeNull();
    }
  });
  it("does not silently turn a nonexistent tool into the default workspace", () => {
    expect(getViewEntry("workbench", "not-a-registered-view")).toBeNull();
    expect(getViewEntry("missing-module", null)).toBeNull();
  });
});
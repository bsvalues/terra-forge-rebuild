import { describe, expect, it } from "vitest";
import { IA_MODULES, isLegalNavigation } from "./IA_MAP";
import { WORKSPACES, findWorkspace, searchWorkspaceTools } from "./workspaces";

describe("workspace navigation contract", () => {
  it("exposes every registered tool once without changing its owning route", () => {
    const targets = WORKSPACES.flatMap(w => w.tools.map(t => `${t.module}:${t.view}`));
    const registered = IA_MODULES.flatMap(m => m.views.map(v => `${m.id}:${v.id}`));
    expect([...targets].sort()).toEqual([...registered].sort());
    expect(new Set(targets).size).toBe(targets.length);
    for (const workspace of WORKSPACES) {
      for (const tool of workspace.tools) expect(isLegalNavigation(tool.module, tool.view)).toBe(true);
    }
  });
  it("finds county ingestion while another module is open", () => {
    expect(searchWorkspaceTools("ingestion").map(t => `${t.module}:${t.view}`)).toContain("home:ids");
  });
  it("keeps spatial analysis in its existing route while identifying its Atlas workspace", () => {
    expect(findWorkspace("factory", "geoequity")?.id).toBe("atlas");
  });
  it("resolves module roots to their actual workspace", () => {
    expect(findWorkspace("workbench", null)?.id).toBe("property");
    expect(findWorkspace("factory", null)?.id).toBe("forge");
    expect(findWorkspace("registry", null)?.id).toBe("dossier");
  });
});
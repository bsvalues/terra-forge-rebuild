import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { saveImportDraft, loadImportDraft, clearImportDraft, resumeStep, draftKey, IMPORT_DRAFT_MAX_AGE_MS, type ImportDraft } from "./importDraft";

const base = (over: Partial<ImportDraft> = {}): ImportDraft => ({
  savedAt: 1000, step: "validate", targetTable: "sales", importProfile: "generic",
  parsedFile: { fileName: "sales.csv", rowCount: 2 }, mappings: [{ sourceField: "a", targetField: "b" }],
  validation: null, detectedCombined: false, jobId: "job-1", ...over,
});

describe("import draft recovery", () => {
  const key = draftKey("county-a", "user-1");
  beforeEach(() => clearImportDraft(key));

  it("resumes an unpublished import at the step the user left", async () => {
    await saveImportDraft(key, base());
    const d = await loadImportDraft(key, 2000);
    expect(d?.step).toBe("validate");
    expect(d?.mappings).toHaveLength(1);
    expect(d?.jobId).toBe("job-1");
  });
  it("keeps drafts separate per county", async () => {
    await saveImportDraft(key, base());
    expect(await loadImportDraft(draftKey("county-b", "user-1"), 2000)).toBeNull();
  });
  it("never resumes an interrupted publish as running; it returns to preview", () => {
    expect(resumeStep("publish")).toBe("preview");
    expect(resumeStep("complete")).toBeNull();
    expect(resumeStep("select")).toBeNull();
  });
  it("expires drafts after 7 days", async () => {
    await saveImportDraft(key, base({ savedAt: 0 }));
    expect(await loadImportDraft(key, IMPORT_DRAFT_MAX_AGE_MS + 1)).toBeNull();
  });
  it("discards a draft once cleared", async () => {
    await saveImportDraft(key, base());
    await clearImportDraft(key);
    expect(await loadImportDraft(key, 2000)).toBeNull();
  });
});

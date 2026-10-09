import { describe, it, expect } from "vitest";
import { addSpace, removeSpace, parseSpaces, MAX_SPACES, isSafeSpacePath } from "@/lib/spaces";

describe("Spaces", () => {
  it("adds a space for an in-app path", () => {
    expect(addSpace([], "Appeals", "/workbench/dais", "a")).toEqual([
      { id: "a", name: "Appeals", path: "/workbench/dais" },
    ]);
  });

  it("does not duplicate a path that is already saved", () => {
    const one = addSpace([], "A", "/home", "a");
    expect(addSpace(one, "B", "/home", "b")).toHaveLength(1);
  });

  it("caps the dock at 8 spaces", () => {
    let list = [] as ReturnType<typeof addSpace>;
    for (let i = 0; i < 10; i++) list = addSpace(list, `S${i}`, `/p${i}`, `${i}`);
    expect(MAX_SPACES).toBe(8);
    expect(list).toHaveLength(8);
  });

  it("rejects external or protocol-relative paths", () => {
    expect(isSafeSpacePath("https://evil.com")).toBe(false);
    expect(isSafeSpacePath("//evil.com")).toBe(false);
    expect(addSpace([], "X", "//evil.com", "x")).toEqual([]);
  });

  it("rejects empty names", () => {
    expect(addSpace([], "   ", "/home", "x")).toEqual([]);
  });

  it("removes by id", () => {
    const list = addSpace([], "A", "/home", "a");
    expect(removeSpace(list, "a")).toEqual([]);
  });

  it("ignores corrupt or hostile stored data", () => {
    expect(parseSpaces("not json")).toEqual([]);
    expect(parseSpaces(JSON.stringify([{ id: "1", name: "x", path: "https://evil" }]))).toEqual([]);
  });
});

import { renameSpace, spaceIndexFromKey } from "@/lib/spaces";

describe("Space renaming and shortcuts", () => {
  it("renames a space and rejects blank names", () => {
    const list = addSpace([], "A", "/home", "a");
    expect(renameSpace(list, "a", "  Appeals ")[0].name).toBe("Appeals");
    expect(renameSpace(list, "a", "   ")[0].name).toBe("A");
  });

  const k = (o: Partial<Parameters<typeof spaceIndexFromKey>[0]>) =>
    spaceIndexFromKey({ key: "", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...o });

  it("Ctrl+Alt+1 jumps to the first space, Ctrl+Alt+8 to the eighth", () => {
    expect(k({ ctrlKey: true, altKey: true, code: "Digit1", key: "¡" })).toBe(0);
    expect(k({ metaKey: true, altKey: true, key: "8" })).toBe(7);
  });

  it("ignores 9, 0, missing modifiers and Shift", () => {
    expect(k({ ctrlKey: true, altKey: true, key: "9" })).toBeNull();
    expect(k({ ctrlKey: true, altKey: true, key: "0" })).toBeNull();
    expect(k({ ctrlKey: true, key: "1" })).toBeNull();
    expect(k({ ctrlKey: true, altKey: true, shiftKey: true, key: "1" })).toBeNull();
  });
});

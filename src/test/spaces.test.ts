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

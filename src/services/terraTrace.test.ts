import { describe, it, expect } from "vitest";
import { computeDiff } from "./terraTrace";

describe("computeDiff", () => {
  it("returns only changed keys", () => {
    const before = { a: 1, b: "hello", c: true };
    const after = { a: 2, b: "hello", c: false };
    const result = computeDiff(before, after);
    expect(result.before).toEqual({ a: 1, c: true });
    expect(result.after).toEqual({ a: 2, c: false });
  });

  it("returns empty diffs when nothing changed", () => {
    const obj = { x: 10, y: "test" };
    const result = computeDiff(obj, { ...obj });
    expect(result.before).toEqual({});
    expect(result.after).toEqual({});
  });

  it("detects added keys in after", () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };
    const result = computeDiff(before, after);
    expect(result.before).toEqual({ b: undefined });
    expect(result.after).toEqual({ b: 2 });
  });

  it("handles null and undefined values", () => {
    const before = { a: null, b: "val" };
    const after = { a: "filled", b: null };
    const result = computeDiff(
      before as Record<string, unknown>,
      after as Record<string, unknown>
    );
    expect(result.before).toEqual({ a: null, b: "val" });
    expect(result.after).toEqual({ a: "filled", b: null });
  });

  it("handles empty objects", () => {
    const result = computeDiff({}, {});
    expect(result.before).toEqual({});
    expect(result.after).toEqual({});
  });

  it("detects numeric precision changes", () => {
    const result = computeDiff({ val: 100000 }, { val: 105000 });
    expect(result.before).toEqual({ val: 100000 });
    expect(result.after).toEqual({ val: 105000 });
  });
});

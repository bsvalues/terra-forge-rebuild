import { describe, it, expect } from "vitest";
import {
  clampSplit,
  isEmbedMode,
  buildEmbedUrl,
  stripEmbedParam,
  parseSplitState,
  DEFAULT_SPLIT,
} from "@/lib/splitView";
import { windowTitleForPath } from "@/lib/desktopWindow";

describe("Side-by-side windows", () => {
  it("keeps each window between 25% and 75% wide", () => {
    expect(clampSplit(0.1)).toBe(0.25);
    expect(clampSplit(0.9)).toBe(0.75);
    expect(clampSplit(0.5)).toBe(0.5);
    expect(clampSplit(NaN)).toBe(DEFAULT_SPLIT);
  });

  it("marks side-window pages and keeps their own query", () => {
    expect(buildEmbedUrl("/factory/geoequity?nbhd=13010#map")).toBe("/factory/geoequity?nbhd=13010&tf_embed=1#map");
    expect(isEmbedMode("?tf_embed=1")).toBe(true);
    expect(isEmbedMode("?nbhd=1")).toBe(false);
  });

  it("refuses to load outside pages in a side window", () => {
    expect(buildEmbedUrl("https://evil.com")).toBeNull();
    expect(buildEmbedUrl("//evil.com")).toBeNull();
  });

  it("removes the side-window mark when swapping to main", () => {
    expect(stripEmbedParam("/home?tf_embed=1&x=2")).toBe("/home?x=2");
  });

  it("ignores unsafe or corrupt saved layouts", () => {
    expect(parseSplitState('{"path":"https://evil","ratio":0.6}')).toEqual({ path: null, ratio: 0.6 });
    expect(parseSplitState('{"path":"/home","ratio":5}')).toEqual({ path: "/home", ratio: 0.75 });
    expect(parseSplitState("bad")).toEqual({ path: null, ratio: DEFAULT_SPLIT });
  });

  it("titles a side window from its page", () => {
    expect(windowTitleForPath("/home/data-ops/dashboard?tf_embed=1")).toEqual({ title: "Home", subtitle: "Command Briefing" });
    expect(windowTitleForPath("/factory/geoequity").subtitle).toBe("Spatial Analysis");
  });
});

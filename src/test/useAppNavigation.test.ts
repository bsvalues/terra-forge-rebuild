// Phase C6 — useAppNavigation Hook Tests
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { PRIMARY_MODULE_IDS } from "@/config/IA_MAP";

function wrapper(initialPath: string) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
}

describe("useAppNavigation — URL parsing", () => {
  it("parses /home → activeModule === 'home', activeView is null", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/home"),
    });
    expect(result.current.activeModule).toBe("home");
    expect(result.current.activeView).toBeNull();
  });

  it("parses /factory/calibration → activeModule === 'factory', activeView === 'calibration'", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/factory/calibration"),
    });
    expect(result.current.activeModule).toBe("factory");
    expect(result.current.activeView).toBe("calibration");
  });

  it("parses /workbench/field → activeModule === 'workbench', activeView === 'field'", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/workbench/field"),
    });
    expect(result.current.activeModule).toBe("workbench");
    expect(result.current.activeView).toBe("field");
  });

  it("parses /registry → activeModule === 'registry'", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/registry"),
    });
    expect(result.current.activeModule).toBe("registry");
  });

  it("falls back to 'home' for unknown paths", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/unknown-module"),
    });
    expect(result.current.activeModule).toBe("home");
  });

  it("activeModule is always one of the 4 primary module IDs", () => {
    const paths = ["/home", "/workbench", "/factory", "/registry", "/", "/bogus"];
    for (const path of paths) {
      const { result } = renderHook(() => useAppNavigation(), {
        wrapper: wrapper(path),
      });
      expect(PRIMARY_MODULE_IDS as readonly string[]).toContain(result.current.activeModule);
    }
  });

  it("returns navigateTo as a function", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/home"),
    });
    expect(typeof result.current.navigateTo).toBe("function");
  });

  it("returns navigateToLegacy as a function", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/home"),
    });
    expect(typeof result.current.navigateToLegacy).toBe("function");
  });

  it("navigationDirection defaults to 'push'", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/home"),
    });
    expect(result.current.navigationDirection).toBe("push");
  });

  it("activeGroup is null for bare module paths", () => {
    const { result } = renderHook(() => useAppNavigation(), {
      wrapper: wrapper("/factory"),
    });
    expect(result.current.activeGroup).toBeNull();
  });
});

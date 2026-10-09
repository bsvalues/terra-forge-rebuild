import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DesktopWindow } from "@/components/layout/DesktopWindow";
import { windowTitleFor, parseWindowPrefs } from "@/lib/desktopWindow";

describe("windowTitleFor", () => {
  it("uses the page names from the navigation map", () => {
    expect(windowTitleFor("home", "dashboard")).toEqual({ title: "Home", subtitle: "Command Briefing" });
    expect(windowTitleFor("home")).toEqual({ title: "Home" });
  });
  it("falls back to a readable name for unknown pages", () => {
    expect(windowTitleFor("home", "made-up-view").subtitle).toBe("Made Up View");
  });
});

describe("parseWindowPrefs", () => {
  it("only trusts a real true value", () => {
    expect(parseWindowPrefs('{"maximized":true}').maximized).toBe(true);
    expect(parseWindowPrefs('{"maximized":"yes"}').maximized).toBe(false);
    expect(parseWindowPrefs("garbage").maximized).toBe(false);
    expect(parseWindowPrefs(null).maximized).toBe(false);
  });
});

describe("DesktopWindow", () => {
  const setup = (over = {}) => {
    const props = {
      title: "Home",
      subtitle: "Command Briefing",
      maximized: false,
      minimized: false,
      onClose: vi.fn(),
      onMinimize: vi.fn(),
      onToggleMaximize: vi.fn(),
      ...over,
    };
    render(<DesktopWindow {...props}><p>body</p></DesktopWindow>);
    return props;
  };

  it("shows title and content", () => {
    setup();
    expect(screen.getByText("Command Briefing")).toBeTruthy();
    expect(screen.getByText("body")).toBeTruthy();
  });

  it("wires the three window buttons", () => {
    const p = setup();
    fireEvent.click(screen.getByLabelText("Close window and go Home"));
    fireEvent.click(screen.getByLabelText("Minimize window"));
    fireEvent.click(screen.getByLabelText("Maximize window"));
    expect(p.onClose).toHaveBeenCalledOnce();
    expect(p.onMinimize).toHaveBeenCalledOnce();
    expect(p.onToggleMaximize).toHaveBeenCalledOnce();
  });

  it("renders nothing while minimized", () => {
    setup({ minimized: true });
    expect(screen.queryByText("body")).toBeNull();
  });
});

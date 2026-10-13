// Phase C6 — TahoeSidebar Component Tests
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TahoeSidebar } from "@/components/navigation/TahoeSidebar";

// Mock hooks that make network calls
vi.mock("@/hooks/useCountyMeta", () => ({
  useCountyMeta: vi.fn(() => null),
}));

vi.mock("@/hooks/useCountyVitals", () => ({
  useCountyVitals: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock("@/hooks/useSidebarBadges", () => ({
  useSidebarBadges: vi.fn(() => ({})),
}));

vi.mock("@/hooks/useActiveCounty", () => ({
  useActiveCountyId: vi.fn(() => null),
  useHasActiveCounty: vi.fn(() => false),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function Providers({ children }: { children: React.ReactNode }) {
  const client = makeClient();
  return React.createElement(
    QueryClientProvider,
    { client },
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/home"] },
      React.createElement(SidebarProvider, null, children),
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TahoeSidebar", () => {
  it("renders without crashing", () => {
    render(
      React.createElement(TahoeSidebar, { onNavigate: vi.fn() }),
      { wrapper: Providers },
    );
    // If it renders without throwing, the test passes
    expect(document.body).toBeTruthy();
  });

  it("search trigger button is present and has aria-label containing 'command palette' or '⌘K'", () => {
    render(
      React.createElement(TahoeSidebar, { onNavigate: vi.fn() }),
      { wrapper: Providers },
    );
    const searchBtn = screen.getByRole("button", { name: /command palette|⌘K/i });
    expect(searchBtn).toBeTruthy();
  });


});

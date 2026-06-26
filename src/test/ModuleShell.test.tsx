// Phase C6 — ModuleShell Component Tests
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ModuleShell } from "@/components/layout/ModuleShell";

// Mock all hooks that make network calls
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

vi.mock("@/hooks/useRealtimeNotifications", () => ({
  useRealtimeNotifications: vi.fn(() => undefined),
}));

vi.mock("@/hooks/useNotificationStore", () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    addNotification: vi.fn(),
    clearAll: vi.fn(),
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/constitutionGuards", () => ({
  logNavAttempt: vi.fn(),
}));

// Mock complex child components that have deep dependencies
vi.mock("@/components/layout/ViewRenderer", () => ({
  ViewRenderer: vi.fn(() => React.createElement("div", { "data-testid": "view-renderer" }, "View")),
}));

vi.mock("@/components/navigation/GlobalCommandPalette", () => ({
  GlobalCommandPalette: vi.fn(() => null),
}));

vi.mock("@/components/navigation/ControlCenter", () => ({
  ControlCenter: vi.fn(() => null),
}));

vi.mock("@/components/navigation/InstallPrompt", () => ({
  InstallPrompt: vi.fn(() => null),
}));

vi.mock("@/components/navigation/TopSystemBar", () => ({
  TopSystemBar: vi.fn(() => React.createElement("div", { "data-testid": "top-system-bar" })),
}));

vi.mock("@/components/navigation/BreadcrumbBar", () => ({
  BreadcrumbBar: vi.fn(() => React.createElement("div", { "data-testid": "breadcrumb-bar" })),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }, ref: React.Ref<HTMLDivElement>) =>
      React.createElement("div", { ...props, ref }, children),
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
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
    React.createElement(MemoryRouter, { initialEntries: ["/home"] }, children),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ModuleShell", () => {
  it("renders without crashing", () => {
    render(React.createElement(ModuleShell), { wrapper: Providers });
    expect(document.body).toBeTruthy();
  });

  it("renders the main content area", () => {
    const { container } = render(React.createElement(ModuleShell), { wrapper: Providers });
    // ModuleShell renders a main element with role="main"
    const main = container.querySelector('[role="main"]');
    expect(main).toBeTruthy();
  });
});

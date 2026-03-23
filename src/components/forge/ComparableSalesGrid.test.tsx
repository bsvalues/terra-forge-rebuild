// TerraFusion OS — Comparable Sales Grid Tests (Phase 177)

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useParcelDetails", () => ({
  useComparableSales: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

import { useComparableSales } from "@/hooks/useParcelDetails";
import { ComparableSalesGrid } from "./ComparableSalesGrid";

const mockUseComparableSales = useComparableSales as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

const MOCK_COMPS = [
  {
    id: "sale-1",
    sale_date: "2024-06-01",
    sale_price: 320000,
    deed_type: "WD",
    parcels: { id: "p-1", address: "123 Main St", city: "Kennewick", assessed_value: 300000, building_area: 1600 },
  },
  {
    id: "sale-2",
    sale_date: "2024-03-15",
    sale_price: 280000,
    deed_type: "WD",
    parcels: { id: "p-2", address: "456 Oak Ave", city: "Richland", assessed_value: 270000, building_area: 1400 },
  },
  {
    id: "sale-3",
    sale_date: "2024-01-10",
    sale_price: 350000,
    deed_type: "BD",
    parcels: { id: "p-3", address: "789 Pine Dr", city: "Pasco", assessed_value: 340000, building_area: null },
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ComparableSalesGrid", () => {
  it("shows placeholder when no parcelId", () => {
    mockUseComparableSales.mockReturnValue({ data: [], isLoading: false });
    render(
      React.createElement(wrapper, {}, React.createElement(ComparableSalesGrid, {
        parcelId: null, neighborhoodCode: null, assessedValue: null,
      })),
    );
    expect(screen.getByText(/select a parcel/i)).toBeTruthy();
  });

  it("shows loading skeleton when isLoading=true", () => {
    mockUseComparableSales.mockReturnValue({ data: null, isLoading: true });
    const { container } = render(
      React.createElement(wrapper, {}, React.createElement(ComparableSalesGrid, {
        parcelId: "p-1", neighborhoodCode: "100", assessedValue: 300000,
      })),
    );
    expect(container.querySelectorAll(".animate-pulse, [class*=skeleton]").length).toBeGreaterThan(0);
  });

  it("renders comp rows when data is provided", () => {
    mockUseComparableSales.mockReturnValue({ data: MOCK_COMPS, isLoading: false });
    render(
      React.createElement(wrapper, {}, React.createElement(ComparableSalesGrid, {
        parcelId: "p-subject", neighborhoodCode: "100", assessedValue: 310000,
      })),
    );
    expect(screen.getByText(/123 Main St/i)).toBeTruthy();
  });

  it("calculates $/sqft correctly (price / area)", () => {
    mockUseComparableSales.mockReturnValue({ data: [MOCK_COMPS[0]], isLoading: false });
    render(
      React.createElement(wrapper, {}, React.createElement(ComparableSalesGrid, {
        parcelId: "p-subject", neighborhoodCode: "100", assessedValue: 310000,
      })),
    );
    // 320000 / 1600 = $200
    expect(screen.getByText("$200")).toBeTruthy();
  });

  it("shows '—' for $/sqft when building_area is null", () => {
    mockUseComparableSales.mockReturnValue({ data: [MOCK_COMPS[2]], isLoading: false });
    render(
      React.createElement(wrapper, {}, React.createElement(ComparableSalesGrid, {
        parcelId: "p-subject", neighborhoodCode: "100", assessedValue: 310000,
      })),
    );
    // 789 Pine Dr has null building_area → $/sqft = —
    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("shows 'No qualified comparable sales found' for empty data", () => {
    mockUseComparableSales.mockReturnValue({ data: [], isLoading: false });
    render(
      React.createElement(wrapper, {}, React.createElement(ComparableSalesGrid, {
        parcelId: "p-subject", neighborhoodCode: "100", assessedValue: 310000,
      })),
    );
    expect(screen.getByText(/no qualified/i)).toBeTruthy();
  });

  it("respects the limit prop", () => {
    const manyComps = Array.from({ length: 15 }, (_, i) => ({
      ...MOCK_COMPS[0],
      id: `sale-${i}`,
      parcels: { ...MOCK_COMPS[0].parcels, id: `p-${i}`, address: `${100 + i} Test St` },
    }));
    mockUseComparableSales.mockReturnValue({ data: manyComps, isLoading: false });
    render(
      React.createElement(wrapper, {}, React.createElement(ComparableSalesGrid, {
        parcelId: "p-subject", neighborhoodCode: "100", assessedValue: 310000, limit: 5,
      })),
    );
    expect(screen.getByText(/showing 5 of 15/i)).toBeTruthy();
  });

  it("does not show overflow label when rows <= limit", () => {
    mockUseComparableSales.mockReturnValue({ data: MOCK_COMPS, isLoading: false });
    render(
      React.createElement(wrapper, {}, React.createElement(ComparableSalesGrid, {
        parcelId: "p-subject", neighborhoodCode: "100", assessedValue: 310000, limit: 10,
      })),
    );
    expect(screen.queryByText(/showing/i)).toBeNull();
  });
});

// ── Pure unit: ratio math ─────────────────────────────────────────────────────

describe("AV/SP ratio calculation", () => {
  const calcRatio = (av: number, sp: number) => (av > 0 && sp > 0 ? av / sp : null);

  it("calculates ratio correctly", () => {
    expect(calcRatio(300000, 320000)).toBeCloseTo(0.9375);
  });

  it("returns null when sale price is 0", () => {
    expect(calcRatio(300000, 0)).toBeNull();
  });

  it("returns null when assessed value is 0", () => {
    expect(calcRatio(0, 320000)).toBeNull();
  });
});

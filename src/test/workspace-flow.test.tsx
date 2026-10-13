import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useWorkspaceTool } from "@/hooks/useWorkspaceTool";
import { WorkbenchProvider, useWorkbench } from "@/components/workbench/WorkbenchContext";
vi.mock("@/hooks/useParcel360", () => ({ useParcel360: () => null }));

function ToolProbe() {
  const [tool, select] = useWorkspaceTool("tool", ["comps", "cost"], "comps");
  const location = useLocation();
  return <><output>{tool}:{location.search}</output><button onClick={() => select("cost")}>Cost</button><button onClick={() => select("invalid")}>Invalid</button></>;
}
function ParcelProbe() {
  const { parcel, setParcel, setWorkMode, activeTab } = useWorkbench();
  return <><output>{parcel.id}:{activeTab}</output><button onClick={() => setParcel({ id: "test-parcel", address: "Test address" })}>Select</button><button onClick={() => setWorkMode("admin")}>Admin</button></>;
}
describe("workspace continuity", () => {
  it("preserves county scope and embedded mode while changing tools", () => {
    render(<MemoryRouter initialEntries={["/?county=benton&tf_embed=1"]}><ToolProbe /></MemoryRouter>);
    fireEvent.click(screen.getByText("Cost"));
    expect(screen.getByRole("status")).toHaveTextContent("cost:?county=benton&tf_embed=1&tool=cost");
    fireEvent.click(screen.getByText("Invalid"));
    expect(screen.getByRole("status")).toHaveTextContent("tool=cost");
  });
  it("defaults unknown tool requests without changing other parameters", () => {
    render(<MemoryRouter initialEntries={["/?tool=unknown&tf_embed=1"]}><ToolProbe /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("comps:?tool=unknown&tf_embed=1");
  });
  it("administrative work retains the parcel and activates the Dais lane", () => {
    render(<MemoryRouter><WorkbenchProvider><ParcelProbe /></WorkbenchProvider></MemoryRouter>);
    fireEvent.click(screen.getByText("Select"));
    fireEvent.click(screen.getByText("Admin"));
    expect(screen.getByRole("status")).toHaveTextContent("test-parcel:dais");
  });
});
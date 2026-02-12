import { useState, useCallback } from "react";
import { SovereignSidebar } from "@/components/navigation/SovereignSidebar";
import { SovereignHeader } from "@/components/navigation/SovereignHeader";
import { IDSCommandCenter } from "@/components/ids/IDSCommandCenter";
import { VEIDashboard } from "@/components/vei/VEIDashboard";
import { PropertyWorkbench } from "@/components/workbench";
import { GeoEquityDashboard } from "@/components/geoequity/GeoEquityDashboard";
import { CommandBriefing } from "@/components/dashboard/CommandBriefing";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingParcel, setPendingParcel] = useState<{ id: string; parcelNumber: string; address: string; assessedValue: number } | null>(null);

  const handleGeoParcelSelect = useCallback((parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => {
    setPendingParcel(parcel);
    setActiveModule("workbench");
  }, []);

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return <CommandBriefing onNavigate={setActiveModule} />;
      case "ids":
        return <IDSCommandCenter />;
      case "vei":
        return <VEIDashboard />;
      case "workbench":
        return <PropertyWorkbench initialParcel={pendingParcel} onParcelConsumed={() => setPendingParcel(null)} />;
      case "geoequity":
        return <GeoEquityDashboard onNavigateToWorkbench={handleGeoParcelSelect} />;
      default:
        return <CommandBriefing onNavigate={setActiveModule} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SovereignSidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <main
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          sidebarCollapsed ? "ml-[72px]" : "ml-[280px]"
        )}
      >
        <SovereignHeader
          moduleTitle={
            activeModule === "dashboard" ? "Command Briefing" :
            activeModule === "ids" ? "Intelligent Data Suite" :
            activeModule === "vei" ? "Vertical Equity Index" :
            activeModule === "workbench" ? "Property Workbench" :
            activeModule === "geoequity" ? "GeoEquity" :
            "TerraFusion"
          }
        />
        <div className="flex-1 overflow-auto">
          {renderModule()}
        </div>
      </main>
    </div>
  );
}

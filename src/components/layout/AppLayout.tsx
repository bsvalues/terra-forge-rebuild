import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopSystemBar } from "@/components/navigation/TopSystemBar";
import { DockLauncher } from "@/components/navigation/DockLauncher";
import { GlobalCommandPalette } from "@/components/navigation/GlobalCommandPalette";
import { ControlCenter } from "@/components/navigation/ControlCenter";
import { IDSCommandCenter } from "@/components/ids/IDSCommandCenter";
import { PropertyWorkbench } from "@/components/workbench";
import { SuiteHub } from "@/components/dashboard/SuiteHub";
import { FactoryLayout } from "@/components/factory/FactoryLayout";
import { SyncDashboard } from "@/components/sync/SyncDashboard";
import { VEIDashboard } from "@/components/vei/VEIDashboard";
import { GeoEquityDashboard } from "@/components/geoequity/GeoEquityDashboard";
import { useContextMode } from "@/hooks/useContextMode";

interface AppLayoutProps {
  initialParcel?: {
    id: string;
    parcelNumber: string;
    address: string;
    assessedValue: number;
  } | null;
  initialModule?: string;
  initialFactoryMode?: string;
}

export function AppLayout({ initialParcel: routeParcel, initialModule, initialFactoryMode }: AppLayoutProps) {
  const [activeModule, setActiveModule] = useState(initialModule || "dashboard");
  const [pendingParcel, setPendingParcel] = useState<{
    id: string;
    parcelNumber: string;
    address: string;
    assessedValue: number;
  } | null>(routeParcel ?? null);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [pendingSubTab, setPendingSubTab] = useState<string | null>(null);
  const [pendingIdsPillar, setPendingIdsPillar] = useState<string | null>(null);
  const [pendingIdsJobId, setPendingIdsJobId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);

  const handleNavigate = useCallback((target: string) => {
    // Support "workbench:dais:appeals" deep-link syntax (tab:subtab)
    if (target.startsWith("workbench:")) {
      const parts = target.split(":");
      setPendingTab(parts[1]);
      setPendingSubTab(parts[2] ?? null);
      setActiveModule("workbench");
    } else if (target.startsWith("ids:")) {
      const parts = target.split(":");
      setPendingIdsPillar(parts[1]);
      setPendingIdsJobId(parts[2] ?? null);
      setActiveModule("ids");
    } else {
      setActiveModule(target);
    }
  }, []);

  const currentScene = useContextMode({
    activeModule,
    workMode: "overview",
    hasParcel: !!pendingParcel,
  });

  const handleParcelNavigate = useCallback(
    (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => {
      setPendingParcel(parcel);
      setActiveModule("workbench");
    },
    []
  );

  const renderStage = () => {
    switch (activeModule) {
      case "dashboard":
        return <SuiteHub onNavigate={handleNavigate} onParcelNavigate={handleParcelNavigate} />;
      case "ids":
        return (
          <IDSCommandCenter
            initialPillar={pendingIdsPillar}
            onPillarConsumed={() => setPendingIdsPillar(null)}
            highlightJobId={pendingIdsJobId}
            onJobIdConsumed={() => setPendingIdsJobId(null)}
          />
        );
      case "workbench":
        return (
          <PropertyWorkbench
            initialParcel={pendingParcel}
            onParcelConsumed={() => setPendingParcel(null)}
            initialTab={pendingTab}
            onTabConsumed={() => setPendingTab(null)}
            initialSubTab={pendingSubTab}
            onSubTabConsumed={() => setPendingSubTab(null)}
          />
        );
      case "factory":
        return <FactoryLayout initialMode={initialFactoryMode} />;
      case "vei":
        return (
          <div className="p-6 max-w-7xl mx-auto">
            <VEIDashboard />
          </div>
        );
      case "geoequity":
        return (
          <div className="p-6 max-w-7xl mx-auto">
            <GeoEquityDashboard />
          </div>
        );
      case "sync":
        return (
          <div className="p-6 max-w-7xl mx-auto">
            <SyncDashboard />
          </div>
        );
      default:
        return <SuiteHub onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top System Bar */}
      <TopSystemBar
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenControlCenter={() => setControlCenterOpen(true)}
      />

      {/* Stage — Full-width workspace with safe bottom padding for dock */}
      <main className="flex-1 overflow-auto pb-20 sm:pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderStage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Dock Launcher — Bottom navigation */}
      <DockLauncher activeModule={activeModule} onModuleChange={handleNavigate} />

      {/* Global Command Palette */}
      <GlobalCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onNavigateToParcel={handleParcelNavigate}
      />

      {/* Control Center Drawer */}
      <ControlCenter open={controlCenterOpen} onOpenChange={setControlCenterOpen} />
    </div>
  );
}

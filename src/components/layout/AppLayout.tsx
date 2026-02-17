import { useState, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopSystemBar } from "@/components/navigation/TopSystemBar";
import { DockLauncher } from "@/components/navigation/DockLauncher";
import { GlobalCommandPalette } from "@/components/navigation/GlobalCommandPalette";
import { ControlCenter } from "@/components/navigation/ControlCenter";
import { useContextMode } from "@/hooks/useContextMode";

// ── Code-split: every route-level module is lazy-loaded ────────────
const SuiteHub = lazy(() => import("@/components/dashboard/SuiteHub").then(m => ({ default: m.SuiteHub })));
const IDSCommandCenter = lazy(() => import("@/components/ids/IDSCommandCenter").then(m => ({ default: m.IDSCommandCenter })));
const PropertyWorkbench = lazy(() => import("@/components/workbench").then(m => ({ default: m.PropertyWorkbench })));
const FieldStudioDashboard = lazy(() => import("@/components/field").then(m => ({ default: m.FieldStudioDashboard })));
const FactoryLayout = lazy(() => import("@/components/factory/FactoryLayout").then(m => ({ default: m.FactoryLayout })));
const SyncDashboard = lazy(() => import("@/components/sync/SyncDashboard").then(m => ({ default: m.SyncDashboard })));
const VEIDashboard = lazy(() => import("@/components/vei/VEIDashboard").then(m => ({ default: m.VEIDashboard })));
const GeoEquityDashboard = lazy(() => import("@/components/geoequity/GeoEquityDashboard").then(m => ({ default: m.GeoEquityDashboard })));
const DataQualityScoringEngine = lazy(() => import("@/components/quality/DataQualityScoringEngine").then(m => ({ default: m.DataQualityScoringEngine })));

// ── Loading fallback ───────────────────────────────────────────────
function StageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading module…</span>
      </div>
    </div>
  );
}

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
      case "field":
        return <FieldStudioDashboard />;
      case "quality":
        return (
          <div className="p-6 max-w-7xl mx-auto">
            <DataQualityScoringEngine />
          </div>
        );
      default:
        return <SuiteHub onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopSystemBar
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenControlCenter={() => setControlCenterOpen(true)}
      />

      <main className="flex-1 overflow-auto pb-20 sm:pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={<StageFallback />}>
              {renderStage()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <DockLauncher activeModule={activeModule} onModuleChange={handleNavigate} />

      <GlobalCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onNavigateToParcel={handleParcelNavigate}
      />

      <ControlCenter open={controlCenterOpen} onOpenChange={setControlCenterOpen} />
    </div>
  );
}

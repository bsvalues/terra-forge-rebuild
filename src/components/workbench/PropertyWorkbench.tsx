import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { WorkbenchProvider, useWorkbench } from "./WorkbenchContext";
import { ReviewQueueProvider } from "./ReviewQueueContext";
import { ContextRibbon } from "./ContextRibbon";
import { SuiteTabNavigation } from "./SuiteTabNavigation";
import { TerraPilotPanel } from "./TerraPilotPanel";
import { SuiteTab } from "./types";
import { useScrapeJobNotifications } from "@/hooks/useScrapeJobNotifications";
import { useRecentParcels } from "@/hooks/useRecentParcels";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";

// Suite Content Components
import { SummaryTab } from "./tabs/SummaryTab";
import { ForgeTab } from "./tabs/ForgeTab";
import { AtlasTab } from "./tabs/AtlasTab";
import { DaisTab } from "./tabs/DaisTab";
import { DossierTab } from "./tabs/DossierTab";
import { PilotTab } from "./tabs/PilotTab";
import { SketchTab } from "./tabs/SketchTab";

// Admin Dashboard
import { AdminDashboard } from "@/components/admin";

// Command Palette
import { CommandPalette } from "./CommandPalette";

// Review Queue
import { ReviewQueueBar } from "./ReviewQueueBar";
import { ReviewQueueSidebar } from "./ReviewQueueSidebar";

const TAB_COMPONENTS: Record<SuiteTab, React.ComponentType> = {
  summary: SummaryTab,
  forge: ForgeTab,
  atlas: AtlasTab,
  dais: DaisTab,
  dossier: DossierTab,
  pilot: PilotTab,
  sketch: SketchTab,
};

interface WorkbenchContentProps {
  initialParcel?: { id: string; parcelNumber: string; address: string; assessedValue: number } | null;
  onParcelConsumed?: () => void;
  initialTab?: string | null;
  onTabConsumed?: () => void;
  initialSubTab?: string | null;
  onSubTabConsumed?: () => void;
}

function WorkbenchContent({ initialParcel, onParcelConsumed, initialTab, onTabConsumed, initialSubTab, onSubTabConsumed }: WorkbenchContentProps) {
  const { activeTab, workMode, setParcel, setActiveTab } = useWorkbench();
  const [daisCategory, setDaisCategory] = useState<string | null>(null);
  const [pilotPanelOpen, setPilotPanelOpen] = useState(false);
  const { addRecent } = useRecentParcels();

  // Enable global scrape job notifications
  useScrapeJobNotifications();

  // Handle initial parcel from GeoEquity click-to-select
  useEffect(() => {
    if (initialParcel) {
      setParcel({
        id: initialParcel.id,
        parcelNumber: initialParcel.parcelNumber,
        address: initialParcel.address,
        assessedValue: initialParcel.assessedValue,
      });
      // Track in recent parcels
      addRecent(initialParcel);
      onParcelConsumed?.();
    }
  }, [initialParcel, setParcel, onParcelConsumed, addRecent]);

  // Handle initial tab deep-link from CommandBriefing
  useEffect(() => {
    if (initialTab) {
      const validTabs: SuiteTab[] = ["summary", "forge", "atlas", "dais", "dossier", "pilot", "sketch"];
      if (validTabs.includes(initialTab as SuiteTab)) {
        setActiveTab(initialTab as SuiteTab);
      }
      if (initialSubTab) {
        setDaisCategory(initialSubTab);
        onSubTabConsumed?.();
      }
      onTabConsumed?.();
    }
  }, [initialTab, initialSubTab, setActiveTab, onTabConsumed, onSubTabConsumed]);

  const TabComponent = TAB_COMPONENTS[activeTab];

  // Show Admin Dashboard when in admin mode
  if (workMode === "admin") {
    return (
      <div className="flex flex-col h-[calc(100dvh-11rem)] min-h-[28rem] bg-background">
        <CommandPalette />
        <ContextRibbon />
        <div className="flex-1 overflow-auto">
          <AdminDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-11rem)] min-h-[28rem] bg-background">
      {/* Command Palette - Global keyboard shortcut handler */}
      <CommandPalette />
      
      {/* Context Ribbon - Always visible */}
      <ContextRibbon />

      {/* Review Queue Bar */}
      <ReviewQueueBar />

      {/* Suite Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 bg-tf-surface border-b border-border">
        <div className="min-w-0 overflow-x-auto"><SuiteTabNavigation /></div>
        {activeTab !== "pilot" && <Button variant="ghost" size="sm" className="gap-2 shrink-0" aria-label="Toggle TerraPilot panel" aria-pressed={pilotPanelOpen} title="Toggle TerraPilot panel" onClick={() => setPilotPanelOpen((open) => !open)}><PanelRight className="h-4 w-4" />TerraPilot</Button>}
      </div>

      {/* Main Content Area with Queue Sidebar + Pilot Panel */}
      <div className="flex-1 overflow-hidden flex">
        {/* Queue Progress Sidebar */}
        <AnimatePresence>
          <ReviewQueueSidebar />
        </AnimatePresence>

        {/* Main + Pilot */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* Main Suite Content */}
            <ResizablePanel defaultSize={pilotPanelOpen ? 70 : 100} minSize={50}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-auto"
                >
                  {activeTab === "dais" ? (
                    <DaisTab initialCategory={daisCategory} onCategoryConsumed={() => setDaisCategory(null)} />
                  ) : (
                    <TabComponent />
                  )}
                </motion.div>
              </AnimatePresence>
            </ResizablePanel>

            {/* TerraPilot Panel */}
            {pilotPanelOpen && activeTab !== "pilot" && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={30} 
                  minSize={20} 
                  maxSize={45}
                  collapsible
                  onCollapse={() => setPilotPanelOpen(false)}
                >
                  <TerraPilotPanel onClose={() => setPilotPanelOpen(false)} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>

    </div>
  );
}

interface PropertyWorkbenchProps {
  initialParcel?: { id: string; parcelNumber: string; address: string; assessedValue: number } | null;
  onParcelConsumed?: () => void;
  initialTab?: string | null;
  onTabConsumed?: () => void;
  initialSubTab?: string | null;
  onSubTabConsumed?: () => void;
}

export function PropertyWorkbench({ initialParcel, onParcelConsumed, initialTab, onTabConsumed, initialSubTab, onSubTabConsumed }: PropertyWorkbenchProps = {}) {
  return (
    <WorkbenchProvider>
      <ReviewQueueProvider>
        <WorkbenchContent
          initialParcel={initialParcel}
          onParcelConsumed={onParcelConsumed}
          initialTab={initialTab}
          onTabConsumed={onTabConsumed}
          initialSubTab={initialSubTab}
          onSubTabConsumed={onSubTabConsumed}
        />
      </ReviewQueueProvider>
    </WorkbenchProvider>
  );
}

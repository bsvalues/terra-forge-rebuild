import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { WorkbenchProvider, useWorkbench } from "./WorkbenchContext";
import { ContextRibbon } from "./ContextRibbon";
import { SuiteTabNavigation } from "./SuiteTabNavigation";
import { TerraPilotPanel } from "./TerraPilotPanel";
import { SuiteTab } from "./types";
import { useScrapeJobNotifications } from "@/hooks/useScrapeJobNotifications";

// Suite Content Components
import { SummaryTab } from "./tabs/SummaryTab";
import { ForgeTab } from "./tabs/ForgeTab";
import { AtlasTab } from "./tabs/AtlasTab";
import { DaisTab } from "./tabs/DaisTab";
import { DossierTab } from "./tabs/DossierTab";
import { PilotTab } from "./tabs/PilotTab";

// Admin Dashboard
import { AdminDashboard } from "@/components/admin";

// Command Palette
import { CommandPalette } from "./CommandPalette";

// Review Queue
import { ReviewQueueBar } from "./ReviewQueueBar";

const TAB_COMPONENTS: Record<SuiteTab, React.ComponentType> = {
  summary: SummaryTab,
  forge: ForgeTab,
  atlas: AtlasTab,
  dais: DaisTab,
  dossier: DossierTab,
  pilot: PilotTab,
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
  const { activeTab, pilotMode, workMode, setParcel, setActiveTab } = useWorkbench();
  const [daisCategory, setDaisCategory] = useState<string | null>(null);
  const [pilotPanelOpen, setPilotPanelOpen] = useState(true);

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
      onParcelConsumed?.();
    }
  }, [initialParcel, setParcel, onParcelConsumed]);

  // Handle initial tab deep-link from CommandBriefing
  useEffect(() => {
    if (initialTab) {
      const validTabs: SuiteTab[] = ["summary", "forge", "atlas", "dais", "dossier", "pilot"];
      if (validTabs.includes(initialTab as SuiteTab)) {
        setActiveTab(initialTab as SuiteTab);
      }
      // Handle sub-tab (e.g., "appeals" within "dais")
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
      <div className="flex flex-col h-screen bg-background">
        {/* Command Palette - Global keyboard shortcut handler */}
        <CommandPalette />
        
        {/* Context Ribbon - Always visible */}
        <ContextRibbon />
        
        {/* Admin Dashboard Content */}
        <div className="flex-1 overflow-auto">
          <AdminDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Command Palette - Global keyboard shortcut handler */}
      <CommandPalette />
      
      {/* Context Ribbon - Always visible */}
      <ContextRibbon />

      {/* Review Queue Bar */}
      <ReviewQueueBar />

      {/* Suite Tab Navigation */}
      <div className="px-4 bg-tf-surface/50 backdrop-blur-sm">
        <SuiteTabNavigation />
      </div>

      {/* Main Content Area with Resizable Pilot Panel */}
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

      {/* Floating Pilot Toggle (when panel is closed) */}
      {!pilotPanelOpen && activeTab !== "pilot" && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={() => setPilotPanelOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-tf-cyan to-tf-bright-cyan flex items-center justify-center shadow-sovereign z-50"
        >
          <span className="text-tf-substrate text-xl">✨</span>
        </motion.button>
      )}
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
      <WorkbenchContent
        initialParcel={initialParcel}
        onParcelConsumed={onParcelConsumed}
        initialTab={initialTab}
        onTabConsumed={onTabConsumed}
        initialSubTab={initialSubTab}
        onSubTabConsumed={onSubTabConsumed}
      />
    </WorkbenchProvider>
  );
}

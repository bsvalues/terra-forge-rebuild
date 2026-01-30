import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
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

// Suite Content Components
import { SummaryTab } from "./tabs/SummaryTab";
import { ForgeTab } from "./tabs/ForgeTab";
import { AtlasTab } from "./tabs/AtlasTab";
import { DaisTab } from "./tabs/DaisTab";
import { DossierTab } from "./tabs/DossierTab";
import { PilotTab } from "./tabs/PilotTab";

// Admin Dashboard
import { AdminDashboard } from "@/components/admin";

const TAB_COMPONENTS: Record<SuiteTab, React.ComponentType> = {
  summary: SummaryTab,
  forge: ForgeTab,
  atlas: AtlasTab,
  dais: DaisTab,
  dossier: DossierTab,
  pilot: PilotTab,
};

function WorkbenchContent() {
  const { activeTab, pilotMode, workMode } = useWorkbench();
  const [pilotPanelOpen, setPilotPanelOpen] = useState(true);

  const TabComponent = TAB_COMPONENTS[activeTab];

  // Show Admin Dashboard when in admin mode
  if (workMode === "admin") {
    return (
      <div className="flex flex-col h-screen bg-background">
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
      {/* Context Ribbon - Always visible */}
      <ContextRibbon />

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
                <TabComponent />
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

export function PropertyWorkbench() {
  return (
    <WorkbenchProvider>
      <WorkbenchContent />
    </WorkbenchProvider>
  );
}

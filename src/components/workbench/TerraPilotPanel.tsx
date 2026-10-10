import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Zap, 
  Lightbulb, 
  ChevronDown,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkbench } from "./WorkbenchContext";
import { TerraSphereVisual } from "./TerraSphereVisual";
import { TerraPilotChat } from "./TerraPilotChat";

interface TerraPilotPanelProps {
  onClose: () => void;
}

export function TerraPilotPanel({ onClose }: TerraPilotPanelProps) {
  const { pilotMode, setPilotMode, systemState, setActiveTab } = useWorkbench();
  const [collapsed, setCollapsed] = useState(false);

  const openFullscreen = () => {
    setActiveTab("pilot");
  };

  return (
    <div className="h-full flex flex-col bg-tf-surface/80 backdrop-blur-xl border-l border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <TerraSphereVisual size="sm" state={systemState} />
          <span className="text-sm font-medium text-foreground">TerraPilot</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={openFullscreen}
            aria-label="Open TerraPilot tab"
            title="Open TerraPilot tab"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand TerraPilot" : "Collapse TerraPilot"}
            title={collapsed ? "Expand TerraPilot" : "Collapse TerraPilot"}
            aria-expanded={!collapsed}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            aria-label="Close TerraPilot panel"
            title="Close TerraPilot panel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Mode Toggle */}
            <div className="p-3 border-b border-border/30">
              <div className="pilot-mode-toggle w-full">
                <Button variant="ghost" size="sm"
                  onClick={() => setPilotMode("pilot")}
                  className="pilot-mode-btn flex-1"
                  data-mode="pilot"
                  data-active={pilotMode === "pilot"}
                  aria-pressed={pilotMode === "pilot"}
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" />
                  Pilot
                </Button>
                <Button variant="ghost" size="sm"
                  onClick={() => setPilotMode("muse")}
                  className="pilot-mode-btn flex-1"
                  data-mode="muse"
                  data-active={pilotMode === "muse"}
                  aria-pressed={pilotMode === "muse"}
                >
                  <Lightbulb className="w-3.5 h-3.5 inline mr-1" />
                  Muse
                </Button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden">
              <TerraPilotChat />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

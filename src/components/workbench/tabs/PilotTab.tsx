import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Lightbulb, Zap } from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";
import { TerraPilotChat } from "../TerraPilotChat";

export function PilotTab() {
  const { pilotMode, setPilotMode } = useWorkbench();

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border-b border-border/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tf-cyan to-tf-purple flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-light text-foreground">TerraPilot</h2>
              <p className="text-sm text-muted-foreground">Your AI copilot across TerraFusion</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="pilot-mode-toggle">
            <button
              onClick={() => setPilotMode("pilot")}
              className="pilot-mode-btn"
              data-mode="pilot"
              data-active={pilotMode === "pilot"}
            >
              <Zap className="w-3.5 h-3.5 inline mr-1" />
              Pilot
            </button>
            <button
              onClick={() => setPilotMode("muse")}
              className="pilot-mode-btn"
              data-mode="muse"
              data-active={pilotMode === "muse"}
            >
              <Lightbulb className="w-3.5 h-3.5 inline mr-1" />
              Muse
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg glass-subtle text-sm">
          {pilotMode === "pilot" ? (
            <p className="text-muted-foreground">
              <span className="text-tf-cyan font-medium">Pilot Mode</span> — Execute tasks, run models, navigate parcels, manage workflows
            </p>
          ) : (
            <p className="text-muted-foreground">
              <span className="text-tf-purple font-medium">Muse Mode</span> — Draft documents, explain valuations, synthesize evidence
            </p>
          )}
        </div>
      </motion.div>

      {/* Full Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <TerraPilotChat fullscreen />
      </div>
    </div>
  );
}

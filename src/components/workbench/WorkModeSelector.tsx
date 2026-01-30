import { motion } from "framer-motion";
import { 
  Eye, 
  Calculator, 
  Map, 
  ClipboardList, 
  Briefcase 
} from "lucide-react";
import { useWorkbench } from "./WorkbenchContext";
import { WorkMode, WORK_MODE_CONFIGS } from "./types";
import { cn } from "@/lib/utils";

const ICONS = {
  Eye,
  Calculator,
  Map,
  ClipboardList,
  Briefcase,
};

export function WorkModeSelector() {
  const { workMode, setWorkMode } = useWorkbench();

  return (
    <div className="flex items-center gap-1 p-1 rounded-full glass-subtle">
      {Object.values(WORK_MODE_CONFIGS).map((config) => {
        const Icon = ICONS[config.icon as keyof typeof ICONS];
        const isActive = workMode === config.id;

        return (
          <button
            key={config.id}
            onClick={() => setWorkMode(config.id)}
            className={cn(
              "work-mode-chip flex items-center gap-1.5",
              isActive && "data-[active=true]"
            )}
            data-active={isActive}
            title={config.description}
          >
            {isActive && (
              <motion.div
                layoutId="workModeIndicator"
                className="absolute inset-0 rounded-full bg-tf-cyan/15 border border-tf-cyan/30"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <Icon className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10 hidden lg:inline">{config.name}</span>
          </button>
        );
      })}
    </div>
  );
}

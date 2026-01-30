import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Hammer, 
  Globe, 
  Building2, 
  FolderOpen, 
  Sparkles 
} from "lucide-react";
import { useWorkbench } from "./WorkbenchContext";
import { SuiteTab, SUITE_CONFIGS } from "./types";
import { cn } from "@/lib/utils";

const ICONS = {
  LayoutDashboard,
  Hammer,
  Globe,
  Building2,
  FolderOpen,
  Sparkles,
};

interface SuiteTabNavigationProps {
  className?: string;
}

export function SuiteTabNavigation({ className }: SuiteTabNavigationProps) {
  const { activeTab, setActiveTab } = useWorkbench();

  const tabs: SuiteTab[] = ["summary", "forge", "atlas", "dais", "dossier", "pilot"];

  return (
    <nav className={cn("flex items-center border-b border-border/50", className)}>
      {tabs.map((tabId) => {
        const config = SUITE_CONFIGS[tabId];
        const Icon = ICONS[config.icon as keyof typeof ICONS];
        const isActive = activeTab === tabId;

        return (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={cn(
              "suite-tab flex items-center gap-2 py-3 px-4",
              "relative transition-colors"
            )}
            data-active={isActive}
          >
            <Icon className={cn(
              "w-4 h-4 transition-colors",
              isActive ? "text-tf-cyan" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}>
              {config.name}
            </span>
            
            {isActive && (
              <motion.div
                layoutId="suiteTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-tf-cyan to-tf-bright-cyan"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

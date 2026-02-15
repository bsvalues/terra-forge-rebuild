import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Home,
  Database,
  Search,
  Factory,
  Shield,
  LogOut,
  BarChart3,
  Map,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DockLauncherProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const dockItems = [
  { id: "dashboard", label: "Home", icon: Home, shortcut: "⌘1" },
  { id: "workbench", label: "Workbench", icon: Search, shortcut: "⌘2" },
  { id: "factory", label: "Factory", icon: Factory, shortcut: "⌘3" },
  { id: "ids", label: "IDS", icon: Database, shortcut: "⌘4" },
  { id: "vei", label: "VEI", icon: BarChart3, shortcut: "⌘5" },
  { id: "geoequity", label: "GeoEquity", icon: Map, shortcut: "⌘6" },
  { id: "sync", label: "Sync", icon: Shield, shortcut: "⌘7" },
];

export function DockLauncher({ activeModule, onModuleChange }: DockLauncherProps) {
  const { signOut } = useAuthContext();

  return (
    <div className="dock-launcher material-shell">
      <nav className="flex items-center gap-1">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => onModuleChange(item.id)}
                  className="dock-item"
                  data-active={isActive}
                  whileHover={{ y: -6, scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive ? "text-tf-cyan" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[9px] mt-0.5 transition-colors",
                      isActive ? "text-tf-cyan font-medium" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {item.label}
                <kbd className="ml-2 text-[10px] text-muted-foreground">{item.shortcut}</kbd>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Separator */}
        <div className="w-px h-6 bg-border/50 mx-1" />

        {/* Sign Out */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={signOut}
              className="dock-item"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="top">Sign Out</TooltipContent>
        </Tooltip>
      </nav>
    </div>
  );
}

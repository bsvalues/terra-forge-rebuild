import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getQueueStats } from "@/services/fieldStore";
import {
  Home,
  Database,
  Search,
  Factory,
  Shield,
  LogOut,
  BarChart3,
  Map,
  Compass,
  Target,
  MoreHorizontal,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

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
  { id: "field", label: "Field", icon: Compass, shortcut: "⌘7" },
  { id: "sync", label: "Sync", icon: Shield, shortcut: "⌘8" },
  { id: "quality", label: "Quality", icon: Target, shortcut: "⌘9" },
  { id: "readiness", label: "Readiness", icon: ShieldCheck, shortcut: "⌘0" },
  { id: "analytics", label: "Analytics", icon: TrendingUp, shortcut: "" },
];

// Contextual dock sets — when deep in a module, show only relevant companions
const CONTEXTUAL_DOCK: Record<string, string[]> = {
  field: ["dashboard", "field", "sync", "geoequity", "workbench"],
};

const VISIBLE_COUNT_MOBILE = 5;

export function DockLauncher({ activeModule, onModuleChange }: DockLauncherProps) {
  const { signOut } = useAuthContext();
  const isMobile = useIsMobile();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);

  // Poll unsynced observation count — the leprechaun demands accountability
  useEffect(() => {
    const poll = () => getQueueStats().then((s) => setPendingSync(s.pending)).catch(() => {});
    poll();
    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Contextual dock: in Field mode on mobile, show only relevant companions
  const contextualIds = isMobile && CONTEXTUAL_DOCK[activeModule];
  const baseDockItems = contextualIds
    ? dockItems.filter((i) => contextualIds.includes(i.id))
    : dockItems;

  const visibleItems = isMobile && !contextualIds ? baseDockItems.slice(0, VISIBLE_COUNT_MOBILE) : baseDockItems;
  const overflowItems = isMobile && !contextualIds ? baseDockItems.slice(VISIBLE_COUNT_MOBILE) : [];

  // If the active module is in the overflow, swap it into visible
  const activeInOverflow = isMobile && overflowItems.some((i) => i.id === activeModule);
  const displayItems = activeInOverflow
    ? [...visibleItems.slice(0, VISIBLE_COUNT_MOBILE - 1), dockItems.find((i) => i.id === activeModule)!]
    : visibleItems;
  const displayOverflow = activeInOverflow
    ? [...overflowItems.filter((i) => i.id !== activeModule), visibleItems[VISIBLE_COUNT_MOBILE - 1]]
    : overflowItems;

  return (
    <div className="dock-launcher material-shell">
      <nav className="flex items-center gap-0.5 sm:gap-1">
        {displayItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          const showBadge = item.id === "field" && pendingSync > 0;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => onModuleChange(item.id)}
                  className="dock-item px-2 sm:px-3 relative"
                  data-active={isActive}
                  whileHover={{ y: -6, scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5 transition-colors",
                      isActive ? "text-tf-cyan" : "text-muted-foreground"
                    )}
                  />
                  {/* Unsynced badge — the paste-eating sentinel watches over field data */}
                  {showBadge && (
                    <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                      {pendingSync > 99 ? "99+" : pendingSync}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[8px] sm:text-[9px] mt-0.5 transition-colors hidden xs:inline",
                      isActive ? "text-tf-cyan font-medium" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {item.label}
                {showBadge && ` (${pendingSync} unsynced)`}
                <kbd className="ml-2 text-[10px] text-muted-foreground">{item.shortcut}</kbd>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Overflow "More" button — mobile only */}
        {isMobile && displayOverflow.length > 0 && (
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => setOverflowOpen(!overflowOpen)}
                  className="dock-item px-2"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[8px] mt-0.5 text-muted-foreground">More</span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">More modules</TooltipContent>
            </Tooltip>

            <AnimatePresence>
              {overflowOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-14 right-0 bg-card border border-border/60 rounded-lg p-2 shadow-xl min-w-[140px] z-50"
                >
                  {displayOverflow.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onModuleChange(item.id);
                          setOverflowOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                        <kbd className="ml-auto text-[10px] opacity-60">{item.shortcut}</kbd>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Separator */}
        <div className="w-px h-6 bg-border/50 mx-0.5 sm:mx-1" />

        {/* Sign Out */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={signOut}
              className="dock-item px-2 sm:px-3"
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

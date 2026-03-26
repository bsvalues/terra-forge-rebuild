import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getQueueStats } from "@/services/fieldStore";
import { LogOut } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { IA_MODULES } from "@/config/IA_MAP";

interface DockLauncherProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

export function DockLauncher({ activeModule, onModuleChange }: DockLauncherProps) {
  const { signOut } = useAuthContext();
  const _isMobile = useIsMobile();
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const poll = () => getQueueStats().then((s) => setPendingSync(s.pending)).catch(() => {});
    poll();
    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dock-launcher material-shell safe-area-bottom">
      <nav className="flex items-center gap-0.5 sm:gap-1 px-1">
        {IA_MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;
          const showBadge = mod.id === "workbench" && pendingSync > 0;

          return (
            <Tooltip key={mod.id}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => onModuleChange(mod.id)}
                  className="dock-item px-2 sm:px-3 relative touch-manipulation min-w-[44px] min-h-[44px] flex flex-col items-center justify-center"
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
                  {showBadge && (
                    <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                      {pendingSync > 99 ? "99+" : pendingSync}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[8px] sm:text-[9px] mt-0.5 transition-colors",
                      isActive ? "text-tf-cyan font-medium" : "text-muted-foreground"
                    )}
                  >
                    {mod.label}
                  </span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {mod.label}
                {showBadge && ` (${pendingSync} unsynced)`}
                <kbd className="ml-2 text-[10px] text-muted-foreground">{mod.shortcut}</kbd>
              </TooltipContent>
            </Tooltip>
          );
        })}

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

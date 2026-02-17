import { motion } from "framer-motion";
import { useAuthContext } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Wifi,
  WifiOff,
  Command,
  SlidersHorizontal,
} from "lucide-react";
import { NotificationBell } from "@/components/geoequity/NotificationBell";
import { CountySwitcher } from "@/components/admin/CountySwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountyVitals } from "@/hooks/useCountyVitals";

interface TopSystemBarProps {
  onOpenCommandPalette: () => void;
  onOpenControlCenter: () => void;
}

export function TopSystemBar({ onOpenCommandPalette, onOpenControlCenter }: TopSystemBarProps) {
  const { profile } = useAuthContext();

  const { data: county } = useQuery({
    queryKey: ["system-bar-county"],
    queryFn: async () => {
      const { data } = await supabase.from("counties").select("name, state").limit(1).maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: vitals } = useCountyVitals();
  const parcelsCount = vitals?.parcels.total ?? 0;

  const isOnline = vitals !== undefined;
  const currentYear = new Date().getFullYear();

  return (
    <header className="sticky top-0 z-50 h-12 flex items-center justify-between px-4 material-shell border-b border-border/30">
      {/* Left: County Switcher + Year */}
      <div className="flex items-center gap-3">
        <motion.div
          className="w-7 h-7 rounded-lg bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <span className="text-tf-substrate font-bold text-xs">TF</span>
        </motion.div>

        <CountySwitcher />

        <span className="text-muted-foreground hidden sm:inline">•</span>
        <span className="text-muted-foreground text-sm hidden sm:inline">TY {currentYear}</span>
      </div>

      {/* Center: Cmd+K hint — hidden on mobile */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground text-sm"
      >
        <Command className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Search parcels, suites, actions...</span>
        <span className="md:hidden">Search...</span>
        <kbd className="ml-2 hidden md:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Mobile: search icon only */}
      <button
        onClick={onOpenCommandPalette}
        className="sm:hidden p-2 rounded-lg hover:bg-muted/40 transition-colors"
      >
        <Command className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Right: Role + Sync + Control Center + User */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Role Badge — hidden on mobile */}
        <Badge variant="outline" className="hidden md:inline-flex text-[10px] px-2 py-0.5 border-tf-cyan/30 text-tf-cyan">
          {profile?.display_name || "Analyst"}
        </Badge>

        {/* Sync Status — compact on mobile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-tf-green" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-tf-red" />
              )}
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {parcelsCount?.toLocaleString() || "—"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isOnline ? `Synced: ${parcelsCount?.toLocaleString()} parcels` : "Offline"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Notifications */}
        <NotificationBell />

        {/* Control Center */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={onOpenControlCenter}>
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Control Center</TooltipContent>
        </Tooltip>

        {/* User Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-tf-substrate" />
        </div>
      </div>
    </header>
  );
}

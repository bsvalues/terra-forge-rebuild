import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Settings,
  ChevronRight,
  Globe,
  Database,
  Search,
  LogOut,
  Home,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

interface SovereignSidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

// Phase 0-2 modules only — out-of-scope modules removed
const modules = [
  { id: "dashboard", label: "Dashboard", icon: Home, description: "Command Briefing" },
  { id: "ids", label: "IDS", icon: Database, description: "Ingest & Data Health" },
  { id: "vei", label: "VEI Suite", icon: TrendingUp, description: "Vertical Equity Index" },
  { id: "workbench", label: "Workbench", icon: Search, description: "Property Workbench" },
  { id: "geoequity", label: "GeoEquity", icon: Globe, description: "GIS & Spatial Analysis" },
];

const bottomModules = [
  { id: "settings", label: "Settings", icon: Settings, description: "Configuration" },
];

export function SovereignSidebar({
  activeModule,
  onModuleChange,
  collapsed = false,
  onCollapsedChange,
}: SovereignSidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40",
        "bg-sidebar border-r border-sidebar-border",
        "flex flex-col"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {/* Logo orb */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center shadow-sovereign"
          >
            <span className="text-tf-substrate font-bold text-lg">TF</span>
          </motion.div>
          
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <h1 className="font-light text-lg text-gradient-sovereign">
                TerraFusion
              </h1>
              <p className="text-xs text-muted-foreground">Elite Government OS</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;

          return (
            <motion.button
              key={module.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onModuleChange(module.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg",
                "transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent border border-tf-cyan/30 shadow-sovereign"
                  : "hover:bg-sidebar-accent/50 border border-transparent"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                isActive ? "bg-tf-cyan/20" : "bg-sidebar-accent"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  isActive ? "text-tf-cyan" : "text-muted-foreground"
                )} />
              </div>
              
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 text-left"
                >
                  <p className={cn(
                    "text-sm font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {module.label}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {module.description}
                  </p>
                </motion.div>
              )}

              {!collapsed && isActive && (
                <ChevronRight className="w-4 h-4 text-tf-cyan" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {bottomModules.map((module) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;

          return (
            <motion.button
              key={module.id}
              whileHover={{ x: 4 }}
              onClick={() => onModuleChange(module.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg",
                "transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className={cn(
                "w-5 h-5",
                isActive ? "text-tf-cyan" : "text-muted-foreground"
              )} />
              
              {!collapsed && (
                <span className={cn(
                  "text-sm",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {module.label}
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Sign out */}
        <SignOutButton collapsed={collapsed} />

        {/* Collapse toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent/50"
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </motion.button>
      </div>
    </motion.aside>
  );
}

function SignOutButton({ collapsed }: { collapsed: boolean }) {
  const { signOut } = useAuthContext();
  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={signOut}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-accent/50 transition-all duration-200"
    >
      <LogOut className="w-5 h-5 text-muted-foreground" />
      {!collapsed && (
        <span className="text-sm text-muted-foreground">Sign Out</span>
      )}
    </motion.button>
  );
}

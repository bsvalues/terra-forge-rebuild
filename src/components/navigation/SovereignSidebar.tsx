import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Calculator,
  Brain,
  FolderTree,
  LayoutDashboard,
  Settings,
  ChevronRight,
  CalendarCog,
  FlaskConical,
} from "lucide-react";

interface SovereignSidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const modules = [
  { id: "vei", label: "VEI Suite", icon: TrendingUp, description: "Vertical Equity Index" },
  { id: "segments", label: "Segments", icon: FlaskConical, description: "Factor Analysis" },
  { id: "costforge", label: "CostForge", icon: Calculator, description: "3-6-9 Valuation Engine" },
  { id: "avm", label: "AVM Studio", icon: Brain, description: "ML Model Laboratory" },
  { id: "axiom", label: "AxiomFS", icon: FolderTree, description: "Sovereign File Lattice" },
  { id: "regression", label: "Regression", icon: LayoutDashboard, description: "PhD Analytics" },
  { id: "admin", label: "Administration", icon: CalendarCog, description: "Study Period Manager" },
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

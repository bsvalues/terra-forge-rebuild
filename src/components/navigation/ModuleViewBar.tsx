// TerraFusion OS — Module View Bar
// Renders sub-view tabs for the active module, driven by IA_MAP.ts
// This is the ONLY sub-navigation within a module.

import { cn } from "@/lib/utils";
import { getModule, type PrimaryModuleId, type ViewDefinition } from "@/config/IA_MAP";

interface ModuleViewBarProps {
  moduleId: PrimaryModuleId;
  activeView: string | null;
  onViewChange: (viewId: string) => void;
}

export function ModuleViewBar({ moduleId, activeView, onViewChange }: ModuleViewBarProps) {
  const mod = getModule(moduleId);
  if (!mod || mod.views.length <= 1) return null;

  // Default to first view if none selected
  const currentView = activeView || mod.views[0].id;

  return (
    <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-none">
          {mod.views.map((view: ViewDefinition) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation min-h-[44px]",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {view.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

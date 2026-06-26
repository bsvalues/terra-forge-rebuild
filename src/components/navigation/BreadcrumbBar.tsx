// TerraFusion OS — BreadcrumbBar
// Shows navigation path: Home > Data Operations > IDS Command Center
// With optional "Next: [view] →" hint.

import { ChevronRight, ArrowRight } from "lucide-react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { getModule, getViewGroup } from "@/config/IA_MAP";
import { NEXT_STEPS } from "@/config/NEXT_STEPS";

interface BreadcrumbBarProps {
  onNavigate: (target: string) => void;
}

export function BreadcrumbBar({ onNavigate }: BreadcrumbBarProps) {
  const { activeModule, activeView } = useAppNavigation();

  const mod = getModule(activeModule);
  if (!mod) return null;

  // Don't show breadcrumbs if we're at the module root (dashboard/landing)
  if (!activeView || activeView === "dashboard" || activeView === "property" || activeView === "calibration") {
    return null;
  }

  const group = getViewGroup(activeModule, activeView);
  const view = mod.views.find((v) => v.id === activeView);
  const nextStep = activeView ? NEXT_STEPS[activeView] : undefined;

  return (
    <div className="border-b border-border/30 bg-background/40 backdrop-blur-sm px-4 sm:px-5 py-1.5 flex items-center justify-between min-h-[32px]">
      <nav className="flex items-center gap-0.5 text-[12px]" aria-label="Breadcrumb">
        {/* Module */}
        <button
          onClick={() => onNavigate(activeModule)}
          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted/30"
        >
          {mod.label}
        </button>

        {/* Group (if applicable) */}
        {group && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
            <span className="text-muted-foreground/55 px-1">
              {group.label}
            </span>
          </>
        )}

        {/* Current view */}
        {view && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
            <span className="text-foreground/80 font-medium px-1">
              {view.label}
            </span>
          </>
        )}
      </nav>

      {/* Next Step suggestion */}
      {nextStep && (
        <button
          onClick={() => onNavigate(nextStep.target)}
          className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-primary/8"
        >
          <span>{nextStep.label}</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

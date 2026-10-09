// TerraFusion OS — DesktopWindow
// Window chrome around the active module so the shell reads as a county desktop:
// traffic lights (close → Home, minimize → reveal desktop, zoom → full stage), title, body.

import type { ReactNode } from "react";
import { Minus, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DesktopWindowProps {
  title: string;
  subtitle?: string;
  maximized: boolean;
  minimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  /** Extra controls on the right of the title bar (e.g. "Open beside"). */
  actions?: ReactNode;
  /** When true the parent handles spacing (used in side-by-side layout). */
  flush?: boolean;
  children: ReactNode;
}

export function DesktopWindow({
  title,
  subtitle,
  maximized,
  minimized,
  onClose,
  onMinimize,
  onToggleMaximize,
  actions,
  flush,
  children,
}: DesktopWindowProps) {
  if (minimized) return null;

  return (
    <section
      aria-label={`${title} window`}
      className={cn(
        "desktop-window flex flex-col min-h-0 flex-1 overflow-hidden transition-[margin,border-radius] duration-300",
        flush ? "rounded-xl" : maximized ? "m-0 rounded-none" : "mx-3 mb-3 mt-2 rounded-xl",
      )}
    >
      <header
        className="desktop-window-titlebar h-9 flex items-center gap-3 px-3 shrink-0"
        onDoubleClick={onToggleMaximize}
      >
        <div className="group flex items-center gap-1.5">
          <button aria-label="Close window and go Home" onClick={onClose} className="traffic-light traffic-close">
            <X className="w-2 h-2" />
          </button>
          <button aria-label="Minimize window" onClick={onMinimize} className="traffic-light traffic-min">
            <Minus className="w-2 h-2" />
          </button>
          <button
            aria-label={maximized ? "Restore window" : "Maximize window"}
            onClick={onToggleMaximize}
            className="traffic-light traffic-max"
          >
            {maximized ? <Minimize2 className="w-2 h-2" /> : <Maximize2 className="w-2 h-2" />}
          </button>
        </div>
        <div className="min-w-0 flex-1 flex items-baseline gap-2">
          <h2 className="text-[13px] font-semibold text-foreground/90 truncate">{title}</h2>
          {subtitle && <span className="text-[11px] text-muted-foreground truncate">{subtitle}</span>}
        </div>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </header>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
    </section>
  );
}

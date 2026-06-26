// TerraFusion OS — ModuleShell
// Wraps sidebar + breadcrumb bar + content area for each module.
// Replaces AppLayout as the main layout component.

import { useState, useCallback, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TopSystemBar } from "@/components/navigation/TopSystemBar";
import { GlobalCommandPalette } from "@/components/navigation/GlobalCommandPalette";
import { ControlCenter } from "@/components/navigation/ControlCenter";
import { InstallPrompt } from "@/components/navigation/InstallPrompt";
import { TrustModeProvider } from "@/contexts/TrustModeContext";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { ViewRenderer } from "./ViewRenderer";
import { BreadcrumbBar } from "@/components/navigation/BreadcrumbBar";
import { TahoeSidebar } from "@/components/navigation/TahoeSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { logNavAttempt } from "@/lib/constitutionGuards";

function StageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading module…</span>
      </div>
    </div>
  );
}

export function ModuleShell() {
  const { activeModule, activeView, navigationDirection, navigateToLegacy } = useAppNavigation();

  useRealtimeNotifications();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);

  // Navigation handler that bridges legacy string targets to URL navigation
  const handleNavigate = useCallback(
    (target: string) => {
      logNavAttempt(target);
      navigateToLegacy(target);
    },
    [navigateToLegacy],
  );

  const handleParcelNavigate = useCallback(
    (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => {
      // Navigate to workbench with parcel context
      // For now, store in sessionStorage since we can't pass state through URL
      sessionStorage.setItem("tf:pendingParcel", JSON.stringify(parcel));
      navigateToLegacy("workbench:property");
    },
    [navigateToLegacy],
  );

  // tf:navigate — allow non-React components to trigger navigation
  useEffect(() => {
    const handler = (e: Event) => {
      const { module, view } = (e as CustomEvent<{ module: string; view: string }>).detail;
      const target = view ? `${module}:${view}` : module;
      handleNavigate(target);
    };
    window.addEventListener("tf:navigate", handler);
    return () => window.removeEventListener("tf:navigate", handler);
  }, [handleNavigate]);

  // Cmd+1-4: macOS-style module switching
  useEffect(() => {
    const MODULE_SHORTCUTS: Record<string, string> = {
      "1": "home",
      "2": "workbench",
      "3": "factory",
      "4": "registry",
    };
    const handleModuleShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && MODULE_SHORTCUTS[e.key]) {
        e.preventDefault();
        handleNavigate(MODULE_SHORTCUTS[e.key]);
      }
    };
    window.addEventListener("keydown", handleModuleShortcut);
    return () => window.removeEventListener("keydown", handleModuleShortcut);
  }, [handleNavigate]);

  // Animation variants — Tahoe spatial push/pop
  const variants = {
    push: {
      initial: { x: 60, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -60, opacity: 0 },
    },
    pop: {
      initial: { x: -60, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 60, opacity: 0 },
    },
  };

  const currentVariant = variants[navigationDirection];

  return (
    <TrustModeProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden" style={{ background: "hsl(var(--background))" }}>
          {/* Tahoe Sidebar */}
          <TahoeSidebar onNavigate={handleNavigate} />

          {/* Main content area */}
          <SidebarInset className="flex flex-col flex-1 min-w-0">
            {/* Top system bar */}
            <TopSystemBar
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onOpenControlCenter={() => setControlCenterOpen(true)}
              onOpenMobileNav={() => {
                // SidebarProvider handles mobile toggle via useSidebar().toggleSidebar()
                // This is a no-op; the hamburger in TopSystemBar will be wired to sidebar
              }}
            />

            {/* Breadcrumb bar */}
            <BreadcrumbBar onNavigate={handleNavigate} />

            {/* View content with spatial transitions */}
            <main id="main-content" role="main" className="flex-1 overflow-auto">
              <ErrorBoundary fallbackTitle={`${activeModule} module encountered an error`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeModule}-${activeView}`}
                    initial={currentVariant.initial}
                    animate={currentVariant.animate}
                    exit={currentVariant.exit}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <Suspense fallback={<StageFallback />}>
                      <ViewRenderer
                        onNavigate={handleNavigate}
                        onParcelNavigate={handleParcelNavigate}
                      />
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </ErrorBoundary>
            </main>
          </SidebarInset>
        </div>

        {/* Overlays */}
        <InstallPrompt />

        <GlobalCommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          activeModule={activeModule}
          onModuleChange={handleNavigate}
          onNavigateToParcel={handleParcelNavigate}
        />

        <ControlCenter open={controlCenterOpen} onOpenChange={setControlCenterOpen} />
      </SidebarProvider>
    </TrustModeProvider>
  );
}

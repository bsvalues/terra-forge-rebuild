// TerraFusion OS — ModuleShell
// Wraps sidebar + breadcrumb bar + content area for each module.
// Replaces AppLayout as the main layout component.

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { DesktopWindow } from "./DesktopWindow";
import { SpacesDock } from "./SpacesDock";
import wallpaper from "@/assets/desktop-wallpaper.jpg";
import { SideWindow } from "./SideWindow";
import { OpenBesideMenu } from "./OpenBesideMenu";
import { SplitHandle } from "./SplitHandle";
import { clampSplit, isEmbedMode, loadSplitState, saveSplitState, stripEmbedParam } from "@/lib/splitView";
import { isParcelLinkEnabled, setParcelLinkEnabled, subscribeParcelLinkToggle } from "@/lib/parcelLink";
import { Link2, Link2Off } from "lucide-react";

import { windowTitleFor, loadWindowPrefs, saveWindowPrefs } from "@/lib/desktopWindow";

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
  const [maximized, setMaximized] = useState(() => loadWindowPrefs().maximized);
  const [minimized, setMinimized] = useState(false);
  const { title: windowTitle, subtitle: windowSubtitle } = windowTitleFor(activeModule, activeView);

  useEffect(() => saveWindowPrefs({ maximized }), [maximized]);

  // Side-by-side windows. Inside a side window (embed mode) the shell renders content only.
  const location = useLocation();
  const routerNavigate = useNavigate();
  const embedded = isEmbedMode(location.search);
  const currentPath = stripEmbedParam(location.pathname + location.search + location.hash);
  const [split, setSplit] = useState(() => loadSplitState());
  const splitRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!embedded) saveSplitState(split);
  }, [split, embedded]);
  const openBeside = (path: string) => {
    setMinimized(false);
    setSplit((st) => ({ ...st, path }));
  };
  const closeBeside = () => setSplit((st) => ({ ...st, path: null }));
  const swapWindows = (sidePath: string) => {
    setSplit((st) => ({ ...st, path: currentPath }));
    routerNavigate(sidePath);
  };

  // Parcel link between the two windows: on = both follow one parcel, off = compare two.
  const [parcelLinked, setParcelLinked] = useState(isParcelLinkEnabled);
  useEffect(() => subscribeParcelLinkToggle(setParcelLinked), []);
  const toggleParcelLink = () => {
    const next = !parcelLinked;
    setParcelLinked(next);
    setParcelLinkEnabled(next);
  };

  // Window shortcuts: Ctrl/Cmd+Shift+M minimize/restore, Ctrl/Cmd+Shift+F focus (maximize), Esc restores a hidden window.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && !e.altKey && e.code === "KeyM") {
        e.preventDefault();
        setMinimized((m) => !m);
      } else if (mod && e.shiftKey && !e.altKey && e.code === "KeyF") {
        e.preventDefault();
        setMaximized((m) => !m);
      } else if (e.key === "Escape") {
        setMinimized(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      routerNavigate("/workbench/property", { state: { initialParcel: parcel } });
    },
    [routerNavigate],
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
  const showSplit = !!split.path && !minimized;

  const stage = (
    <>
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
    </>
  );

  // Side-window content: no sidebar, top bar or dock — just the page.
  if (embedded) {
    return (
      <TrustModeProvider>
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background">{stage}</div>
      </TrustModeProvider>
    );
  }

  return (
    <TrustModeProvider>
      <SidebarProvider>
        <div
          className="desktop-wallpaper relative flex h-screen w-full overflow-hidden"
          style={{ backgroundImage: `url(${wallpaper})` }}
        >
          {/* Tahoe Sidebar */}
          <TahoeSidebar onNavigate={handleNavigate} />

          {/* Main content area */}
          <SidebarInset className="relative flex flex-col flex-1 min-w-0 bg-transparent">
            {/* Top system bar */}
            <TopSystemBar
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onOpenControlCenter={() => setControlCenterOpen(true)}
              onOpenMobileNav={() => {
                // SidebarProvider handles mobile toggle via useSidebar().toggleSidebar()
                // This is a no-op; the hamburger in TopSystemBar will be wired to sidebar
              }}
            />

            <div
              ref={splitRef}
              className={showSplit ? (maximized ? "flex flex-1 min-h-0" : "flex flex-1 min-h-0 mx-3 mb-3 mt-2") : "contents"}
            >
              <div
                className={showSplit ? "flex min-h-0 min-w-0" : "contents"}
                style={showSplit ? { flexBasis: `${split.ratio * 100}%` } : undefined}
              >
            <DesktopWindow
              title={windowTitle}
              subtitle={windowSubtitle}
              maximized={maximized}
              minimized={minimized}
              onClose={() => { setMinimized(false); handleNavigate("home"); }}
              onMinimize={() => setMinimized(true)}
              onToggleMaximize={() => setMaximized((m) => !m)}
              flush={showSplit}
              actions={
                <>
                  {showSplit && (
                    <button
                      aria-label={parcelLinked ? "Unlink windows (compare two parcels)" : "Link windows (follow one parcel)"}
                      aria-pressed={parcelLinked}
                      title={parcelLinked ? "Linked: both windows follow one parcel" : "Unlinked: compare two parcels"}
                      onClick={toggleParcelLink}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-1"
                    >
                      {parcelLinked ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
                      {parcelLinked ? "Linked" : "Unlinked"}
                    </button>
                  )}
                  {!split.path && <OpenBesideMenu currentPath={currentPath} onOpen={openBeside} />}
                </>
              }
            >
                {stage}
            </DesktopWindow>
              </div>
              {showSplit && (
                <>
                  <SplitHandle
                    ratio={split.ratio}
                    containerRef={splitRef}
                    onChange={(r) => setSplit((st) => ({ ...st, ratio: clampSplit(r) }))}
                  />
                  <div className="flex min-h-0 min-w-0 flex-1">
                    <SideWindow path={split.path!} onClose={closeBeside} onSwap={swapWindows} />
                  </div>
                </>
              )}
            </div>
            {minimized && <div className="flex-1" aria-hidden />}

            <SpacesDock
              currentTitle={windowSubtitle ?? windowTitle}
              minimized={minimized}
              focused={maximized}
              onRestore={() => setMinimized(false)}
              onToggleFocus={() => setMaximized((m) => !m)}
            />
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

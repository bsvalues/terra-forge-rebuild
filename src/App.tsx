import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkipToContent } from "@/components/SkipToContent";
import { useGlobalErrorHandler } from "@/hooks/useGlobalErrorHandler";
import { ModuleShell } from "@/components/layout/ModuleShell";

// Lazy-loaded non-shell routes
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Property = lazy(() => import("./pages/Property"));
const OwnerPortal = lazy(() => import("./pages/OwnerPortal"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground tracking-wider uppercase">Loading module…</span>
      </div>
    </div>
  );
}

/** Protected ModuleShell wrapper */
function ProtectedShell() {
  return (
    <ProtectedRoute>
      <ErrorBoundary fallbackTitle="TerraForge module failed to load">
        <ModuleShell />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

/** Inner component so hooks work inside providers */
function AppShell() {
  useGlobalErrorHandler();

  return (
    <>
      <SkipToContent />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Auth — no shell */}
            <Route path="/auth" element={<Auth />} />

            {/* Owner portal — no shell */}
            <Route path="/portal" element={<OwnerPortal />} />

            {/* Property deep-link — redirects into workbench */}
            <Route
              path="/property/:parcelId"
              element={
                <ProtectedRoute>
                  <ErrorBoundary fallbackTitle="Property view failed to load">
                    <Property />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* ── Tahoe Shell Routes ──────────────────────────── */}
            {/* Root → redirect to /home */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Home module routes */}
            <Route path="/home" element={<ProtectedShell />} />
            <Route path="/home/:groupSlug" element={<ProtectedShell />} />
            <Route path="/home/:groupSlug/:viewId" element={<ProtectedShell />} />

            {/* Workbench module routes */}
            <Route path="/workbench" element={<ProtectedShell />} />
            <Route path="/workbench/:viewId" element={<ProtectedShell />} />

            {/* Factory module routes */}
            <Route path="/factory" element={<ProtectedShell />} />
            <Route path="/factory/:viewId" element={<ProtectedShell />} />

            {/* Registry module routes */}
            <Route path="/registry" element={<ProtectedShell />} />
            <Route path="/registry/:viewId" element={<ProtectedShell />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <ErrorBoundary fallbackTitle="TerraFusion OS encountered a critical error">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppShell />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

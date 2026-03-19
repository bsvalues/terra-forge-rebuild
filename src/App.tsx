import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkipToContent } from "@/components/SkipToContent";
import { useGlobalErrorHandler } from "@/hooks/useGlobalErrorHandler";

// Lazy-loaded route components for code-splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Property = lazy(() => import("./pages/Property"));
const Factory = lazy(() => import("./pages/Factory"));
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
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ErrorBoundary fallbackTitle="Dashboard failed to load">
                    <Index />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/factory"
              element={
                <ProtectedRoute>
                  <ErrorBoundary fallbackTitle="Factory failed to load">
                    <Factory />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/factory/:mode"
              element={
                <ProtectedRoute>
                  <ErrorBoundary fallbackTitle="Factory failed to load">
                    <Factory />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
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

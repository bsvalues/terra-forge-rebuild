import { useState, useCallback, lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { TopSystemBar } from "@/components/navigation/TopSystemBar";
import { DockLauncher } from "@/components/navigation/DockLauncher";
import { ModuleViewBar } from "@/components/navigation/ModuleViewBar";
import { GlobalCommandPalette } from "@/components/navigation/GlobalCommandPalette";
import { ControlCenter } from "@/components/navigation/ControlCenter";
import { InstallPrompt } from "@/components/navigation/InstallPrompt";
import { MobileNavDrawer } from "@/components/navigation/MobileNavDrawer";
import { TrustModeProvider } from "@/contexts/TrustModeContext";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { resolveLegacyId, type PrimaryModuleId } from "@/config/IA_MAP";
import { logNavAttempt } from "@/lib/constitutionGuards";

// ── Code-split: every route-level module is lazy-loaded ────────────
// Home views
const SuiteHub = lazy(() => import("@/components/dashboard/SuiteHub").then(m => ({ default: m.SuiteHub })));
const IDSCommandCenter = lazy(() => import("@/components/ids/IDSCommandCenter").then(m => ({ default: m.IDSCommandCenter })));
const DataQualityScoringEngine = lazy(() => import("@/components/quality/DataQualityScoringEngine").then(m => ({ default: m.DataQualityScoringEngine })));
const RollReadinessDashboard = lazy(() => import("@/components/certification").then(m => ({ default: m.RollReadinessDashboard })));
const SyncDashboard = lazy(() => import("@/components/sync/SyncDashboard").then(m => ({ default: m.SyncDashboard })));
const GeometryHealthDashboard = lazy(() => import("@/components/geometry").then(m => ({ default: m.GeometryHealthDashboard })));
const BatchNoticeDashboard = lazy(() => import("@/components/dais/BatchNoticeDashboard").then(m => ({ default: m.BatchNoticeDashboard })));
const ExportCenter = lazy(() => import("@/components/exports").then(m => ({ default: m.ExportCenter })));
const WatchlistPanel = lazy(() => import("@/components/watchlist").then(m => ({ default: m.WatchlistPanel })));
const RecentParcelsPanel = lazy(() => import("@/components/recent").then(m => ({ default: m.RecentParcelsPanel })));
const SavedFiltersPanel = lazy(() => import("@/components/filters").then(m => ({ default: m.SavedFiltersPanel })));
const BulkOperationsPanel = lazy(() => import("@/components/bulk").then(m => ({ default: m.BulkOperationsPanel })));
const ReportingDashboard = lazy(() => import("@/components/reporting").then(m => ({ default: m.ReportingDashboard })));
const SchedulerDashboard = lazy(() => import("@/components/scheduler").then(m => ({ default: m.SchedulerDashboard })));
const NotificationCenterPanel = lazy(() => import("@/components/notifications").then(m => ({ default: m.NotificationCenterPanel })));
const DataValidationPanel = lazy(() => import("@/components/validation").then(m => ({ default: m.DataValidationPanel })));
const NeighborhoodDirectoryPanel = lazy(() => import("@/components/neighborhoods").then(m => ({ default: m.NeighborhoodDirectoryPanel })));
const CountyConfigPanel = lazy(() => import("@/components/settings").then(m => ({ default: m.CountyConfigPanel })));
const AppealInsightsDashboard = lazy(() => import("@/components/appeal-insights").then(m => ({ default: m.AppealInsightsDashboard })));
const CountyPipelineHub = lazy(() => import("@/components/slco-pipeline").then(m => ({ default: m.SLCOPipelineHub })));
const SLCODemoLanding = lazy(() => import("@/components/slco-pipeline").then(m => ({ default: m.SLCODemoLanding })));
const WebhookNotificationHub = lazy(() => import("@/components/slco-pipeline").then(m => ({ default: m.WebhookNotificationHub })));
const DataDoctorDashboard = lazy(() => import("@/components/slco-pipeline").then(m => ({ default: m.DataDoctorDashboard })));
const DataOpsPanel = lazy(() => import("@/components/admin/DataOpsPanel").then(m => ({ default: m.DataOpsPanel })));
const RevaluationLaunchPanel = lazy(() => import("@/components/revaluation/RevaluationLaunchPanel").then(m => ({ default: m.RevaluationLaunchPanel })));
const RevaluationProgressTracker = lazy(() => import("@/components/revaluation/RevaluationProgressTracker").then(m => ({ default: m.RevaluationProgressTracker })));
const RevaluationReportDashboard = lazy(() => import("@/components/revaluation/RevaluationReportDashboard").then(m => ({ default: m.RevaluationReportDashboard })));
const RevaluationNoticeGenerator = lazy(() => import("@/components/revaluation/RevaluationNoticeGenerator").then(m => ({ default: m.RevaluationNoticeGenerator })));
const NeighborhoodReviewOrchestrator = lazy(() => import("@/components/review").then(m => ({ default: m.NeighborhoodReviewOrchestrator })));
const AppealRiskDashboard = lazy(() => import("@/components/appeal-risk").then(m => ({ default: m.AppealRiskDashboard })));
const ComparativeDashboard = lazy(() => import("@/components/comparative").then(m => ({ default: m.ComparativeDashboard })));
const OwnerPortal = lazy(() => import("@/components/owner-portal").then(m => ({ default: m.OwnerPortal })));
const IAAOComplianceDashboard = lazy(() => import("@/components/iaao").then(m => ({ default: m.IAAOComplianceDashboard })));

// Workbench views
const PropertyWorkbench = lazy(() => import("@/components/workbench").then(m => ({ default: m.PropertyWorkbench })));
const FieldStudioDashboard = lazy(() => import("@/components/field").then(m => ({ default: m.FieldStudioDashboard })));
const ParcelComparisonPanel = lazy(() => import("@/components/comparison").then(m => ({ default: m.ParcelComparisonPanel })));

// Factory views
const FactoryLayout = lazy(() => import("@/components/factory/FactoryLayout").then(m => ({ default: m.FactoryLayout })));
const VEIDashboard = lazy(() => import("@/components/vei/VEIDashboard").then(m => ({ default: m.VEIDashboard })));
const GeoEquityDashboard = lazy(() => import("@/components/geoequity/GeoEquityDashboard").then(m => ({ default: m.GeoEquityDashboard })));
const AnalyticsDashboard = lazy(() => import("@/components/analytics/AnalyticsDashboard").then(m => ({ default: m.AnalyticsDashboard })));
const AdvancedAnalyticsDashboard = lazy(() => import("@/components/analytics/AdvancedAnalyticsDashboard").then(m => ({ default: m.AdvancedAnalyticsDashboard })));
const AVMStudioDashboard = lazy(() => import("@/components/avm/AVMStudioDashboard").then(m => ({ default: m.AVMStudioDashboard })));
const SegmentRevaluationDashboard = lazy(() => import("@/components/revaluation/SegmentRevaluationDashboard").then(m => ({ default: m.SegmentRevaluationDashboard })));
// Registry views
const TrustRegistryPage = lazy(() => import("@/components/trust").then(m => ({ default: m.TrustRegistryPage })));
const ValueAdjustmentLedger = lazy(() => import("@/components/ledger").then(m => ({ default: m.ValueAdjustmentLedger })));
const DataCatalogPanel = lazy(() => import("@/components/catalog").then(m => ({ default: m.DataCatalogPanel })));
const ModelRegistryPanel = lazy(() => import("@/components/models").then(m => ({ default: m.ModelRegistryPanel })));
const AuditTimeline = lazy(() => import("@/components/workbench/AuditTimeline").then(m => ({ default: m.AuditTimeline })));
const AxiomFSDashboard = lazy(() => import("@/components/axiomfs/AxiomFSDashboard").then(m => ({ default: m.AxiomFSDashboard })));

// PACS views
const QualityGateDashboard = lazy(() => import("@/components/pacs/QualityGateDashboard").then(m => ({ default: m.QualityGateDashboard })));
const ParcelDossierPACS = lazy(() => import("@/components/pacs/ParcelDossierPACS").then(m => ({ default: m.ParcelDossierPACS })));
const NeighborhoodRollupDashboard = lazy(() => import("@/components/pacs/NeighborhoodRollupDashboard").then(m => ({ default: m.NeighborhoodRollupDashboard })));
const ReconciliationDashboard = lazy(() => import("@/components/pacs/ReconciliationDashboard").then(m => ({ default: m.ReconciliationDashboard })));
const PacsAnalyticsDashboard = lazy(() => import("@/components/pacs/PacsAnalyticsDashboard").then(m => ({ default: m.PacsAnalyticsDashboard })));
const ValueChangeDashboard = lazy(() => import("@/components/assessment/ValueChangeDashboard").then(m => ({ default: m.ValueChangeDashboard })));

// ── Loading fallback ───────────────────────────────────────────────
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

interface AppLayoutProps {
  initialParcel?: {
    id: string;
    parcelNumber: string;
    address: string;
    assessedValue: number;
  } | null;
  initialModule?: string;
  initialFactoryMode?: string;
}

export function AppLayout({ initialParcel: routeParcel, initialModule, initialFactoryMode }: AppLayoutProps) {
  // Resolve legacy module IDs to the new 4-module structure
  const resolvedInitial = initialModule ? resolveLegacyId(initialModule) : null;

  const [activeModule, setActiveModule] = useState<PrimaryModuleId>(
    (resolvedInitial?.module as PrimaryModuleId) || "home"
  );
  const [activeView, setActiveView] = useState<string | null>(
    resolvedInitial?.view || null
  );

  useRealtimeNotifications();

  const [pendingParcel, setPendingParcel] = useState<{
    id: string;
    parcelNumber: string;
    address: string;
    assessedValue: number;
  } | null>(routeParcel ?? null);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [pendingSubTab, setPendingSubTab] = useState<string | null>(null);
  const [pendingIdsPillar, setPendingIdsPillar] = useState<string | null>(null);
  const [pendingIdsJobId, setPendingIdsJobId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleNavigate = useCallback((target: string) => {
    // Log every navigation attempt for Constitution Gate #3 Health Panel
    logNavAttempt(target);

    if (target.includes(":")) {
      const parts = target.split(":");
      const firstPart = parts[0];

      // workbench:tab:subtab deep-link
      if (firstPart === "workbench") {
        // If second part is a workbench suite tab (forge/atlas/dais/dossier/pilot)
        // route to property view with pending tab
        const suiteTab = parts[1];
        if (["forge", "atlas", "dais", "dossier", "pilot"].includes(suiteTab)) {
          setPendingTab(suiteTab);
          setPendingSubTab(parts[2] ?? null);
          setActiveModule("workbench");
          setActiveView("property");
          return;
        }
        // workbench:field
        if (suiteTab === "field") {
          setActiveModule("workbench");
          setActiveView("field");
          return;
        }
        // workbench:property
        setActiveModule("workbench");
        setActiveView("property");
        return;
      }

      // home:view deep-link
      if (firstPart === "home") {
        setActiveModule("home");
        setActiveView(parts[1] || null);
        return;
      }

      // ids:pillar:jobId (legacy — redirect to home:ids)
      if (firstPart === "ids") {
        setPendingIdsPillar(parts[1] ?? null);
        setPendingIdsJobId(parts[2] ?? null);
        setActiveModule("home");
        setActiveView("ids");
        return;
      }

      // factory:view
      if (firstPart === "factory") {
        setActiveModule("factory");
        setActiveView(parts[1] || null);
        return;
      }

      // registry:view
      if (firstPart === "registry") {
        setActiveModule("registry");
        setActiveView(parts[1] || null);
        return;
      }

      // Legacy compound format — resolve through IA_MAP
      const resolved = resolveLegacyId(firstPart);
      if (resolved) {
        setActiveModule(resolved.module);
        setActiveView(parts[1] || resolved.view || null);
      } else {
        setActiveModule(firstPart as PrimaryModuleId);
        setActiveView(parts[1] || null);
      }
      return;
    }

    // Simple targets — resolve through IA_MAP
    const resolved = resolveLegacyId(target);
    if (resolved) {
      setActiveModule(resolved.module);
      setActiveView(resolved.view || null);
    } else {
      setActiveModule(target as PrimaryModuleId);
      setActiveView(null);
    }
  }, []);

  const handleModuleChange = useCallback((moduleId: string) => {
    if (moduleId.includes(":")) {
      handleNavigate(moduleId);
      return;
    }
    setActiveModule(moduleId as PrimaryModuleId);
    setActiveView(null);
  }, [handleNavigate]);

  const handleViewChange = useCallback((viewId: string) => {
    setActiveView(viewId);
  }, []);

  const handleParcelNavigate = useCallback(
    (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => {
      setPendingParcel(parcel);
      setActiveModule("workbench");
      setActiveView("property");
    },
    []
  );

  const renderStage = () => {
    const view = activeView;

    switch (activeModule) {
      // ── HOME: County Cockpit ──────────────────────────────────
      case "home":
        switch (view) {
          case "ids":
            return (
              <IDSCommandCenter
                initialPillar={pendingIdsPillar}
                onPillarConsumed={() => setPendingIdsPillar(null)}
                highlightJobId={pendingIdsJobId}
                onJobIdConsumed={() => setPendingIdsJobId(null)}
              />
            );
          case "quality":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <DataQualityScoringEngine />
              </div>
            );
          case "readiness":
            return (
              <div className="p-6 max-w-5xl mx-auto">
                <RollReadinessDashboard />
              </div>
            );
          case "geometry":
            return <GeometryHealthDashboard />;
          case "notices":
            return <BatchNoticeDashboard />;
          case "exports":
            return <ExportCenter />;
          case "watchlist":
            return <WatchlistPanel onNavigateToParcel={handleParcelNavigate} />;
          case "recents":
            return <RecentParcelsPanel onNavigateToParcel={handleParcelNavigate} />;
          case "smart-views":
            return <SavedFiltersPanel />;
          case "bulk-ops":
            return <BulkOperationsPanel />;
          case "reports":
            return <ReportingDashboard />;
          case "scheduler":
            return <SchedulerDashboard />;
          case "activity":
            return <NotificationCenterPanel />;
          case "validation":
            return <DataValidationPanel />;
          case "neighborhoods":
            return <NeighborhoodDirectoryPanel />;
          case "nbhd-rollup":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <NeighborhoodRollupDashboard />
              </div>
            );
          case "appeal-insights":
            return <AppealInsightsDashboard />;
          case "county-pipeline":
          case "slco-pipeline":
            return <CountyPipelineHub />;
          case "slco-demo":
            return <SLCODemoLanding onNavigate={handleNavigate} />;
          case "data-doctor":
            return <DataDoctorDashboard />;
          case "launch-reval":
            return <RevaluationLaunchPanel />;
          case "reval-progress":
            return <RevaluationProgressTracker onNavigate={handleNavigate} />;
          case "reval-report":
            return <RevaluationReportDashboard onNavigate={handleNavigate} />;
          case "reval-notices":
            return <RevaluationNoticeGenerator onNavigate={handleNavigate} />;
          case "nbhd-review":
            return <NeighborhoodReviewOrchestrator />;
          case "appeal-risk":
            return <AppealRiskDashboard />;
          case "comparative":
            return <ComparativeDashboard />;
          case "owner-portal":
            return <OwnerPortal />;
          case "webhooks":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <WebhookNotificationHub />
              </div>
            );
          case "settings":
            return <CountyConfigPanel />;
          case "data-ops":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <DataOpsPanel />
              </div>
            );
          case "pacs-quality-gates":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <QualityGateDashboard />
              </div>
            );
          case "reconciliation":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <ReconciliationDashboard />
              </div>
            );
          case "pacs-analytics":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <PacsAnalyticsDashboard />
              </div>
            );
          case "value-change":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <ValueChangeDashboard />
              </div>
            );
          case "sync":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <SyncDashboard />
              </div>
            );
          default:
            return <SuiteHub onNavigate={handleNavigate} />;
        }

      // ── WORKBENCH: Parcel 360 ────────────────────────────────
      case "workbench":
        if (view === "pacs-dossier") {
          return (
            <div className="p-6 max-w-7xl mx-auto">
              <ParcelDossierPACS parcelId={pendingParcel?.id ?? null} />
            </div>
          );
        }
        if (view === "field") {
          return <FieldStudioDashboard />;
        }
        if (view === "compare") {
          return <ParcelComparisonPanel />;
        }
        return (
          <PropertyWorkbench
            initialParcel={pendingParcel}
            onParcelConsumed={() => setPendingParcel(null)}
            initialTab={pendingTab}
            onTabConsumed={() => setPendingTab(null)}
            initialSubTab={pendingSubTab}
            onSubTabConsumed={() => setPendingSubTab(null)}
          />
        );

      // ── FACTORY: Mass Appraisal ──────────────────────────────
      case "factory":
        switch (view) {
          case "vei":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <VEIDashboard />
              </div>
            );
          case "geoequity":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <GeoEquityDashboard onNavigateToWorkbench={handleParcelNavigate} />
              </div>
            );
          case "avm":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <AVMStudioDashboard />
              </div>
            );
          case "analytics":
            return <AnalyticsDashboard />;
          case "advanced-analytics":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <AdvancedAnalyticsDashboard />
              </div>
            );
          case "segments":
            return (
              <div className="p-6 max-w-7xl mx-auto">
                <SegmentRevaluationDashboard />
              </div>
            );
          case "iaao-compliance":
            return (
              <IAAOComplianceDashboard />
            );
          default:
            // "calibration" or null → FactoryLayout
            return <FactoryLayout initialMode={initialFactoryMode} />;
        }

      // ── REGISTRY: Governance Spine ───────────────────────────
      case "registry":
        if (view === "ledger") {
          return <ValueAdjustmentLedger />;
        }
        if (view === "catalog") {
          return <DataCatalogPanel />;
        }
        if (view === "models") {
          return <ModelRegistryPanel />;
        }
        if (view === "audit-chain") {
          return (
            <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-10rem)]">
              <AuditTimeline />
            </div>
          );
        }
        if (view === "axiomfs") {
          return <AxiomFSDashboard />;
        }
        return (
          <div className="p-0">
            <TrustRegistryPage onNavigate={handleNavigate} />
          </div>
        );

      default:
        return <SuiteHub onNavigate={handleNavigate} onParcelNavigate={handleParcelNavigate} />;
    }
  };

  return (
    <TrustModeProvider>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        <TopSystemBar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenControlCenter={() => setControlCenterOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <ModuleViewBar
          moduleId={activeModule}
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        <main id="main-content" role="main" className="flex-1 overflow-auto pb-20 sm:pb-16">
          <ErrorBoundary fallbackTitle={`${activeModule} module encountered an error`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeModule}-${activeView}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Suspense fallback={<StageFallback />}>
                  {renderStage()}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>

        <DockLauncher activeModule={activeModule} onModuleChange={handleModuleChange} />

        <InstallPrompt />

        <MobileNavDrawer
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
        />

        <GlobalCommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          activeModule={activeModule}
          onModuleChange={handleNavigate}
          onNavigateToParcel={handleParcelNavigate}
        />

        <ControlCenter open={controlCenterOpen} onOpenChange={setControlCenterOpen} />
      </div>
    </TrustModeProvider>
  );
}

// TerraFusion OS — View Component Map
// Maps viewId → lazy-loaded component. Extracted from AppLayout's renderStage().
// This is consumed by ViewRenderer to render the correct component for a URL.

import { lazy, type LazyExoticComponent, type ComponentType } from "react";

// ── Lazy component imports ────────────────────────────────────────

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
const DataDoctorDashboard = lazy(() => import("@/components/slco-pipeline").then(m => ({ default: m.DataDoctorDashboard })));
const WebhookNotificationHub = lazy(() => import("@/components/slco-pipeline").then(m => ({ default: m.WebhookNotificationHub })));
const DataOpsPanel = lazy(() => import("@/components/admin/DataOpsPanel").then(m => ({ default: m.DataOpsPanel })));
const RevaluationLaunchPanel = lazy(() => import("@/components/revaluation/RevaluationLaunchPanel").then(m => ({ default: m.RevaluationLaunchPanel })));
const RevaluationProgressTracker = lazy(() => import("@/components/revaluation/RevaluationProgressTracker").then(m => ({ default: m.RevaluationProgressTracker })));
const RevaluationReportDashboard = lazy(() => import("@/components/revaluation/RevaluationReportDashboard").then(m => ({ default: m.RevaluationReportDashboard })));
const RevaluationNoticeGenerator = lazy(() => import("@/components/revaluation/RevaluationNoticeGenerator").then(m => ({ default: m.RevaluationNoticeGenerator })));
const NeighborhoodReviewOrchestrator = lazy(() => import("@/components/review").then(m => ({ default: m.NeighborhoodReviewOrchestrator })));
const AppealRiskDashboard = lazy(() => import("@/components/appeal-risk").then(m => ({ default: m.AppealRiskDashboard })));
const NeighborhoodRollupDashboard = lazy(() => import("@/components/pacs/NeighborhoodRollupDashboard").then(m => ({ default: m.NeighborhoodRollupDashboard })));
const QualityGateDashboard = lazy(() => import("@/components/pacs/QualityGateDashboard").then(m => ({ default: m.QualityGateDashboard })));
const ReconciliationDashboard = lazy(() => import("@/components/pacs/ReconciliationDashboard").then(m => ({ default: m.ReconciliationDashboard })));
const PacsAnalyticsDashboard = lazy(() => import("@/components/pacs/PacsAnalyticsDashboard").then(m => ({ default: m.PacsAnalyticsDashboard })));
const ValueChangeDashboard = lazy(() => import("@/components/assessment/ValueChangeDashboard").then(m => ({ default: m.ValueChangeDashboard })));
const SalesRatioStudy = lazy(() => import("@/components/analytics/SalesRatioStudy").then(m => ({ default: m.SalesRatioStudy })));
const ExemptionAnalysis = lazy(() => import("@/components/assessment/ExemptionAnalysis").then(m => ({ default: m.ExemptionAnalysis })));
const SchemaDiffPanel = lazy(() => import("@/components/analytics/SchemaDiffPanel").then(m => ({ default: m.SchemaDiffPanel })));
const CountyCompatibilityScore = lazy(() => import("@/components/analytics/CountyCompatibilityScore").then(m => ({ default: m.CountyCompatibilityScore })));
const CountyOnboardingWizard = lazy(() => import("@/components/admin/CountyOnboardingWizard").then(m => ({ default: m.CountyOnboardingWizard })));
const CrossCountyBenchmarks = lazy(() => import("@/components/analytics/CrossCountyBenchmarks").then(m => ({ default: m.CrossCountyBenchmarks })));
const IngestAuditLog = lazy(() => import("@/components/analytics/IngestAuditLog").then(m => ({ default: m.IngestAuditLog })));
const CountyReadinessReport = lazy(() => import("@/components/analytics/CountyReadinessReport").then(m => ({ default: m.CountyReadinessReport })));

// Workbench views
const PropertyWorkbench = lazy(() => import("@/components/workbench").then(m => ({ default: m.PropertyWorkbench })));
const ParcelDossierPACS = lazy(() => import("@/components/pacs/ParcelDossierPACS").then(m => ({ default: m.ParcelDossierPACS })));
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
const IAAOComplianceDashboard = lazy(() => import("@/components/iaao").then(m => ({ default: m.IAAOComplianceDashboard })));

// Registry views
const TrustRegistryPage = lazy(() => import("@/components/trust").then(m => ({ default: m.TrustRegistryPage })));
const ValueAdjustmentLedger = lazy(() => import("@/components/ledger").then(m => ({ default: m.ValueAdjustmentLedger })));
const DataCatalogPanel = lazy(() => import("@/components/catalog").then(m => ({ default: m.DataCatalogPanel })));
const ModelRegistryPanel = lazy(() => import("@/components/models").then(m => ({ default: m.ModelRegistryPanel })));
const AuditTimeline = lazy(() => import("@/components/workbench/AuditTimeline").then(m => ({ default: m.AuditTimeline })));
const AxiomFSDashboard = lazy(() => import("@/components/axiomfs/AxiomFSDashboard").then(m => ({ default: m.AxiomFSDashboard })));

// ── Component Map ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViewComponent = LazyExoticComponent<ComponentType<any>>;

export interface ViewEntry {
  component: ViewComponent;
  /** Optional wrapper className (replaces the inline div wrappers from AppLayout) */
  wrapperClass?: string;
}

/**
 * Maps "moduleId:viewId" → ViewEntry.
 * The default/landing view for each module uses "moduleId:_default".
 */
export const VIEW_COMPONENT_MAP: Record<string, ViewEntry> = {
  // ── Home module ─────────────────────────────────────────────
  "home:_default": { component: SuiteHub },
  "home:dashboard": { component: SuiteHub },
  "home:ids": { component: IDSCommandCenter },
  "home:quality": { component: DataQualityScoringEngine, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:readiness": { component: RollReadinessDashboard, wrapperClass: "p-6 max-w-5xl mx-auto" },
  "home:geometry": { component: GeometryHealthDashboard },
  "home:sync": { component: SyncDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:notices": { component: BatchNoticeDashboard },
  "home:exports": { component: ExportCenter },
  "home:watchlist": { component: WatchlistPanel },
  "home:recents": { component: RecentParcelsPanel },
  "home:smart-views": { component: SavedFiltersPanel },
  "home:bulk-ops": { component: BulkOperationsPanel },
  "home:reports": { component: ReportingDashboard },
  "home:scheduler": { component: SchedulerDashboard },
  "home:activity": { component: NotificationCenterPanel },
  "home:validation": { component: DataValidationPanel },
  "home:neighborhoods": { component: NeighborhoodDirectoryPanel },
  "home:nbhd-rollup": { component: NeighborhoodRollupDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:appeal-insights": { component: AppealInsightsDashboard },
  "home:appeal-risk": { component: AppealRiskDashboard },
  "home:nbhd-review": { component: NeighborhoodReviewOrchestrator },
  "home:county-pipeline": { component: CountyPipelineHub },
  "home:data-doctor": { component: DataDoctorDashboard },
  "home:webhooks": { component: WebhookNotificationHub, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:settings": { component: CountyConfigPanel },
  "home:data-ops": { component: DataOpsPanel, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:launch-reval": { component: RevaluationLaunchPanel },
  "home:reval-progress": { component: RevaluationProgressTracker },
  "home:reval-report": { component: RevaluationReportDashboard },
  "home:reval-notices": { component: RevaluationNoticeGenerator },
  "home:pacs-quality-gates": { component: QualityGateDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:reconciliation": { component: ReconciliationDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:pacs-analytics": { component: PacsAnalyticsDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:value-change": { component: ValueChangeDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:ratio-study": { component: SalesRatioStudy, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:exemption-analysis": { component: ExemptionAnalysis, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:schema-diff": { component: SchemaDiffPanel, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:county-compatibility": { component: CountyCompatibilityScore, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:county-onboarding": { component: CountyOnboardingWizard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:county-benchmarks": { component: CrossCountyBenchmarks, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:ingest-audit": { component: IngestAuditLog, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "home:county-readiness": { component: CountyReadinessReport, wrapperClass: "p-6 max-w-7xl mx-auto" },

  // ── Workbench module ────────────────────────────────────────
  "workbench:_default": { component: PropertyWorkbench },
  "workbench:property": { component: PropertyWorkbench },
  "workbench:pacs-dossier": { component: ParcelDossierPACS, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "workbench:field": { component: FieldStudioDashboard },
  "workbench:compare": { component: ParcelComparisonPanel },

  // ── Factory module ──────────────────────────────────────────
  "factory:_default": { component: FactoryLayout },
  "factory:calibration": { component: FactoryLayout },
  "factory:vei": { component: VEIDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "factory:geoequity": { component: GeoEquityDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "factory:avm": { component: AVMStudioDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "factory:analytics": { component: AnalyticsDashboard },
  "factory:advanced-analytics": { component: AdvancedAnalyticsDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "factory:segments": { component: SegmentRevaluationDashboard, wrapperClass: "p-6 max-w-7xl mx-auto" },
  "factory:iaao-compliance": { component: IAAOComplianceDashboard },

  // ── Registry module ─────────────────────────────────────────
  "registry:_default": { component: TrustRegistryPage },
  "registry:trust": { component: TrustRegistryPage },
  "registry:audit-chain": { component: AuditTimeline, wrapperClass: "p-6 max-w-5xl mx-auto h-[calc(100vh-10rem)]" },
  "registry:ledger": { component: ValueAdjustmentLedger },
  "registry:catalog": { component: DataCatalogPanel },
  "registry:models": { component: ModelRegistryPanel },
  "registry:axiomfs": { component: AxiomFSDashboard },
};

/** Look up a view component. Returns the default for the module if viewId is null. */
export function getViewEntry(moduleId: string, viewId: string | null): ViewEntry | null {
  const key = viewId ? `${moduleId}:${viewId}` : `${moduleId}:_default`;
  return VIEW_COMPONENT_MAP[key] ?? VIEW_COMPONENT_MAP[`${moduleId}:_default`] ?? null;
}

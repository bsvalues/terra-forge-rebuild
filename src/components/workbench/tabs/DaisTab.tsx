import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileCheck, Scale, Bell, ClipboardCheck, ExternalLink } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AppealsWorkflow } from "@/components/dais/AppealsWorkflow";
import { AppealRiskDashboard } from "@/components/dais/AppealRiskDashboard";
import { PermitsWorkflow } from "@/components/dais/PermitsWorkflow";
import { ExemptionsWorkflow } from "@/components/dais/ExemptionsWorkflow";
import { ExemptionEligibilityChecker } from "@/components/dais/ExemptionEligibilityChecker";
import { CertificationPipeline } from "@/components/dais/CertificationPipeline";
import { NoticesPanel } from "@/components/dais/NoticesPanel";
import { BatchNoticeStatusDashboard } from "@/components/dais/BatchNoticeStatusDashboard";
import { DQRemediationProgressTracker } from "@/components/dais/DQRemediationProgressTracker";
import { NeighborhoodCertificationWorkflow } from "@/components/dais/NeighborhoodCertificationWorkflow";
import { PermitImpactEstimator } from "@/components/dais/PermitImpactEstimator";
import { MultiParcelBatchExport } from "@/components/dais/MultiParcelBatchExport";
import { AppealOutcomePredictor } from "@/components/dais/AppealOutcomePredictor";
import { OwnerCommunicationLog } from "@/components/dais/OwnerCommunicationLog";
import { RollChangeSummary } from "@/components/dais/RollChangeSummary";
import { PropertyInspectionScheduler } from "@/components/dais/PropertyInspectionScheduler";
import { TaxLevyImpactCalculator } from "@/components/dais/TaxLevyImpactCalculator";
import { WorkflowTemplateCRUD } from "@/components/admin/WorkflowTemplateCRUD";
import { BulkAssessmentExport } from "@/components/valuation/BulkAssessmentExport";
import { WorkflowAutomationRules } from "@/components/dais/WorkflowAutomationRules";
import { BatchWorkflowExecutor } from "@/components/dais/BatchWorkflowExecutor";
import { WorkToolBar } from "@/components/navigation/WorkToolBar";
import { useWorkspaceTool } from "@/hooks/useWorkspaceTool";
import { useWorkbench } from "../WorkbenchContext";
import { PermitsPanel } from "../PermitsPanel";
import { ExemptionsPanel } from "../ExemptionsPanel";
import { Button } from "@/components/ui/button";
import { AssessmentCalendar } from "@/components/dais/AssessmentCalendar";


interface DaisTabProps {
  initialCategory?: string | null;
  onCategoryConsumed?: () => void;
}

export function DaisTab({ initialCategory, onCategoryConsumed }: DaisTabProps) {
  const [activeCategory, setActiveCategory] = useWorkspaceTool("adminTool", ["appeals", "permits", "exemptions", "notices", "certification", "templates", "export", "dq-remediation", "automation", "batch", "calendar"], "permits");
  const { parcel } = useWorkbench();

  const navigate = useNavigate();

  // Handle deep-linked category
  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
      onCategoryConsumed?.();
    }
  }, [initialCategory, onCategoryConsumed]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Permits & appeals</h2><Button variant="outline" size="sm" onClick={() => navigate("/home/readiness")}>County roll readiness<ExternalLink className="ml-2 h-3 w-3" /></Button></div>
      <WorkToolBar active={activeCategory} onSelect={setActiveCategory} primary={["permits", "exemptions", "appeals", "notices"]} tools={[
        {id:"permits",label:"Permits",icon:FileCheck}, {id:"exemptions",label:"Exemptions",icon:ClipboardCheck}, {id:"appeals",label:"Appeals",icon:Scale}, {id:"notices",label:"Notices",icon:Bell},
        {id:"certification",label:"Certification",group:"County operations"}, {id:"calendar",label:"Calendar",group:"County operations"}, {id:"export",label:"Export",group:"County operations"}, {id:"batch",label:"Batch workflows",group:"County operations"}, {id:"dq-remediation",label:"Data remediation",group:"County operations"}, {id:"templates",label:"Workflow templates",group:"Configuration"}, {id:"automation",label:"Automation rules",group:"Configuration"}
      ]} />
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-4">
        <TabsContent value="permits" className="mt-0 space-y-4">
          <PermitsPanel parcelId={parcel.id} />
          <details><summary className="cursor-pointer text-sm font-medium">Permit workflows and inspections</summary><div className="mt-4 space-y-4"><PermitsWorkflow /><PermitImpactEstimator /><PropertyInspectionScheduler /></div></details>
        </TabsContent>

        <TabsContent value="exemptions" className="mt-0 space-y-4">
          <ExemptionsPanel parcelId={parcel.id} />
          <details><summary className="cursor-pointer text-sm font-medium">Exemption decisions</summary><div className="mt-4 space-y-4"><ExemptionsWorkflow /><ExemptionEligibilityChecker /></div></details>
        </TabsContent>

        <TabsContent value="appeals" className="mt-0 space-y-4">
          <AppealsWorkflow />
          <details><summary className="cursor-pointer text-sm font-medium">Appeal analysis</summary><div className="mt-4 space-y-4"><AppealRiskDashboard /><AppealOutcomePredictor /></div></details>
        </TabsContent>

        <TabsContent value="notices" className="mt-0 space-y-4">
          <NoticesPanel />
          <details><summary className="cursor-pointer text-sm font-medium">Notice tracking and communication</summary><div className="mt-4 space-y-4"><BatchNoticeStatusDashboard /><OwnerCommunicationLog /></div></details>
        </TabsContent>

        <TabsContent value="certification" className="mt-0 space-y-4">
          <CertificationPipeline />
          <NeighborhoodCertificationWorkflow />
          <RollChangeSummary />
          <TaxLevyImpactCalculator />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <WorkflowTemplateCRUD />
        </TabsContent>

        <TabsContent value="export" className="mt-0 space-y-4">
          <div className="p-4">
            <BulkAssessmentExport />
          </div>
          <div className="p-4">
            <MultiParcelBatchExport />
          </div>
        </TabsContent>

        <TabsContent value="dq-remediation" className="mt-0">
          <div className="p-4">
            <DQRemediationProgressTracker />
          </div>
        </TabsContent>

        <TabsContent value="automation" className="mt-0">
          <div className="p-4">
            <WorkflowAutomationRules />
          </div>
        </TabsContent>

        <TabsContent value="batch" className="mt-0">
          <div className="p-4">
            <BatchWorkflowExecutor />
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <div className="p-4">
            <AssessmentCalendar />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// TerraFusion OS — Phase 82.2: Workflow Engine
// State machine for template-driven workflow execution.
// Wraps SagaOrchestrator with DB persistence, TerraTrace emission, and TerraPilot tool hooks.

import { supabase } from "@/integrations/supabase/client";
import { SagaOrchestrator, type StepHandler, type SagaExecutionResult } from "./sagaOrchestrator";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowStatus = "pending" | "active" | "paused" | "completed" | "failed" | "cancelled";
export type WorkflowStepStatus = "pending" | "active" | "completed" | "skipped" | "failed";

export interface WorkflowStep {
  step_id: string;
  title: string;
  description?: string;
  required_role?: "admin" | "analyst" | "viewer";
  auto_action?: string; // TerraPilot tool name to auto-trigger
  depends_on?: string[]; // step_ids that must be completed first
}

export interface WorkflowTemplate {
  id: string;
  county_id: string | null;
  name: string;
  workflow_type: string;
  steps: WorkflowStep[];
  created_by: string | null;
  created_at: string;
}

export interface WorkflowInstance {
  id: string;
  template_id: string;
  county_id: string;
  status: WorkflowStatus;
  context: Record<string, unknown>;
  current_step: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface WorkflowStepTransition {
  instance_id: string;
  step_id: string;
  from_status: WorkflowStepStatus;
  to_status: WorkflowStepStatus;
  actor_id: string;
  timestamp: string;
  notes?: string;
}

// ─── Built-in Templates ───────────────────────────────────────────────────────

export const BUILT_IN_TEMPLATES: Omit<WorkflowTemplate, "id" | "created_at">[] = [
  {
    county_id: null,
    name: "Revaluation Cycle",
    workflow_type: "revaluation",
    created_by: null,
    steps: [
      {
        step_id: "data_prep",
        title: "Data Preparation",
        description: "Verify parcel data quality, run DQ diagnosis, resolve blockers",
        required_role: "analyst",
        auto_action: "run_dq_check",
      },
      {
        step_id: "sales_analysis",
        title: "Sales Analysis",
        description: "Import qualified sales, compute time-trend adjustments",
        required_role: "analyst",
        auto_action: "analyze_sales",
        depends_on: ["data_prep"],
      },
      {
        step_id: "model_calibration",
        title: "Model Calibration",
        description: "Train AVM, review COD/PRD statistics, apply for >70% R²",
        required_role: "analyst",
        auto_action: "run_avm",
        depends_on: ["sales_analysis"],
      },
      {
        step_id: "neighborhood_review",
        title: "Neighborhood Review",
        description: "Review values by neighborhood, apply adjustments",
        required_role: "analyst",
        depends_on: ["model_calibration"],
      },
      {
        step_id: "certification",
        title: "Certification",
        description: "Admin certifies final roll — all values locked",
        required_role: "admin",
        auto_action: "certify_roll",
        depends_on: ["neighborhood_review"],
      },
    ],
  },
  {
    county_id: null,
    name: "Appeal Defense",
    workflow_type: "appeal_defense",
    created_by: null,
    steps: [
      {
        step_id: "intake",
        title: "Appeal Intake",
        description: "Receive and log appeal, assign reviewer",
        required_role: "analyst",
      },
      {
        step_id: "evidence_gathering",
        title: "Evidence Gathering",
        description: "Pull comps, build defense narrative, attach photos",
        required_role: "analyst",
        auto_action: "build_defense_narrative",
        depends_on: ["intake"],
      },
      {
        step_id: "hearing_prep",
        title: "Hearing Preparation",
        description: "Review value position, prepare exhibits",
        required_role: "analyst",
        depends_on: ["evidence_gathering"],
      },
      {
        step_id: "hearing",
        title: "Hearing / Decision",
        description: "Conduct hearing, record board decision",
        required_role: "analyst",
        depends_on: ["hearing_prep"],
      },
      {
        step_id: "update_roll",
        title: "Roll Update",
        description: "Apply any mandated value change per board decision",
        required_role: "admin",
        depends_on: ["hearing"],
      },
    ],
  },
  {
    county_id: null,
    name: "Exemption Review",
    workflow_type: "exemption_review",
    created_by: null,
    steps: [
      {
        step_id: "application_review",
        title: "Application Review",
        description: "Verify eligibility criteria for submitted exemption",
        required_role: "analyst",
        auto_action: "check_exemption_eligibility",
      },
      {
        step_id: "site_inspection",
        title: "Site Inspection",
        description: "Schedule field visit if required",
        required_role: "analyst",
        depends_on: ["application_review"],
      },
      {
        step_id: "determination",
        title: "Determination",
        description: "Approve or deny exemption application",
        required_role: "analyst",
        depends_on: ["site_inspection"],
      },
      {
        step_id: "notification",
        title: "Owner Notification",
        description: "Send determination letter to property owner",
        required_role: "analyst",
        auto_action: "draft_notice",
        depends_on: ["determination"],
      },
    ],
  },
];

// ─── WorkflowEngine ───────────────────────────────────────────────────────────

export class WorkflowEngine {
  private countyId: string;
  private userId: string;

  constructor(countyId: string, userId: string) {
    this.countyId = countyId;
    this.userId = userId;
  }

  // ── Emit TerraTrace event via DB ──
  private async emitTrace(
    eventType: string,
    eventData: Record<string, unknown>,
    correlationId?: string
  ) {
    await (supabase as any)
      .from("trace_events")
      .insert({
        county_id: this.countyId,
        actor_id: this.userId,
        source_module: "workflow",
        event_type: eventType,
        event_data: eventData,
        ...(correlationId ? { correlation_id: correlationId } : {}),
      });
  }

  // ── Get or create a workflow instance ──
  async createInstance(
    templateId: string,
    assignedTo?: string,
    context?: Record<string, unknown>
  ): Promise<WorkflowInstance | null> {
    const { data, error } = await (supabase as any)
      .from("workflow_instances")
      .insert({
        template_id: templateId,
        county_id: this.countyId,
        status: "active",
        assigned_to: assignedTo ?? this.userId,
        context: context ?? {},
        current_step: null,
      })
      .select()
      .single();

    if (error || !data) return null;

    await this.emitTrace("workflow_started", {
      instance_id: data.id,
      template_id: templateId,
      assigned_to: assignedTo ?? this.userId,
    }, data.id);

    return data as WorkflowInstance;
  }

  // ── Advance to the next step ──
  async advanceStep(
    instanceId: string,
    toStepId: string,
    notes?: string
  ): Promise<boolean> {
    // Read current instance
    const { data: inst } = await (supabase as any)
      .from("workflow_instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (!inst) return false;

    const prevStep = inst.current_step;

    const { error } = await (supabase as any)
      .from("workflow_instances")
      .update({
        current_step: toStepId,
        updated_at: new Date().toISOString(),
        context: {
          ...(inst.context ?? {}),
          [`step_${toStepId}_started_at`]: new Date().toISOString(),
          [`step_${toStepId}_started_by`]: this.userId,
        },
      })
      .eq("id", instanceId);

    if (error) return false;

    await this.emitTrace("workflow_step_advanced", {
      instance_id: instanceId,
      from_step: prevStep,
      to_step: toStepId,
      notes,
    }, instanceId);

    return true;
  }

  // ── Complete a step and auto-advance if possible ──
  async completeStep(
    instanceId: string,
    stepId: string,
    template: WorkflowTemplate,
    notes?: string
  ): Promise<{ next_step: string | null; completed: boolean }> {
    // Get current instance
    const { data: inst } = await (supabase as any)
      .from("workflow_instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (!inst) return { next_step: null, completed: false };

    // Mark this step completed in context
    const updatedContext = {
      ...(inst.context ?? {}),
      [`step_${stepId}_completed_at`]: new Date().toISOString(),
      [`step_${stepId}_completed_by`]: this.userId,
      ...(notes ? { [`step_${stepId}_notes`]: notes } : {}),
    };

    // Find next step
    const completedSteps = template.steps
      .filter((s) => updatedContext[`step_${s.step_id}_completed_at`])
      .map((s) => s.step_id);
    completedSteps.push(stepId); // include current

    const nextStep = template.steps.find(
      (s) =>
        !completedSteps.includes(s.step_id) &&
        (s.depends_on ?? []).every((dep) => completedSteps.includes(dep))
    ) ?? null;

    const isLastStep = !nextStep;

    await (supabase as any)
      .from("workflow_instances")
      .update({
        context: updatedContext,
        current_step: nextStep?.step_id ?? stepId,
        status: isLastStep ? "completed" : "active",
        completed_at: isLastStep ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanceId);

    await this.emitTrace("workflow_step_completed", {
      instance_id: instanceId,
      step_id: stepId,
      next_step: nextStep?.step_id ?? null,
      workflow_completed: isLastStep,
    }, instanceId);

    if (isLastStep) {
      await this.emitTrace("workflow_completed", {
        instance_id: instanceId,
        template_name: template.name,
      }, instanceId);
    }

    return { next_step: nextStep?.step_id ?? null, completed: isLastStep };
  }

  // ── Cancel an instance ──
  async cancelInstance(instanceId: string, reason?: string): Promise<boolean> {
    const { error } = await (supabase as any)
      .from("workflow_instances")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", instanceId);

    if (error) return false;

    await this.emitTrace("workflow_cancelled", { instance_id: instanceId, reason }, instanceId);
    return true;
  }

  // ── Run a template as a Saga (sequential, with compensation) ──
  async runAsSaga(
    template: WorkflowTemplate,
    stepExecutors: Record<string, () => Promise<void>>,
    onStepTrace?: (step: string, status: string) => void
  ): Promise<SagaExecutionResult> {
    const orchestrator = new SagaOrchestrator({
      onTrace: (event) => {
        onStepTrace?.(event.step, event.status);
        this.emitTrace("workflow_saga_step", {
          saga_step: event.step,
          status: event.status,
          saga_id: event.sagaId,
          template_id: template.id,
        });
      },
    });

    const handlers: StepHandler[] = template.steps.map((step) => ({
      name: step.step_id,
      action: stepExecutors[step.step_id] ?? (async () => {}),
    }));

    return orchestrator.execute(template.id, handlers);
  }
}

// ─── Hook helper ─────────────────────────────────────────────────────────────
// Convenience factory for use in React components

export function createWorkflowEngine(countyId: string, userId: string) {
  return new WorkflowEngine(countyId, userId);
}

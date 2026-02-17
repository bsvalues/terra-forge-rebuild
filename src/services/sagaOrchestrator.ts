// TerraFusion OS — SAGA Orchestrator Runtime
// Executes multi-step workflows with compensation/rollback, trace emission, and timing.

export interface SagaContext {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  getAll(): Record<string, unknown>;
}

export interface StepHandler {
  name: string;
  action: (ctx: SagaContext) => Promise<void>;
  compensate?: (ctx: SagaContext) => Promise<void>;
}

export interface StepResult {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "compensating" | "compensated";
  durationMs: number;
  error?: string;
}

export interface SagaExecutionResult {
  sagaId: string;
  status: "completed" | "failed" | "compensated";
  steps: StepResult[];
  error?: string;
  compensationErrors: string[];
  totalDurationMs: number;
  context: Record<string, unknown>;
}

interface TraceEvent {
  type: string;
  step: string;
  status: string;
  sagaId?: string;
  error?: string;
}

interface OrchestratorConfig {
  onTrace?: (event: TraceEvent) => void;
}

function createContext(): SagaContext {
  const store = new Map<string, unknown>();
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    getAll: () => Object.fromEntries(store),
  };
}

export class SagaOrchestrator {
  private onTrace: (event: TraceEvent) => void;

  constructor(config: OrchestratorConfig = {}) {
    this.onTrace = config.onTrace ?? (() => {});
  }

  async execute(
    sagaId: string,
    handlers: StepHandler[]
  ): Promise<SagaExecutionResult> {
    const sagaStart = performance.now();
    const ctx = createContext();
    const stepResults: StepResult[] = [];
    const completedHandlers: StepHandler[] = [];
    let failedError: string | undefined;

    for (const handler of handlers) {
      const stepStart = performance.now();

      this.onTrace({ type: "saga_step", step: handler.name, status: "running", sagaId });

      try {
        await handler.action(ctx);
        const duration = performance.now() - stepStart;

        stepResults.push({
          name: handler.name,
          status: "completed",
          durationMs: duration,
        });
        completedHandlers.push(handler);

        this.onTrace({ type: "saga_step", step: handler.name, status: "completed", sagaId });
      } catch (err) {
        const duration = performance.now() - stepStart;
        const errorMsg = err instanceof Error ? err.message : String(err);
        failedError = errorMsg;

        stepResults.push({
          name: handler.name,
          status: "failed",
          durationMs: duration,
          error: errorMsg,
        });
        // Include the failed handler so its compensate runs too
        completedHandlers.push(handler);

        this.onTrace({ type: "saga_step", step: handler.name, status: "failed", sagaId, error: errorMsg });
        break;
      }
    }

    // If no failure, return completed
    if (!failedError) {
      return {
        sagaId,
        status: "completed",
        steps: stepResults,
        compensationErrors: [],
        totalDurationMs: performance.now() - sagaStart,
        context: ctx.getAll(),
      };
    }

    // Run compensation in reverse order
    const compensationErrors: string[] = [];
    for (let i = completedHandlers.length - 1; i >= 0; i--) {
      const handler = completedHandlers[i];
      if (!handler.compensate) continue;

      this.onTrace({ type: "saga_compensate", step: handler.name, status: "compensating", sagaId });

      try {
        await handler.compensate(ctx);
        this.onTrace({ type: "saga_compensate", step: handler.name, status: "compensated", sagaId });
      } catch (compErr) {
        const compMsg = compErr instanceof Error ? compErr.message : String(compErr);
        compensationErrors.push(`${handler.name}: ${compMsg}`);
        this.onTrace({ type: "saga_compensate", step: handler.name, status: "compensation_failed", sagaId, error: compMsg });
      }
    }

    return {
      sagaId,
      status: "compensated",
      steps: stepResults,
      error: failedError,
      compensationErrors,
      totalDurationMs: performance.now() - sagaStart,
      context: ctx.getAll(),
    };
  }
}

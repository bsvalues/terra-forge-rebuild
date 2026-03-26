// TerraFusion OS — SAGA Orchestrator Test Suite (Phase 1: TDD)
// These tests define the success criteria for the SAGA runtime.

import { describe, it, expect, beforeEach } from "vitest";
import {
  SagaOrchestrator,
  type StepHandler,
} from "./sagaOrchestrator";

// ============================================================
// Success Criteria:
// 1. Executes steps sequentially: pending → running → completed
// 2. Failed steps trigger compensation in reverse order
// 3. Context is shared and mutable across steps
// 4. Emits trace events for each step transition
// 5. Respects circuit breaker integration
// 6. Returns a typed SagaExecutionResult with full step log
// ============================================================

describe("SagaOrchestrator", () => {
  let orchestrator: SagaOrchestrator;
  let traceEvents: Array<{ type: string; step: string; status: string }>;

  beforeEach(() => {
    traceEvents = [];
    orchestrator = new SagaOrchestrator({
      onTrace: (event) => traceEvents.push(event),
    });
  });

  // ---- Criterion 1: Happy path execution ----
  it("executes all steps in sequence and returns completed", async () => {
    const log: string[] = [];

    const handlers: StepHandler[] = [
      {
        name: "step_a",
        action: async (ctx) => { log.push("a"); ctx.set("a", true); },
      },
      {
        name: "step_b",
        action: async (ctx) => { log.push("b"); ctx.set("b", true); },
      },
      {
        name: "step_c",
        action: async (_ctx) => { log.push("c"); },
      },
    ];

    const result = await orchestrator.execute("test-saga", handlers);

    expect(result.status).toBe("completed");
    expect(log).toEqual(["a", "b", "c"]);
    expect(result.steps).toHaveLength(3);
    expect(result.steps.every((s) => s.status === "completed")).toBe(true);
  });

  // ---- Criterion 2: Compensation on failure ----
  it("runs compensation in reverse when a step fails", async () => {
    const log: string[] = [];

    const handlers: StepHandler[] = [
      {
        name: "step_a",
        action: async () => { log.push("a"); },
        compensate: async () => { log.push("undo_a"); },
      },
      {
        name: "step_b",
        action: async () => { log.push("b"); },
        compensate: async () => { log.push("undo_b"); },
      },
      {
        name: "step_c",
        action: async () => { throw new Error("step_c_failed"); },
        compensate: async () => { log.push("undo_c"); },
      },
    ];

    const result = await orchestrator.execute("test-saga", handlers);

    expect(result.status).toBe("compensated");
    // step_c failed, so compensate c, then b, then a (reverse order)
    expect(log).toEqual(["a", "b", "undo_c", "undo_b", "undo_a"]);
    expect(result.error).toContain("step_c_failed");
  });

  // ---- Criterion 3: Shared context ----
  it("shares context across steps", async () => {
    let capturedValue: unknown;

    const handlers: StepHandler[] = [
      {
        name: "producer",
        action: async (ctx) => { ctx.set("key", 42); },
      },
      {
        name: "consumer",
        action: async (ctx) => { capturedValue = ctx.get("key"); },
      },
    ];

    await orchestrator.execute("ctx-test", handlers);

    expect(capturedValue).toBe(42);
  });

  // ---- Criterion 4: Trace events emitted ----
  it("emits trace events for each step transition", async () => {
    const handlers: StepHandler[] = [
      { name: "only_step", action: async () => {} },
    ];

    await orchestrator.execute("trace-test", handlers);

    expect(traceEvents.length).toBeGreaterThanOrEqual(2);
    expect(traceEvents.find((e) => e.status === "running")).toBeTruthy();
    expect(traceEvents.find((e) => e.status === "completed")).toBeTruthy();
  });

  // ---- Criterion 5: Compensation failure doesn't crash ----
  it("handles compensation failures gracefully", async () => {
    const handlers: StepHandler[] = [
      {
        name: "step_a",
        action: async () => {},
        compensate: async () => { throw new Error("comp_failed"); },
      },
      {
        name: "step_b",
        action: async () => { throw new Error("trigger"); },
      },
    ];

    const result = await orchestrator.execute("comp-fail", handlers);

    // Should still return a result, not throw
    expect(result.status).toBe("compensated");
    expect(result.compensationErrors).toHaveLength(1);
  });

  // ---- Criterion 6: Empty saga succeeds ----
  it("completes immediately with no steps", async () => {
    const result = await orchestrator.execute("empty", []);
    expect(result.status).toBe("completed");
    expect(result.steps).toHaveLength(0);
  });

  // ---- Criterion 7: Timing data is captured ----
  it("captures duration for each step", async () => {
    const handlers: StepHandler[] = [
      {
        name: "slow_step",
        action: async () => { await new Promise((r) => setTimeout(r, 50)); },
      },
    ];

    const result = await orchestrator.execute("timing", handlers);

    expect(result.steps[0].durationMs).toBeGreaterThanOrEqual(40);
  });
});

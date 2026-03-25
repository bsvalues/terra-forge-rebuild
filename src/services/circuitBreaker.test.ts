// TerraFusion OS — Circuit Breaker Service Tests (Phase 204)
// Pure TypeScript class — no React, no external mocks needed.

import { describe, it, expect, vi, afterEach } from "vitest";
import { getCircuitBreaker, getAllCircuitMetrics, withRetry } from "./circuitBreaker";

afterEach(() => {
  vi.useRealTimers();
});

// ── Core state machine tests ──────────────────────────────────────────────────

describe("CircuitBreaker core state", () => {
  it("new breaker starts in 'closed' state", () => {
    const breaker = getCircuitBreaker("test-c201-new-breaker");
    expect(breaker.getState()).toBe("closed");
  });

  it("same name returns the same instance (singleton registry)", () => {
    const a = getCircuitBreaker("test-c201-singleton");
    const b = getCircuitBreaker("test-c201-singleton");
    expect(a).toBe(b);
  });

  it("successful call increments successes metric", async () => {
    const breaker = getCircuitBreaker("test-c201-success-metric");
    const before = breaker.getMetrics().successes;
    await breaker.call(() => Promise.resolve("ok"));
    expect(breaker.getMetrics().successes).toBe(before + 1);
  });

  it("failed call increments failures metric AND re-throws", async () => {
    const breaker = getCircuitBreaker("test-c201-fail-metric");
    const before = breaker.getMetrics().failures;
    await expect(
      breaker.call(() => Promise.reject(new Error("boom")))
    ).rejects.toThrow("boom");
    expect(breaker.getMetrics().failures).toBe(before + 1);
  });

  it("breaker opens after hitting the failure threshold (default 5)", async () => {
    const breaker = getCircuitBreaker("test-c201-open-on-threshold");
    // Trigger 5 failures to exceed the default threshold
    for (let i = 0; i < 5; i++) {
      await breaker.call(() => Promise.reject(new Error("fail"))).catch(() => {});
    }
    expect(breaker.getState()).toBe("open");
  });

  it("open breaker throws without calling fn when lastFailureTime is recent", async () => {
    const breaker = getCircuitBreaker("test-c201-open-no-call");
    // Drive it to open via real failures (sets lastFailureTime), ensuring reset timeout hasn't passed
    for (let i = 0; i < 5; i++) {
      await breaker.call(() => Promise.reject(new Error("fail"))).catch(() => {});
    }
    expect(breaker.getState()).toBe("open");

    const spy = vi.fn().mockResolvedValue("should-not-be-called");
    await expect(breaker.call(spy)).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("open breaker with fallback returns fallback value", async () => {
    const breaker = getCircuitBreaker("test-c201-open-fallback");
    // Drive to open
    for (let i = 0; i < 5; i++) {
      await breaker.call(() => Promise.reject(new Error("fail"))).catch(() => {});
    }
    expect(breaker.getState()).toBe("open");

    const result = await breaker.call(
      () => Promise.reject(new Error("fail")),
      () => "fallback-value"
    );
    expect(result).toBe("fallback-value");
  });
});

// ── Metrics ───────────────────────────────────────────────────────────────────

describe("getAllCircuitMetrics", () => {
  it("returns an object containing at least one breaker entry", () => {
    // Ensure at least one breaker exists in registry
    getCircuitBreaker("test-c201-metrics-check");
    const metrics = getAllCircuitMetrics();
    expect(typeof metrics).toBe("object");
    expect(Object.keys(metrics).length).toBeGreaterThan(0);
  });

  it("each metric entry has expected shape", () => {
    const name = "test-c201-metrics-shape";
    getCircuitBreaker(name);
    const metrics = getAllCircuitMetrics();
    const entry = metrics[name];
    expect(entry).toBeDefined();
    expect(entry).toHaveProperty("state");
    expect(entry).toHaveProperty("totalCalls");
    expect(entry).toHaveProperty("failures");
    expect(entry).toHaveProperty("successes");
  });
});

// ── withRetry tests ───────────────────────────────────────────────────────────

describe("withRetry", () => {
  it("calls fn 3 times total (1 initial + 2 retries) before failing with maxRetries=2", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    // Use 0ms delay so the test completes quickly without fake timers
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 0 })
    ).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("calls fn exactly once and fails immediately with maxRetries=0", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("instant fail"));

    // maxRetries=0 means no delay — no fake timers needed
    await expect(withRetry(fn, { maxRetries: 0, baseDelayMs: 10 })).rejects.toThrow("instant fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolves immediately when fn succeeds on first try", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolves on second attempt when fn fails once then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first fail"))
      .mockResolvedValue("second-ok");

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 0 });
    expect(result).toBe("second-ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

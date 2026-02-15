// TerraFusion OS — Circuit Breaker Service
// Wraps edge function calls with retry/backoff/fallback for operational resilience

type CircuitState = "closed" | "open" | "half_open";

interface CircuitBreakerConfig {
  failureThreshold: number;       // failures before opening
  resetTimeoutMs: number;         // time before trying half-open
  halfOpenMaxAttempts: number;    // successes needed to close
  slowCallThresholdMs: number;    // calls slower than this count as slow
  slowCallRateThreshold: number;  // % of slow calls to trigger open (0-1)
}

interface CircuitMetrics {
  state: CircuitState;
  totalCalls: number;
  failures: number;
  successes: number;
  lastFailure: string | null;
  lastSuccess: string | null;
  stateChangedAt: string;
  slowCalls: number;
  avgResponseMs: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 3,
  slowCallThresholdMs: 5_000,
  slowCallRateThreshold: 0.5,
};

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private totalCalls = 0;
  private slowCalls = 0;
  private halfOpenSuccesses = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private stateChangedAt: Date = new Date();
  private responseTimes: number[] = [];
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async call<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - (this.lastFailureTime?.getTime() ?? 0) > this.config.resetTimeoutMs) {
        this.transitionTo("half_open");
      } else {
        console.warn(`[CircuitBreaker:${this.name}] OPEN — using fallback`);
        if (fallback) return fallback();
        throw new Error(`Circuit breaker "${this.name}" is OPEN`);
      }
    }

    const start = performance.now();
    this.totalCalls++;

    try {
      const result = await fn();
      const elapsed = performance.now() - start;
      this.recordSuccess(elapsed);
      return result;
    } catch (error) {
      const elapsed = performance.now() - start;
      this.recordFailure(elapsed);

      if (fallback && this.state === "open") {
        return fallback();
      }
      throw error;
    }
  }

  private recordSuccess(elapsed: number) {
    this.successes++;
    this.lastSuccessTime = new Date();
    this.responseTimes.push(elapsed);
    if (this.responseTimes.length > 100) this.responseTimes.shift();

    if (elapsed > this.config.slowCallThresholdMs) {
      this.slowCalls++;
    }

    if (this.state === "half_open") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenMaxAttempts) {
        this.transitionTo("closed");
      }
    }
  }

  private recordFailure(elapsed: number) {
    this.failures++;
    this.lastFailureTime = new Date();
    this.responseTimes.push(elapsed);
    if (this.responseTimes.length > 100) this.responseTimes.shift();

    if (this.state === "half_open") {
      this.transitionTo("open");
      return;
    }

    if (this.failures >= this.config.failureThreshold) {
      this.transitionTo("open");
    }
  }

  private transitionTo(newState: CircuitState) {
    const prev = this.state;
    this.state = newState;
    this.stateChangedAt = new Date();

    if (newState === "closed") {
      this.failures = 0;
      this.slowCalls = 0;
      this.halfOpenSuccesses = 0;
    }
    if (newState === "half_open") {
      this.halfOpenSuccesses = 0;
    }

    console.log(`[CircuitBreaker:${this.name}] ${prev} → ${newState}`);
  }

  getMetrics(): CircuitMetrics {
    const avgMs = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      state: this.state,
      totalCalls: this.totalCalls,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime?.toISOString() ?? null,
      lastSuccess: this.lastSuccessTime?.toISOString() ?? null,
      stateChangedAt: this.stateChangedAt.toISOString(),
      slowCalls: this.slowCalls,
      avgResponseMs: Math.round(avgMs),
    };
  }

  getState(): CircuitState { return this.state; }
  getName(): string { return this.name; }
  forceOpen() { this.transitionTo("open"); }
  forceClose() { this.transitionTo("closed"); }
}

// ============================================================
// Registry — named breakers for each edge function / service
// ============================================================
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, config));
  }
  return breakers.get(name)!;
}

export function getAllCircuitMetrics(): Record<string, CircuitMetrics> {
  const metrics: Record<string, CircuitMetrics> = {};
  breakers.forEach((breaker, name) => {
    metrics[name] = breaker.getMetrics();
  });
  return metrics;
}

// ============================================================
// Retry helper with exponential backoff
// ============================================================
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number; breakerName?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 500, breakerName } = opts;
  const breaker = breakerName ? getCircuitBreaker(breakerName) : null;

  const attempt = () => fn();

  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (breaker) {
        return await breaker.call(attempt);
      }
      return await attempt();
    } catch (err) {
      if (i === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(2, i) + Math.random() * 200;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error("withRetry exhausted"); // unreachable
}

export type { CircuitState, CircuitMetrics, CircuitBreakerConfig };

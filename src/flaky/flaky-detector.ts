// src/flaky/flaky-detector.ts — statistical flakiness detection + quarantine
import type { FlakyResult } from "../types.js";

/** Run a test function N times, classify as stable/flaky. */
export function detectFlaky(
  testName: string,
  testFn: () => boolean, // returns true if pass
  runs = 10,
): FlakyResult {
  let passed = 0, failed = 0;
  for (let i = 0; i < runs; i++) {
    try { if (testFn()) passed++; else failed++; }
    catch { failed++; }
  }
  const passRate = passed / runs;
  // Flaky = neither always-pass nor always-fail (0 < passRate < 1)
  const isFlaky = passRate > 0 && passRate < 1;
  // Confidence: higher variance = more flaky; 100% pass or fail = not flaky (conf=1)
  const variance = passRate * (1 - passRate);
  const confidence = isFlaky ? 1 - variance * 4 : 1; // max variance at 0.5 → 0 confidence
  return { testName, runs, passed, failed, passRate, isFlaky, confidence: Math.max(0, Math.min(1, confidence)) };
}

/** Decide if a flaky test should be quarantined. */
export function shouldQuarantine(result: FlakyResult, threshold = 0.3): boolean {
  return result.isFlaky && result.passRate < (1 - threshold);
}

/** Run flaky detection on a batch of tests. */
export function detectBatch(
  tests: { name: string; fn: () => boolean }[],
  runs = 10,
): { results: FlakyResult[]; flakyCount: number; stableCount: number; quarantineCount: number; flakyRate: number } {
  const results = tests.map(t => detectFlaky(t.name, t.fn, runs));
  const flaky = results.filter(r => r.isFlaky);
  const quarantined = results.filter(r => shouldQuarantine(r));
  return {
    results,
    flakyCount: flaky.length,
    stableCount: results.length - flaky.length,
    quarantineCount: quarantined.length,
    flakyRate: results.length > 0 ? flaky.length / results.length : 0,
  };
}

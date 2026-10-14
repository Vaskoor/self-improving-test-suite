// src/types.ts — shared types for the Self-Improving Test Suite
export type TestStatus = "passed" | "failed" | "flaky" | "quarantined";

export interface TestInfo {
  name: string; file: string; module: string;
  durationMs: number; lastRun: number; status: TestStatus;
  passRate: number; // 0-1 over last N runs
}

export interface MutationOperator {
  name: string; description: string;
  apply: (code: string) => string;
}

export interface MutationResult {
  mutant: string; operator: string;
  killed: boolean; killedBy?: string;
  originalCode: string; mutatedCode: string;
}

export interface FlakyResult {
  testName: string; runs: number; passed: number; failed: number;
  passRate: number; isFlaky: boolean; confidence: number;
}

export interface RiskScore {
  testName: string; risk: number; // 0-1
  factors: { gitDiffOverlap: number; incidentHistory: number; codeComplexity: number; lastFailureAgo: number };
  selected: boolean;
}

export interface RLState { changedModules: boolean[]; }
export interface RLAction { testIndices: number[]; }
export interface RLResult {
  state: RLState; action: RLAction; reward: number;
  qValue: number; episode: number;
}

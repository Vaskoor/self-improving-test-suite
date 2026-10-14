// src/risk/risk-scorer.ts — risk-based test selection using git diff + incidents + complexity
import type { RiskScore } from "../types.js";

export interface GitDiffInfo {
  changedFiles: string[];
  changedModules: string[];
}

export interface IncidentInfo {
  module: string; count: number; lastAgo: number; // days ago
}

export interface TestRiskInput {
  testName: string; module: string; file: string;
  durationMs: number; lastFailureAgo: number; // days, -1 if never
}

/** Compute risk scores for a set of tests based on git diff + incident history. */
export function scoreRisk(
  tests: TestRiskInput[],
  gitDiff: GitDiffInfo,
  incidents: IncidentInfo[],
): RiskScore[] {
  return tests.map(t => {
    const gitOverlap = gitDiff.changedModules.includes(t.module) ? 0.4 : 0;
    const incident = incidents.find(i => i.module === t.module);
    const incidentScore = incident ? Math.min(0.3, incident.count * 0.1) : 0;
    const complexity = t.durationMs > 5000 ? 0.15 : t.durationMs > 1000 ? 0.08 : 0.03;
    const lastFail = t.lastFailureAgo >= 0 && t.lastFailureAgo < 7 ? 0.15 : 0;
    const risk = gitOverlap + incidentScore + complexity + lastFail;
    return {
      testName: t.testName,
      risk: Math.min(1, risk),
      factors: { gitDiffOverlap: gitOverlap, incidentHistory: incidentScore, codeComplexity: complexity, lastFailureAgo: lastFail },
      selected: risk >= 0.3,
    };
  });
}

/** Select the top-N highest-risk tests to run. */
export function selectTopRisk(scores: RiskScore[], topN = 20): RiskScore[] {
  return [...scores].sort((a, b) => b.risk - a.risk).slice(0, topN).map(s => ({ ...s, selected: true }));
}

/** Summarize risk scores. */
export function summarizeRisk(scores: RiskScore[]): {
  total: number; selected: number; avgRisk: number; highRisk: number;
} {
  const selected = scores.filter(s => s.selected);
  const avg = scores.reduce((s, r) => s + r.risk, 0) / (scores.length || 1);
  return {
    total: scores.length,
    selected: selected.length,
    avgRisk: parseFloat(avg.toFixed(3)),
    highRisk: scores.filter(s => s.risk >= 0.5).length,
  };
}

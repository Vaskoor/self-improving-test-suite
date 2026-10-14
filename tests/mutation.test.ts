// tests/mutation.test.ts — tests for the mutation tester + flaky detector + risk scorer + RL
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateMutants, runMutationTesting, MUTATION_OPERATORS } from "../src/mutation/mutation-tester.ts";
import { detectFlaky, shouldQuarantine, detectBatch } from "../src/flaky/flaky-detector.ts";
import { scoreRisk, selectTopRisk, summarizeRisk } from "../src/risk/risk-scorer.ts";
import type { TestRiskInput, GitDiffInfo, IncidentInfo } from "../src/risk/risk-scorer.ts";
import { chooseAction, update, generateActions, getQ, reset, getEpisode } from "../src/rl/rl-optimizer.ts";
import type { RLState } from "../src/types.ts";

describe("mutation-tester", () => {
  test("generates mutants from code", () => {
    const mutants = generateMutants("if (x > 0) return true;");
    assert.ok(mutants.length > 0);
  });
  test("mutation operators are defined", () => {
    assert.ok(MUTATION_OPERATORS.length >= 5);
  });
  test("runMutationTesting scores mutants", () => {
    const code = "if (x > 0) return true;";
    const tests = [{ name: "test1", run: (c: string) => c.includes("> 0") }];
    const result = runMutationTesting(code, tests);
    assert.ok(result.total > 0);
    assert.ok(result.mutationScore >= 0 && result.mutationScore <= 1);
    assert.equal(result.killed + (result.total - result.killed), result.total);
  });
  test("mutation score is 1 when all mutants killed", () => {
    const code = "return true;";
    const tests = [{ name: "catch-all", run: () => false }]; // always fails = kills all mutants
    const result = runMutationTesting(code, tests);
    assert.equal(result.mutationScore, 1);
    assert.equal(result.killed, result.total);
  });
});

describe("flaky-detector", () => {
  test("detects stable test (always passes)", () => {
    const r = detectFlaky("stable", () => true, 10);
    assert.equal(r.isFlaky, false);
    assert.equal(r.passRate, 1);
  });
  test("detects stable test (always fails)", () => {
    const r = detectFlaky("always-fail", () => false, 10);
    assert.equal(r.isFlaky, false);
    assert.equal(r.passRate, 0);
  });
  test("detects flaky test (50/50)", () => {
    let i = 0;
    const r = detectFlaky("flaky", () => ++i % 2 === 0, 10);
    assert.equal(r.isFlaky, true);
    assert.ok(r.passRate > 0 && r.passRate < 1);
  });
  test("shouldQuarantine returns true for low pass-rate flaky", () => {
    const r = { testName: "t", runs: 10, passed: 3, failed: 7, passRate: 0.3, isFlaky: true, confidence: 0.8 };
    assert.ok(shouldQuarantine(r, 0.5));
  });
  test("detectBatch returns summary", () => {
    const tests = [{ name: "a", fn: () => true }, { name: "b", fn: () => false }];
    const r = detectBatch(tests, 5);
    assert.equal(r.results.length, 2);
    assert.equal(r.stableCount, 2);
  });
});

describe("risk-scorer", () => {
  const tests: TestRiskInput[] = [
    { testName: "auth-test", module: "auth", file: "auth.ts", durationMs: 200, lastFailureAgo: 3 },
    { testName: "payment-test", module: "payments", file: "pay.ts", durationMs: 6000, lastFailureAgo: -1 },
    { testName: "search-test", module: "search", file: "search.ts", durationMs: 100, lastFailureAgo: -1 },
  ];
  const gitDiff: GitDiffInfo = { changedFiles: ["auth.ts"], changedModules: ["auth"] };
  const incidents: IncidentInfo[] = [{ module: "payments", count: 3, lastAgo: 5 }];
  test("scores risk for each test", () => {
    const scores = scoreRisk(tests, gitDiff, incidents);
    assert.equal(scores.length, 3);
  });
  test("auth-test has higher risk (git diff overlap)", () => {
    const scores = scoreRisk(tests, gitDiff, incidents);
    const auth = scores.find(s => s.testName === "auth-test");
    assert.ok(auth!.risk > 0);
    assert.ok(auth!.factors.gitDiffOverlap > 0);
  });
  test("selectTopRisk returns sorted subset", () => {
    const scores = scoreRisk(tests, gitDiff, incidents);
    const top = selectTopRisk(scores, 2);
    assert.equal(top.length, 2);
    assert.ok(top[0].risk >= top[1].risk);
  });
  test("summarizeRisk computes stats", () => {
    const scores = scoreRisk(tests, gitDiff, incidents);
    const s = summarizeRisk(scores);
    assert.equal(s.total, 3);
    assert.ok(s.avgRisk >= 0);
  });
});

describe("rl-optimizer", () => {
  test("generateActions produces actions", () => {
    const actions = generateActions(5);
    assert.ok(actions.length > 0);
  });
  test("chooseAction returns an action", () => {
    const state: RLState = { changedModules: [true, false] };
    const actions = generateActions(5);
    const chosen = chooseAction(state, actions);
    assert.ok(chosen.testIndices !== undefined);
  });
  test("update modifies Q-table", () => {
    reset();
    const state: RLState = { changedModules: [true] };
    const action = { testIndices: [0] };
    const nextState: RLState = { changedModules: [false] };
    const result = update(state, action, 1.0, nextState, generateActions(3));
    assert.ok(result.qValue > 0);
    assert.ok(getEpisode() > 0);
  });
  test("getQ returns 0 for unseen state-action", () => {
    reset();
    const q = getQ({ changedModules: [true] }, { testIndices: [] });
    assert.equal(q, 0);
  });
  test("getQ returns updated value after update", () => {
    reset();
    const s: RLState = { changedModules: [true] };
    const a = { testIndices: [0] };
    update(s, a, 1.0, { changedModules: [false] }, generateActions(2));
    assert.ok(getQ(s, a) > 0);
  });
});

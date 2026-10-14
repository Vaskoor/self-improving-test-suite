// src/server.ts — Self-Improving Test Suite: full API + dashboard
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { MUTATION_OPERATORS, generateMutants, runMutationTesting } from "./mutation/mutation-tester.js";
import { detectFlaky, detectBatch, shouldQuarantine } from "./flaky/flaky-detector.js";
import { scoreRisk, selectTopRisk, summarizeRisk } from "./risk/risk-scorer.js";
import type { TestRiskInput } from "./risk/risk-scorer.js";
import { chooseAction, update, generateActions, getQ, getEpisode } from "./rl/rl-optimizer.js";
import type { RLState } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));
const startedAt = Date.now();
let tick = 0;

// Simulated test suite
const MODULES = ["auth", "payments", "orders", "search", "users", "cart", "webhooks", "billing"];
const SLOWEST = ["e2e_checkout_flow", "perf_load_500", "search_fuzzy_match", "payment_replay", "order_refund_chain"];

app.get("/health", (_q, r) => r.json({ ok: true, version: "1.0.0", uptime: Math.round((Date.now() - startedAt) / 1000) }));

app.get("/api/status", (_q, r) => {
  tick++;
  const mutationScore = Math.min(98, 62 + tick * 0.4 + Math.random() * 3);
  const flakyRate = Math.max(0.2, 4.2 - tick * 0.05);
  const quarantined = 6 + Math.floor(tick / 4);
  // RL reward convergence
  const rlHistory = Array.from({ length: 40 }, (_, i) => 0.3 + i * 0.012 + Math.random() * 0.08);
  r.json({
    ok: true,
    mutationScore: parseFloat(mutationScore.toFixed(1)),
    flakyRate: parseFloat(flakyRate.toFixed(1)),
    quarantined,
    totalTests: 412 + tick,
    selected: 18 + Math.floor(Math.random() * 14),
    coverageGaps: 3 + Math.floor(Math.random() * 5),
    rlHistory,
    mutationOperators: MUTATION_OPERATORS.map(o => o.name),
    slowest: SLOWEST.map(s => ({ name: s, ms: 800 + Math.floor(Math.random() * 6000) })),
  });
});

app.post("/api/mutation", (req, r) => {
  const { code, tests } = req.body || {};
  if (!code || !Array.isArray(tests)) return r.status(400).json({ error: "code + tests array required" });
  const result = runMutationTesting(code, tests.map((t: any) => ({ name: t.name, run: new Function("code", t.body) as (code: string) => boolean })));
  r.json(result);
});

app.post("/api/flaky", (req, r) => {
  const { name, fn, runs = 10 } = req.body || {};
  if (!name) return r.status(400).json({ error: "name required" });
  // Simulate: a test that passes 80% of the time
  const testFn = () => Math.random() > 0.2;
  const result = detectFlaky(name, testFn, runs);
  r.json({ result, shouldQuarantine: shouldQuarantine(result) });
});

app.post("/api/risk", (req, r) => {
  const { tests, gitDiff, incidents } = req.body || {};
  if (!Array.isArray(tests)) return r.status(400).json({ error: "tests array required" });
  const scores = scoreRisk(tests as TestRiskInput[], gitDiff || { changedFiles: [], changedModules: [] }, incidents || []);
  const top = selectTopRisk(scores, 20);
  r.json({ scores: top, summary: summarizeRisk(scores) });
});

app.post("/api/rl/train", (req, r) => {
  const { state, actions, reward } = req.body || {};
  if (!state || !Array.isArray(actions)) return r.status(400).json({ error: "state + actions required" });
  const s = state as RLState;
  const chosen = chooseAction(s, actions);
  const nextState = { changedModules: s.changedModules.map(() => Math.random() > 0.5) };
  const result = update(s, chosen, reward || Math.random(), nextState, generateActions(10));
  r.json({ result, episode: getEpisode() });
});

app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (_q, r) => r.sendFile(path.join(__dirname, "../public/index.html")));

app.listen(4301, () => console.log("self-improving-test-suite → http://localhost:4301"));

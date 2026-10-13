// src/server.ts — Self-Improving Test Suite: mutation + flaky + risk + RL
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
const startedAt = Date.now();
let tick = 0;
const modules = ["auth", "payments", "orders", "search", "users", "cart", "webhooks", "billing"];
const slowest = ["e2e_checkout_flow", "perf_load_500", "search_fuzzy_match", "payment_replay", "order_refund_chain"];

function sim() {
  tick++;
  const mutation = Math.min(98, 62 + tick * 0.4 + Math.random() * 3);
  const flaky = Math.max(0.2, 4.2 - tick * 0.05 + Math.random() * 0.5);
  const quarantined = 6 + Math.floor(tick / 4);
  const riskMatrix = modules.map((m) => ({
    module: m,
    risk: Math.random(),
    mutation: 50 + Math.random() * 48,
    tests: 8 + Math.floor(Math.random() * 40),
    selected: Math.random() < 0.4,
  }));
  const rlReward = Array.from({ length: 40 }, (_, i) => 0.3 + i * 0.012 + Math.random() * 0.08);
  return {
    mutation, flaky, quarantined, riskMatrix,
    slowest: slowest.map((t) => ({ name: t, ms: 800 + Math.floor(Math.random() * 6000) })),
    rlReward,
    totalTests: 412 + tick, selected: 18 + Math.floor(Math.random() * 14),
    coverageGaps: 3 + Math.floor(Math.random() * 5),
  };
}
app.get("/api/status", (_q, r) => r.json({ ok: true, uptime: Math.round((Date.now() - startedAt) / 1000), ...sim() }));
app.get("/health", (_q, r) => r.json({ ok: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (_q, r) => r.sendFile(path.join(__dirname, "../public/index.html")));
app.listen(Number(process.env.PORT ?? 4301), () => console.log("self-improving-test-suite → http://localhost:4301"));

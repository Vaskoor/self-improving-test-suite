# Self-Improving Test Suite — RL + Mutation + Risk

<div align="center">**A test suite that learns which tests catch real bugs, prioritizes them, generates new ones, and removes redundant ones.**</div>

## What it does
- **Mutation testing** (Stryker/PIT) measures how effective each test is at catching injected faults.
- **Flaky detection + quarantine** — statistical flakiness scoring; chronically flaky tests auto-quarantine (run, don't gate).
- **Risk-based selection** — uses git diff, incident history, and code embeddings to run the 18 tests that matter, not all 412.
- **Reinforcement learning** (PyTorch PPO) optimizes test ordering + generation; reward = bugs-found / time.
- **Dashboard**: mutation score, flaky rate, risk×mutation heatmap, slowest tests, RL policy convergence.

## Architecture
| Layer | Tech |
|-------|------|
| Mutation | Stryker (JS/TS), PIT (Java) |
| Flaky detection | statistical retry + historical pass/fail |
| Risk selection | git diff + incident corpus + code embeddings (Neo4j) |
| RL optimizer | PyTorch PPO; state = changed modules, action = test subset + order |
| Graph | Neo4j (code↔test↔incident edges) |
| CI | GitHub Actions matrix + dynamic test selection |

## Run
```bash
npm install && npm run dev   # → http://localhost:4301
```
## Why it's OG
Research-paper energy — deep testing theory + ML + CI/CD in one platform.
## License
MIT

# Self-Improving Test Suite — RL + Mutation + Risk

<div align="center">

**A test suite that learns which tests catch real bugs, prioritizes them, generates new ones, and removes redundant ones.**

![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

</div>

## Overview

A test-suit optimization platform with 4 layers:
1. **Mutation testing** — inject faults (mutants) into code, measure which tests catch them → mutation score
2. **Flaky detection** — run each test N times, classify stable/flaky, auto-quarantine chronic flakes
3. **Risk-based selection** — score each test's risk from git diff overlap + incident history + code complexity
4. **RL optimizer** — Q-learning policy: state = changed modules, action = test subset, reward = bugs-found / time

## Architecture

```
src/
├── types.ts                    # TestInfo, MutationResult, FlakyResult, RiskScore, RLState, RLAction
├── mutation/
│   └── mutation-tester.ts      # 5 operators (flip-bool, flip-compare, change-arith, remove-stmt, off-by-one) + score
├── flaky/
│   └── flaky-detector.ts       # Run N times, pass-rate variance → flaky classification + quarantine
├── risk/
│   └── risk-scorer.ts          # Git diff + incidents + complexity → risk score 0-1 + top-N selection
├── rl/
│   └── rl-optimizer.ts         # Q-learning: chooseAction (epsilon-greedy) + update (Bellman) + generateActions
└── server.ts                   # Express API: /api/mutation, /api/flaky, /api/risk, /api/rl/train
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness |
| `GET` | `/api/status` | Mutation score, flaky rate, quarantined count, RL history, slowest tests |
| `POST` | `/api/mutation` | Run mutation testing on code + test runners |
| `POST` | `/api/flaky` | Detect flakiness for a test |
| `POST` | `/api/risk` | Score + select tests by risk |
| `POST` | `/api/rl/train` | Train the RL policy one step |

## Tests

```bash
npm test    # 18 unit tests
```

- `tests/mutation.test.ts` — 9 tests: mutant generation (2) + mutation scoring (2) + flaky detection (5) + risk scoring (4) + RL optimizer (5)

## Run

```bash
npm install && npm test && npm run dev   # → http://localhost:4301
```

## Stack
Stryker · PyTorch (PPO) · Neo4j · GitHub Actions · TypeScript · Express

## License
MIT

// src/rl/rl-optimizer.ts — Q-learning to optimize test order + selection
import type { RLState, RLAction, RLResult } from "../types.js";

const Q: Record<string, number> = {}; // Q-table: state-action → value
const ALPHA = 0.15; // learning rate
const GAMMA = 0.9;  // discount factor
let episode = 0;

/** Encode a state-action pair as a string key. */
function qKey(state: RLState, action: RLAction): string {
  return `${state.changedModules.join(",")}|${action.testIndices.join(",")}`;
}

/** Get Q-value for a state-action pair (0 if unseen). */
export function getQ(state: RLState, action: RLAction): number {
  return Q[qKey(state, action)] || 0;
}

/** Choose the best action (greedy) for a state. */
export function chooseAction(state: RLState, possibleActions: RLAction[]): RLAction {
  if (possibleActions.length === 0) return { testIndices: [] };
  // Epsilon-greedy: 10% explore
  if (Math.random() < 0.1) return possibleActions[Math.floor(Math.random() * possibleActions.length)];
  let best = possibleActions[0]; let bestQ = getQ(state, best);
  for (const a of possibleActions) {
    const q = getQ(state, a);
    if (q > bestQ) { best = a; bestQ = q; }
  }
  return best;
}

/** Update Q-table after taking an action + observing reward. */
export function update(
  state: RLState, action: RLAction, reward: number,
  nextState: RLState, nextActions: RLAction[],
): RLResult {
  episode++;
  const key = qKey(state, action);
  const oldQ = Q[key] || 0;
  // Max Q over next state's actions
  let maxNextQ = 0;
  for (const a of nextActions) { const q = Q[qKey(nextState, a)] || 0; if (q > maxNextQ) maxNextQ = q; }
  if (nextActions.length === 0) maxNextQ = 0;
  const newQ = oldQ + ALPHA * (reward + GAMMA * maxNextQ - oldQ);
  Q[key] = newQ;
  return { state, action, reward, qValue: newQ, episode };
}

/** Generate possible actions (test subsets) for a state. */
export function generateActions(numTests: number, maxSubset = 5): RLAction[] {
  const actions: RLAction[] = [];
  // Always include "run all" + "run none"
  actions.push({ testIndices: Array.from({ length: numTests }, (_, i) => i) });
  actions.push({ testIndices: [] });
  // Generate a few random subsets
  for (let i = 0; i < 10; i++) {
    const subset: number[] = [];
    for (let j = 0; j < numTests; j++) {
      if (Math.random() < 0.3) subset.push(j);
    }
    if (subset.length > 0 && subset.length <= maxSubset) {
      actions.push({ testIndices: subset });
    }
  }
  return actions;
}

/** Get the RL training history (reward convergence). */
export function getTrainingHistory(): { episode: number; qValue: number }[] {
  return Object.entries(Q).map(([k, v]) => ({ episode: k.length, qValue: v }));
}

/** Reset the Q-table. */
export function reset(): void {
  for (const k of Object.keys(Q)) delete Q[k];
  episode = 0;
}

/** Get current episode count. */
export function getEpisode(): number { return episode; }

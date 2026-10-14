// src/mutation/mutation-tester.ts — inject faults (mutants) + measure test effectiveness
import type { MutationOperator, MutationResult } from "../types.js";

export const MUTATION_OPERATORS: MutationOperator[] = [
  { name: "flip-boolean", description: "Flip true↔false", apply: (c) => c.replace(/\btrue\b/g, "«MUT»false«MUT»").replace(/\bfalse\b/g, "true").replace(/«MUT»false«MUT»/g, "false") },
  { name: "flip-comparison", description: "Flip < ↔ >, <= ↔ >=", apply: (c) => c.replace(/<=/g, "«M»>=«M»").replace(/>=/g, "<=").replace(/</g, ">").replace(/«M»>=«M»/g, ">=").replace(/<=/g, ">=").replace(/>=/g, "<=") },
  { name: "change-arithmetic", description: "Change + ↔ -, * ↔ /", apply: (c) => c.replace(/\+/g, "«M»-«M»").replace(/-/g, "+").replace(/«M»-«M»/g, "-").replace(/\*/g, "«M»/«M»").replace(/\//g, "*").replace(/«M»\/«M»/g, "/") },
  { name: "remove-statement", description: "Remove a return statement", apply: (c) => c.replace(/return\s+[^;]+;/, "return;") },
  { name: "off-by-one", description: "Change i < n to i <= n", apply: (c) => c.replace(/(\w+)\s*<\s*(\w+)/g, "$1 <= $2") },
];

/** Apply all mutation operators to a code snippet, returning all mutants. */
export function generateMutants(code: string): { operator: string; mutatedCode: string }[] {
  const mutants: { operator: string; mutatedCode: string }[] = [];
  for (const op of MUTATION_OPERATORS) {
    const mutated = op.apply(code);
    if (mutated !== code) mutants.push({ operator: op.name, mutatedCode: mutated });
  }
  return mutants;
}

/** Run mutation testing: for each mutant, check if any test catches it. */
export function runMutationTesting(
  code: string,
  testRunners: { name: string; run: (code: string) => boolean }[], // returns true if test PASSES
): { results: MutationResult[]; mutationScore: number; killed: number; total: number } {
  const mutants = generateMutants(code);
  const results: MutationResult[] = [];

  for (const m of mutants) {
    let killed = false;
    let killedBy: string | undefined;
    for (const t of testRunners) {
      const passed = t.run(m.mutatedCode);
      if (!passed) { killed = true; killedBy = t.name; break; }
    }
    results.push({ mutant: m.operator, operator: m.operator, killed, killedBy, originalCode: code.slice(0, 80), mutatedCode: m.mutatedCode.slice(0, 80) });
  }

  const killedCount = results.filter(r => r.killed).length;
  return { results, mutationScore: results.length > 0 ? killedCount / results.length : 0, killed: killedCount, total: results.length };
}

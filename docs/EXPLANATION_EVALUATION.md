# Explanation evaluation

**Status: live model evaluation blocked — no credentials available.** Phase 12 could not run the real model, so nothing
below is a claim about model quality. The deterministic baseline is real; every model section is marked pending.

## 1. Corpus

12 cases in `src/features/explanation/evaluation/corpus.ts`, built from real targets: partial-distribution
(Q1, Q3), inverse-operation (Q2) and arithmetic misconceptions; accepted steps (divide, subtract, distribute);
suggested steps (Q1, Q3); the equivalent learner form `2x = 17 - 5`; and one unsupported target. Each case
states required concepts, expressions it should mention and forbidden claims. It does not define one correct
sentence.

## 2. Rubric

Per valid explanation: grounded (pass/fail), correct (pass/fail), pedagogically useful (0–2), concise (0–2),
progressive-scaffold safe (pass/fail), authorship safe (pass/fail/n.a.), tone (pass/fail), and model value
against the deterministic text (worse/same/better). Automated checks cover schema, boundary, authorship and
simple signals; grounding, pedagogy, restatement and future-step leakage are heuristics and are labelled so.
Correctness, pedagogical value and "better/same/worse" need a person. `npm run eval:explanations:review`
writes `evaluation-output/explanation-review.md` for that, and a filled `evaluation-output/human-review.json`
is tallied in the summary.

## 3. Deterministic baseline (run offline)

```
Explanation evaluation — deterministic

Cases: 12
Valid schema: 11/11
Boundary violations: 0
Grounded: 11/11
Pedagogy (heuristic): 11/11
Progressive-scaffold violations (heuristic): 0
Restates the hint (heuristic): 0
Concise (≤220 chars): 11/11
Authorship checks: 1/1
Unavailable handled: 1/1
```

Phase 11 found one progressive-scaffold issue: the Q2 inverse-operation explanation stated the next equation
(`2x = 12`). Phase 12 audited every deterministic misconception mapping against the question's transition graph
and removed later results from them: the three inverse-operation explanations no longer state the next equation,
the three arithmetic explanations no longer state the answer, and the partial-distribution explanations describe
what the number multiplies instead of the expanded result. Accepted-step and suggested-step explanations still
state the step they explain, because that equation is part of the supplied state. A test now fails if any
misconception, hint or example explanation names a later equation. The heuristic reports 0 violations.

## 4. Model tested

None. Live evaluation blocked (no `LLM_API_KEY`). Run `npm run eval:explanations:llm` with `LLM_API_KEY` (and optionally `LLM_MODEL`) set.

## 5. Prompt version

`explanation-prompt/1` is the only version. It stays active until live results show a concrete, repeated problem.

## 6–10. Automated results, human review, latency, failure patterns, prompt changes

Blocked, pending credentials. No human review has been done, no prompt V2 exists and none is justified. The runner already records schema, boundary, grounding (heuristic), authorship,
future-step leakage (heuristic), length, restatement (heuristic), latency (average and median), token counts
and prompt version per case. The model's own results are saved to `evaluation-output/latest.json` (ignored).
A second prompt version is created only if repeated failures justify it; V1 is never edited.

## 11. Routing policy

Provisional and unchanged: `llm-first` (`explanationRoutingPolicy.ts`), with the deterministic provider as fallback. This is
the pre-existing behaviour and is not evidence-based. A hybrid policy would be a change to the per-target
table in that file, backed by the results above.

## 12. Limitations

- Corpus is small and hand-written; one run per case; heuristics are not semantic understanding.
- Model results are nondeterministic and are not committed.

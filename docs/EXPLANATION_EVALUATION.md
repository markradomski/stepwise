# Explanation evaluation

Authoritative summary of how model-written explanations compare with the deterministic baseline.

**Evaluation date:** 2026-10-06 · **Model:** `claude-haiku-4-5-20251001` · **Settings:** temperature 0, max 400 output tokens,
8 s timeout, one response per case, cache bypassed (the evaluation runs through a fresh handler, so every result is a
real generation) · **Prompts:** `explanation-prompt/1` (active) and `explanation-prompt/2` (evaluated, not adopted).

> **Reviewer disclosure.** The human-review judgements below were made by the implementing assistant (an AI), not by a
> person, and not by the model being evaluated. They are recorded in `docs/evaluation/human-review-v1.json` and
> `-v2.json` with a note per case. A human reviewer should confirm them, particularly the three borderline calls:
> q2-accepted-subtraction (same), q1-suggested-step (better) and q3-accepted-distribution (worse).

## 1. Corpus

12 fixed cases (`src/features/explanation/evaluation/corpus.ts`), unchanged between prompt versions: 4 misconception
(partial distribution Q1 and Q3, inverse operation Q2, arithmetic Q2), 5 accepted-step (including the equivalent learner
form `2x = 17 - 5`), 2 suggested-step and 1 unsupported target. Hint and example targets are not in the corpus.

## 2. Deterministic baseline

Before the live run, the deterministic copy was audited for future-step leakage and fixed (Phase 12: inverse-operation,
arithmetic and partial-distribution explanations no longer state later results).

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

## 3. Prompt V1: automated results (11 supported cases)

| Check | Result |
| --- | --- |
| Valid schema | 10/11 (1 timeout in the first run; not reproduced in 3 reruns) |
| Boundary violations (automated) | 1 (q2 inverse-operation: the `example` field states `2x = 12`) |
| Progressive-scaffold flag (heuristic) | 1; human review found 4 (see §5) |
| Grounding (heuristic) | 8/10 pass; 2 of the 3 flags were false negatives (see §5) |
| Concise (≤220 characters) | 6/10 |
| Latency, successful calls | median 1994 ms, average 2102 ms, max 2731 ms (deterministic: ~0 ms) |
| Tokens per call | median 1039 in, 190 out; max output 214 |
| Failures | 0 provider errors, 0 invalid outputs, 1 timeout |

Rerun: `q3-accepted-distribution` timed out at 8 s in the first run. It was rerun 3 times and succeeded each time (2.1–2.3 s,
identical text), so the timeout was a one-off. The three reruns are the outputs reviewed for that case.

## 4. Prompt V1: human review

| Case | Value | Notes |
| --- | --- | --- |
| q1-misconception-partial-distribution | same | Correct, clear, adds little over the deterministic copy |
| q1-accepted-divide | same | Paraphrase |
| q1-suggested-step | **better** | Explains why: dividing undoes the multiplication by 3 |
| q2-misconception-inverse-operation | same | Body safe; `example` states `2x = 12` |
| q2-accepted-subtraction | same | Adds per-side arithmetic, no material gain |
| q2-accepted-equivalent-form | **worse** | Ignores the learner's `2x = 17 - 5` |
| q2-accepted-division | same | Paraphrase |
| q3-misconception-partial-distribution | **worse** | Drops the sign: "the x and the 1" |
| q3-accepted-distribution | **worse** | Expansion right; says the operation is applied "to the left side only" yet both sides stay equal |
| q3-suggested-step | **better** | Explains why: undo the multiplication by 4 |
| q2-misconception-arithmetic | **worse** | Generic; explains nothing about the error; `example` reveals the answer |

**Better 2, Same 5, Worse 4** (11 reviewed, plus 1 unsupported case handled by the deterministic provider as unavailable).

Hard-failure counts (human): mathematical errors 2 (q3 sign drop; q3 muddled reasoning); grounding failures 1 (q2 equivalent);
scaffold leaks 4, all in the optional `example` field; authorship failures 1 (drops the learner's form, never claims they typed
`2x = 12`); tone failures 0.

## 5. V1 failure patterns

Repeated (3 or more):
- **Future results in the `example` field: 4 of 10** (q1 partial distribution `3x`/`6`, q2 inverse `2x = 12`, q2 arithmetic answer `6`,
  q3 partial distribution `4x`/`4`). The UI renders only title and body, so no learner saw these, but the output breaks the scaffold rule.
  The automated heuristic caught 1: it looks for supplied expressions verbatim and missed paraphrases such as "which equals 6".
- **No added value on accepted steps and most misconceptions:** 0 better of 5 accepted-step and 0 of 4 misconception cases.

One-off or small-n (not treated as patterns): sign error in Q3 partial distribution (it recurred in the V2 run, same case), generic text
for the arithmetic case, ignoring the equivalent learner form (1 case), one timeout.

## 6. Prompt V2

**Rationale.** The only repeated, concrete problem was the `example` leak (4 of 10). V2 keeps every V1 restriction and adds one rule:
every equation, expression and result must already appear in the supplied data, and the example may be left out. Nothing else changed.
V1 is untouched; V2 is registered separately (`prompts/explanationPromptV2.ts`).

**Result on the same corpus (11 supported cases):** 11/11 valid, 0 timeouts; the model omitted `example` in all 11. Latency median 1671 ms,
average 1645 ms, max 1985 ms; tokens median 1102 in, 135 out. Human review: **Better 0, Same 6, Worse 5**.

## 7. V1 vs V2

| Pattern | V1 | V2 |
| --- | --- | --- |
| Future result in `example` | 4/10 | 0 (field omitted): improved |
| Future result in the displayed body | 0 | 1 (q1 partial distribution: "This gives 3x + 6, not 3x + 2"): **regressed** |
| Better than deterministic | 2 | 0: **regressed** (the "why" in suggested steps disappeared) |
| Q3 sign error | present | present: unchanged |
| Ignored learner form | present | present: unchanged |
| Generic arithmetic text | present | present: unchanged |
| Latency / tokens | median 1994 ms | median 1671 ms: improved |

V2 removed an undisplayed problem, introduced a displayed leak and lost both cases where the model had added value, so **V1 stays
active**. Single runs at temperature 0 are not a measure of variance.

## 8. Latency

The model took about 2 s per explanation (1.7 s for V2) against effectively zero for deterministic text, and one call in 11 timed out at 8 s.
That is acceptable for an optional, on-demand explanation behind an "Explaining…" state, but it is a real cost and counts against using
the model where it adds nothing.

## 9. Authorship

The model never claimed the learner typed `2x = 12`, but in 2 of 2 runs it ignored the learner's `2x = 17 - 5` entirely, which the
deterministic copy acknowledges. Equivalent learner forms stay deterministic.

## 10. Progressive scaffolding

Displayed bodies were safe in V1 (0 leaks). The leaks were in the unused `example` field (4/10). V2 leaked once in a displayed body.
The deterministic baseline passes the heuristic with 0 violations and has a test covering every misconception mapping.

## 11. Final routing policy: hybrid by target (`explanationRoutingPolicy.ts`)

| Target | Route |
| --- | --- |
| suggested-step | model first, deterministic fallback |
| misconception | deterministic |
| hint | deterministic (no corpus evidence) |
| example | deterministic (no corpus evidence) |
| accepted-step, including equivalent learner forms | deterministic |

**Why.** Across the reviewed cases the model was better only on suggested steps (2/2). Everywhere else it was the same or worse, with
a sign error, an ignored learner expression and generic text, and it costs about 2 s. The deterministic provider is always the fallback
for model routes and the whole path for the rest. The policy is encoded in one table and tested for every target kind.

## 12. Limitations

- Only 2 suggested-step cases, both Q1/Q3 bracket questions; none for Q2. "Better" there is a small, mild result.
- One generation per case, one model, one corpus of 12. Heuristic checks are not semantic; several grounding flags were false negatives.
- Reviewed by an AI assistant, not a human (see the disclosure). Judgements may shift under human review.
- Hint and example targets were not evaluated, so they stay deterministic by default rather than by evidence.
- Raw model output is kept in the ignored `evaluation-output/` directory and is not committed.

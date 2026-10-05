# Stepwise case study

Stepwise is a small adaptive maths-practice prototype: three linear-equation questions, step-by-step working, and help that appears only when it is useful. This note explains the product thinking, the system design and what the model evaluation found. It is a prototype; nothing here is claimed to improve learning outcomes.

## Problem

Learners need support, but an interface can easily fail them in two ways: by exposing every internal judgement (scores, diagnoses, levels), or by turning help into a wall of controls. The question was how much a system can know without the learner having to see it.

## Design hypothesis

**The system can know more than the learner needs to see.** Stepwise keeps a rich internal state (canonical expression, recognised misconception, help history, a mastery estimate) and shows the learner only the next useful thing: their working, honest feedback and, on request, one piece of help.

## Interaction model

- **One continuous sequence.** The given equation is the first line; accepted steps follow; a system-suggested step is labelled as such. It reads as one piece of reasoning, and the learner writes each line as the equation after one operation.
- **Accepted versus rejected work.** A rejected attempt stays visible, marked with text and an icon (not colour alone). A recognised misconception gets specific feedback. An unrecognised step is not called wrong: it gets neutral wording, only a generic prompt and no invented diagnosis.
- **Four kinds of help.** A generic **Prompt** (non-diagnostic), a **Hint** (specific to a recognised misconception), an **Example** (a different expression, never the answer) and a **Suggested next step** (a system-authored line that enters the working).
- **Completion.** A solved question replaces the input with a clear next action; the solved working stays on screen.

## Progress versus mastery

Visible progress is plain: Question 1 of 3, then 2, then 3. A separate mastery estimate exists only for the inspector. It is a small illustrative rule (a completion gain reduced by the help used), not a validated assessment model, and the learner never sees it. Keeping the two apart avoids turning a practice session into a score.

## Assistance model

Help follows explicit, deterministic rules: a fresh state offers **Need help?**, which gives a Prompt; the first recognised misconception offers a Hint; after a Hint comes an Example; after an Example comes the Suggested next step. A repeated mistake changes which help is *available* next but never reveals anything on its own. Taking the suggested step closes the old help and starts the new state fresh. All of it sits in one compact surface behind one quiet launcher beside Check step, with at most one way back to earlier help. Reopening or closing help never counts as new help, and never touches mastery.

## Explanation boundary

An optional **Explain this** action answers "why does this make sense?" (help answers "what do I do next?"). Explanations come from a provider behind a narrow boundary:

1. Trusted Stepwise state is turned into a small structured request (question, target, expressions, the deterministic text already shown). It excludes mastery, session counts, other attempts and anything from the inspector.
2. A routing policy picks the provider. The server builds a versioned prompt itself, so the browser cannot send prompts.
3. Provider output is untrusted. It is validated (version, lengths, no unknown fields) on the server and again in the browser, and rendered as plain text.
4. Any failure (timeout, invalid output, rate limit, provider error) falls back to the deterministic explanation.

The output schema has no field for correctness, misconception, next step, progress or mastery. The model can only reword a judgement Stepwise has already made. Rate limiting, request dedupe and a small bounded cache protect cost; the API key never reaches client code. Details: [EXPLANATION_MODEL_BOUNDARY.md](EXPLANATION_MODEL_BOUNDARY.md).

## Evaluation

I did not assume the model would be better. A fixed corpus of 12 cases (11 supported, 1 unsupported) covers misconceptions, accepted steps, suggested steps and an equivalent learner form (`2x = 17 - 5`). Each output is checked for schema, boundary (no correctness claims, no system terms, no blame), grounding, authorship and future-step leakage, then rated Better, Same or Worse than the deterministic text.

Run against `claude-haiku-4-5-20251001` with prompt V1: **Better 2, Same 5, Worse 4**, median latency about 2 s. The two Better cases were both Suggested next step explanations, where the model explained *why* a step is taken. Elsewhere it paraphrased the deterministic text or was worse: it dropped a negative sign, wrote a generic arithmetic explanation and ignored the learner's equivalent form.

**Caveat:** the Better / Same / Worse judgements were made by an AI assistant, not an independent human, and the sample is small (two suggested-step cases, one run each). Treat this as evidence-informed, not conclusive. Full detail: [EXPLANATION_EVALUATION.md](EXPLANATION_EVALUATION.md).

## What changed because of evaluation

- **The deterministic baseline had scaffold leaks.** Comparing against it exposed that some deterministic explanations stated the next equation or the final answer. They were fixed and a test now covers every mapping.
- **Prompt V2 was rejected.** It was written for one repeated problem (future results in the optional `example` field). It removed that, but lost both cases where V1 helped and fixed nothing else. V1 stays active; V2 is kept, registered and documented.
- **Routing became hybrid.** The model is tried first only for Suggested next step; accepted steps, misconceptions, hints and examples use the deterministic provider; every model route falls back to deterministic.

## What I would do next

- Have a human reviewer confirm or overturn the Better / Same / Worse judgements.
- Add more Suggested next step cases (there is none for Question 2) and evaluate hint and example targets.
- Deploy the existing Cloudflare adapter and test rate limits and caching live.
- Consider more maths domains only after the architecture has held up on this one.

## Limitations

Three questions, one topic, one model, one run per case, heuristic automated checks, and no learner testing. The mastery estimate is illustrative. The Cloudflare path is untested, and the repository has no remote yet.

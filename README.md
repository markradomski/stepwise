# Stepwise

An adaptive maths practice prototype that reveals the right amount of help at the right time.

Stepwise explores the difference between what a learning system knows internally and what should be shown to a learner at a given moment. The first topic is simple linear equations.

The project is intentionally narrow in scope.

## Stack

React, TypeScript, Vite, CSS Modules, Vitest and React Testing Library.

## Design

The visual prototype lives in [Figma](https://www.figma.com/design/DbgJ4GfXerydrZzYUhEvol).

## Status

The learner UI follows the Figma prototype. The default route is a real three-question practice session, starting with `3(x + 2) = 18`, with:

- truthful question progress (Question 1 of 3, 2 of 3, 3 of 3), a dedicated "Question complete" state that replaces the input with a Next question action (the solved working stays visible), and a final Practice complete state
- contextual help: a single quiet launcher beside Check step opens one compact, embedded help surface that shows only the support currently relevant (prompt, hint or example), one forward action and, at most, one way back to earlier help. Support is deterministic and progressively exposed: it follows the learner's own actions and diagnosed difficulty, never time, and generic help can never escalate to the answer. Repeated difficulty changes which help is available next without auto-revealing it, and reviewing or closing help never counts as new help
- optional explanation layer: an "Explain this" action beside feedback, a hint, an accepted step or a suggested step opens a small inline explanation of why it makes sense. It elaborates on deterministic feedback and working without controlling correctness or progression: correctness and misconception detection stay deterministic. Explanations come from a provider interface that receives a narrow structured request and returns display-only text that is validated before rendering; the only provider today is local and deterministic, and no external service is called
- model-backed explanations (optional): the explanation provider can be switched to a language model on the server. Correctness, diagnosis and progression stay deterministic; the model only receives a narrow structured explanation request, its output is untrusted and validated before display, and the deterministic explanations remain the fallback. API keys stay server-side and the app works without any configuration. See [docs/EXPLANATION_MODEL_BOUNDARY.md](docs/EXPLANATION_MODEL_BOUNDARY.md)
- one continuous working sequence: the given line, the learner's accepted steps and any system-suggested step read as a single piece of reasoning, while authorship (a labelled suggested step) and uncertainty (a recognised misconception versus an unrecognised attempt) stay visibly distinct
- per-question content: each question defines its own generic prompts, hints, worked examples and misconception feedback
- session-level learning state kept apart from the question on screen
- a hidden internal mastery estimate, visible only in the inspector (`?inspector=1`) and never to the learner. It is a small illustrative rule, not a validated assessment model.

Each question includes:

- real step entry
- deterministic validation, with no maths library or AI
- multiple valid solution paths (distribute first, or divide first)
- feedback for recognised misconceptions, with a stronger message when one repeats
- an explicit interaction model: write the equation as it looks after one operation, one line at a time, shown on screen before the first step; the given equation is the first line of the working, accepted steps accumulate beneath it, and valid unsimplified steps (such as `x + 2 = 18/3`) get light guidance to simplify
- recognition of simple equivalent forms, such as `(x + 2) = 18/3` or `x = 12/3`, while keeping the learner's own expression in the working
- honest handling of uncertainty: a step it can't match is not called wrong, gets neutral wording and only a generic hint, and is never given a made-up diagnosis
- progressive scaffolding: a prompt, hint, worked example and system-provided next step, each revealed only on request and one forward action at a time
- a distinction between a correct answer and evidence of reasoning: a correct final answer that skips the working is acknowledged but doesn't complete the question

Developer note:

- `/` is the live interactive app, with nothing but the product on screen. `?inspector=1` adds the learning-state inspector.
- `?dev=1` shows the live app with development navigation.
- `?state=01` to `?state=06` are static visual previews. They show the development navigation and a "Static demo preview" banner, and their controls are disabled. "Return to Live" goes back to `/`.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` starts the development server
- `npm run build` type-checks and builds for production
- `npm test` runs the test suite
- `npm run typecheck` runs TypeScript without building

## Optional model configuration

Without configuration the deterministic provider is used.

```bash
cp .env.example .env
# set EXPLANATION_PROVIDER=llm and LLM_API_KEY=... (server-only; never prefix with VITE_)
npm run dev
```

The same explanation handler runs locally as Vite middleware and when deployed as Cloudflare Pages Functions
(`functions/api/`; `wrangler pages deploy dist` serves both). It applies a per-client rate limit (default 10 a
minute), shares identical in-flight requests, and keeps a small bounded cache of validated results. A rate-limited
or failed model call falls back to the deterministic explanation. Limits are tunable in `.env.example`; they are
in-memory and per instance.

Stepwise routes explanations by target type based on a reviewed evaluation against the deterministic baseline, not the model
universally: the model is used first only for suggested-step explanations (better in 2 of 2 reviewed cases, small sample), and the
deterministic provider handles everything else and is always the fallback. See
[docs/EXPLANATION_EVALUATION.md](docs/EXPLANATION_EVALUATION.md).

```bash
npm run eval:explanations         # deterministic baseline, offline
npm run eval:explanations:llm     # also evaluates the configured model (opt-in, uses the API)
npm run eval:explanations:review  # writes evaluation-output/explanation-review.md for human review
npm run mock:llm                  # local stand-in for the model API, to try fallbacks without a key
```

## Case study note

Stepwise evaluates model-generated explanations against a deterministic baseline for correctness, grounding, scaffold safety,
authorship, pedagogy and latency. Model use is routed only where reviewed outputs showed added value: in the first evaluation (12
cases, one model) that was suggested-step explanations only. The reviewed judgements were made by an AI assistant and await a human
check, and the sample is small.

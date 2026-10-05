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

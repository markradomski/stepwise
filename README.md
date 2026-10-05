# Stepwise

An adaptive maths practice prototype that reveals the right amount of help at the right time.

Stepwise explores the difference between what a learning system knows internally and what should be shown to a learner at a given moment. The first topic is simple linear equations.

The project is intentionally narrow in scope.

## Stack

React, TypeScript, Vite, CSS Modules, Vitest and React Testing Library.

## Design

The visual prototype lives in [Figma](https://www.figma.com/design/DbgJ4GfXerydrZzYUhEvol).

## Status

The learner UI follows the Figma prototype. The default route is a working practice question, `3(x + 2) = 18`, with:

- real step entry
- deterministic validation, with no maths library or AI
- multiple valid solution paths (distribute first, or divide first)
- feedback for recognised misconceptions, with a stronger message when one repeats
- progressive scaffolding: a hint, then a worked example, then a system-provided next step, each revealed only when the situation calls for it
- a distinction between a correct answer and evidence of reasoning: a correct final answer that skips the working is acknowledged but doesn't complete the question

Use the selector at the bottom left to switch views. `?inspector=1` shows the learning-state inspector beside the live question. `?state=01` to `?state=06` render the static designed states for visual review. Narrow the viewport to review the mobile layout.

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

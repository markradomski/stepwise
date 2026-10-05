# Stepwise

An adaptive maths practice prototype that reveals the right amount of help at the right time.

Stepwise explores the difference between what a learning system knows internally and what should be shown to a learner at a given moment. The first topic is simple linear equations.

The project is intentionally narrow in scope.

## Stack

React, TypeScript, Vite, CSS Modules, Vitest and React Testing Library.

## Design

The visual prototype lives in [Figma](https://www.figma.com/design/DbgJ4GfXerydrZzYUhEvol).

## Status

Phase 1 implements the learner UI from the Figma prototype, driven by static fixture states. There is no maths evaluation or adaptive logic yet.

Open `?state=01` to `?state=06` to review each designed state, or use the demo selector at the bottom left. Narrow the viewport to review the mobile layout.

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

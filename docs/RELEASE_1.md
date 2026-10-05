# Release 1

- **Live demo:** https://stepwise.mrad-a17.workers.dev/
- **Source:** https://github.com/markradomski/stepwise (branch `master`)
- **Platform:** Cloudflare Workers with static assets. `worker/index.ts` handles `/api/*` through the shared handler; every other path is served from `dist` as a single-page app (`wrangler.jsonc`). Runtime variables and secrets (`EXPLANATION_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`) are set in the Cloudflare dashboard.
- **Deployed from:** `master`, including commit `64924bd` (the Worker entry).

## Verified live (2026-10-06)

| Check | Result |
| --- | --- |
| Root, `?inspector=1`, `?dev=1`, static states 03/09/14/16/17 | Load correctly; static states show the banner and disabled controls |
| Deterministic route (accepted step) | Provider Deterministic, outcome Deterministic only, no model call |
| Model route (Suggested next step, Explain this) | "Explaining…", then a real model explanation; provider LLM, routing LLM preferred, outcome Success, prompt `explanation-prompt/1`; mastery unchanged |
| Cache | First request Miss (about 2.2 s), repeat Hit (about 26 ms) |
| Mobile (390px) | Q1 flow, help, example, Suggested step, a real-model explanation and completion fit with no overflow and no target under 44 px |
| Keyboard | Enter submits; Tab reaches Help; Close help returns focus to Help; focus ring visible; final Enter does not activate Next question |
| Secrets | Deployed JS and CSS, `/api/explain/config` and `/api/explain` contain no API key, `sk-ant` or local paths |

## Not triggered in production

- **Fallback:** production fallback was not induced. It is covered by automated tests and was verified in the local Workers runtime against a mock model.
- **Rate limit:** the production limit was not intentionally triggered. The 429 path is covered by automated tests and was verified in the local Workers runtime, including the deterministic fallback.

## Known limitations

- The rate limiter and cache are in memory and per Worker isolate, so limits and hits are approximate across instances.
- The public model endpoint has lightweight abuse controls, not enterprise-grade ones.
- The Better / Same / Worse evaluation review was done by an AI assistant and is not independently human-validated; the corpus is small.
- No real-user study and no screen-reader testing; the mastery estimate is illustrative only.
- A prototype, not a production-ready platform.

# Explanation model boundary

Stepwise can optionally use a language model to word explanations. The model never makes a maths decision.

## 1. What the model can do

Write a short, plain-text explanation of something Stepwise has already established: why a feedback message,
hint, example, accepted step or suggested step makes sense.

## 2. What it cannot do

Judge correctness, diagnose a misconception, choose or reveal the next canonical step, decide help
availability, complete a question, or touch mastery, scoring or progress. The output schema has no field for
any of these, and the validator rejects unknown fields.

## 3. Request schema (`explanation-request/1`)

`questionId`, `targetKind`, `currentExpression`, and where applicable `learnerExpression`,
`canonicalExpression`, `misconceptionId`, plus the deterministic label and content already on screen.
Built by `buildExplanationRequest` from trusted state. Nothing else leaves the browser.

## 4. Output schema (`explanation-output/1`)

`{ version, title (≤80), body (≤500), example? (≤200) }`, plain text only.

## 5. Validation

- Server: `validateExplanationRequest` checks version, target enum, field types and lengths, body size
  (4 KB) and rejects unknown fields, so the browser cannot send prompts or messages.
- The server builds the prompt itself (`explanation-prompt/1`). Learner text is JSON-encoded inside a
  delimited data block.
- Model output is requested as a single forced structured result, then checked by
  `validateExplanationResult` on the server and again in the browser before anything renders.

## 6. Fallback

`LLM → deterministic provider → safe "unavailable" message`. One attempt per provider; no retries.
Without server configuration the deterministic provider is used directly. It is also the reference
implementation for the evaluation corpus.

## 7. Failure states

Timeout, network/HTTP error, malformed response, and invalid output each fall back to the deterministic
provider. If it has no explanation, the learner sees "I can’t add a useful explanation for this yet."
The inspector shows provider attempted, provider used, outcome (for example `Fallback · Timeout`),
prompt version and latency. Learners never see technical detail.

## 8. Data minimisation

No mastery, session counts, previous questions, other attempts, identity, inspector state or browser
metadata is sent. The API key is read server-side only (`LLM_API_KEY`) and never reaches client code.
Logs record status and latency only.

## 9. Evaluation

`npm run eval:explanations` runs a 12-case corpus against the deterministic provider with no network.
`npm run eval:explanations:llm` additionally evaluates the configured model (opt-in, uses the API, needs
`LLM_API_KEY`; writes ignored output to `evaluation-output/`). Checks: schema, boundary (no correctness
judgement, no system terms, no blame, no future answers), grounding, pedagogy, authorship. It is a practical
sanity check, not an educational benchmark.

## 10. Deployable boundary and abuse controls

One framework-free handler (`server/explainHandler.ts`) serves both the Vite dev middleware
(`server/vitePlugin.ts`) and a web-standard adapter (`server/webAdapter.ts`) used by the Cloudflare Pages
Functions in `functions/api/`. Behaviour is identical on both paths; only the client key differs (socket
address locally, `CF-Connecting-IP` when deployed).

- **Rate limit:** fixed window per anonymous client key (default 10 / minute). Exceeding it returns 429
  `rate-limited`; the browser falls back to the deterministic explanation. Nothing is stored beyond the window.
- **Deduplication:** identical concurrent requests share one model call within a server instance.
- **Cache:** bounded in-memory LRU with TTL (default 200 entries, 15 minutes). Keyed on prompt version, model
  and the normalised request. Only validated successes are cached; errors, timeouts and invalid output never are.
- **Outcomes:** success, deterministic-only, and fallback reasons timeout, network, invalid output, rate limited,
  provider error; or unavailable. Shown only in the inspector.
- **Limits of these controls:** state is per process/isolate, so a distributed deployment needs a shared limiter.

## 11. Routing policy

Hybrid by target, chosen from reviewed live results: the model is tried first only for suggested-step explanations; every
other target uses the deterministic provider directly. The deterministic provider is always the fallback. Model use is
conditional by target. See `docs/EXPLANATION_EVALUATION.md`. Routing lives in `explanationRoutingPolicy.ts` as an explicit table.

## 12. Live evaluation findings

Run on 2026-10-06 against `claude-haiku-4-5-20251001`, prompt `explanation-prompt/1` (active): better than deterministic on 2 of 11
cases (both suggested steps), same on 5, worse on 4; median latency about 2 s. Prompt `explanation-prompt/2` was evaluated and not
adopted. The deterministic baseline was audited for future-step leakage and now passes. Reviewed by an AI assistant, pending human
confirmation.

## 13. Known limitations

- Rate limiting, dedupe and cache are in-memory and per instance.
- Unresolved: the model sometimes puts future results in the unused `example` field, drops negative signs in bracket cases and ignores
  equivalent learner forms; evidence for the suggested-step route rests on two cases.
- Grounding and pedagogy checks are pattern-based and can miss subtle errors; boundary checks can
  over-flag unusual wording.
- What can be explained is defined by the deterministic mapping, so the model cannot extend coverage.
- Single model call, no streaming, no caching.

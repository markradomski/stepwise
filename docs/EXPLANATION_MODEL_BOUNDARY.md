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

## 10. Known limitations

- The local proxy is a Vite middleware; a deployment needs the same handlers as a function plus rate limiting
  and abuse controls.
- Grounding and pedagogy checks are pattern-based and can miss subtle errors; boundary checks can
  over-flag unusual wording.
- What can be explained is defined by the deterministic mapping, so the model cannot extend coverage.
- Single model call, no streaming, no caching.

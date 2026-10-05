# Stepwise: portfolio summary

**Title:** Stepwise

**One-liner:** Adaptive maths practice that reveals the right amount of help at the right time.

**Short description:** Stepwise is a React and TypeScript prototype of a maths-practice interface. Learners work through linear equations one line at a time while the system quietly tracks what it knows: validation, misconceptions, help history, a hidden mastery estimate. It shows only the support needed at that moment, through one compact help surface and a continuous working sequence. Model-written explanations are an optional layer behind a validated boundary: the maths is always deterministic, and the model was evaluated against a deterministic baseline before being given any role.

**Role / focus:** Product engineering, interaction design, React/TypeScript, deterministic learning state, accessibility, Figma alignment, evaluated LLM integration.

**Key points**
- Interaction design: continuous step-by-step working, text-and-icon feedback (never colour alone), a single contextual help launcher, keyboard behaviour covered by tests, mobile layouts checked at 390px.
- State-heavy UI kept clean: validation, assistance escalation, session state and the mastery estimate are pure, tested logic, separate from presentation.
- Product reasoning: progress is separate from mastery, unrecognised is not "wrong", and help escalates by explicit rules.
- Model boundary: narrow structured request, server-built versioned prompt, validated output, deterministic fallback, rate limiting, dedupe and a bounded cache.
- Evidence-based routing: model used first only for Suggested next step explanations; deterministic everywhere else.

**Model / evaluation note:** On a 12-case corpus with `claude-haiku-4-5-20251001` the model was better than deterministic text in 2 cases, the same in 5 and worse in 4, so it is routed to only one explanation type. The Better / Same / Worse review was done by an AI assistant and awaits independent human review; the sample is small.

**Links:** repository README, `docs/CASE_STUDY.md`, `docs/EXPLANATION_EVALUATION.md`. No live URL or git remote yet.

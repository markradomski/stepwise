import type { Misconception } from '../practice/validation';

export const REQUEST_VERSION = 'explanation-request/1';
export const OUTPUT_VERSION = 'explanation-output/1';

export const LIMITS = { title: 80, body: 500, example: 200 } as const;

// What can be explained. Each target names content the deterministic system has already produced.
export type ExplanationTarget =
  | {
      kind: 'misconception';
      questionId: string;
      expression: string;
      misconceptionId: Misconception;
      learnerExpression: string;
    }
  | { kind: 'hint'; questionId: string; expression: string; misconceptionId: Misconception }
  | { kind: 'example'; questionId: string; expression: string; misconceptionId: Misconception }
  | { kind: 'suggested-step'; questionId: string; fromExpression: string; suggestedExpression: string }
  | {
      kind: 'accepted-step';
      questionId: string;
      previousExpression: string;
      submittedExpression: string;
      canonicalExpression: string;
    };

export type ExplanationTargetKind = ExplanationTarget['kind'];

// The only thing a provider ever receives. It deliberately excludes mastery, session counts,
// other attempts and anything from the inspector.
export type ExplanationRequest = {
  version: typeof REQUEST_VERSION;
  questionId: string;
  targetKind: ExplanationTargetKind;
  currentExpression: string;
  learnerExpression?: string;
  canonicalExpression?: string;
  misconceptionId?: Misconception;
  deterministicLabel?: string;
  deterministicContent?: string;
};

// Display-only text. There are intentionally no fields for correctness, progression, diagnosis or scoring.
export type ExplanationResult = {
  version: typeof OUTPUT_VERSION;
  title: string;
  body: string;
  example?: string;
};

export type UntrustedExplanationResult = unknown;

export type ExplanationProviderOutcome =
  | { status: 'ok'; value: UntrustedExplanationResult }
  | { status: 'unavailable' };

export interface ExplanationProvider {
  id: string;
  label: string;
  supports(request: ExplanationRequest): boolean;
  explain(request: ExplanationRequest): Promise<ExplanationProviderOutcome>;
}

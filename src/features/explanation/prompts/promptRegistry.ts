import { buildExplanationPromptV1, PROMPT_VERSION, type ExplanationPrompt } from './explanationPromptV1';
import type { ExplanationRequest } from '../explanationTypes';

// Prompt versions are immutable. A new version is added alongside, never edited in place.
export const promptBuilders: Record<string, (request: ExplanationRequest) => ExplanationPrompt> = {
  [PROMPT_VERSION]: buildExplanationPromptV1,
};

export const ACTIVE_PROMPT_VERSION = PROMPT_VERSION;

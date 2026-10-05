import type { Ref } from 'react';
import { Button } from '../../components/Button/Button';
import { CompletionPanel } from '../../components/CompletionPanel/CompletionPanel';
import { ExplainSlot, type ExplainSlotProps } from '../../components/ExplanationSurface/ExplanationSurface';
import { FeedbackMessage, type FeedbackKind } from '../../components/FeedbackMessage/FeedbackMessage';
import { HelpSurface, type HelpSurfaceProps } from '../../components/HelpSurface/HelpSurface';
import { HintAction } from '../../components/HintAction/HintAction';
import { InteractionGuide } from '../../components/InteractionGuide/InteractionGuide';
import { Inspector } from '../../components/Inspector/Inspector';
import { MathInput } from '../../components/MathInput/MathInput';
import { QuestionShell } from '../../components/QuestionShell/QuestionShell';
import { WorkingStep, type WorkingStepSource, type WorkingStepStatus } from '../../components/WorkingStep/WorkingStep';
import type { LearningState } from '../../lib/learningState';
import styles from './LearnerView.module.css';

export type LearnerViewProps = {
  progress?: { currentQuestion: number; totalQuestions: number };
  question: { instruction: string; expression: string };
  workingSteps: Array<{ expression: string; status: WorkingStepStatus; source?: WorkingStepSource }>;
  input?: {
    value: string;
    focused?: boolean;
    focusToken?: number;
    onChange?: (value: string) => void;
    onSubmit?: () => void;
  };
  feedback?: { kind: FeedbackKind; title?: string; message: string };
  primaryAction?: { label: string; disabled?: boolean; onClick?: () => void };
  completion?: { title: string; message: string; actionLabel: string; onAction?: () => void; focusKey?: number };
  help?: {
    launcher: { label: string; onClick?: () => void; ref?: Ref<HTMLButtonElement> };
    surface?: HelpSurfaceProps;
  };
  explain?: { feedback?: ExplainSlotProps; step?: ExplainSlotProps };
  inspector?: LearningState;
  preview?: boolean;
  guideOpen?: boolean;
};

export function LearnerView({
  progress,
  question,
  workingSteps,
  input,
  feedback,
  primaryAction,
  completion,
  help,
  explain,
  inspector,
  preview,
  guideOpen,
}: LearnerViewProps) {
  const lastStepStatus = workingSteps.at(-1)?.status;
  const lastStepNeedsWork = lastStepStatus === 'incorrect' || lastStepStatus === 'unrecognised';
  const lines: LearnerViewProps['workingSteps'] = [{ expression: question.expression, status: 'given' }, ...workingSteps];
  const chain = lines.map((line) => line.status === 'given' || line.status === 'accepted');
  const chainLength = chain.filter(Boolean).length;
  let chainPosition = 0;
  const railFor = (isChain: boolean) => {
    if (!isChain || chainLength < 2) return undefined;
    chainPosition += 1;
    return chainPosition === 1 ? 'start' : chainPosition === chainLength ? 'end' : 'middle';
  };
  const hasAcceptedWork = workingSteps.some((step) => step.status === 'accepted');
  return (
    <div className={`${styles.stage} ${inspector ? styles.withInspector : ''}`}>
      <main className={styles.column}>
        <QuestionShell progress={progress} question={question} />
        <InteractionGuide open={guideOpen ?? !hasAcceptedWork} />
        <section className={styles.working} aria-labelledby="working-heading">
          <h2 id="working-heading" className="overline">
            Your working
          </h2>
          <ol className={styles.steps} aria-label="Working so far">
            {lines.map((line, index) => (
              <WorkingStep key={index} {...line} rail={railFor(chain[index])}>
                {explain?.step && index === lines.length - 1 && <ExplainSlot {...explain.step} preview={preview} />}
              </WorkingStep>
            ))}
          </ol>
          <div role="status" className={`${styles.feedbackSlot} ${lastStepNeedsWork ? styles.attached : ''}`}>
            {feedback && (
              <div className={styles.help}>
                <FeedbackMessage {...feedback} />
                {explain?.feedback && <ExplainSlot {...explain.feedback} preview={preview} />}
              </div>
            )}
            {completion && <CompletionPanel {...completion} preview={preview} />}
          </div>
          {(input || primaryAction || help) && (
            <div className={styles.nextLine}>
              {input && (
                <MathInput
                  label="Write the equation after your next step"
                  helper="Use brackets, + − × ÷ and =."
                  {...input}
                  disabled={preview}
                />
              )}
              {(primaryAction || help) && (
                <div className={styles.actions}>
                  {primaryAction && (
                    <Button
                      disabled={preview || primaryAction.disabled}
                      preview={preview}
                      onClick={primaryAction.onClick}
                    >
                      {primaryAction.label}
                    </Button>
                  )}
                  {help && (
                    <HintAction
                      {...help.launcher}
                      expanded={Boolean(help.surface)}
                      controls={help.surface?.id}
                      disabled={preview}
                    />
                  )}
                </div>
              )}
              {help?.surface && <HelpSurface {...help.surface} preview={preview} />}
            </div>
          )}
        </section>
      </main>
      {inspector && (
        <div className={styles.inspectorSlot}>
          <Inspector state={inspector} />
        </div>
      )}
    </div>
  );
}

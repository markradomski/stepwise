import { useEffect, useRef } from 'react';
import { Button } from '../../components/Button/Button';
import { FeedbackMessage, type FeedbackKind } from '../../components/FeedbackMessage/FeedbackMessage';
import { HintAction } from '../../components/HintAction/HintAction';
import { Inspector } from '../../components/Inspector/Inspector';
import { MathInput } from '../../components/MathInput/MathInput';
import { QuestionShell } from '../../components/QuestionShell/QuestionShell';
import { WorkedExample } from '../../components/WorkedExample/WorkedExample';
import { WorkingStep, type WorkingStepSource, type WorkingStepStatus } from '../../components/WorkingStep/WorkingStep';
import type { LearningState } from '../../lib/learningState';
import styles from './LearnerView.module.css';

export type LearnerViewProps = {
  progress: { current: number; total: number; complete?: boolean };
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
  hint?: string;
  example?: { before: string; after: string; explanation: string };
  primaryAction?: { label: string; disabled?: boolean; onClick?: () => void; focusKey?: number };
  secondaryAction?: { label: string; emphasis?: 'quiet' | 'prominent'; onClick?: () => void };
  inspector?: LearningState;
};

export function LearnerView({
  progress,
  question,
  workingSteps,
  input,
  feedback,
  hint,
  example,
  primaryAction,
  secondaryAction,
  inspector,
}: LearnerViewProps) {
  const lastStepIncorrect = workingSteps.at(-1)?.status === 'incorrect';
  const primaryRef = useRef<HTMLButtonElement>(null);
  const primaryFocusKey = primaryAction?.focusKey ?? 0;

  // Deferred so the Enter keypress that completed the question can't also activate the new button.
  useEffect(() => {
    if (primaryFocusKey === 0) return;
    const timer = setTimeout(() => primaryRef.current?.focus());
    return () => clearTimeout(timer);
  }, [primaryFocusKey]);

  return (
    <div className={`${styles.stage} ${inspector ? styles.withInspector : ''}`}>
      <main className={styles.column}>
        <QuestionShell progress={progress} question={question} />
        <section className={styles.working} aria-labelledby="working-heading">
          <h2 id="working-heading" className="overline">
            Your working
          </h2>
          {workingSteps.length > 0 && (
            <ol className={styles.steps} aria-label="Working so far">
              {workingSteps.map((step, index) => (
                <WorkingStep key={index} {...step} />
              ))}
            </ol>
          )}
          <div role="status" className={`${styles.feedbackSlot} ${lastStepIncorrect ? styles.attached : ''}`}>
            {feedback && <FeedbackMessage {...feedback} />}
            {hint && <FeedbackMessage kind="hint" title="Hint" message={hint} />}
            {example && <WorkedExample {...example} />}
          </div>
          {input && (
            <MathInput
              label="Your next step"
              stepNumber={workingSteps.filter((step) => step.status === 'accepted').length + 1}
              helper="Use brackets, + − × ÷ and =."
              {...input}
            />
          )}
          {(primaryAction || secondaryAction) && (
            <div className={styles.actions}>
              {primaryAction && (
                <Button buttonRef={primaryRef} disabled={primaryAction.disabled} onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && <HintAction {...secondaryAction} />}
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

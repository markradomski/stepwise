import { Button } from '../../components/Button/Button';
import { FeedbackMessage, type FeedbackKind } from '../../components/FeedbackMessage/FeedbackMessage';
import { HintAction } from '../../components/HintAction/HintAction';
import { Inspector } from '../../components/Inspector/Inspector';
import { MathInput } from '../../components/MathInput/MathInput';
import { QuestionShell } from '../../components/QuestionShell/QuestionShell';
import { WorkingStep, type WorkingStepStatus } from '../../components/WorkingStep/WorkingStep';
import type { LearningState } from '../../lib/learningState';
import styles from './LearnerView.module.css';

export type LearnerViewProps = {
  progress: { current: number; total: number; complete?: boolean };
  question: { instruction: string; expression: string };
  workingSteps: Array<{ expression: string; status: WorkingStepStatus }>;
  input?: {
    value: string;
    focused?: boolean;
    focusToken?: number;
    onChange?: (value: string) => void;
    onSubmit?: () => void;
  };
  feedback?: { kind: FeedbackKind; title?: string; message: string };
  primaryAction?: { label: string; disabled?: boolean; onClick?: () => void };
  secondaryAction?: { label: string; emphasis?: 'quiet' | 'prominent' };
  inspector?: LearningState;
};

export function LearnerView({
  progress,
  question,
  workingSteps,
  input,
  feedback,
  primaryAction,
  secondaryAction,
  inspector,
}: LearnerViewProps) {
  const lastStepIncorrect = workingSteps.at(-1)?.status === 'incorrect';

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
                <Button disabled={primaryAction.disabled} onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && <HintAction label={secondaryAction.label} emphasis={secondaryAction.emphasis} />}
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

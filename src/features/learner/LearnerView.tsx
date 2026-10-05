import { Button } from '../../components/Button/Button';
import { CompletionPanel } from '../../components/CompletionPanel/CompletionPanel';
import { FeedbackMessage, type FeedbackKind } from '../../components/FeedbackMessage/FeedbackMessage';
import { HintAction } from '../../components/HintAction/HintAction';
import { InteractionGuide } from '../../components/InteractionGuide/InteractionGuide';
import { Inspector } from '../../components/Inspector/Inspector';
import { MathInput } from '../../components/MathInput/MathInput';
import { QuestionShell } from '../../components/QuestionShell/QuestionShell';
import { WorkedExample } from '../../components/WorkedExample/WorkedExample';
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
  hint?: string;
  example?: { before: string; after: string; explanation: string };
  primaryAction?: { label: string; disabled?: boolean; onClick?: () => void };
  completion?: { title: string; message: string; actionLabel: string; onAction?: () => void; focusKey?: number };
  secondaryAction?: { label: string; onClick?: () => void };
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
  hint,
  example,
  primaryAction,
  completion,
  secondaryAction,
  inspector,
  preview,
  guideOpen,
}: LearnerViewProps) {
  const lastStepStatus = workingSteps.at(-1)?.status;
  const lastStepNeedsWork = lastStepStatus === 'incorrect' || lastStepStatus === 'unrecognised';
  const lines: LearnerViewProps['workingSteps'] = [{ expression: question.expression, status: 'given' }, ...workingSteps];
  const latestLine = lines.map((line) => line.status === 'given' || line.status === 'accepted').lastIndexOf(true);
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
              <WorkingStep key={index} {...line} latest={index === latestLine} />
            ))}
          </ol>
          <div role="status" className={`${styles.feedbackSlot} ${lastStepNeedsWork ? styles.attached : ''}`}>
            {feedback && <FeedbackMessage {...feedback} />}
            {hint && <FeedbackMessage kind="hint" title="Hint" message={hint} />}
            {example && <WorkedExample {...example} />}
            {completion && <CompletionPanel {...completion} preview={preview} />}
          </div>
          {input && (
            <MathInput
              label="Write the equation after your next step"
              helper="Use brackets, + − × ÷ and =."
              {...input}
              disabled={preview}
            />
          )}
          {(primaryAction || secondaryAction) && (
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
              {secondaryAction && <HintAction {...secondaryAction} disabled={preview} />}
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

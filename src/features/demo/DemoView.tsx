import { Button } from '../../components/Button/Button';
import { FeedbackMessage } from '../../components/FeedbackMessage/FeedbackMessage';
import { HintAction } from '../../components/HintAction/HintAction';
import { Inspector } from '../../components/Inspector/Inspector';
import { MathInput } from '../../components/MathInput/MathInput';
import { QuestionShell } from '../../components/QuestionShell/QuestionShell';
import { WorkingStep } from '../../components/WorkingStep/WorkingStep';
import type { DemoState } from './demoStates';
import styles from './DemoView.module.css';

type Props = { state: DemoState };

export function DemoView({ state }: Props) {
  const { progress, question, workingSteps, input, feedback, primaryAction, secondaryAction, inspector } = state;
  const lastStepIncorrect = workingSteps.at(-1)?.status === 'incorrect';

  return (
    <div className={`${styles.stage} ${inspector ? styles.withInspector : ''}`}>
      <main className={styles.column}>
        <QuestionShell progress={progress} question={question} />
        <section className={styles.working} aria-labelledby="working-heading">
          <h2 id="working-heading" className="overline">
            Your working
          </h2>
          {(workingSteps.length > 0 || feedback) && (
            <div className={lastStepIncorrect ? styles.attached : styles.history}>
              {workingSteps.length > 0 && (
                <ol className={styles.steps} aria-label="Working so far">
                  {workingSteps.map((step) => (
                    <WorkingStep key={step.expression} {...step} />
                  ))}
                </ol>
              )}
              {feedback && <FeedbackMessage {...feedback} />}
            </div>
          )}
          {input && (
            <MathInput
              label="Your next step"
              stepNumber={workingSteps.length + 1}
              value={input.value}
              focused={input.state === 'focused'}
              helper="Use brackets, + − × ÷ and =."
            />
          )}
          {(primaryAction || secondaryAction) && (
            <div className={styles.actions}>
              {primaryAction && <Button disabled={primaryAction.disabled}>{primaryAction.label}</Button>}
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

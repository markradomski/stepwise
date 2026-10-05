import type { LearningState } from '../../lib/learningState';
import { ExposureStatus } from '../ExposureStatus/ExposureStatus';
import { LearningStateRow } from '../LearningStateRow/LearningStateRow';
import styles from './Inspector.module.css';

type Props = { state: LearningState };

export function Inspector({ state }: Props) {
  const { exposure } = state;
  return (
    <aside className={styles.inspector} aria-label="Learning state inspector">
      <header className={styles.header}>
        <h2 className={styles.title}>Inspector</h2>
        <p className={styles.note}>Internal view. The learner never sees this panel.</p>
      </header>
      <section>
        <h3 className="overline">Learning state</h3>
        <dl>
          <LearningStateRow label="Concept" value={state.concept} />
          <LearningStateRow label="Current strategy" value={state.strategy} />
          <LearningStateRow label="Attempt" value={String(state.attempt)} />
          {state.lastValidation && <LearningStateRow label="Last validation" value={state.lastValidation} />}
          {state.recognition && <LearningStateRow label="Recognition" value={state.recognition} />}
          {state.simplification && <LearningStateRow label="Simplification" value={state.simplification} />}
          {state.submittedExpression && <LearningStateRow label="Submitted" value={state.submittedExpression} />}
          {state.canonicalExpression && <LearningStateRow label="Canonical state" value={state.canonicalExpression} />}
          <LearningStateRow label="Detected misconception" value={state.misconception} />
          {state.helpSource && <LearningStateRow label="Help source" value={state.helpSource} />}
          <LearningStateRow label="Repeated misconception count" value={String(state.repeatedMisconceptionCount)} />
          <LearningStateRow label="Hint level" value={`${state.hintLevel.current} / ${state.hintLevel.max}`} />
          <LearningStateRow label="Mastery estimate" value={state.masteryEstimate.toFixed(2)} />
          <LearningStateRow label="Intervention" value={state.intervention} />
        </dl>
      </section>
      <section>
        <h3 className="overline">Exposure</h3>
        <dl>
          <ExposureStatus label="Mastery" status={exposure.mastery} />
          <ExposureStatus label="Misconception label" status={exposure.misconceptionLabel} />
          <ExposureStatus label="Next solution step" status={exposure.nextSolutionStep} />
          <ExposureStatus label="Hint" status={exposure.hint} />
          <ExposureStatus label="Worked example" status={exposure.workedExample} />
        </dl>
      </section>
    </aside>
  );
}

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
          {state.currentExpression && <LearningStateRow label="Current expression" value={state.currentExpression} />}
          <LearningStateRow label="Current strategy" value={state.strategy} />
          <LearningStateRow label="Attempt" value={String(state.attempt)} />
          {state.questionStatus && <LearningStateRow label="Question status" value={state.questionStatus} />}
          {state.lastValidation && <LearningStateRow label="Last validation" value={state.lastValidation} />}
          {state.recognition && <LearningStateRow label="Recognition" value={state.recognition} />}
          {state.simplification && <LearningStateRow label="Simplification" value={state.simplification} />}
          {state.submittedExpression && <LearningStateRow label="Submitted" value={state.submittedExpression} />}
          {state.canonicalExpression && <LearningStateRow label="Canonical state" value={state.canonicalExpression} />}
          <LearningStateRow label="Detected misconception" value={state.misconception} />
          {state.helpSource && <LearningStateRow label="Help source" value={state.helpSource} />}
          {state.helpRequested && <LearningStateRow label="Help requested" value={state.helpRequested} />}
          <LearningStateRow label="Repeated misconception count" value={String(state.repeatedMisconceptionCount)} />
          <LearningStateRow label="Hint level" value={`${state.hintLevel.current} / ${state.hintLevel.max}`} />
          {!state.session && <LearningStateRow label="Mastery estimate" value={state.masteryEstimate.toFixed(2)} />}
          <LearningStateRow label="Intervention" value={state.intervention} />
        </dl>
      </section>
      {state.session && (
        <section>
          <h3 className="overline">Session</h3>
          <dl>
            <LearningStateRow label="Question" value={state.session.question} />
            <LearningStateRow label="Completed" value={String(state.session.completed)} />
            <LearningStateRow label="Independent solutions" value={String(state.session.independentSolutions)} />
            <LearningStateRow label="Generic help requests" value={String(state.session.genericHelpRequests)} />
            <LearningStateRow label="Hints requested" value={String(state.session.hintsRequested)} />
            <LearningStateRow label="Examples requested" value={String(state.session.examplesRequested)} />
            <LearningStateRow label="Next-step reveals" value={String(state.session.nextStepReveals)} />
            <LearningStateRow label="Skipped reasoning" value={String(state.session.skippedReasoning)} />
            <LearningStateRow label="Mastery estimate" value={state.session.masteryEstimate.toFixed(2)} />
          </dl>
        </section>
      )}
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

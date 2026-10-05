import { MathExpression } from '../MathExpression/MathExpression';
import { StatusIcon } from '../StatusIcon/StatusIcon';
import styles from './WorkingStep.module.css';

export type WorkingStepStatus = 'given' | 'accepted' | 'incorrect' | 'unrecognised';

export type WorkingStepSource = 'learner' | 'system';

export type RailSegment = 'start' | 'middle' | 'end';

type Props = {
  expression: string;
  status: WorkingStepStatus;
  source?: WorkingStepSource;
  rail?: RailSegment;
};

const attemptStatus = { incorrect: 'Needs attention', unrecognised: 'Not recognised yet' };

// Learner-accepted lines carry no label: they are just working. Only the given line, a
// system-authored line and a rejected attempt say what they are.
export function WorkingStep({ expression, status, source = 'learner', rail }: Props) {
  const kind = source === 'system' ? 'system' : status;
  const attempt = status === 'incorrect' || status === 'unrecognised';
  return (
    <li className={`${styles.line} ${styles[kind]} ${rail ? `${styles.rail} ${styles[rail]}` : ''}`}>
      <span className={styles.mark}>
        {kind === 'accepted' && <StatusIcon kind="check" size={20} />}
        {kind === 'incorrect' && <StatusIcon kind="attention" size={20} />}
        {kind === 'unrecognised' && <StatusIcon kind="note" size={20} />}
        {(kind === 'given' || kind === 'system') && <span className={styles.dot} aria-hidden="true" />}
      </span>
      {kind === 'given' && <span className={styles.meta}>Given</span>}
      {kind === 'system' && <span className={styles.meta}>Suggested next step</span>}
      {attempt && (
        <span className={styles.meta}>
          Attempt<span aria-hidden="true"> · </span>
          <span className={styles.attemptStatus}>{attemptStatus[status]}</span>
        </span>
      )}
      <MathExpression expression={expression} size="step" />
      {kind === 'accepted' && <span className="srOnly">Step accepted</span>}
    </li>
  );
}

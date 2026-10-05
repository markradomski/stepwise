import { MathExpression } from '../MathExpression/MathExpression';
import { StatusIcon, type StatusIconKind } from '../StatusIcon/StatusIcon';
import styles from './WorkingStep.module.css';

export type WorkingStepStatus = 'given' | 'accepted' | 'incorrect' | 'unrecognised' | 'current';

export type WorkingStepSource = 'learner' | 'system';

type Props = { expression: string; status: WorkingStepStatus; source?: WorkingStepSource; latest?: boolean };

const presentation: Record<WorkingStepStatus, { label: string; icon: StatusIconKind }> = {
  given: { label: 'Given', icon: 'start' },
  accepted: { label: 'Step accepted', icon: 'check' },
  incorrect: { label: 'Needs attention', icon: 'attention' },
  unrecognised: { label: 'Not recognised yet', icon: 'note' },
  current: { label: 'Current step', icon: 'note' },
};

export function WorkingStep({ expression, status, source = 'learner', latest }: Props) {
  const { label, icon } = source === 'system' ? { label: 'Suggested next step', icon: 'hint' as const } : presentation[status];
  return (
    <li className={`${styles.step} ${styles[source === 'system' ? 'system' : status]} ${latest ? styles.latest : ''}`}>
      <StatusIcon kind={icon} />
      <div className={styles.content}>
        <MathExpression expression={expression} size={status === 'given' ? 'large' : 'step'} />
        <span className={styles.status}>{label}</span>
      </div>
    </li>
  );
}

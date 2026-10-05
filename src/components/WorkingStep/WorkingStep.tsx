import { MathExpression } from '../MathExpression/MathExpression';
import { StatusIcon, type StatusIconKind } from '../StatusIcon/StatusIcon';
import styles from './WorkingStep.module.css';

export type WorkingStepStatus = 'accepted' | 'incorrect' | 'current';

export type WorkingStepSource = 'learner' | 'system';

type Props = { expression: string; status: WorkingStepStatus; source?: WorkingStepSource };

const presentation: Record<WorkingStepStatus, { label: string; icon: StatusIconKind }> = {
  accepted: { label: 'Step accepted', icon: 'check' },
  incorrect: { label: 'Needs attention', icon: 'attention' },
  current: { label: 'Current step', icon: 'note' },
};

export function WorkingStep({ expression, status, source = 'learner' }: Props) {
  const { label, icon } = source === 'system' ? { label: 'Suggested next step', icon: 'hint' as const } : presentation[status];
  return (
    <li className={`${styles.step} ${styles[source === 'system' ? 'system' : status]}`}>
      <StatusIcon kind={icon} />
      <div className={styles.content}>
        <MathExpression expression={expression} size="step" />
        <span className={styles.status}>{label}</span>
      </div>
    </li>
  );
}

import { StatusIcon } from '../StatusIcon/StatusIcon';
import styles from './HintAction.module.css';

type Props = { label: string; emphasis?: 'quiet' | 'prominent' };

export function HintAction({ label, emphasis = 'quiet' }: Props) {
  return (
    <button type="button" className={`${styles.action} ${styles[emphasis]}`}>
      <StatusIcon kind="hint" size={emphasis === 'quiet' ? 20 : 24} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}

import { StatusIcon } from '../StatusIcon/StatusIcon';
import styles from './HintAction.module.css';

type Props = { label: string; emphasis?: 'quiet' | 'prominent'; onClick?: () => void };

export function HintAction({ label, emphasis = 'quiet', onClick }: Props) {
  return (
    <button type="button" className={`${styles.action} ${styles[emphasis]}`} onClick={onClick}>
      <StatusIcon kind="hint" size={emphasis === 'quiet' ? 20 : 24} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}

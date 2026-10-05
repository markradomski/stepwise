import { StatusIcon } from '../StatusIcon/StatusIcon';
import styles from './HintAction.module.css';

type Props = { label: string; emphasis?: 'quiet' | 'prominent'; disabled?: boolean; onClick?: () => void };

export function HintAction({ label, emphasis = 'quiet', disabled, onClick }: Props) {
  return (
    <button type="button" className={`${styles.action} ${styles[emphasis]}`} disabled={disabled} onClick={onClick}>
      <StatusIcon kind="hint" size={emphasis === 'quiet' ? 20 : 24} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}

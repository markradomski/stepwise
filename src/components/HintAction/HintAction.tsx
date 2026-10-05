import { StatusIcon } from '../StatusIcon/StatusIcon';
import styles from './HintAction.module.css';

type Props = { label: string; disabled?: boolean; onClick?: () => void };

export function HintAction({ label, disabled, onClick }: Props) {
  return (
    <button type="button" className={styles.action} disabled={disabled} onClick={onClick}>
      <StatusIcon kind="hint" size={20} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}

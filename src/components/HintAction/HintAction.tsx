import type { Ref } from 'react';
import { StatusIcon } from '../StatusIcon/StatusIcon';
import styles from './HintAction.module.css';

type Props = { label: string; disabled?: boolean; expanded?: boolean; controls?: string; ref?: Ref<HTMLButtonElement>; onClick?: () => void };

export function HintAction({ label, disabled, expanded, controls, ref, onClick }: Props) {
  return (
    <button ref={ref} type="button" className={styles.action} disabled={disabled}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      onClick={onClick}>
      <StatusIcon kind="hint" size={20} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}

import styles from './ReopenAction.module.css';

type Props = { label: string; disabled?: boolean; onClick?: () => void };

export function ReopenAction({ label, disabled, onClick }: Props) {
  return (
    <button type="button" className={styles.action} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

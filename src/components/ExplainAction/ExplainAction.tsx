import styles from './ExplainAction.module.css';

type Props = { expanded: boolean; controls?: string; disabled?: boolean; onClick?: () => void };

export function ExplainAction({ expanded, controls, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className={styles.action}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      Explain this
    </button>
  );
}

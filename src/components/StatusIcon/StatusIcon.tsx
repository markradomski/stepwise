import styles from './StatusIcon.module.css';

export type StatusIconKind = 'check' | 'attention' | 'hint' | 'note';

type Props = { kind: StatusIconKind; size?: number };

export function StatusIcon({ kind, size = 24 }: Props) {
  return (
    <svg
      className={`${styles.icon} ${styles[kind]}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'attention' ? (
        <rect className={styles.shape} width="24" height="24" rx="6" />
      ) : (
        <circle className={styles.shape} cx="12" cy="12" r={kind === 'note' ? 11 : 12} />
      )}
      {kind === 'check' && <path className={styles.stroke} d="M7 12.5l3.5 3.5L17 8.5" />}
      {kind === 'attention' && (
        <>
          <path className={styles.stroke} d="M12 6.5v7" />
          <circle className={styles.dot} cx="12" cy="17.5" r="1.5" />
        </>
      )}
      {kind === 'hint' && (
        <>
          <path className={styles.stroke} d="M9.2 9.6a2.9 2.9 0 1 1 4.4 2.5c-1 .6-1.6 1.1-1.6 2.2" />
          <circle className={styles.dot} cx="12" cy="17.6" r="1.4" />
        </>
      )}
      {kind === 'note' && (
        <>
          <path className={styles.stroke} d="M12 11v6" />
          <circle className={styles.dot} cx="12" cy="7.6" r="1.4" />
        </>
      )}
    </svg>
  );
}

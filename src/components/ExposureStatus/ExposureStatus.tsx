import type { ExposureStatus as Status } from '../../lib/learningState';
import styles from './ExposureStatus.module.css';

type Props = { label: string; status: Status };

const statusLabel: Record<Status, string> = {
  hidden: 'Hidden',
  visible: 'Visible',
  available: 'Available',
};

export function ExposureStatus({ label, status }: Props) {
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd className={`${styles.pill} ${styles[status]}`}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
          <circle className={styles.ring} cx="7" cy="7" r="6.25" />
          {status === 'hidden' && <path className={styles.slash} d="M2.8 2.8l8.4 8.4" />}
          {status === 'available' && <circle className={styles.core} cx="7" cy="7" r="2" />}
        </svg>
        {statusLabel[status]}
      </dd>
    </div>
  );
}

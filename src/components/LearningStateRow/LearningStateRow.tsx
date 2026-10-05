import styles from './LearningStateRow.module.css';

type Props = { label: string; value: string };

export function LearningStateRow({ label, value }: Props) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}

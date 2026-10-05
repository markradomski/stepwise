import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <main className={styles.shell}>
      <h1 className={styles.title}>Stepwise</h1>
      <p className={styles.tagline}>Adaptive maths practice.</p>
      <p className={styles.principle}>
        The system knows more than the learner needs to see.
      </p>
    </main>
  );
}

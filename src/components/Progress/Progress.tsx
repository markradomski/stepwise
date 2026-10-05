import styles from './Progress.module.css';

type Props = { current: number; total: number; complete?: boolean };

type DotState = 'done' | 'current' | 'upcoming';

function dotState(round: number, current: number, complete?: boolean): DotState {
  if (round < current || (complete && round === current)) return 'done';
  return round === current ? 'current' : 'upcoming';
}

export function Progress({ current, total, complete }: Props) {
  const rounds = Array.from({ length: total }, (_, index) => index + 1);
  return (
    <p className={styles.progress}>
      <span className={styles.dots} aria-hidden="true">
        {rounds.map((round) => (
          <span key={round} className={`${styles.dot} ${styles[dotState(round, current, complete)]}`} />
        ))}
      </span>
      <span>
        Round {current} of {total}
        {complete && <span className="srOnly"> complete</span>}
      </span>
    </p>
  );
}

import { useId } from 'react';
import { MathExpression } from '../MathExpression/MathExpression';
import styles from './WorkedExample.module.css';

type Props = { before: string; after: string; explanation: string };

export function WorkedExample({ before, after, explanation }: Props) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className={styles.example}>
      <p id={headingId} className="overline">
        Worked example
      </p>
      <p className={styles.working}>
        <MathExpression expression={before} size="small" />
        <span className="srOnly">becomes</span>
        <span aria-hidden="true" className={styles.arrow}>
          →
        </span>
        <MathExpression expression={after} size="small" />
      </p>
      <p>{explanation}</p>
    </div>
  );
}

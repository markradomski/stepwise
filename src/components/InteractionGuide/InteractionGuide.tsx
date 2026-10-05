import { MathExpression } from '../MathExpression/MathExpression';
import styles from './InteractionGuide.module.css';

type Props = { open: boolean };

// Explains the input convention only. Maths help stays in the hint, example and next-step actions.
export function InteractionGuide({ open }: Props) {
  return (
    <details className={styles.guide} open={open}>
      <summary className={styles.summary}>How Stepwise works</summary>
      <div className={styles.body}>
        <p>Write one line of working at a time: the equation as it looks after one operation.</p>
        <p className={styles.example}>
          <span className={styles.label}>Example</span>
          <MathExpression expression="2x + 4 = 10" size="small" />
          <span aria-hidden="true">→</span>
          <MathExpression expression="2x = 6" size="small" />
          <span className={styles.caption}>after subtracting 4 from both sides</span>
        </p>
        <p>Write the equation, not the operation.</p>
      </div>
    </details>
  );
}

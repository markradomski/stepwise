import styles from './MathExpression.module.css';

type Props = { expression: string; size: 'display' | 'step' };

export function MathExpression({ expression, size }: Props) {
  return (
    <span role="math" aria-label={expression} className={`${styles.math} ${styles[size]}`}>
      {expression.split(/(x)/).map((part, index) => (part === 'x' ? <var key={index}>x</var> : part))}
    </span>
  );
}

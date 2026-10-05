import styles from './MathExpression.module.css';

type Props = { expression: string; size: 'display' | 'step' | 'small' };

export function MathExpression({ expression, size }: Props) {
  return (
    <span role="math" aria-label={expression} className={`${styles.math} ${styles[size]}`}>
      {expression.split(/([xy])/).map((part, index) => (/^[xy]$/.test(part) ? <var key={index}>{part}</var> : part))}
    </span>
  );
}

import { useEffect, useId, useRef } from 'react';
import styles from './MathInput.module.css';

type Props = {
  label: string;
  stepNumber: number;
  value?: string;
  focused?: boolean;
  helper?: string;
};

export function MathInput({ label, stepNumber, value, focused, helper }: Props) {
  const inputId = useId();
  const helperId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused) inputRef.current?.focus();
  }, [focused]);

  return (
    <div className={styles.root}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.field}>
        <span className={styles.stepNumber} aria-hidden="true">
          {stepNumber}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          className={styles.input}
          type="text"
          defaultValue={value}
          placeholder="Type your step"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby={helper ? helperId : undefined}
        />
      </div>
      {helper && (
        <p id={helperId} className={styles.helper}>
          {helper}
        </p>
      )}
    </div>
  );
}

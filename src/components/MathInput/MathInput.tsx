import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import styles from './MathInput.module.css';

type Props = {
  label: string;
  stepNumber: number;
  value?: string;
  focused?: boolean;
  focusToken?: number;
  helper?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
};

export function MathInput({ label, stepNumber, value, focused, focusToken = 0, helper, onChange, onSubmit }: Props) {
  const inputId = useId();
  const helperId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused || focusToken > 0) inputRef.current?.focus();
  }, [focused, focusToken]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSubmit?.();
  };

  const valueProps = onChange
    ? { value: value ?? '', onChange: (event: { target: { value: string } }) => onChange(event.target.value) }
    : { defaultValue: value };

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
          {...valueProps}
          onKeyDown={handleKeyDown}
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

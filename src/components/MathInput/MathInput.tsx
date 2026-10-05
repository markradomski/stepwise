import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import styles from './MathInput.module.css';

type Props = {
  label: string;
  value?: string;
  focused?: boolean;
  focusToken?: number;
  disabled?: boolean;
  helper?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
};

export function MathInput({ label, value, focused, focusToken = 0, disabled, helper, onChange, onSubmit }: Props) {
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
      <div className={`${styles.field} ${disabled && focused ? styles.showFocus : ''}`}>
        <input
          ref={inputRef}
          id={inputId}
          className={styles.input}
          type="text"
          disabled={disabled}
          {...valueProps}
          onKeyDown={handleKeyDown}
          placeholder="Type the equation"
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

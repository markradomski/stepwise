import type { ReactNode } from 'react';
import styles from './Button.module.css';

type Props = {
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  children: ReactNode;
};

export function Button({ variant = 'primary', disabled, children }: Props) {
  return (
    <button type="button" className={`${styles.button} ${styles[variant]}`} disabled={disabled}>
      {children}
    </button>
  );
}

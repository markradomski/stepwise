import type { ReactNode } from 'react';
import styles from './Button.module.css';

type Props = {
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

export function Button({ variant = 'primary', disabled, onClick, children }: Props) {
  return (
    <button type="button" className={`${styles.button} ${styles[variant]}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

import type { ReactNode, Ref } from 'react';
import styles from './Button.module.css';

type Props = {
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  onClick?: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

export function Button({ variant = 'primary', disabled, onClick, buttonRef, children }: Props) {
  return (
    <button ref={buttonRef} type="button" className={`${styles.button} ${styles[variant]}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

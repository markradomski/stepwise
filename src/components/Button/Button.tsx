import type { ReactNode, Ref } from 'react';
import styles from './Button.module.css';

type Props = {
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  preview?: boolean;
  onClick?: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

export function Button({ variant = 'primary', disabled, preview, onClick, buttonRef, children }: Props) {
  return (
    <button ref={buttonRef} type="button" className={`${styles.button} ${styles[variant]} ${preview ? styles.preview : ''}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

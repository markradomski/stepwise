import { useEffect, useRef } from 'react';
import { Button } from '../Button/Button';
import { StatusIcon } from '../StatusIcon/StatusIcon';
import styles from './CompletionPanel.module.css';

type Props = {
  title: string;
  message: string;
  actionLabel: string;
  onAction?: () => void;
  focusKey?: number;
  preview?: boolean;
};

export function CompletionPanel({ title, message, actionLabel, onAction, focusKey = 0, preview }: Props) {
  const actionRef = useRef<HTMLButtonElement>(null);

  // Deferred so the Enter keypress that completed the question can't also activate the new button.
  useEffect(() => {
    if (focusKey === 0) return;
    const timer = setTimeout(() => actionRef.current?.focus());
    return () => clearTimeout(timer);
  }, [focusKey]);

  return (
    <div className={styles.panel}>
      <div className={styles.text}>
        <StatusIcon kind="check" />
        <div>
          <p className={styles.title}>{title}</p>
          <p>{message}</p>
        </div>
      </div>
      <div className={styles.action}>
        <Button buttonRef={actionRef} onClick={onAction} disabled={preview} preview={preview}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

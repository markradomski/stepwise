import { StatusIcon, type StatusIconKind } from '../StatusIcon/StatusIcon';
import styles from './FeedbackMessage.module.css';

export type FeedbackKind = 'neutral' | 'success' | 'error' | 'hint';

type Props = { kind: FeedbackKind; title?: string; message: string };

const icons: Record<FeedbackKind, StatusIconKind> = {
  neutral: 'note',
  success: 'check',
  error: 'attention',
  hint: 'hint',
};

export function FeedbackMessage({ kind, title, message }: Props) {
  return (
    <div className={`${styles.message} ${styles[kind]}`}>
      <StatusIcon kind={icons[kind]} />
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        <p>{message}</p>
      </div>
    </div>
  );
}

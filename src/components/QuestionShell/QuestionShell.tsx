import { Progress } from '../Progress/Progress';
import styles from './QuestionShell.module.css';

type Props = {
  progress?: { currentQuestion: number; totalQuestions: number; complete?: boolean };
  question: { instruction: string };
};

export function QuestionShell({ progress, question }: Props) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <svg className={styles.mark} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
            <rect x="0" y="12" width="5" height="10" rx="1" />
            <rect x="8.5" y="6" width="5" height="16" rx="1" />
            <rect x="17" y="0" width="5" height="22" rx="1" />
          </svg>
          <h1 className={styles.wordmark}>Stepwise</h1>
        </div>
        {progress && <Progress {...progress} />}
      </header>
      <section className={styles.question} aria-labelledby="question-heading">
        <h2 id="question-heading" className="overline">
          Practice question
        </h2>
        <p>{question.instruction}</p>
      </section>
    </div>
  );
}

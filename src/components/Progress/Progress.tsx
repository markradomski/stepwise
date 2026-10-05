import styles from './Progress.module.css';

type Props = { currentQuestion: number; totalQuestions: number; complete?: boolean };

export function Progress({ currentQuestion, totalQuestions, complete }: Props) {
  return (
    <p className={styles.progress}>
      Question {currentQuestion} of {totalQuestions}
      {complete && <span className={styles.complete}> · complete</span>}
    </p>
  );
}

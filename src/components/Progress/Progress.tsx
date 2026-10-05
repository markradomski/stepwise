type Props = { currentQuestion: number; totalQuestions: number };

export function Progress({ currentQuestion, totalQuestions }: Props) {
  return (
    <>
      Question {currentQuestion} of {totalQuestions}
    </>
  );
}

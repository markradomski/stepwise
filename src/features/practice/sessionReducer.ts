import { masteryAfterQuestion } from './mastery';
import { practiceReducer, type PracticeAction } from './practiceReducer';
import { createInitialPracticeState } from './practiceState';
import { practiceQuestions } from './questions';
import { createInitialSession, resultFromPractice, type PracticeSessionState } from './sessionState';

export type SessionAction = PracticeAction | { type: 'NEXT_QUESTION' } | { type: 'PRACTICE_AGAIN' };

const isLastQuestion = (session: PracticeSessionState) => session.currentQuestionIndex === practiceQuestions.length - 1;

export function sessionReducer(session: PracticeSessionState, action: SessionAction): PracticeSessionState {
  switch (action.type) {
    case 'PRACTICE_AGAIN':
      return session.completed ? createInitialSession() : session;

    case 'NEXT_QUESTION': {
      if (!session.currentPractice.completed || isLastQuestion(session)) return session;
      const currentQuestionIndex = session.currentQuestionIndex + 1;
      return {
        ...session,
        currentQuestionIndex,
        currentPractice: createInitialPracticeState(practiceQuestions[currentQuestionIndex]),
      };
    }

    default: {
      const currentPractice = practiceReducer(session.currentPractice, action);
      if (currentPractice === session.currentPractice) return session;
      if (session.currentPractice.completed || !currentPractice.completed) return { ...session, currentPractice };

      const result = resultFromPractice(currentPractice);
      return {
        ...session,
        currentPractice,
        results: [...session.results, result],
        masteryEstimate: masteryAfterQuestion(session.masteryEstimate, result),
        completed: isLastQuestion(session),
      };
    }
  }
}

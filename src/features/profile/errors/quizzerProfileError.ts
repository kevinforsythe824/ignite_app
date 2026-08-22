export type QuizzerProfileErrorCode =
  | 'invalid-profile-data'
  | 'permission-denied'
  | 'unavailable'
  | 'unexpected';

/** Application-facing Quizzer profile / persistence failure. */
export class QuizzerProfileError extends Error {
  readonly code: QuizzerProfileErrorCode;
  readonly quizzerId: string | undefined;

  constructor(code: QuizzerProfileErrorCode, message: string, quizzerId?: string) {
    super(message);
    this.name = 'QuizzerProfileError';
    this.code = code;
    this.quizzerId = quizzerId;
  }
}

/** Application input for creating a Quizzer profile if one does not yet exist. */
export interface ProvisionQuizzerProfileInput {
  quizzerId: string;
  firstName: string;
  lastName: string;
  avatarId?: string | null;
}

/**
 * Normalized provision payload after write-boundary whitespace trim.
 * Names are guaranteed non-empty after trim.
 */
export interface NormalizedProvisionQuizzerProfileInput {
  quizzerId: string;
  firstName: string;
  lastName: string;
  avatarId: string | null;
}

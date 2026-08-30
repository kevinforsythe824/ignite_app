import { createContext, useContext } from 'react';

import type { FeedbackRepository } from '../repositories/feedbackRepository';
import { firebaseFeedbackRepository } from '../repositories';

const FeedbackRepositoryContext = createContext<FeedbackRepository | undefined>(undefined);

/**
 * Optional test/override injection. Production screens use the Firebase singleton.
 * This is not a session provider.
 */
export const FeedbackRepositoryContextProvider = FeedbackRepositoryContext.Provider;

export function useFeedbackRepository(): FeedbackRepository {
  return useContext(FeedbackRepositoryContext) ?? firebaseFeedbackRepository;
}

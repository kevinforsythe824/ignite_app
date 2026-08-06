import React from 'react';

import FlashcardStudyScreen from '../../../screens/FlashcardStudyScreen';
import { FlashcardSessionProvider } from '../state/FlashcardSessionContext';

/**
 * Study tab entry: keeps flashcard session state inside the feature boundary
 * so other tabs and the root navigator are unaffected by session updates.
 */
export function FlashcardStudyRoute(): React.JSX.Element {
  return (
    <FlashcardSessionProvider>
      <FlashcardStudyScreen />
    </FlashcardSessionProvider>
  );
}

export default FlashcardStudyRoute;

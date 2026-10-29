import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import FlashcardStudyScreen from '../../../screens/FlashcardStudyScreen';
import { StudyMessage } from '../../study/components/StudyMessage';
import type { StudyStackParamList } from '../../study/navigation/types';
import { useStudyCurriculum } from '../../study/state/StudyCurriculumGate';
import { resolveStudyScope, studySessionKey } from '../domain/resolveStudyScope';
import { FlashcardSessionProvider } from '../state/FlashcardSessionContext';

export { studyCurriculumRepository } from '../../study/state/StudyCurriculumGate';

/**
 * Flashcards for the Study curriculum already loaded by StudyCurriculumGate.
 * Scope is the selected MaterialSet, then an optional section. Category
 * filters and shuffle run inside the session on that scoped list.
 * scripturePresentation is official because these cards use verse text and
 * annotations. Fixture sessions omit that prop and stay on matchedRules.
 */
export function FlashcardStudyRoute(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<StudyStackParamList, 'FlashcardStudy'>>();
  const route = useRoute<RouteProp<StudyStackParamList, 'FlashcardStudy'>>();
  const curriculum = useStudyCurriculum();
  const sectionId = route.params?.sectionId;
  const scope = resolveStudyScope(curriculum, sectionId);
  const goBack = () => navigation.goBack();

  if (scope.status === 'unknown-section') {
    return (
      <StudyMessage
        testID="study-unknown-section"
        title="This section isn't available"
        copy="Go back and choose a section from this material."
        onBack={goBack}
      />
    );
  }

  if (scope.status === 'empty-section') {
    return (
      <StudyMessage
        testID="study-empty-section"
        title={scope.section.title}
        copy="This section has no cards."
        onBack={goBack}
      />
    );
  }

  return (
    <FlashcardSessionProvider
      key={studySessionKey(curriculum.seasonId, curriculum.materialSetId, sectionId)}
      seasonId={curriculum.seasonId}
      title={scope.title}
      cards={scope.cards}
      scripturePresentation="official"
    >
      <FlashcardStudyScreen onBackPress={goBack} />
    </FlashcardSessionProvider>
  );
}

export default FlashcardStudyRoute;

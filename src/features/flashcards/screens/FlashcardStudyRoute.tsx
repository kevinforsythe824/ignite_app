import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FlashcardStudyScreen from '../../../screens/FlashcardStudyScreen';
import { colors, spacing, typography } from '../../../shared/theme';
import { useSeasonParticipation } from '../../season/state/SeasonParticipationProvider';
import { useFlashcardCurriculum } from '../hooks/useFlashcardCurriculum';
import { firestoreCurriculumRepository } from '../repositories';
import { FlashcardSessionProvider } from '../state/FlashcardSessionContext';

/** Live Study curriculum source — Firestore, not the JSON fixture. */
export const studyCurriculumRepository = firestoreCurriculumRepository;

/**
 * Study tab entry. Curriculum loads only for the participation-resolved Study target.
 * An unready Season session does not fall back to another MaterialSet.
 */
export function FlashcardStudyRoute(): React.JSX.Element {
  const { session } = useSeasonParticipation();
  if (session.status !== 'ready') {
    return <StudyTargetUnavailable />;
  }

  return (
    <ReadyFlashcardStudy
      materialSetId={session.studyTarget.materialSetId}
      seasonId={session.studyTarget.seasonId}
    />
  );
}

function ReadyFlashcardStudy({
  seasonId,
  materialSetId,
}: {
  seasonId: string;
  materialSetId: string;
}): React.JSX.Element {
  const { loadState, reload } = useFlashcardCurriculum(
    seasonId,
    materialSetId,
    studyCurriculumRepository,
  );

  if (loadState.status === 'ready') {
    return (
      <FlashcardSessionProvider
        seasonId={loadState.curriculum.seasonId}
        title={loadState.curriculum.title}
        cards={loadState.curriculum.cards}
      >
        <FlashcardStudyScreen />
      </FlashcardSessionProvider>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.message}>
        {loadState.status === 'loading' ? (
          <Text style={styles.title}>Loading cards…</Text>
        ) : null}
        {loadState.status === 'empty' ? (
          <>
            <Text style={styles.title}>No cards available</Text>
            <Text style={styles.copy}>There are no cards for this season.</Text>
          </>
        ) : null}
        {loadState.status === 'error' ? (
          <>
            <Text style={styles.title}>Could not load cards</Text>
            <Text style={styles.copy}>{loadState.message}</Text>
            <Pressable
              onPress={reload}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function StudyTargetUnavailable(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.message} testID="study-target-unavailable">
        <Text style={styles.title}>Study isn't available right now</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.sm,
  },
  title: {
    ...typography.verseReference,
    textAlign: 'center',
  },
  copy: {
    ...typography.hint,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryPressed: {
    opacity: 0.7,
  },
  retryLabel: {
    ...typography.title,
  },
});

export default FlashcardStudyRoute;

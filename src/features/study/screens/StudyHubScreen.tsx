import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing, typography } from '../../../shared/theme';
import {
  listStudySections,
  materialSetStudyCards,
} from '../../flashcards/domain/resolveStudyScope';
import { StudyMessage } from '../components/StudyMessage';
import type { StudyStackParamList } from '../navigation/types';
import { useStudyCurriculum } from '../state/StudyCurriculumGate';

function formatCardCount(count: number): string {
  return count === 1 ? '1 card' : `${count} cards`;
}

/**
 * Study landing page. Study All and Explore by Section use the curriculum
 * already loaded for this Season and MaterialSet.
 */
export function StudyHubScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<StudyStackParamList, 'StudyHub'>>();
  const curriculum = useStudyCurriculum();
  const materialCards = materialSetStudyCards(curriculum);
  const sections = listStudySections(curriculum);

  if (materialCards.length === 0) {
    return (
      <StudyMessage title="No cards available" copy="There are no cards for this season." />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} testID="study-hub">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.screenTitle}>
          Study
        </Text>
        <Text style={styles.materialTitle} testID="study-material-title">
          {curriculum.title}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Study All Material, ${formatCardCount(materialCards.length)}`}
          onPress={() => navigation.navigate('FlashcardStudy')}
          style={({ pressed }) => [styles.studyAll, pressed ? styles.studyAllPressed : null]}
          testID="study-all-material"
        >
          <Text style={styles.studyAllTitle}>Study All Material</Text>
          <Text style={styles.studyAllCount}>{formatCardCount(materialCards.length)}</Text>
        </Pressable>

        <Text accessibilityRole="header" style={styles.sectionHeading}>
          Explore by Section
        </Text>

        {sections.length === 0 ? (
          <Text style={styles.emptySections}>No sections in this material.</Text>
        ) : (
          sections.map(({ section, cardCount }) => (
            <Pressable
              key={section.sectionId}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${section.title}, ${formatCardCount(cardCount)}`}
              onPress={() =>
                navigation.navigate('FlashcardStudy', { sectionId: section.sectionId })
              }
              style={({ pressed }) => [
                styles.sectionCard,
                pressed ? styles.sectionCardPressed : null,
              ]}
              testID={`study-section-${section.sectionId}`}
            >
              <View style={styles.sectionText}>
                <Text style={styles.sectionTitle} numberOfLines={3}>
                  {section.title}
                </Text>
                <Text style={styles.sectionCount}>{formatCardCount(cardCount)}</Text>
              </View>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.navy} />
              </View>
            </Pressable>
          ))
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View All Material"
          onPress={() => navigation.navigate('AnnotatedScriptureList')}
          style={({ pressed }) => [styles.viewAll, pressed ? styles.viewAllPressed : null]}
          testID="view-all-material"
        >
          <Text style={styles.viewAllTitle}>View All Material</Text>
          <Text style={styles.viewAllCopy}>Read every verse in this material</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  screenTitle: {
    ...typography.screenTitle,
  },
  materialTitle: {
    ...typography.sectionTitle,
  },
  studyAll: {
    marginTop: spacing.sm,
    minHeight: spacing.minTouchTarget,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    opacity: 1,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    ...shadows.card,
  },
  studyAllTitle: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  studyAllCount: {
    ...typography.bodySecondary,
    color: colors.navy,
  },
  sectionHeading: {
    ...typography.sectionTitle,
    marginTop: spacing.sm,
  },
  emptySections: {
    ...typography.bodySecondary,
  },
  sectionCard: {
    minHeight: spacing.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.cardWhite,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionText: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.cardTitle,
  },
  sectionCount: {
    ...typography.bodySecondary,
  },
  /**
   * Fully opaque press feedback. Fading the coral card over the page
   * background drops title and count contrast below 4.5:1.
   */
  studyAllPressed: {
    opacity: 1,
    borderColor: colors.navy,
  },
  /**
   * Opaque press on the white section card. Fading the card toward the page
   * background drops the secondary count below 4.5:1.
   */
  sectionCardPressed: {
    opacity: 1,
    backgroundColor: colors.cardWhite,
    borderColor: colors.navy,
  },
  viewAll: {
    marginTop: spacing.sm,
    minHeight: spacing.minTouchTarget,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardWhite,
    opacity: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  viewAllPressed: {
    opacity: 1,
    backgroundColor: colors.cardWhite,
    borderColor: colors.navy,
  },
  viewAllTitle: {
    ...typography.cardTitle,
  },
  viewAllCopy: {
    ...typography.bodySecondary,
  },
});

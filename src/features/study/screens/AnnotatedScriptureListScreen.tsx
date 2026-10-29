import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../../shared/theme';
import { AnnotatedScriptureDocument } from '../components/AnnotatedScriptureDocument';
import { StudyMessage } from '../components/StudyMessage';
import { projectAnnotatedScriptureList } from '../domain/projectAnnotatedScriptureList';
import type { StudyStackParamList } from '../navigation/types';
import { useStudyCurriculum } from '../state/StudyCurriculumGate';

const BACK_TO_HUB_LABEL = 'Back to Study Hub';
const ICON_SIZE = 24;

/**
 * Reading view of the MaterialSet already loaded for Study.
 * Scrolling does not start a flashcard session or record recall.
 */
export function AnnotatedScriptureListScreen(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<StudyStackParamList, 'AnnotatedScriptureList'>>();
  const curriculum = useStudyCurriculum();
  const projection = useMemo(() => projectAnnotatedScriptureList(curriculum), [curriculum]);
  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!projection.ok) {
    return (
      <StudyMessage
        testID="scripture-list-unavailable"
        title="Scripture isn't available"
        copy="This material can't be displayed right now."
        onBack={goBack}
        backAccessibilityLabel={BACK_TO_HUB_LABEL}
      />
    );
  }

  const verseCount = projection.sections.reduce((sum, section) => sum + section.cards.length, 0);
  if (verseCount === 0) {
    return (
      <StudyMessage
        testID="scripture-list-empty"
        title="No scripture available"
        copy="There are no verses for this material."
        onBack={goBack}
        backAccessibilityLabel={BACK_TO_HUB_LABEL}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} testID="scripture-list-screen">
      <View style={styles.chrome}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={BACK_TO_HUB_LABEL}
          onPress={goBack}
          hitSlop={spacing.sm}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backPressed : null]}
          testID="scripture-list-back"
        >
          <Ionicons name="chevron-back" size={ICON_SIZE} color={colors.navy} />
        </Pressable>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.screenTitle}>
            All Scripture
          </Text>
          <Text
            accessibilityLabel={`Material set, ${curriculum.title}`}
            style={styles.materialTitle}
            testID="scripture-material-title"
          >
            {curriculum.title}
          </Text>
        </View>
      </View>
      <AnnotatedScriptureDocument
        seasonId={curriculum.seasonId}
        materialSetId={curriculum.materialSetId}
        sections={projection.sections}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    minWidth: spacing.minTouchTarget,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  backPressed: {
    opacity: 1,
    backgroundColor: colors.cardWhite,
    borderRadius: radius.control,
  },
  heading: {
    flex: 1,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  screenTitle: {
    ...typography.stackTitle,
  },
  materialTitle: {
    ...typography.body,
  },
});

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { SettingsRow } from '../../profile/components/SettingsRow';
import type { ProfileStackParamList } from '../../profile/navigation/types';
import { feedbackCopy } from '../copy/feedbackCopy';
import type { FeedbackCategory } from '../domain/feedbackCategory';

type HelpNavigation = NativeStackNavigationProp<ProfileStackParamList, 'HelpAndFeedback'>;

/** Hub: choose a feedback category. */
export function HelpAndFeedbackScreen(): React.JSX.Element {
  const navigation = useNavigation<HelpNavigation>();

  const openCompose = (category: FeedbackCategory) => {
    navigation.navigate('FeedbackCompose', { category });
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.supporting} testID="help-feedback-supporting">
        {feedbackCopy.hub.supporting}
      </Text>
      <View style={styles.section}>
        <SettingsRow
          label={feedbackCopy.hub.reportBug}
          onPress={() => openCompose('bug')}
          testID="help-feedback-bug"
        />
        <SettingsRow
          label={feedbackCopy.hub.requestFeature}
          onPress={() => openCompose('feature')}
          testID="help-feedback-feature"
        />
        <SettingsRow
          label={feedbackCopy.hub.general}
          onPress={() => openCompose('general')}
          testID="help-feedback-general"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.lg,
  },
  supporting: {
    ...typography.valueBody,
    color: colors.textSecondary,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardWhite,
  },
});

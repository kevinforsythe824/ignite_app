import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { SettingsRow } from '../../profile/components/SettingsRow';
import { SettingsSection } from '../../profile/components/SettingsSection';
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
      testID="help-feedback-scroll"
    >
      <Text style={styles.supporting} testID="help-feedback-supporting">
        {feedbackCopy.hub.supporting}
      </Text>
      <SettingsSection testID="help-feedback-section">
        <SettingsRow
          icon="bug-outline"
          label={feedbackCopy.hub.reportBug}
          onPress={() => openCompose('bug')}
          testID="help-feedback-bug"
        />
        <SettingsRow
          icon="bulb-outline"
          label={feedbackCopy.hub.requestFeature}
          onPress={() => openCompose('feature')}
          testID="help-feedback-feature"
        />
        <SettingsRow
          icon="chatbubble-ellipses-outline"
          label={feedbackCopy.hub.general}
          onPress={() => openCompose('general')}
          testID="help-feedback-general"
        />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.lg,
  },
  supporting: {
    ...typography.bodySecondary,
  },
});

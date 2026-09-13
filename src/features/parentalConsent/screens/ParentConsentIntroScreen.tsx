import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import type { AccountCreationStackParamList } from '../../auth/navigation/types';
import { colors, spacing, typography } from '../../../shared/theme';
import { parentalConsentCopy } from '../copy/parentalConsentCopy';

export function ParentConsentIntroScreen(): React.JSX.Element {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AccountCreationStackParamList, 'ParentConsentIntro'>
    >();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.goBack();
  };

  return (
    <AuthScreenLayout canvas="brand" onBack={handleBack}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="consent-intro-title"
        >
          {parentalConsentCopy.intro.title}
        </Text>
        <Text style={styles.body}>{parentalConsentCopy.intro.body}</Text>
      </View>
      <AuthPrimaryButton
        testID="consent-intro-continue"
        accentTone="auth"
        label={parentalConsentCopy.intro.continue}
        onPress={() => navigation.navigate('ParentEmail')}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.verseReference,
  },
  body: {
    ...typography.brandTagline,
    color: colors.textSecondary,
  },
});

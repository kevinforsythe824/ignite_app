import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../components/AuthPrimaryButton';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { authCopy } from '../copy/authCopy';
import type { AccountCreationStackParamList } from '../navigation/types';

/**
 * Privacy boundary before email/password collection.
 * Does not persist age. Does not invent parental-consent mechanics.
 */
export function PrivacyAgeScreen(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountCreationStackParamList, 'PrivacyAge'>>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.goBack();
  };

  return (
    <AuthScreenLayout onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>{authCopy.privacyAge.title}</Text>
        <Text style={styles.supporting}>{authCopy.privacyAge.supporting}</Text>
      </View>
      <Text
        accessibilityRole="header"
        style={styles.question}
        testID="auth-privacy-age-question"
      >
        {authCopy.privacyAge.question}
      </Text>
      <View style={styles.actions}>
        <AuthPrimaryButton
          testID="auth-privacy-age-thirteen-or-older"
          label={authCopy.privacyAge.thirteenOrOlder}
          onPress={() => navigation.navigate('CreateAccount')}
        />
        <AuthPrimaryButton
          testID="auth-privacy-age-under-thirteen"
          label={authCopy.privacyAge.underThirteen}
          variant="secondary"
          onPress={() => navigation.navigate('UnderThirteenBlocked')}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.verseReference,
  },
  supporting: {
    ...typography.brandTagline,
  },
  question: {
    ...typography.title,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

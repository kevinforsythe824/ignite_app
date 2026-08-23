import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../components/AuthPrimaryButton';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { authCopy } from '../copy/authCopy';
import type { AccountCreationStackParamList, AuthStackParamList } from '../navigation/types';

/**
 * Terminal privacy boundary for the under-13 path.
 * Does not claim COPPA compliance or implement verifiable parental consent.
 */
export function UnderThirteenBlockedScreen(): React.JSX.Element {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AccountCreationStackParamList, 'UnderThirteenBlocked'>
    >();

  const handleBackToWelcome = () => {
    const parent = navigation.getParent<NativeStackNavigationProp<AuthStackParamList>>();
    if (parent) {
      parent.navigate('Welcome');
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <AuthScreenLayout onBack={handleBackToWelcome}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="auth-under-thirteen-title"
        >
          {authCopy.underThirteenBlocked.title}
        </Text>
        <Text style={styles.body}>{authCopy.underThirteenBlocked.body}</Text>
      </View>
      <AuthPrimaryButton
        testID="auth-under-thirteen-back-welcome"
        label={authCopy.underThirteenBlocked.backToWelcome}
        onPress={handleBackToWelcome}
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
  },
});

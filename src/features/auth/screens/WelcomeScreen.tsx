import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../components/AuthPrimaryButton';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { AuthTextLink } from '../components/AuthTextLink';
import { IgniteBrandMark } from '../components/IgniteBrandMark';
import { WelcomeValueRow, type WelcomeValueTone } from '../components/WelcomeValueRow';
import { AUTH_ACTIONS_HORIZONTAL_INSET } from '../components/authLayout';
import { authCopy } from '../copy/authCopy';
import { startAccountCreation } from '../navigation/startAccountCreation';
import type { AuthStackParamList } from '../navigation/types';

const VALUE_TONES: Record<(typeof authCopy.welcome.valueItems)[number]['id'], WelcomeValueTone> = {
  study: 'coral',
  confidence: 'blue',
  ready: 'gold',
};

export function WelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Welcome'>>();

  return (
    <AuthScreenLayout keyboardAvoiding={false}>
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <IgniteBrandMark size="welcome" />
          <Text style={styles.tagline}>{authCopy.welcome.tagline}</Text>
        </View>

        <View style={styles.values}>
          {authCopy.welcome.valueItems.map((item) => (
            <WelcomeValueRow
              key={item.id}
              title={item.title}
              description={item.description}
              icon={item.icon}
              tone={VALUE_TONES[item.id]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <AuthPrimaryButton
            testID="auth-welcome-create-account"
            label={authCopy.welcome.createAccount}
            onPress={() => startAccountCreation(navigation)}
          />
          <AuthTextLink
            testID="auth-welcome-sign-in"
            prompt={authCopy.welcome.signInPrompt}
            label={authCopy.welcome.signIn}
            onPress={() => navigation.navigate('SignIn')}
          />
        </View>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  tagline: {
    ...typography.brandTagline,
    textAlign: 'center',
  },
  values: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    paddingHorizontal: AUTH_ACTIONS_HORIZONTAL_INSET,
    paddingBottom: spacing.lg,
  },
});

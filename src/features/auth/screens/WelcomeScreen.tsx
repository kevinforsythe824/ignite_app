import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
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

/**
 * Leftover vertical space is split evenly between the block gaps instead of
 * pooling above the hero, so the wording sits close under the brand mark.
 */
const BLOCK_GAP_FLEX = 1;

export function WelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Welcome'>>();

  return (
    <AuthScreenLayout canvas="brand" keyboardAvoiding={false}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <IgniteBrandMark size="header" />
        </View>

        <View style={styles.body}>
          <View style={styles.hero}>
            <Text style={styles.headlinePrimary}>{authCopy.welcome.headlinePrimary}</Text>
            <Text style={styles.headlineAccent}>{authCopy.welcome.headlineAccent}</Text>
            <Text style={styles.supporting}>{authCopy.welcome.supporting}</Text>
          </View>

          <View style={styles.heroValuesGap} />

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

          <View style={styles.valuesActionsGap} />

          <View style={styles.actions}>
            <AuthPrimaryButton
              testID="auth-welcome-create-account"
              accentTone="auth"
              label={authCopy.welcome.createAccount}
              onPress={() => startAccountCreation(navigation)}
            />
            <AuthTextLink
              testID="auth-welcome-sign-in"
              tone="authAccent"
              prompt={authCopy.welcome.signInPrompt}
              label={authCopy.welcome.signIn}
              onPress={() => navigation.navigate('SignIn')}
            />
          </View>
        </View>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  brand: {
    alignSelf: 'flex-start',
  },
  body: {
    flexGrow: 1,
    paddingTop: spacing.sm,
  },
  heroValuesGap: {
    flexGrow: BLOCK_GAP_FLEX,
    flexShrink: 1,
    flexBasis: spacing.xl,
  },
  valuesActionsGap: {
    flexGrow: BLOCK_GAP_FLEX,
    flexShrink: 1,
    flexBasis: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  headlinePrimary: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headlineAccent: {
    ...typography.screenTitle,
    color: colors.authAccent,
    textAlign: 'center',
  },
  supporting: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  values: {
    gap: spacing.rowGap,
  },
  actions: {
    gap: spacing.sm,
    paddingHorizontal: AUTH_ACTIONS_HORIZONTAL_INSET,
  },
});

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import type {
  AccountCreationStackParamList,
  AuthStackParamList,
} from '../../auth/navigation/types';
import { colors, spacing, typography } from '../../../shared/theme';
import { parentalConsentCopy } from '../copy/parentalConsentCopy';
import { useParentalConsent } from '../hooks/useParentalConsent';

function recoveryBody(
  status: string | undefined,
  bindingState: string | undefined,
  errorCode: string | null | undefined,
): string {
  if (status === 'expired') {
    return parentalConsentCopy.recovery.expired;
  }
  if (status === 'revoked') {
    return parentalConsentCopy.recovery.revoked;
  }
  if (status === 'approved' && bindingState === 'bound') {
    return parentalConsentCopy.recovery.approvedBound;
  }
  if (errorCode === 'network-unavailable' || errorCode === 'unavailable') {
    return parentalConsentCopy.recovery.network;
  }
  if (errorCode === 'permission-denied' || errorCode === 'not-found') {
    return parentalConsentCopy.recovery.invalidSession;
  }
  return parentalConsentCopy.recovery.generic;
}

export function ConsentRecoveryScreen(): React.JSX.Element {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AccountCreationStackParamList, 'ConsentRecovery'>
    >();
  const { session, clearSession, hasActiveConsent, needsFreshConsent, presentationFor } =
    useParentalConsent();

  const presentation = presentationFor();
  const showSignIn =
    presentation === 'approvedBound' || needsFreshConsent || Boolean(session.capability?.pendingClaimUid);
  const showContinueApproval =
    hasActiveConsent && presentation === 'waiting';

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.goBack();
  };

  const handleStartOver = async () => {
    // clearSession preserves pendingClaimUid when present (existing-account recovery).
    await clearSession();
    navigation.replace('ParentConsentIntro');
  };

  const handleSignIn = () => {
    const parent = navigation.getParent<NativeStackNavigationProp<AuthStackParamList>>();
    parent?.replace('SignIn');
  };

  const handleContinue = () => {
    navigation.replace('ConsentPending');
  };

  const body = recoveryBody(
    session.snapshot?.status,
    session.snapshot?.bindingState,
    session.lastError?.code,
  );

  return (
    <AuthScreenLayout canvas="brand" onBack={handleBack}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="consent-recovery-title"
        >
          {parentalConsentCopy.recovery.title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <View style={styles.actions}>
        {showContinueApproval ? (
          <AuthPrimaryButton
            testID="consent-recovery-continue"
            accentTone="auth"
            label={parentalConsentCopy.recovery.continueApproval}
            onPress={handleContinue}
          />
        ) : null}
        <AuthPrimaryButton
          testID="consent-recovery-start-over"
          accentTone="auth"
          label={parentalConsentCopy.recovery.startOver}
          variant={showContinueApproval ? 'secondary' : 'primary'}
          onPress={() => {
            void handleStartOver();
          }}
        />
        {showSignIn ? (
          <AuthPrimaryButton
            testID="consent-recovery-sign-in"
            label={parentalConsentCopy.recovery.signIn}
            variant="secondary"
            onPress={handleSignIn}
          />
        ) : null}
      </View>
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
  actions: {
    gap: spacing.md,
  },
});

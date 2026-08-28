import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { AuthTextLink } from '../../auth/components/AuthTextLink';
import type {
  AccountCreationStackParamList,
  AuthStackParamList,
} from '../../auth/navigation/types';
import { colors, spacing, typography } from '../../../shared/theme';
import { parentalConsentCopy } from '../copy/parentalConsentCopy';
import { ParentalConsentError } from '../errors/parentalConsentError';
import { useParentalConsent } from '../hooks/useParentalConsent';

function navigateForDestination(
  navigation: NativeStackNavigationProp<AccountCreationStackParamList, 'ConsentPending'>,
  destination: ReturnType<ReturnType<typeof useParentalConsent>['resolveResumeDestination']>,
): void {
  if (destination === 'createAccount') {
    navigation.replace('CreateAccount');
    return;
  }
  if (destination === 'signInToClaim') {
    const parent = navigation.getParent<NativeStackNavigationProp<AuthStackParamList>>();
    parent?.replace('SignIn');
    return;
  }
  if (destination === 'recovery') {
    navigation.replace('ConsentRecovery');
  }
}

export function ConsentPendingScreen(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountCreationStackParamList, 'ConsentPending'>>();
  const { session, refreshStatus, resendNotice, resolveResumeDestination } = useParentalConsent();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const focusedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const refreshRunIdRef = useRef(0);
  const refreshStatusRef = useRef(refreshStatus);
  refreshStatusRef.current = refreshStatus;
  const resolveResumeDestinationRef = useRef(resolveResumeDestination);
  resolveResumeDestinationRef.current = resolveResumeDestination;
  const hydrateReady = session.hydrateStatus === 'ready';

  const runRefresh = useCallback(async () => {
    // Single-flight: overlapping focus/AppState/manual refreshes caused repeated
    // getStatus calls, loading flicker, and stale null → recovery navigations.
    if (refreshInFlightRef.current) {
      return;
    }
    refreshInFlightRef.current = true;
    const runId = refreshRunIdRef.current + 1;
    refreshRunIdRef.current = runId;
    setChecking(true);
    setErrorMessage(undefined);
    try {
      const snapshot = await refreshStatusRef.current();
      if (runId !== refreshRunIdRef.current) {
        return;
      }
      if (!snapshot) {
        navigation.replace('ConsentRecovery');
        return;
      }
      const destination = resolveResumeDestinationRef.current(snapshot);
      if (destination !== 'pending') {
        navigateForDestination(navigation, destination);
      }
    } catch (error) {
      if (runId !== refreshRunIdRef.current) {
        return;
      }
      if (
        error instanceof ParentalConsentError &&
        (error.code === 'permission-denied' || error.code === 'not-found')
      ) {
        navigation.replace('ConsentRecovery');
        return;
      }
      setErrorMessage(
        error instanceof ParentalConsentError
          ? error.message
          : parentalConsentCopy.errors.unexpected,
      );
    } finally {
      if (runId === refreshRunIdRef.current) {
        refreshInFlightRef.current = false;
        setChecking(false);
      }
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (!hydrateReady) {
        return () => {
          focusedRef.current = false;
        };
      }
      void runRefresh();

      const onAppState = (next: AppStateStatus) => {
        if (next === 'active' && focusedRef.current) {
          void runRefresh();
        }
      };
      const subscription =
        typeof AppState?.addEventListener === 'function'
          ? AppState.addEventListener('change', onAppState)
          : null;

      return () => {
        focusedRef.current = false;
        // Invalidate in-flight auto-refresh so an unfocused completion cannot
        // navigate or clear loading for a later focus cycle.
        refreshRunIdRef.current += 1;
        refreshInFlightRef.current = false;
        subscription?.remove();
      };
    }, [hydrateReady, runRefresh]),
  );

  const handleBack = () => {
    // Keep capability — active privacy path.
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.goBack();
  };

  const handleResend = async () => {
    if (resending || checking) {
      return;
    }
    setResending(true);
    setErrorMessage(undefined);
    try {
      await resendNotice();
    } catch (error) {
      setErrorMessage(
        error instanceof ParentalConsentError
          ? error.message
          : parentalConsentCopy.errors.unexpected,
      );
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = session.snapshot?.maskedParentEmail ?? 'your parent or guardian';
  const deliveryFailed = session.snapshot?.noticeDeliveryStatus === 'failed_transient';

  return (
    <AuthScreenLayout onBack={handleBack}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="consent-pending-title"
        >
          {parentalConsentCopy.pending.title}
        </Text>
        <Text style={styles.supporting} testID="consent-pending-masked-email">
          {parentalConsentCopy.pending.supporting(maskedEmail)}
        </Text>
      </View>
      {deliveryFailed ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.banner}
          testID="consent-pending-delivery-failed"
        >
          {parentalConsentCopy.pending.deliveryFailed}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.formError}>
          {errorMessage}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <AuthPrimaryButton
          testID="consent-pending-check-again"
          label={parentalConsentCopy.pending.checkAgain}
          loadingLabel={parentalConsentCopy.pending.checking}
          onPress={() => {
            void runRefresh();
          }}
          loading={checking}
          disabled={checking || resending}
        />
        <AuthPrimaryButton
          testID="consent-pending-resend"
          label={parentalConsentCopy.pending.resend}
          loadingLabel={parentalConsentCopy.pending.resending}
          variant="secondary"
          onPress={() => {
            void handleResend();
          }}
          loading={resending}
          disabled={checking || resending}
        />
        <AuthTextLink
          testID="consent-pending-change-email"
          label={parentalConsentCopy.pending.changeEmail}
          disabled={checking || resending}
          onPress={() => navigation.navigate('ConsentChangeEmail')}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.verseReference,
  },
  supporting: {
    ...typography.brandTagline,
  },
  banner: {
    ...typography.hint,
    color: colors.navy,
    marginBottom: spacing.md,
  },
  formError: {
    ...typography.hint,
    color: colors.practicingRed,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});

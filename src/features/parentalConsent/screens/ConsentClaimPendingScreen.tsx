import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/hooks/useAuth';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { colors, spacing, typography } from '../../../shared/theme';
import { parentalConsentCopy } from '../copy/parentalConsentCopy';
import { ParentalConsentError } from '../errors/parentalConsentError';
import {
  isTerminalClaimError,
  isTransientParentalConsentError,
} from '../errors/translateParentalConsentError';
import { useParentalConsent } from '../hooks/useParentalConsent';
import { hasConsentCapability } from '../domain/consentClientSession';

/**
 * Root-level post-signup claim gate.
 * Auto-claims when capability tokens exist; otherwise offers Sign Out for fresh-consent recovery.
 */
export function ConsentClaimPendingScreen(): React.JSX.Element {
  const { session: authSession, signOut } = useAuth();
  const { session, claim, needsFreshConsent, refreshStatus } = useParentalConsent();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [terminal, setTerminal] = useState(needsFreshConsent && !hasConsentCapability(session.capability));
  const attemptedRef = useRef(false);
  const authenticated =
    authSession.status === 'authenticated' ? authSession.identity.uid : null;

  const runClaim = async () => {
    if (busy) {
      return;
    }
    if (!hasConsentCapability(session.capability)) {
      setTerminal(true);
      setErrorMessage(parentalConsentCopy.claimPending.terminal);
      return;
    }
    if (!session.capability?.pendingClaimUid || !authenticated) {
      // Fresh signup may still be promoting awaitingClaim → pendingClaimUid.
      setErrorMessage(parentalConsentCopy.claimPending.transient);
      return;
    }
    if (session.capability.pendingClaimUid !== authenticated) {
      setTerminal(true);
      setErrorMessage(parentalConsentCopy.claimPending.terminal);
      return;
    }

    setBusy(true);
    setErrorMessage(undefined);
    try {
      // Always attempt claim. Same-UID bound is server-idempotent success;
      // different-UID bound returns already-exists → enterFreshConsentRecovery.
      // Do not treat bindingState===bound as a client-side success/failure shortcut.
      try {
        await refreshStatus();
      } catch {
        // Claim may still succeed; fall through.
      }
      await claim();
    } catch (error) {
      if (error instanceof ParentalConsentError) {
        if (isTransientParentalConsentError(error)) {
          setErrorMessage(parentalConsentCopy.claimPending.transient);
        } else if (error.code === 'unauthenticated' && authenticated !== null) {
          // Signed-in but Functions auth context missing/rejected — not network,
          // and not recovery "Sign in to finish…".
          setErrorMessage(parentalConsentCopy.claimPending.authContext);
        } else if (error.code === 'unauthenticated') {
          // Existing-account recovery path B: caller is not authenticated for claim.
          setErrorMessage(parentalConsentCopy.errors.unauthenticated);
        } else if (isTerminalClaimError(error) || needsFreshConsent) {
          setTerminal(true);
          setErrorMessage(parentalConsentCopy.claimPending.terminal);
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage(parentalConsentCopy.errors.unexpected);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (attemptedRef.current) {
      return;
    }
    if (!hasConsentCapability(session.capability)) {
      attemptedRef.current = true;
      setTerminal(true);
      setErrorMessage(parentalConsentCopy.claimPending.terminal);
      return;
    }
    // Wait until pendingClaimUid is bound to this Auth UID (fresh signup path A).
    if (!session.capability?.pendingClaimUid || !authenticated) {
      return;
    }
    if (session.capability.pendingClaimUid !== authenticated) {
      attemptedRef.current = true;
      setTerminal(true);
      setErrorMessage(parentalConsentCopy.claimPending.terminal);
      return;
    }
    attemptedRef.current = true;
    void runClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, session.capability?.pendingClaimUid, session.capability?.requestId]);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreenLayout canvas="brand">
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="consent-claim-pending-title"
        >
          {parentalConsentCopy.claimPending.title}
        </Text>
        <Text style={styles.body}>
          {terminal
            ? parentalConsentCopy.claimPending.terminal
            : parentalConsentCopy.claimPending.body}
        </Text>
      </View>
      {errorMessage && !terminal ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.formError}>
          {errorMessage}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {!terminal ? (
          <AuthPrimaryButton
            testID="consent-claim-pending-retry"
            accentTone="auth"
            label={parentalConsentCopy.claimPending.retry}
            onPress={() => {
              void runClaim();
            }}
            loading={busy}
            disabled={busy}
          />
        ) : null}
        <AuthPrimaryButton
          testID="consent-claim-pending-sign-out"
          accentTone="auth"
          label={parentalConsentCopy.claimPending.signingOut}
          variant={terminal ? 'primary' : 'secondary'}
          onPress={() => {
            void handleSignOut();
          }}
          loading={busy && terminal}
          disabled={busy}
        />
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
  formError: {
    ...typography.hint,
    color: colors.practicingRed,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});

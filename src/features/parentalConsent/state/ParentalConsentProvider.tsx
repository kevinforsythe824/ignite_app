import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '../../auth/hooks/useAuth';
import {
  createEmptyConsentClientSession,
  hasConsentCapability,
  type ConsentClientSession,
} from '../domain/consentClientSession';
import type { ParentalConsentSnapshot } from '../domain/parentalConsentSnapshot';
import {
  toParentalConsentPresentation,
  type ParentalConsentPresentation,
} from '../domain/parentalConsentStatus';
import { ParentalConsentError } from '../errors/parentalConsentError';
import {
  isTerminalClaimError,
  isTransientParentalConsentError,
  translateParentalConsentError,
} from '../errors/translateParentalConsentError';
import type { ParentalConsentRepository } from '../repositories/parentalConsentRepository';
import { firebaseParentalConsentRepository } from '../repositories';
import type { ConsentSecureStore } from '../storage/consentSecureStore';
import { expoConsentSecureStore } from '../storage/expoConsentSecureStore';
import {
  initialParentalConsentSessionState,
  type ParentalConsentSessionState,
} from './parentalConsentSessionState';

export type ConsentResumeDestination =
  | 'pending'
  | 'createAccount'
  | 'signInToClaim'
  | 'recovery';

export interface ParentalConsentContextValue {
  session: ParentalConsentSessionState;
  /** Active under-13 privacy path (requestId + token present). */
  hasActiveConsent: boolean;
  /** RootNavigator claim gate: pendingClaimUid matches authenticated uid. */
  isClaimRequired: boolean;
  /** True when Auth exists but consent must be renewed before claim. */
  needsFreshConsent: boolean;
  createRequest(parentEmail: string): Promise<ParentalConsentSnapshot>;
  refreshStatus(): Promise<ParentalConsentSnapshot | null>;
  resendNotice(): Promise<void>;
  updateParentEmail(parentEmail: string): Promise<ParentalConsentSnapshot>;
  claim(): Promise<void>;
  beginPostSignupClaim(): Promise<void>;
  /**
   * After Auth signup succeeds: bind claim intent to the concrete UID immediately.
   * Clears awaitingClaim. Prefer this over waiting solely for the Auth effect.
   */
  completePostSignupClaim(uid: string): Promise<void>;
  cancelPostSignupClaim(): Promise<void>;
  /** Clear local capability (explicit Start over). Preserves pendingClaimUid when set. */
  clearSession(): Promise<void>;
  /**
   * After terminal claim: keep pendingClaimUid, set needsFreshConsent,
   * clear dead request tokens.
   */
  enterFreshConsentRecovery(uid: string): Promise<void>;
  /**
   * Resolve where to send the user after an authoritative status check.
   * Does not navigate — callers navigate.
   */
  resolveResumeDestination(
    snapshot?: ParentalConsentSnapshot | null,
  ): ConsentResumeDestination;
  presentationFor(
    snapshot?: ParentalConsentSnapshot | null,
  ): ParentalConsentPresentation | null;
}

const ParentalConsentContext = createContext<ParentalConsentContextValue | undefined>(
  undefined,
);

export interface ParentalConsentProviderProps {
  children: ReactNode;
  repository?: ParentalConsentRepository;
  secureStore?: ConsentSecureStore;
}

function requireCredentials(capability: ConsentClientSession | null): {
  requestId: string;
  clientSessionToken: string;
} {
  if (!hasConsentCapability(capability) || capability === null) {
    throw new ParentalConsentError(
      'unexpected',
      'Parent approval session is missing on this device.',
    );
  }
  return {
    requestId: capability.requestId!,
    clientSessionToken: capability.clientSessionToken!,
  };
}

/**
 * Owns local consent capability + last authoritative snapshot.
 * Mounts between AuthProvider and QuizzerProfileProvider.
 */
export function ParentalConsentProvider({
  children,
  repository = firebaseParentalConsentRepository,
  secureStore = expoConsentSecureStore,
}: ParentalConsentProviderProps): React.JSX.Element {
  const { session: authSession } = useAuth();
  const authStatus = authSession.status;
  const authenticatedUid =
    authSession.status === 'authenticated' ? authSession.identity.uid : null;

  const repositoryRef = useRef(repository);
  repositoryRef.current = repository;
  const secureStoreRef = useRef(secureStore);
  secureStoreRef.current = secureStore;
  const authenticatedUidRef = useRef(authenticatedUid);
  authenticatedUidRef.current = authenticatedUid;
  const authStatusRef = useRef(authStatus);
  authStatusRef.current = authStatus;

  const [session, setSession] = useState<ParentalConsentSessionState>(
    initialParentalConsentSessionState,
  );
  const refreshGenerationRef = useRef(0);
  const capabilityRef = useRef<ConsentClientSession | null>(null);

  const persistCapability = useCallback(async (next: ConsentClientSession | null) => {
    capabilityRef.current = next;
    if (next === null) {
      setSession((current) => ({
        ...current,
        capability: null,
        snapshot: null,
        lastError: null,
      }));
      await secureStoreRef.current.clear();
      return;
    }
    // Update React state before the durable write so the claim gate can engage
    // immediately after signup (SecureStore I/O must not delay pendingClaimUid).
    setSession((current) => ({
      ...current,
      capability: next,
    }));
    await secureStoreRef.current.write(next);
  }, []);

  // Hydrate SecureStore once; apply claim-intent hygiene without racing Auth restore.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setSession((current) => ({ ...current, hydrateStatus: 'hydrating' }));
      let stored: ConsentClientSession | null;
      try {
        stored = await secureStoreRef.current.read();
      } catch {
        stored = null;
      }
      if (cancelled) {
        return;
      }

      let next = stored;
      const status = authStatusRef.current;
      const uid = authenticatedUidRef.current;

      if (next?.awaitingClaim === true) {
        if (status === 'authenticated' && uid) {
          // Auth already restored: bind claim intent to the concrete UID.
          const { awaitingClaim: _cleared, ...rest } = next;
          next = {
            ...rest,
            version: next.version,
            pendingClaimUid: uid,
          };
          await secureStoreRef.current.write(next);
        } else if (status === 'initializing') {
          // NEVER clear awaitingClaim or conclude "no user" while Auth is still restoring.
          // Hold unresolved claim-recovery state; promotion runs when Auth resolves.
        } else {
          // Unauthenticated after Auth resolved: keep awaitingClaim.
          // Ambiguous post-signup must not silently unlock CreateAccount.
          // Explicit cancelPostSignupClaim (known signup failure) remains the clear path.
        }
      }

      capabilityRef.current = next;
      setSession((current) => ({
        ...current,
        hydrateStatus: 'ready',
        capability: next,
      }));
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
    // Hydrate once on mount; auth promotion / hold of awaitingClaim is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When Auth resolves authenticated after beginPostSignupClaim (or hydrate hold),
  // promote awaitingClaim → pendingClaimUid.
  useEffect(() => {
    if (session.hydrateStatus !== 'ready') {
      return;
    }
    const capability = capabilityRef.current;
    if (!capability?.awaitingClaim || !authenticatedUid) {
      return;
    }

    const { awaitingClaim: _cleared, ...rest } = capability;
    const next: ConsentClientSession = {
      ...rest,
      version: capability.version,
      pendingClaimUid: authenticatedUid,
    };
    void persistCapability(next);
  }, [authenticatedUid, persistCapability, session.hydrateStatus]);

  const createRequest = useCallback(
    async (parentEmail: string): Promise<ParentalConsentSnapshot> => {
      setSession((current) => ({ ...current, refreshing: true, lastError: null }));
      try {
        const result = await repositoryRef.current.createRequest({ parentEmail });
        const previous = capabilityRef.current ?? createEmptyConsentClientSession();
        const next: ConsentClientSession = {
          version: previous.version,
          requestId: result.requestId,
          clientSessionToken: result.clientSessionToken,
          // Preserve recovery identity across fresh consent for an existing UID.
          pendingClaimUid: previous.pendingClaimUid,
          needsFreshConsent: previous.needsFreshConsent,
        };
        const snapshot: ParentalConsentSnapshot = {
          status: result.status,
          maskedParentEmail: result.maskedParentEmail,
          expiresAt: result.expiresAt,
          bindingState: result.bindingState,
          noticeDeliveryStatus: result.noticeDeliveryStatus,
        };
        await persistCapability(next);
        setSession((current) => ({
          ...current,
          snapshot,
          refreshing: false,
          lastError: null,
        }));
        return snapshot;
      } catch (error) {
        const translated = translateParentalConsentError(error);
        setSession((current) => ({
          ...current,
          refreshing: false,
          lastError: translated,
        }));
        throw translated;
      }
    },
    [persistCapability],
  );

  const refreshStatus = useCallback(async (): Promise<ParentalConsentSnapshot | null> => {
    const credentialsCapable = hasConsentCapability(capabilityRef.current);
    if (!credentialsCapable) {
      return null;
    }
    const credentials = requireCredentials(capabilityRef.current);
    const generation = refreshGenerationRef.current + 1;
    refreshGenerationRef.current = generation;
    setSession((current) => ({ ...current, refreshing: true, lastError: null }));

    try {
      const result = await repositoryRef.current.getStatus(credentials);
      if (refreshGenerationRef.current !== generation) {
        return null;
      }
      const snapshot: ParentalConsentSnapshot = {
        status: result.status,
        maskedParentEmail: result.maskedParentEmail,
        expiresAt: result.expiresAt,
        bindingState: result.bindingState,
      };
      setSession((current) => ({
        ...current,
        snapshot,
        refreshing: false,
        lastError: null,
      }));
      return snapshot;
    } catch (error) {
      if (refreshGenerationRef.current !== generation) {
        return null;
      }
      const translated = translateParentalConsentError(error);
      setSession((current) => ({
        ...current,
        refreshing: false,
        lastError: translated,
      }));
      throw translated;
    }
  }, []);

  const resendNotice = useCallback(async (): Promise<void> => {
    const credentials = requireCredentials(capabilityRef.current);
    setSession((current) => ({ ...current, refreshing: true, lastError: null }));
    try {
      const result = await repositoryRef.current.resendNotice(credentials);
      setSession((current) => ({
        ...current,
        refreshing: false,
        lastError: null,
        snapshot: current.snapshot
          ? {
              ...current.snapshot,
              noticeDeliveryStatus: result.noticeDeliveryStatus,
            }
          : current.snapshot,
      }));
    } catch (error) {
      const translated = translateParentalConsentError(error);
      setSession((current) => ({
        ...current,
        refreshing: false,
        lastError: translated,
      }));
      throw translated;
    }
  }, []);

  const updateParentEmail = useCallback(
    async (parentEmail: string): Promise<ParentalConsentSnapshot> => {
      const credentials = requireCredentials(capabilityRef.current);
      setSession((current) => ({ ...current, refreshing: true, lastError: null }));
      try {
        const result = await repositoryRef.current.updateParentEmail({
          ...credentials,
          parentEmail,
        });
        // After email rotate, re-fetch authoritative status.
        const status = await repositoryRef.current.getStatus(credentials);
        const snapshot: ParentalConsentSnapshot = {
          status: status.status,
          maskedParentEmail: result.maskedParentEmail,
          expiresAt: status.expiresAt,
          bindingState: status.bindingState,
          noticeDeliveryStatus: result.noticeDeliveryStatus,
        };
        setSession((current) => ({
          ...current,
          snapshot,
          refreshing: false,
          lastError: null,
        }));
        return snapshot;
      } catch (error) {
        const translated = translateParentalConsentError(error);
        setSession((current) => ({
          ...current,
          refreshing: false,
          lastError: translated,
        }));
        throw translated;
      }
    },
    [],
  );

  /**
   * Explicit Start over.
   * Pre-auth (no pendingClaimUid): clear the entire local capability.
   * Post-auth recovery (pendingClaimUid present): clear dead request tokens only and
   * keep the recovery UID + needsFreshConsent so the next path is Sign In → claim,
   * never a second CreateAccount / Auth account.
   */
  const clearSession = useCallback(async (): Promise<void> => {
    refreshGenerationRef.current += 1;
    const uid = capabilityRef.current?.pendingClaimUid;
    if (uid) {
      const next: ConsentClientSession = {
        version: capabilityRef.current?.version ?? 1,
        pendingClaimUid: uid,
        needsFreshConsent: true,
      };
      await persistCapability(next);
      setSession((current) => ({
        ...current,
        snapshot: null,
        lastError: null,
      }));
      return;
    }
    await persistCapability(null);
  }, [persistCapability]);

  const beginPostSignupClaim = useCallback(async (): Promise<void> => {
    const current = capabilityRef.current ?? createEmptyConsentClientSession();
    if (!hasConsentCapability(current)) {
      throw new ParentalConsentError(
        'unexpected',
        'Parent approval is required before creating this account.',
      );
    }
    const next: ConsentClientSession = {
      ...current,
      awaitingClaim: true,
    };
    await persistCapability(next);
  }, [persistCapability]);

  const completePostSignupClaim = useCallback(
    async (uid: string): Promise<void> => {
      if (!uid) {
        throw new ParentalConsentError(
          'unexpected',
          'Parent approval claim is not available for this account.',
        );
      }
      const current = capabilityRef.current ?? createEmptyConsentClientSession();
      if (!hasConsentCapability(current)) {
        throw new ParentalConsentError(
          'unexpected',
          'Parent approval session is missing on this device.',
        );
      }
      const { awaitingClaim: _cleared, ...rest } = current;
      const next: ConsentClientSession = {
        ...rest,
        version: current.version,
        pendingClaimUid: uid,
      };
      await persistCapability(next);
    },
    [persistCapability],
  );

  const cancelPostSignupClaim = useCallback(async (): Promise<void> => {
    const current = capabilityRef.current;
    if (!current?.awaitingClaim) {
      return;
    }
    const { awaitingClaim: _cleared, ...rest } = current;
    await persistCapability({ ...rest, version: current.version });
  }, [persistCapability]);

  const enterFreshConsentRecovery = useCallback(
    async (uid: string): Promise<void> => {
      const next: ConsentClientSession = {
        version: capabilityRef.current?.version ?? 1,
        pendingClaimUid: uid,
        needsFreshConsent: true,
      };
      await persistCapability(next);
      setSession((current) => ({
        ...current,
        snapshot: null,
        lastError: null,
      }));
    },
    [persistCapability],
  );

  const claim = useCallback(async (): Promise<void> => {
    const uid = authenticatedUidRef.current;
    const capability = capabilityRef.current;
    if (!uid || capability?.pendingClaimUid !== uid) {
      throw new ParentalConsentError(
        'unexpected',
        'Parent approval claim is not available for this account.',
      );
    }
    if (!hasConsentCapability(capability)) {
      throw new ParentalConsentError(
        'unexpected',
        'Parent approval session is missing on this device.',
      );
    }

    setSession((current) => ({ ...current, refreshing: true, lastError: null }));
    try {
      await repositoryRef.current.claim(requireCredentials(capability));
      await persistCapability(null);
      setSession((current) => ({
        ...current,
        refreshing: false,
        lastError: null,
        snapshot: null,
      }));
    } catch (error) {
      const translated = translateParentalConsentError(error);
      if (isTerminalClaimError(translated) && !isTransientParentalConsentError(translated)) {
        // Prefer getStatus when failed-precondition is ambiguous.
        if (translated.code === 'failed-precondition' && hasConsentCapability(capability)) {
          try {
            const status = await repositoryRef.current.getStatus(
              requireCredentials(capability),
            );
            if (
              status.status === 'approved' &&
              status.bindingState === 'unbound'
            ) {
              // Still claimable — treat as transient-ish failed precondition.
              setSession((current) => ({
                ...current,
                refreshing: false,
                lastError: translated,
                snapshot: {
                  status: status.status,
                  maskedParentEmail: status.maskedParentEmail,
                  expiresAt: status.expiresAt,
                  bindingState: status.bindingState,
                },
              }));
              throw translated;
            }
          } catch (statusError) {
            if (statusError instanceof ParentalConsentError) {
              // Fall through to terminal recovery when status also fails.
            }
          }
        }
        await enterFreshConsentRecovery(uid);
        setSession((current) => ({
          ...current,
          refreshing: false,
          lastError: translated,
        }));
        throw translated;
      }
      setSession((current) => ({
        ...current,
        refreshing: false,
        lastError: translated,
      }));
      throw translated;
    }
  }, [enterFreshConsentRecovery, persistCapability]);

  const presentationFor = useCallback(
    (snapshot?: ParentalConsentSnapshot | null): ParentalConsentPresentation | null => {
      const target = snapshot === undefined ? session.snapshot : snapshot;
      if (!target) {
        return null;
      }
      return toParentalConsentPresentation(target.status, target.bindingState);
    },
    [session.snapshot],
  );

  const resolveResumeDestination = useCallback(
    (snapshot?: ParentalConsentSnapshot | null): ConsentResumeDestination => {
      const capability = capabilityRef.current;
      const target = snapshot === undefined ? session.snapshot : snapshot;

      // Recovery / claim-bound identity never unlocks CreateAccount.
      // awaitingClaim (ambiguous post-signup) also must not unlock CreateAccount.
      if (
        capability?.needsFreshConsent ||
        capability?.pendingClaimUid ||
        capability?.awaitingClaim
      ) {
        if (
          target &&
          toParentalConsentPresentation(target.status, target.bindingState) ===
            'approvedUnbound'
        ) {
          return 'signInToClaim';
        }
        if (target) {
          const presentation = toParentalConsentPresentation(
            target.status,
            target.bindingState,
          );
          if (presentation === 'waiting') {
            return 'pending';
          }
          if (presentation === 'approvedBound' || presentation === 'recovery') {
            return 'recovery';
          }
        }
        // No snapshot yet under fresh-consent recovery: keep building consent.
        if (hasConsentCapability(capability)) {
          return 'pending';
        }
        return 'recovery';
      }

      if (!target) {
        if (hasConsentCapability(capability)) {
          return 'pending';
        }
        return 'recovery';
      }

      const presentation = toParentalConsentPresentation(
        target.status,
        target.bindingState,
      );
      if (presentation === 'waiting') {
        return 'pending';
      }
      if (presentation === 'approvedUnbound') {
        return 'createAccount';
      }
      return 'recovery';
    },
    [session.snapshot],
  );

  const hasActiveConsent = hasConsentCapability(session.capability);
  const needsFreshConsent = session.capability?.needsFreshConsent === true;
  /**
   * Root gate: pendingClaimUid match, or transient awaitingClaim with active
   * request tokens immediately after under-13 signup (before UID bind lands).
   * Do not gate on bare awaitingClaim without tokens (unrelated Sign In).
   */
  const isClaimRequired =
    authenticatedUid !== null &&
    (session.capability?.pendingClaimUid === authenticatedUid ||
      (session.capability?.awaitingClaim === true && hasActiveConsent));

  const value = useMemo<ParentalConsentContextValue>(
    () => ({
      session,
      hasActiveConsent,
      isClaimRequired,
      needsFreshConsent,
      createRequest,
      refreshStatus,
      resendNotice,
      updateParentEmail,
      claim,
      beginPostSignupClaim,
      completePostSignupClaim,
      cancelPostSignupClaim,
      clearSession,
      enterFreshConsentRecovery,
      resolveResumeDestination,
      presentationFor,
    }),
    [
      session,
      hasActiveConsent,
      isClaimRequired,
      needsFreshConsent,
      createRequest,
      refreshStatus,
      resendNotice,
      updateParentEmail,
      claim,
      beginPostSignupClaim,
      completePostSignupClaim,
      cancelPostSignupClaim,
      clearSession,
      enterFreshConsentRecovery,
      resolveResumeDestination,
      presentationFor,
    ],
  );

  return (
    <ParentalConsentContext.Provider value={value}>
      {children}
    </ParentalConsentContext.Provider>
  );
}

export function useParentalConsentContext(): ParentalConsentContextValue {
  const value = useContext(ParentalConsentContext);
  if (value === undefined) {
    throw new Error('useParentalConsent must be used within ParentalConsentProvider');
  }
  return value;
}

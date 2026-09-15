# ADR-010: Mobile parental consent integration (Phase 6.5C)

- **Status:** Accepted
- **Date:** 2026-08-26
- **Related PRD:** §§4.2, 43–44, 48, 62
- **Related:** ADR-006, ADR-007, ADR-008, ADR-009

## Context

Phases 6.5A/6.5B delivered server-authoritative parental consent (Firestore + callables + Hosting + Resend). Mobile still routed under-13 users to a terminal hold (`UnderThirteenBlocked`). Phase 6.5C must unlock under-13 account creation only after authoritative `approved` + `unbound`, bind claim intent to a concrete Auth UID, and recover terminal post-signup claim failures without creating a second Auth account.

## Decision

### Feature boundary

- Mobile parental consent lives in `src/features/parentalConsent/` (feature-first), not nested under auth.
- UI → `ParentalConsentProvider` → `ParentalConsentRepository` → Firebase `httpsCallable` only (`us-central1`).
- Do not call Hosting HTTP, browser sessions, raw email tokens, Admin APIs, or Firestore consent docs from the client.

### Local capability (SecureStore)

- Persist only `{ version, requestId?, clientSessionToken?, awaitingClaim?, pendingClaimUid?, needsFreshConsent? }` via `expo-secure-store`.
- Accessibility: `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, `requireAuthentication: false`.
- Never store server status, a local approved flag, full parent email, age/DOB, or tokens in AsyncStorage.

### Claim intent hygiene

- `beginPostSignupClaim()` sets transient `awaitingClaim` immediately before `signUp`.
- Signup failure → `cancelPostSignupClaim()` clears `awaitingClaim` only; keep approved request for retry.
- Signup success → persist `pendingClaimUid = authenticated UID`; clear `awaitingClaim`.
- Hydrate while Auth is `initializing`: **never** clear `awaitingClaim` and never conclude there is no authenticated user; hold unresolved claim-recovery state until Auth resolves.
- Hydrate / Auth resolve authenticated + `awaitingClaim` → promote to `pendingClaimUid`.
- Auth resolve unauthenticated + `awaitingClaim`: keep claim intent (do not unlock Create Account); prefer Sign In / recovery. Only explicit `cancelPostSignupClaim` clears generic claim intent after a known signup failure.
- RootNavigator claim gate (`isClaimRequired`) is true when authenticated **and** (`pendingClaimUid === authenticatedUid` **or** (`awaitingClaim === true` **and** active consent capability)). Bare `awaitingClaim` without active capability does not gate unrelated Sign In.
- Explicit Start over with `pendingClaimUid` present clears dead request tokens only and keeps the recovery UID + `needsFreshConsent` (existing-account path → Sign In → claim; never a second Auth account).

### Create Account gate

- Unlock Create Account only when `getStatus` returns `approved` + `bindingState: unbound`, and there is no `pendingClaimUid` / `needsFreshConsent` / pre-existing `awaitingClaim` blocking new signup.
- `approved` + `bound` never creates another Auth account from that request.
- Claim pending always calls `claimParentalConsent` (same-UID bound is server-idempotent; different UID → `already-exists` → fresh-consent recovery).
- 13+ remains unchanged when no active under-13 capability.
- `CreateAccountScreen` uses a local, non-persisted in-flight ownership marker (`freshSignupInFlightRef`) during a fresh approved under-13 signup. Set it synchronously before `beginPostSignupClaim` so the focus gate does not treat this screen's own `awaitingClaim` as prior-attempt Sign In recovery.
- The marker does **not** survive remount/restart. A genuinely pre-existing `awaitingClaim` still follows recovery: when `awaitingClaim` is true and the marker is false, focused Create Account redirects unauthenticated users to Sign In.
- When this screen just created `awaitingClaim` (marker true), it does not bounce to Sign In.
- When already authenticated, `RootNavigator` remains the authoritative lifecycle router for the claim gate.

### Active under-13 privacy path

- An active local capability (`requestId` + token) cannot be bypassed by choosing 13+; require explicit Start over confirmation before clearing SecureStore.

### Terminal claim recovery

- Keep the Firebase Auth account.
- Clear dead request tokens; persist `pendingClaimUid` + `needsFreshConsent`.
- Fresh parent consent → Sign In existing UID → claim — **no second signup**.

### Errors

- Map stable Firebase Functions codes only; do not parse human-readable server messages for security/navigation.
- Prefer authoritative `getStatus` after ambiguous `failed-precondition` before choosing recovery.
- Authenticated claim failures with Functions code `unauthenticated` must not be shown as a network/connection error, and must not show recovery “Sign in to finish…” while the user is already signed in.

### Claim callable Cloud Run invoker

- `claimParentalConsent` is Gen2 and always sends a Firebase Auth ID token. Cloud Run IAM must use `invoker: 'public'` so IAM does not try to verify that Firebase token as a Google identity token; Auth remains enforced in-handler via `request.auth.uid`.

## Consequences

- RootNavigator inserts a consent claim gate between Auth and Quizzer profile resolution.
- Under-13 users collect only parent/guardian email before `approved`.
- Phase 7 lifecycle work must not start until this claim gate holds for authenticated under-13 users.

## Alternatives considered

- AsyncStorage for the client session token — rejected; credential-like secret.
- Backend reason-code seam in `HttpsError.details` — deferred; `getStatus` is sufficient for 6.5C.
- Auto-claim on any leftover capability after Sign In — rejected; UID binding required.

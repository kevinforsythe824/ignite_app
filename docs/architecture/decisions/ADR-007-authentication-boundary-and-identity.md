# ADR-007: Authentication boundary and identity separation

- **Status:** Accepted
- **Date:** 2026-08-19
- **Related PRD:** §§38–39, 42, 44, 47, 62, 81–82

## Context

Sprint 2 requires Firebase Authentication for account identity while keeping Quizzer profile/domain data separate. UI and application code must not depend on Firebase Auth SDK types or error codes.

## Decision

- Authentication is accessed through a feature-owned **`AuthRepository`** interface in `src/features/auth/repositories/`.
- Firebase Auth is infrastructure: only `getFirebaseAuth()` in `src/services/firebase/` and the Firebase auth source adapter import `firebase/auth`.
- **`AuthenticatedIdentity`** contains auth-level fields only (`uid`, `email`, `emailVerified`). It does not own Quizzer profile data (name, avatar, age, division, season, progress, entitlement, etc.).
- Firebase/provider failures are translated into **`AuthenticationError`** before leaving the repository boundary.
- App-root **`AuthProvider`** owns session resolution (`initializing` → `unauthenticated` | `authenticated`). Onboarding, profile, and entitlement state compose separately; root routing composition is [ADR-011](ADR-011-account-lifecycle-routing.md). This ADR does not change identity ownership.
- React Native auth persistence uses `@react-native-async-storage/async-storage` with Firebase `getReactNativePersistence`, following the installed AsyncStorage package API.

## Rationale

Mirrors ADR-001 repository isolation for a non-Firestore concern. Keeps future onboarding recovery, under-13 consent routing, and Sprint 3 season eligibility from being embedded in Firebase Auth identity.

## Consequences

- Legacy `AuthService` / `AuthUser` stubs in `src/services/firebase/` are removed; authentication consumers import from `src/features/auth/`.
- Forgot Password / reset email is part of the authentication contract (`sendPasswordResetEmail`). A missing account (`user-not-found`) is treated as success so reset does not enumerate emails; other reset failures still become `AuthenticationError`. Settings-phase account operations on `AuthRepository` are `changeEmail` (internal reauth + `verifyBeforeUpdateEmail`), `changePassword` (internal reauth + `updatePassword`), and `refreshIdentity`. Reauthentication is not a public repository method.
- Sign-up creates a Firebase Auth account only. It does not provision a Quizzer profile. Authenticated identity with a missing profile is a valid later onboarding/recovery state.
- Root navigation composes Auth session with consent and Quizzer profile via the derived lifecycle destination in [ADR-011](ADR-011-account-lifecycle-routing.md). Authenticated identity remains separate from Quizzer profile data.
- Welcome starts account creation through the nested `AccountCreation` stack (`startAccountCreation`) rather than opening the credential form directly. That stack’s initial route is the privacy-age boundary; under-13 users continue through the Phase 6.5C parental-consent flow (parent email → approval → Create Account → claim). See [ADR-010](ADR-010-mobile-parental-consent-integration.md).
- Root navigation also gates authenticated under-13 users on `pendingClaimUid === currentUid` via `ConsentClaimPending` before Quizzer profile routes (ADR-010).

## Alternatives considered

- Exposing Firebase Auth through `firebaseService.auth` — rejected; couples application code to services-layer facade and blurs feature ownership.
- Putting Quizzer name/avatar on authenticated identity — rejected in PRD §§42, 62.

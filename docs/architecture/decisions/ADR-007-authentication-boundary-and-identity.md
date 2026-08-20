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
- App-root **`AuthProvider`** owns session resolution (`initializing` → `unauthenticated` | `authenticated`). Onboarding, profile, and entitlement state compose separately in later Sprint 2 phases.
- React Native auth persistence uses `@react-native-async-storage/async-storage` with Firebase `getReactNativePersistence`, following the installed AsyncStorage package API.

## Rationale

Mirrors ADR-001 repository isolation for a non-Firestore concern. Keeps future onboarding recovery, under-13 consent routing, and Sprint 3 season eligibility from being embedded in Firebase Auth identity.

## Consequences

- Legacy `AuthService` / `AuthUser` stubs in `src/services/firebase/` are removed; authentication consumers import from `src/features/auth/`.
- Forgot Password / reset email is part of the Phase 1 authentication contract (`sendPasswordResetEmail`). Reauthentication and email-change operations wait for the Settings phase.
- Navigation guards and auth screens are implemented in later phases; Phase 1 provider does not gate routing.

## Alternatives considered

- Exposing Firebase Auth through `firebaseService.auth` — rejected; couples application code to services-layer facade and blurs feature ownership.
- Putting Quizzer name/avatar on authenticated identity — rejected in PRD §§42, 62.

# ADR-011: Account lifecycle routing

- **Status:** Accepted
- **Date:** 2026-08-30
- **Related PRD:** §§43–44, 48, 62
- **Related:** ADR-007, ADR-010; playbook §§10, 18

## Context

Sprint 2 Phase 6.5C already routes from Auth, parental-consent claim, and Quizzer profile presence, but the decision tree lived inline in `RootNavigator`. That made precedence hard to test, left a User A → User B first-paint gap (User A’s `profile.ready` could flash until the profile effect ran), and had no insertion point for Sprint 3 season setup or Sprint 4 entitlement access.

PRD §62 owns account lifecycle **routing**, resume, returning-user behavior, and future season/entitlement handoffs. Playbook §10 is the ladder: signed out → Auth; signed in + no profile → onboarding; profile ready + season not configured → season setup; season + no entitlement → purchase; active entitlement → Home. Sprint 2 implements only the first two rungs plus the 6.5C claim gate.

## Decision

- Root navigation destination is a **pure derived value**, not a persisted onboarding document and not a flag (`onboardingComplete`, `isReturningUser`, step index, `justCreatedAccount`).
- The resolver lives in `src/app/lifecycle/` as `resolveAccountLifecycleDestination`. It is **not** a provider, store, or class. It does not own Auth, consent, or profile, and it does not read Firestore or call Firebase.
- `useAccountLifecycleDestination` only composes `useAuth`, `useParentalConsent`, and `useQuizzerProfile` into the resolver.
- `RootNavigator` is a thin switch on that destination plus `mapAccountLifecycleDestinationToRootScreen`.
- Authoritative inputs: Auth status + UID; consent hydrate status + `isClaimRequired`; Quizzer profile session (must match the current Auth UID); dormant `FutureLifecycleSeam` objects for season and entitlement.
- Production Phase 7 seams are always `{ status: 'unavailable' }` — skip the gate. Do not invent season or entitlement records to populate them.

### Precedence (first match wins)

1. Auth `initializing` → `initializing` (Ignite Entry)
2. Auth `unauthenticated` (or no UID) → `unauthenticated` (Auth stack)
3. Authenticated + consent hydrate not `ready` → `resolving` (never evaluate claim or profile routes)
4. Authenticated + `isClaimRequired` → `consentClaim` (never QuizzerName / MainTabs)
5. Profile `missing` / `ready` / `error` whose `quizzerId` is not the current UID → `resolving`
6. Profile `idle` / `loading` → `resolving`
7. Profile `error` → `profileError` (never treat as missing)
8. Profile `missing` → `profileOnboarding`
9. Season seam `loading` / `error` → `resolving`; `required` → `seasonSetup`
10. Entitlement seam `loading` / `error` → `resolving`; `required` → `entitlementAccess`
11. Else → `main`

`seasonSetup` and `entitlementAccess` have no screens in Phase 7. The mapper **fail-closes** them to the existing loading cover so they cannot fall through to MainTabs.

### UID isolation and remount

- The resolver ignores a profile session that does not match the current Auth UID.
- `QuizzerProfileProvider` applies the same rule at **render time** via `isolateQuizzerProfileSessionForUid`, so User A cannot surface as ready/missing/error for User B before the fetch effect runs.
- Authenticated navigator remount key is `authenticated:${uid}` **only**. Destination is not part of the key. Destination remounting is not required; React Navigation already swaps the conditionally rendered root screen set.

### Resume

Re-resolve from authoritative sources after every process start. There is no “resume step 4” integer and no AsyncStorage routing state. Fresh vs returning is only QuizzerProfile missing vs present.

### Account deletion

Phase 7 does **not** implement account deletion. Sprint 2 Phase 9 documents the inventory and future-feature contract in [`ACCOUNT_DELETION_RUNBOOK.md`](../../operations/ACCOUNT_DELETION_RUNBOOK.md) but still adds **no** Delete Account UI or destructive callable — full implementation remains a pre–public-release prerequisite. After a future deletion, the account simply has no Auth session and the resolver returns `unauthenticated`. A future Settings deletion flow must not encode deletion as an onboarding flag. See Open Decisions.

## Rationale

Derived routing keeps ADR-007 identity separation and ADR-010 claim-before-profile intact while making the ladder testable and extensible. Dormant `unavailable` seams let Sprint 3/4 replace a constant instead of rewriting `RootNavigator`. UID-only remount isolates User A → User B without resetting the same user’s navigator during ordinary profile/claim transitions.

## Consequences

- Phase 6.5C claim gate remains in front of profile routes. Parental consent and Functions are consumed, not rewritten.
- QuizzerProfile stays `quizzerId`, `firstName`, `lastName`, `avatarId`. No age, DOB, division, season, entitlement, or onboarding-complete fields.
- No new PII. Routing does not use email, names, DOB, or special accounts. Do not log UIDs, tokens, or profile contents.
- Account deletion exact behavior remains open (Open Decisions). Phase 9 runbook is the inventory/contract; Phase 7/9 add no Delete Account UI and no destructive callables.

## Alternatives considered

- Persisted onboarding flags or a step index — rejected; they drift from Auth / consent / profile truth and invent product state the PRD does not own.
- Destination in the navigator remount key — rejected; it would remount the same user during ordinary lifecycle transitions. UID remount plus resolver/provider UID-match is sufficient for User A → User B.
- Implementing season or entitlement screens in Phase 7 — rejected; those sprints own the sources of truth. `unavailable` skips the gate.
- Implementing account deletion in Phase 7 — rejected; exact behavior is UNRESOLVED. Phase 7 only documents that post-deletion routing is signed-out Auth.

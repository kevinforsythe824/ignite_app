# ADR-008: Parental consent email-plus foundation (server-authoritative)

- **Status:** Accepted
- **Date:** 2026-08-24
- **Related PRD:** §§4.2, 43–44, 62
- **Related:** ADR-001, ADR-006, ADR-007

## Context

Sprint 2 Phase 5 routes under-13 users to a terminal hold before any child account PII is collected. Phase 6.5A establishes the **server-authoritative** parental-consent foundation (Firestore + Cloud Functions) before hosted email delivery (6.5B) or mobile onboarding integration (6.5C).

Ignite must not invent ordinary UI logic as “compliance,” must not claim COPPA certification in product copy, and must keep parent email and capability tokens under backend control.

## Decision

### Consent lifecycle vs account binding

- Consent **status** is a lifecycle enum only: `pending` | `initial_consent_received` | `approved` | `expired` | `revoked`.
- Default 6.5B parent UX: `pending` → one explicit parent POST → `approved`. `initial_consent_received` is retained for audit history, in-flight two-step rows, and a server policy revert after legal review.
- Account **binding** is orthogonal: `claimedByUid` / `claimedAt` (unbound vs bound). Binding is **not** a status value such as `claimed`.
- A request may be `approved` and bound; later `revoked` may still retain historical binding fields.

### Server authority

- Collection `parentalConsentRequests/{requestId}` is Admin/Functions-only. Client Firestore rules: `allow read, write: if false`.
- Rate-limit buckets live in `parentalConsentRateLimits/{bucketId}` with the same deny-all client posture.
- Status transitions run only in trusted Cloud Functions via a pure state machine.
- Mobile clients never mutate consent state directly.

### Single-purpose opaque tokens

Four capabilities, hash-at-rest only:

| Token | Purpose |
|-------|---------|
| `clientSessionToken` | Pre-auth status / resend / update-email / claim capability |
| `approvalToken` | `processInitialConsent` only (the parent consent action) |
| `confirmationToken` | `processConfirmation` only — generated only when `REQUIRE_CONFIRMATION_FOR_APPROVAL` is true |
| `revokeToken` | `revokeConsent` only |

Approval and confirmation tokens must **never** authorize revocation.

### Claim security

- `claimParentalConsent` accepts only `{ requestId, clientSessionToken }`.
- UID is derived solely from authenticated callable context (`request.auth.uid`).
- Client-supplied UIDs are ignored/rejected.
- Binding is one-account: same-uid retry is idempotent; different uid is rejected.

### Parent email minimization

- Persist canonical `parentEmail` for later delivery and `maskedParentEmail` for safe responses.
- Normalize email **in memory** only; do not persist `parentEmailNormalized`.
- Abuse keys use **HMAC-SHA256** over the normalized email with a server secret (`PARENT_EMAIL_HMAC_SECRET`), never unsalted SHA-256 of the email.
- Full parent email is never returned to pre-auth callers and is not written to routine logs.

### Email-plus policy seam

- Confirmation **requirement**, delays, TTL, and resend limits live in server `consentPolicy` configuration (`REQUIRE_CONFIRMATION_FOR_APPROVAL`, confirmation delay).
- Default: the delayed email is a confirmatory **notice** (consent already approved; revoke link only; no second parent action). Setting `REQUIRE_CONFIRMATION_FOR_APPROVAL` to true restores a second parent POST before `approved` without changing the mobile app.
- Exact production VPC / legal interpretation remains subject to release-time privacy/legal review. Code and docs must not claim COPPA compliance.

### Abuse protection

- Rate limits use **Firestore-backed atomic** counters shared across Functions instances (not process memory).
- Firebase App Check may be enforced later; it does not replace rate limits. Emulator/App Check enforcement is off for Phase 6.5A by default.

### Expiration

- Authoritative expiry is check-on-access / check-on-transition. No Cloud Scheduler is required for 6.5A correctness.

### Phase boundaries

- **6.5A:** backend, rules, console/test email port, emulator-proven claim — no Hosting, no real transactional email provider, no mobile consent UI.
- **6.5B / 6.5C:** out of scope for this ADR’s implementation phase; they consume this foundation.

## Rationale

Separating status from binding keeps revocation and claim history intelligible. Single-purpose tokens reduce cross-action replay. HMAC email hashes reduce offline guessing if rate-limit documents leak. Deny-all client rules match ADR-006’s requirement that UI hiding is not authorization.

## Consequences

- Phase 6.5A adds a `functions/` package and deny-all consent/rate-limit rules.
- Under-13 mobile UX is integrated in Phase 6.5C ([ADR-010](ADR-010-mobile-parental-consent-integration.md)).
- Integration tests for claim must use Auth + Functions + Firestore emulators so `request.auth.uid` is real, not a mocked auth object alone.
- HMAC secret must never be committed; local/emulator uses gitignored env; deployed DEV uses Functions secrets.

## Alternatives considered

- Modeling `claimed` as a consent status — rejected; collapses binding with lifecycle.
- Client-writable consent documents — rejected; enables self-approval.
- Reusing approval tokens for revoke — rejected; violates single-purpose token model.
- Unsalted SHA-256 of email as durable rate-limit key — rejected; weaker if data is exfiltrated.
- Process-memory rate-limit Maps — rejected; unsafe across serverless instances.
- Firebase Dynamic Links — rejected (sunset); not used in 6.5A.

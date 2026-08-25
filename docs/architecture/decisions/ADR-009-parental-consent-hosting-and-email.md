# ADR-009: Parental consent Hosting surface and transactional email (DEV)

- **Status:** Accepted
- **Date:** 2026-08-24
- **Related PRD:** §§4.2, 43–44, 62
- **Related:** ADR-006, ADR-008

## Context

Phase 6.5A established server-authoritative parental consent (Firestore + Cloud Functions, console email only). Phase 6.5B must deliver real DEV transactional email and a minimal parent-facing Hosting experience without mobile onboarding integration, without claiming COPPA compliance, and without public raw-token mutation bypasses.

## Decision

### Hosting + Functions

- Parent UI is Firebase Hosting rewritten to Gen 2 HTTPS Functions (server-rendered HTML).
- No Parent Portal, parent Auth, SPA framework, analytics, or tracking.
- GET never mutates consent. Explicit POST + sealed browser session + CSRF required for approve / confirm / revoke.
- Deployed DEV must not expose public `onRequest` endpoints that mutate consent from raw email tokens alone. Use cases remain internal; tests call them directly or via Hosting handlers.

### Browser session

- Short-lived **sealed** cookies (`HttpOnly`, `Secure`, `SameSite=Strict`), purpose-bound (`approve` | `confirm` | `revoke`).
- Sensitive responses use `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, restrictive CSP, and frame protections.
- Capabilities are never stored in `localStorage` / `sessionStorage`.

### Email

- `EmailSender` port remains; DEV uses Resend behind that port. Emulator/CI use console + test capture.
- Consent lifecycle and email-delivery lifecycle are separate fields.
- Create-then-deliver: durable `pending` request first; notice failure records delivery metadata and does not approve; resend recovers.
- Every logical send uses a stable provider idempotency key (`initial-notice|confirmation|…/{requestId}/{deliveryVersion}`).

### Confirmation delay

- Firebase Task Queue Functions (`onTaskDispatched`) enforce `CONFIRMATION_EMAIL_DELAY_MS` (DEV may use a shortened explicit value).
- Confirmation capability is generated once at initial consent: hash-at-rest + sealed ciphertext for retries; raw token never logged or stored in plaintext Firestore fields. After successful send, sealed ciphertext is cleared.
- Task retries must not rotate the confirmation capability or create a different logical confirmation email.

### Environment

- Phase 6.5B targets DEV (`wpf-bible-qizzing`) only. Blaze billing and Cloud Tasks (via Task Queue Functions) are required for deployed delayed confirmation.

## Consequences

- Hosting site at `https://wpf-bible-qizzing.web.app` for parent flows.
- Secrets (`RESEND_API_KEY`, HMAC, session/token seal) live in Secret Manager / gitignored local env — never Expo or Hosting JS.
- Mobile under-13 UI remains Phase 5 terminal hold until Phase 6.5C.

## Alternatives considered

- Keep public raw-token JSON POST handlers — rejected; bypasses session/CSRF architecture.
- Regenerate confirmation token inside Task Queue retries — rejected; breaks delivered links.
- Fail closed on create when email fails — rejected; causes duplicate requests on client retry; resend is the recovery path.
- Firestore session-ID store — rejected for 6.5B; sealed cookies are smaller for Gen 2.

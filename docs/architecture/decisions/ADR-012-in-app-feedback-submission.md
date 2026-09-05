# ADR-012: In-app feedback submission

- **Status:** Accepted
- **Date:** 2026-08-30
- **Related PRD:** §§41.2, 43–44, 47–48, 62
- **Related:** ADR-001, ADR-006, ADR-007, ADR-010, ADR-011

## Context

Sprint 2 needs an explicit, privacy-safe path for bug diagnosis and product feedback (PRD §62). Settings already hosts account management. There was no in-app Help & Feedback surface, and no collection for operator review.

GitHub issue automation, support tickets, chat, screenshots, and account-correlation fields were considered and rejected for this phase.

## Decision

- Authenticated users with a completed Quizzer profile reach **Settings → Help & Feedback → compose** (bug / feature / general).
- The client submits through `FeedbackRepository` → `httpsCallable('submitFeedback')`. UI never writes Firestore.
- Cloud Functions (Gen2, `us-central1`) validate the payload and write `feedbackSubmissions/{autoId}` with the Admin SDK.
- `request.auth.uid` **authorizes the callable only**. Phase 8 does **not** persist `actorUid`, `uid`, or `userId`.
- Stored fields: `category`, optional `title`, `message`, `appVersion`, `platform`, `osVersion`, `deviceType`, server `createdAt` (`deps.now()` + `Timestamp.fromDate`), server `environment`.
- Not stored: Auth email, QuizzerProfile, names, parent email, consent identifiers/tokens/capability, age, division, advertising IDs, IP as a field.
- Client Firestore rules: `allow read, write: if false` on `feedbackSubmissions`.
- `deviceType` is `mobile` | `tablet` | `web` | `unknown`. `tablet` only when the runtime exposes it (iOS `Platform.isPad`). Android is `mobile`, never a guessed phone.
- In-app feedback is **intake for manual Console review**. It does not create GitHub issues, store GitHub tokens, or mention automatic issue creation in the UI.
- Residual spam risk is accepted (auth-only; no new CAPTCHA / App Check / per-UID limiter). App Check remains optional/off (ADR-008).
- Gen2 callable uses `invoker: 'public'` so Cloud Run IAM does not treat the Firebase ID token as a Google identity token (same reason as claim). Auth is enforced in-handler. The client uses normal authenticated `httpsCallable` — no claim-style `getIdToken(true)`.

## Rationale

ADR-001 already requires a repository boundary. ADR-006 requires minimum personal data. Persisting UID would classify submissions as user-owned for later deletion/correlation without an explicit privacy decision. Manual review keeps GitHub secrets out of this phase.

## Consequences

- Operators review documents in the Firebase Console. A best-effort Google Sheets append may also mirror the same allow-listed fields for manual review; Firestore remains authoritative. A Sheets failure must not fail or roll back the Firestore write. A human may file a GitHub issue from [bug_report.yml](../../../.github/ISSUE_TEMPLATE/bug_report.yml) if needed.
- Account deletion must **not** treat `feedbackSubmissions` as user-owned solely via a UID field that is not stored. Any later correlation is a new privacy/architecture decision.
- Future GitHub automation is post-MVP only and must not be implied by this ADR.
- Help & Feedback does not change account-lifecycle routing (ADR-011). It is reachable only from MainTabs / Settings.

# ADR-006: Privacy-by-design and minimum personal data

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related PRD:** §§3.5, 4, 43–44, 46, 62

## Context

Ignite is used by children and teenagers. Privacy and child safety are architectural requirements, not launch-week tasks. Authentication, onboarding, analytics, and crash reporting can otherwise collect more than the product needs.

## Decision

- Follow **privacy-by-design and privacy-by-default**. Collect, store, process, and share only the minimum information required to provide the product.
- Do not unnecessarily collect real name, address, phone number, precise location, contacts, photos, or other unnecessary identifying information.
- Do not use child data for behavioral advertising, targeted marketing, or unnecessary profiling. Do not collect precise location. Do not request unnecessary device permissions.
- Crash reporting, diagnostics, notifications, and analytics must avoid unnecessary child personal data and learning data. Analytics stay product-essential and must not become a second behavioral database.
- Security is enforced on the **backend** (ownership, season isolation, card and entitlement access). A UI restriction is not authorization.
- MVP has **no Parent Portal**. An adult may help a Quizzer through the same core experience; that onboarding context does not create a separate child product.

## Rationale

Minimum data and backend authorization reduce harm if a device is shared, a log is exported, or a future Coach/social feature is considered. Those future features stay deferred because they add privacy and authorization complexity.

## Consequences

- New fields, logs, and analytics categories need a privacy review.
- Do not log tokens, credentials, or unnecessary Quizzer learning history.
- Exact account-deletion behavior is **not** decided by this ADR; see Open Decisions in the README.

## Alternatives considered

- Separate Parent and Child apps in MVP — rejected in PRD §§4.1–4.2, 62.
- Treating UI hiding as access control — rejected in PRD §43.

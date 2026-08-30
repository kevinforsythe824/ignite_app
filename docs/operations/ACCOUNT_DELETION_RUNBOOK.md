# Account deletion runbook

Architecture and operations requirements for **deleting a user's Ignite account** — without implementing deletion in this step.

**Status:** Planning skeleton — detailed deletion behavior is **UNRESOLVED** (PRD gap, ADR Open Decisions). Implementation must be complete **before public release** (playbook §§10, 18). **Phase 7 account-lifecycle routing does not implement deletion and does not close this Sprint 2 / MVP-before-release prerequisite.**

**Sources:** [PRD](../product/PRD.md) (§§43–44), [Development Playbook](../development/Ignite_Development_Playbook.md) (§§10, 17), [ADR-006](../architecture/decisions/ADR-006-privacy-by-design.md), [ADR Open Decisions](../architecture/decisions/README.md), [ENVIRONMENTS.md](ENVIRONMENTS.md), [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md).

---

## Why plan early (Sprint 2–4)

Account deletion must be considered **early** so user-owned data relationships do not make deletion difficult later (playbook Sprint 2 guardrails):

- Authentication identity and Quizzer domain data are **separate concepts** (playbook §10).
- Data models for season participation, learning history, and entitlements should remain **deletable in principle** without breaking global season content.
- Sprint 4 must consider **entitlement ↔ deletion** interactions (purchases, restore, access recovery).

**This document does not implement deletion.** It records boundaries and open questions for future sprints.

---

## Conceptual ownership

### User-owned (candidate for deletion with account)

```text
Firebase Auth identity
        ↓
Ignite User / Quizzer profile
        ↓
User-owned season participation (per season)
        ↓
Progress, RecallEvents, study history, practice history
        ↓
Entitlements (season access, optional AI, etc.)
```

Deleting a user's Ignite account should remove or anonymize **their** participation and learning data according to a future **explicit product-owner policy**.

### Global / official (must NOT be deleted with a user account)

```text
Official global Season content
        ↓
Divisions, Cards, annotations, rules, tournament configuration
```

**Deleting a user's account must NOT delete official/global Season content** or other users' data.

Season isolation (ADR-002) applies: another Quizzer's `seasonId + cardId` learning state is independent.

### Feedback submissions (Phase 8 / ADR-012)

`feedbackSubmissions` are **not** user-owned through a UID field. Phase 8 does not persist `actorUid` / `uid` / `userId`. Do **not** classify these documents as account-owned for deletion solely because an authenticated user created them. Any later correlation or deletion linkage is an **open privacy/architecture decision** — not implied by this runbook.

---

## What account deletion is not

| Topic | Distinction |
|-------|-------------|
| **Refund** | Account deletion ≠ purchase refund. Refund/chargeback flows follow store policies (Sprint 4). |
| **Sign out** | Sign out preserves account and data; deletion is irreversible (subject to unresolved retention policy). |
| **Archive season** | Season archival is curriculum lifecycle, not user account removal. |

---

## Operational principles (when implemented)

Aligned with PRD §§43–44 and ADR-006:

- **Privacy-by-design:** delete or anonymize the minimum set required by policy; do not retain unnecessary child personal data.
- **Backend enforcement:** authorization and deletion scope enforced server-side — UI-only removal is insufficient (PRD §43).
- **Deliberate confirmation:** destructive operations should use explicit confirmation and **re-authentication** where appropriate (platform and auth-method dependent — **UNRESOLVED**).
- **Audit / support:** privacy-safe audit or support handling for deletion requests — what is logged, who can act, retention of deletion records (**UNRESOLVED**).
- **Store records:** Apple/Google transaction and billing records may have **retention and ownership requirements outside Ignite**; deletion in Firebase does not erase store history (Sprint 4).
- **Applicable law/platform requirements** must be reviewed before launch (PRD §44) — specific jurisdictions and COPPA/App Store Kids considerations are **not fully specified in the PRD**.

---

## Environment and testing

- Develop and test deletion flows only in **Development** and **Staging** with **synthetic personas** ([TEST_PERSONAS.md](../testing/TEST_PERSONAS.md)).
- **Never** test destructive deletion against Production real users.
- Deletion Security Rules and Admin workflows must prevent cross-user impact.

---

## Intended high-level flow (placeholder)

Exact steps are **TBD**. Conceptual sequence for future implementation:

```text
User requests account deletion (in-app and/or support channel — TBD)
        ↓
Confirm identity / re-authenticate (TBD)
        ↓
Explain consequences (data loss, entitlements, no refund — TBD copy)
        ↓
Execute deletion job (Auth + Firestore + related stores — TBD)
        ↓
Verify user-owned data removed/anonymized; global season content intact
        ↓
Privacy-safe audit record (TBD)
        ↓
Confirm completion to user (TBD)
```

---

## UNRESOLVED (do not invent)

Record gaps explicitly; get product-owner decisions before coding:

| Topic | Status | Where tracked |
|-------|--------|---------------|
| Exact deletion, retention, and recovery behavior | **UNRESOLVED** | ADR Open Decisions; ADR-006 points here |
| Which auth methods and re-auth pattern | **UNRESOLVED** | ADR Open Decisions (Authentication methods) |
| Entitlement state after deletion / active purchases | **UNRESOLVED** | Sprint 4; store-product mapping |
| Parent/guardian vs Quizzer-initiated deletion (MVP: no Parent Portal) | **UNRESOLVED** | PRD §4 |
| Data export before deletion (if required) | **UNRESOLVED** | Legal/platform review |
| Support-initiated deletion vs self-serve only | **UNRESOLVED** | Operations policy |
| Grace period / soft delete vs hard delete | **UNRESOLVED** | Product + legal |

---

## Implementation placeholders

| Sprint | Expected work |
|--------|----------------|
| **Sprint 2** | Account deletion **architecture** planned; auth vs Quizzer separation. Phase 7 (ADR-011) derives routing from Auth + consent + profile and does **not** close this prerequisite. After a future deletion the resolver would see no Auth session (`unauthenticated`). Do not encode deletion as an onboarding flag. |
| **Sprint 3** | Season-scoped participation models remain deletable in principle |
| **Sprint 4** | Entitlement/purchase interaction with deletion; sandbox testing; no guessed store SKU behavior |
| **Pre–public release** | Full deletion implementation, Security Rules, legal/privacy review |
| **Sprint 11** | End-to-end validation including account lifecycle before MVP |

---

## Related documents

| Document | Role |
|----------|------|
| [Playbook §10](../development/Ignite_Development_Playbook.md) | Account lifecycle and deletion planning |
| [ADR-006](../architecture/decisions/ADR-006-privacy-by-design.md) | Minimum data; deletion not decided there |
| [ADR-012](../architecture/decisions/ADR-012-in-app-feedback-submission.md) | Feedback has no persisted account identifier |
| [ADR Open Decisions](../architecture/decisions/README.md) | Account deletion row |
| [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md) | Privacy during investigation |

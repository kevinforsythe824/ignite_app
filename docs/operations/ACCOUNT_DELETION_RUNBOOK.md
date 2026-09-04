# Account deletion runbook

Canonical Sprint 2 **account-deletion inventory and future-feature contract** for Ignite.

**Status:** Sprint 2 Phase 9 establishes the durable architecture, inventory, and ownership checklist. **Final Delete Account is NOT implemented.** There is no Settings Delete Account row, no deletion callable, no deletion Security Rules, and no deletion lifecycle destination. Exact deletion, retention, and recovery behavior remain **UNRESOLVED** (ADR Open Decisions; ADR-006). Full destructive implementation is required **before public release** (playbook §§10, 18). Sprint 11 validates account lifecycle / privacy controls in release readiness (PRD §71).

**Sources:** [PRD](../product/PRD.md) (§§43–44, 62, 71), [Development Playbook](../development/Ignite_Development_Playbook.md) (§§10, 17, 18), [ADR-006](../architecture/decisions/ADR-006-privacy-by-design.md), [ADR-011](../architecture/decisions/ADR-011-account-lifecycle-routing.md), [ADR-012](../architecture/decisions/ADR-012-in-app-feedback-submission.md), [ADR Open Decisions](../architecture/decisions/README.md), [ENVIRONMENTS.md](ENVIRONMENTS.md), [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md).

---

## What Phase 9 delivered (and what it did not)

| Delivered | Not delivered |
|-----------|---------------|
| Inventory of Sprint 2 account-related data (server vs local) | Delete Account UI / Settings row |
| Classification vocabulary (documentation only) | Deletion Cloud Function / Admin job |
| Future-sprint ownership obligation | Invented parental-consent retention period |
| Conceptual future deletion flow + release checklist | Production deletion seams or enums |
| Explicit Sign Out ≠ consent-capability clear | Retrofitting UID onto feedback |

After a future successful deletion, Auth has no session and Phase 7 lifecycle routing resolves to `unauthenticated` (ADR-011). Do **not** encode deletion as an onboarding flag.

---

## Why plan early (Sprint 2–4)

Account deletion must be considered **early** so user-owned data relationships do not make deletion difficult later (playbook Sprint 2 guardrails):

- Authentication identity and Quizzer domain data are **separate concepts** (playbook §10).
- Data models for season participation, learning history, and entitlements should remain **deletable in principle** without breaking global season content.
- Sprint 4 must consider **entitlement ↔ deletion** interactions (purchases, restore, access recovery).

**This document does not implement deletion.** It is the contract future sprints must keep current.

---

## Classification vocabulary (documentation only)

Use these labels in inventory rows. **Do not** introduce production TypeScript enums or Firestore fields for them in Phase 9.

| Class | Meaning |
|-------|---------|
| `DELETE_WITH_ACCOUNT` | Removed (or hard-deleted) when the account is deleted |
| `ANONYMIZE_WITH_ACCOUNT` | Retained only after identifiers / PII are stripped |
| `RETAIN_BY_POLICY` | Kept under an explicit product/legal retention rule |
| `NOT_ACCOUNT_OWNED` | Not owned via account UID; deletion of the account does not imply removing these records |
| `UNRESOLVED` | Ownership or retention still open — must be decided before final deletion ships |

---

## A. Server / account-owned data (Sprint 2 inventory)

Future deletion, anonymization, or retention handling happens on the **backend**. Client UI hiding is insufficient (PRD §43).

| Data source | Storage | Ownership | Association | Future class | Retention notes | Policy |
|-------------|---------|-----------|-------------|--------------|-----------------|--------|
| Firebase Auth | Auth project | auth feature | `uid` | `DELETE_WITH_ACCOUNT` | Email / credentials | **UNRESOLVED** how/when Auth user is deleted |
| QuizzerProfile | `users/{uid}/profile/main` | profile | path = uid | `DELETE_WITH_ACCOUNT` | Names + `avatar_id` | Client delete denied; server delete **UNRESOLVED** |
| Parental consent requests | `parentalConsentRequests/{id}` | consent Functions | optional `claimedByUid` + parent email | **`UNRESOLVED`** | Parent PII / audit trail | **Must resolve before final deletion** — see [Parental-consent server retention](#parental-consent-server-retention-unresolved) |
| Consent rate limits | `parentalConsentRateLimits/{bucket}` | consent Functions | email hash / IP bucket | `NOT_ACCOUNT_OWNED` | Abuse counters | Ops TTL optional; not Quizzer-owned |
| Feedback submissions | `feedbackSubmissions/{id}` | feedback | **none** (auth only gates the callable) | `NOT_ACCOUNT_OWNED` | Free-text may contain volunteered PII | ADR-012 boundary; retention length is a separate support/privacy decision — **do not retrofit UID** |
| Official seasons / cards | `seasons/...` | curriculum | none | `NOT_ACCOUNT_OWNED` / retain | Global content | Must survive account deletion |

### Conceptual ownership (ladder)

```text
Firebase Auth identity
        ↓
Ignite User / Quizzer profile
        ↓
User-owned season participation (per season)   ← Sprint 3+
        ↓
Progress, RecallEvents, study / practice history ← later sprints
        ↓
Entitlements (season access, optional AI, etc.) ← Sprint 4+
```

### Global / official (must NOT be deleted with a user account)

```text
Official global Season content
        ↓
Divisions, Cards, annotations, rules, tournament configuration
```

**Deleting a user's account must NOT delete official/global Season content** or other users' data. Season isolation (ADR-002) applies.

### Feedback submissions (ADR-012)

`feedbackSubmissions` are **not** user-owned through a UID field. Phase 8 does not persist `actorUid` / `uid` / `userId`. Do **not** classify these documents as account-owned solely because an authenticated user created them. Correlation or deletion linkage later is an **open privacy/architecture decision** — not implied here.

---

## B. Local device / session cleanup

Cleared as part of **successful account deletion** client cleanup where noted. This section does **not** mean a future Ignite backend deletes device storage internals.

| Data source | Storage | Cleanup class | Notes |
|-------------|---------|---------------|-------|
| Auth persistence | AsyncStorage DB `ignite-auth` | **Auth / session lifecycle cleanup** | Cleared via Firebase Auth sign-out or Auth user deletion on the device. Do **not** imply Ignite backend deletes Firebase’s local AsyncStorage internals. |
| Consent capability | SecureStore `ignite.consent.clientSession.v1` | **Deletion-specific local cleanup** | Documented for future successful account deletion only. **Ordinary Sign Out must NOT newly clear consent capability** merely because this runbook mentions cleanup. Preserve existing Sign Out recovery semantics. |
| Parent browser `__session` | Cookie on parent device | Ephemeral hosting session | Not Quizzer-device state; expires with the parent browser session |

### Sign Out vs deletion

| Topic | Distinction |
|-------|-------------|
| **Sign out** | Preserves account and server data; does **not** clear SecureStore consent capability as a new Phase 9 behavior |
| **Account deletion** | Irreversible (subject to unresolved retention policy); includes server cleanup per inventory **A** plus deletion-specific local cleanup in **B** |
| **Refund** | Account deletion ≠ purchase refund (Sprint 4 / store policy) |
| **Archive season** | Curriculum lifecycle, not user account removal |

---

## Parental-consent server retention (UNRESOLVED)

Product/legal must decide **before final deletion / public release**, without inventing a default period in code:

- Delete bound `parentalConsentRequests` rows with the account, **or**
- Anonymize / detach (`claimedByUid` and parent PII), **or**
- Retain-by-policy for audit, **or**
- A hybrid of the above

Track in ADR Open Decisions / ADR-006 / ADR-010. This gap **does not** block Sprint 2 Phase 9 foundation docs.

---

## Future-feature deletion contract

**Durable development rule:** every future sprint that adds **user-owned persistent data** must update this runbook with:

1. Storage location (collection / path / store)
2. Association mechanism (uid path, claim field, none, etc.)
3. Deletion classification (vocabulary above)
4. Any unresolved retention policy

Playbook §18 Sprint 2–4 guardrails point here. Prefer updating this file in the same PR that introduces the data.

### Placeholder rows (docs only — not yet implemented)

| Future area | Likely storage (TBD) | Earliest sprint | Notes |
|-------------|----------------------|-----------------|-------|
| Season participation / region / division / track | User- or season-scoped docs TBD | Sprint 3 | Must remain deletable without touching global curriculum |
| Entitlements / purchases | Entitlement records + store linkage TBD | Sprint 4 | Store billing history may outlive Ignite deletion |
| Progress / activity | Learning-state docs TBD | Sprint 6 | Owned by Quizzer + Season + Card (PRD), not Deck |
| Mastery | Mastery records TBD | Sprint 7 | |
| Practice history | Practice session docs TBD | Sprint 8 | |
| Analytics user records | Analytics store TBD | Sprint 9 | Prefer aggregate / non-PII; if user-keyed, inventory here |

---

## Conceptual future Delete Account flow (not implemented)

Exact steps are **TBD**. Conceptual sequence when product implements deletion:

```text
Settings → Delete Account → confirm → re-authenticate
        ↓
Trusted backend orchestration (callable / Admin job — TBD)
        ↓
User-owned cleanup per inventory A (and later sprint rows)
        ↓
Firebase Auth user delete
        ↓
Local cleanup (Auth session lifecycle + deletion-specific SecureStore consent)
        ↓
Lifecycle resolves → unauthenticated (ADR-011)
```

There is **no present consumer** — **no production seam code** in Phase 9.

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

## Implementation timing

| When | Work |
|------|------|
| **Sprint 2 (Phase 9)** | Architecture + inventory + future-feature contract (this document) |
| **Sprints 3–9** | Each feature that adds user-owned data updates this runbook |
| **Late MVP stabilization / pre–public release** | Full destructive implementation (preferred window once the MVP data graph exists) |
| **Sprint 11** | E2E lifecycle / privacy validation (PRD §71) |

---

## Future account deletion release checklist

Execute later — **not** Phase 9:

- [ ] Complete MVP inventory (S3–S9 data rows filled)
- [ ] Parental-consent **server** retention decision recorded
- [ ] Purchase / entitlement deletion behavior decided
- [ ] Progress / activity / mastery / practice ownership classified
- [ ] Analytics ownership classified
- [ ] Backend orchestration + reauth + idempotency
- [ ] Local-state cleanup (Auth session + deletion-specific SecureStore consent)
- [ ] Destructive UX (Settings Delete Account + confirmation)
- [ ] Security / privacy review
- [ ] DEV / STAGING destructive E2E with synthetic personas only
- [ ] Sprint 11 validation

---

## Environment and testing

- Develop and test deletion flows only in **Development** and **Staging** with **synthetic personas** ([TEST_PERSONAS.md](../testing/TEST_PERSONAS.md)).
- **Never** test destructive deletion against Production real users.
- Deletion Security Rules and Admin workflows must prevent cross-user impact.
- Phase 9 persona `S2-017` is a **placeholder** — not executable until deletion exists.

---

## UNRESOLVED (do not invent)

| Topic | Status | Where tracked |
|-------|--------|---------------|
| Exact deletion, retention, and recovery behavior | **UNRESOLVED** | ADR Open Decisions; ADR-006; this runbook |
| Parental-consent **server** retention (delete / anonymize / retain / hybrid) | **UNRESOLVED** | This runbook; ADR-006 / ADR-010 |
| Which auth methods and re-auth pattern | **UNRESOLVED** | ADR Open Decisions (Authentication methods) |
| Entitlement state after deletion / active purchases | **UNRESOLVED** | Sprint 4; store-product mapping |
| Parent/guardian vs Quizzer-initiated deletion (MVP: no Parent Portal) | **UNRESOLVED** | PRD §4 |
| Data export before deletion (if required) | **UNRESOLVED** | Legal/platform review |
| Support-initiated deletion vs self-serve only | **UNRESOLVED** | Operations policy |
| Grace period / soft delete vs hard delete | **UNRESOLVED** | Product + legal |
| Feedback retention length / optional later correlation | **UNRESOLVED** | Support/privacy; ADR-012 boundary preserved |

---

## Related documents

| Document | Role |
|----------|------|
| [Playbook §10 / §18](../development/Ignite_Development_Playbook.md) | Account lifecycle; Sprint 2–4 guardrails + future-feature inventory obligation |
| [ADR-006](../architecture/decisions/ADR-006-privacy-by-design.md) | Minimum data; deletion not decided there |
| [ADR-011](../architecture/decisions/ADR-011-account-lifecycle-routing.md) | Post-deletion routing = no Auth → `unauthenticated`; Phase 9 documents foundation only |
| [ADR-012](../architecture/decisions/ADR-012-in-app-feedback-submission.md) | Feedback has no persisted account identifier |
| [ADR Open Decisions](../architecture/decisions/README.md) | Account deletion row |
| [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md) | Privacy / destructive triage |
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | Collection deny-all notes including `feedbackSubmissions` |
| [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) | Synthetic users; deletion persona placeholder |

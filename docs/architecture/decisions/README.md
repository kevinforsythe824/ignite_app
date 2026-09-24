# Architecture Decision Records

This folder records durable architecture decisions for Ignite.

The canonical product, business, and architecture source of truth remains [`docs/product/PRD.md`](../../product/PRD.md). ADRs do not replace the PRD. They capture expensive-to-reverse choices so later sprints and agents do not rediscover or silently change them.

How we create and review ADRs is defined in the [Ignite Development Playbook](../../development/Ignite_Development_Playbook.md), section 15.

## What an ADR is

An Architecture Decision Record is a short, dated record of a significant choice:

- the problem or force that required a decision
- the decision that was made
- why it was made
- consequences and tradeoffs
- the PRD sections it derives from
- whether a later decision superseded it

An ADR is not a feature spec, sprint plan, or copy of the PRD.

## When Ignite should create one

Create an ADR when a decision:

- is expensive to reverse
- establishes a durable architectural boundary
- changes data ownership or identity
- changes a persistence or synchronization strategy
- establishes an external provider boundary
- creates an important security or privacy policy
- resolves an ambiguity that future developers or agents would otherwise revisit

Do not create an ADR for every small implementation choice (local component structure, animation values, one-off naming).

If the PRD already states the decision, prefer citing the PRD. Add an ADR when that decision is a boundary later work must not erode.

## Numbering and naming

- Files live in this folder.
- Use `ADR-NNN-short-kebab-title.md` with a zero-padded three-digit number.
- Numbers are assigned sequentially and are never reused.
- The title should name the decision, not the sprint.
- If a decision is replaced, keep the old file. Set its status to **Superseded** and link the new ADR.

## Statuses

| Status | Meaning |
|--------|---------|
| **Proposed** | Written for review. Not yet binding. |
| **Accepted** | In force. Implementation must follow it unless the PRD is intentionally revised. |
| **Superseded** | Replaced by a later ADR. The file remains for history. |

Do not mark a decision **Accepted** when the PRD still leaves it open. Unresolved items belong in [Open Decisions](#open-decisions), not in fake Accepted ADRs.

**Accepted** ADRs may be **amended** in place when a later sprint refines (does not replace) the decision. Keep the original Decision text and record the change in an Amendment section. Use **Superseded** only when a later ADR replaces the decision.

## How the sources relate

Order of authority (playbook §1):

1. Explicit current product-owner decisions
2. Ignite PRD
3. Approved ADRs
4. Official committee-provided season material and rules
5. Ignite Development Playbook
6. Existing implementation
7. Developer or AI assumptions

| Source | Role |
|--------|------|
| PRD | What Ignite is, including product rules, domain, architecture, and roadmap |
| ADRs | Durable choices extracted from the PRD (or later approved revisions) so boundaries stay visible |
| Playbook | How we plan, implement, test, review, and operate |
| Cursor Rules | Short always-on guardrails that point at the PRD, playbook, and ADRs |
| Implementation | Current code. If it conflicts with an explicit product/architecture requirement, evaluate the code for correction rather than silently changing the requirement |

Folder layout remains in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md).

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-persistence-domain-and-repository.md) | Persistence, domain ownership, and repository boundary | Accepted |
| [ADR-002](ADR-002-season-isolation-and-card-identity.md) | Season isolation and card identity | Accepted (amended 2026-09-15) |
| [ADR-003](ADR-003-learning-state-and-recall-history.md) | Learning-state ownership and recall history | Accepted (amended 2026-09-15) |
| [ADR-004](ADR-004-practice-as-separate-domain.md) | Practice is a separate domain | Accepted |
| [ADR-005](ADR-005-ai-advisory-and-provider-isolation.md) | AI is optional, advisory, and provider-isolated | Accepted |
| [ADR-006](ADR-006-privacy-by-design.md) | Privacy-by-design and minimum personal data | Accepted |
| [ADR-007](ADR-007-authentication-boundary-and-identity.md) | Authentication boundary and identity separation | Accepted |
| [ADR-008](ADR-008-parental-consent-email-plus.md) | Parental consent email-plus foundation (server-authoritative) | Accepted |
| [ADR-009](ADR-009-parental-consent-hosting-and-email.md) | Parental consent Hosting surface and transactional email (DEV) | Accepted |
| [ADR-010](ADR-010-mobile-parental-consent-integration.md) | Mobile parental consent integration (Phase 6.5C) | Accepted |
| [ADR-011](ADR-011-account-lifecycle-routing.md) | Account lifecycle routing | Accepted |
| [ADR-012](ADR-012-in-app-feedback-submission.md) | In-app feedback submission | Accepted |
| [ADR-013](ADR-013-content-package-and-authoring-source-boundary.md) | Content package and authoring-source boundary | Accepted |
| [ADR-014](ADR-014-package-import-planning-and-dev-diff.md) | Package import planning and DEV read-only diff | Accepted |

## Open Decisions

These items are **not Accepted**. Do not implement a guessed rule as if the PRD had settled it. Ask, or record a **Proposed** ADR for review.

| Topic | What is settled | What remains open | Where |
|-------|-----------------|-------------------|-------|
| Authentication methods | An account is required. Auth is Firebase Authentication and stays independent of Quizzer domain data. | Which sign-in methods (Apple, Google, email, etc.) and credential-recovery details | PRD §42, §56; playbook Sprint 2 guardrails |
| Exceptional Experienced placement | Official user-facing division name is `Experienced`. Divisions exist; user selects within age eligibility; division is season-scoped and does not change mid-season in V1. Standard MVP/self-service eligibility is defined by the PRD: ages 15–18 are Intermediate when first-year and Experienced otherwise (along with the other PRD age→division bands). | Exceptional placements outside the standard self-service rules (e.g. authorized younger Quizzer into Experienced) are not implemented in MVP onboarding and remain a future controlled/admin/coach concern | PRD §8, §56 |
| Account deletion | Privacy-by-design and minimum data collection are required. Phase 7 lifecycle routing does **not** implement deletion (ADR-011). Sprint 2 Phase 9 establishes the inventory + future-feature contract in [`ACCOUNT_DELETION_RUNBOOK.md`](../../operations/ACCOUNT_DELETION_RUNBOOK.md); final Delete Account UI/callable is still absent. After a future deletion the resolver would see no Auth session. | Exact deletion, retention, recovery behavior, and parental-consent **server** retention | Not specified in the PRD; playbook §§10, 18 and MVP-before-release still require full destructive implementation; runbook + this row |
| Production content import format | Committee provides official material. Authoring direction is settled: standardized human-readable spreadsheet/template per independent division MaterialSet is the authoritative source; app-ready JSON/packages are generated artifacts; conversion must be deterministic; packages need provenance/fingerprint for exact DEV→STAGING→PROD promotion. Import must validate identity, numbering, Scripture, divisions, annotations, quiz metadata, and tournament/rules config. Invalid content fails before publication. **Phase 2A.1 accepted (ADR-013):** workbook sheets/columns, content IR, generated package layout, SHA-256 fingerprint, synthetic/DEV identifier policy, and `phraseOccurrence` as a provisional targeting strategy. **Phase 2A.2 Slice 3 accepted (ADR-014):** offline Firestore plan and DEV-only read-only diff from a validated package. No Firebase writes. | Official committee content-source mapping and official annotation types/targeting remain Phase 2B. DEV apply/replacement, repository cutover, and STAGING/PROD import remain later. Do not treat the synthetic phrase strategy or DEV `c{cardNumber}` IDs as official WPF contracts. | PRD §50; playbook §9 / Sprint 3; ADR-013; ADR-014; CONTENT_PUBLISHING_RUNBOOK.md |
| Store-product mapping | One season purchase grants core season access. AI is a separate optional entitlement. Restore/access recovery is required. | Store SKUs, product IDs, and provider mapping | PRD §9, §26.4; playbook Sprint 4 |
| Backend environments | Three Firebase projects: `dev` → `wpf-bible-qizzing`, `staging` → `ignite-staging-01`, `prod` → `ignite-prod-01`. See [`docs/operations/ENVIRONMENTS.md`](../../operations/ENVIRONMENTS.md). | Native iOS/Android app registration per environment; capturing existing remote Firestore rules before any first deploy | ENVIRONMENTS.md |

If implementation needs a closed answer to any row above, stop and get an explicit product-owner decision rather than encoding an assumption.

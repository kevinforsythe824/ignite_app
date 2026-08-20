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
| [ADR-002](ADR-002-season-isolation-and-card-identity.md) | Season isolation and card identity | Accepted |
| [ADR-003](ADR-003-learning-state-and-recall-history.md) | Learning-state ownership and recall history | Accepted |
| [ADR-004](ADR-004-practice-as-separate-domain.md) | Practice is a separate domain | Accepted |
| [ADR-005](ADR-005-ai-advisory-and-provider-isolation.md) | AI is optional, advisory, and provider-isolated | Accepted |
| [ADR-006](ADR-006-privacy-by-design.md) | Privacy-by-design and minimum personal data | Accepted |
| [ADR-007](ADR-007-authentication-boundary-and-identity.md) | Authentication boundary and identity separation | Accepted |

## Open Decisions

These items are **not Accepted**. Do not implement a guessed rule as if the PRD had settled it. Ask, or record a **Proposed** ADR for review.

| Topic | What is settled | What remains open | Where |
|-------|-----------------|-------------------|-------|
| Authentication methods | An account is required. Auth is Firebase Authentication and stays independent of Quizzer domain data. | Which sign-in methods (Apple, Google, email, etc.) and credential-recovery details | PRD §42, §56; playbook Sprint 2 guardrails |
| Experienced / Senior eligibility | Divisions exist; user selects within age eligibility; division is season-scoped and does not change mid-season in V1. Intermediate includes first-year Quizzers 15–18. Experienced/Senior is “advanced” Quizzers 12–18. | The exact rule that distinguishes first-year vs advanced / Experienced vs Senior | PRD §8, §56 |
| Account deletion | Privacy-by-design and minimum data collection are required. | Exact deletion, retention, and recovery behavior | Not specified in the PRD; playbook §10 and Sprint 2 require planning before release |
| Production content import format | Committee provides official material. Import must validate identity, numbering, Scripture, divisions, annotations, quiz metadata, and tournament/rules config. Invalid content fails before publication. | Concrete production file/package format and toolchain | PRD §50; playbook Sprint 3 |
| Store-product mapping | One season purchase grants core season access. AI is a separate optional entitlement. Restore/access recovery is required. | Store SKUs, product IDs, and provider mapping | PRD §9, §26.4; playbook Sprint 4 |
| Backend environments | Three Firebase projects: `dev` → `wpf-bible-qizzing`, `staging` → `ignite-staging-01`, `prod` → `ignite-prod-01`. See [`docs/operations/ENVIRONMENTS.md`](../../operations/ENVIRONMENTS.md). | Native iOS/Android app registration per environment; capturing existing remote Firestore rules before any first deploy | ENVIRONMENTS.md |

If implementation needs a closed answer to any row above, stop and get an explicit product-owner decision rather than encoding an assumption.

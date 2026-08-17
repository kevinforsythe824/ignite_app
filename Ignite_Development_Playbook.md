# Ignite Development Playbook

**Status:** Working development companion to the Ignite PRD  
**Purpose:** Define how Ignite is planned, implemented, tested, reviewed, released, and operated while using Cursor-assisted development.

## 1. Relationship to the PRD

The PRD is the source of truth for product requirements, business rules, domain concepts, architecture, persistence, security, privacy, testing, and roadmap decisions.

This playbook does not replace the PRD. It defines the development process used to implement it safely.

### Source-of-truth order
1. Explicit current product-owner decisions.
2. Ignite PRD.
3. Approved Architecture Decision Records (ADRs).
4. Official committee-provided season material and rules.
5. Ignite Development Playbook.
6. Existing implementation.
7. Developer or AI assumptions.

If code conflicts with an explicit product/architecture requirement, evaluate the code for correction rather than changing the requirement implicitly.

## 2. Recommended repository documentation structure

```text
docs/
  product/
    Ignite_PRD_v3.0.md
  development/
    Ignite_Development_Playbook.md
  architecture/
    decisions/
      README.md
      ADR-001-....md
      ADR-002-....md
  operations/
    CONTENT_PUBLISHING_RUNBOOK.md
    BUG_TRIAGE_RUNBOOK.md
    RELEASE_RUNBOOK.md
    ACCOUNT_DELETION_RUNBOOK.md

.cursor/
  rules/
    ignite-core.mdc
    ignite-quality.mdc
```

The detailed documents live under `docs/`. Cursor project rules contain short, enforceable instructions that tell the agent which source documents to consult and which guardrails must always be followed.

## 3. Cursor operating model

Cursor is an implementation assistant, not the source of product or architecture decisions.

For significant work, use this sequence:

1. **Inspect** — Read the relevant PRD sections, playbook sections, ADRs, and current implementation.
2. **Explain** — State what currently exists and identify conflicts/gaps.
3. **Plan** — Propose the smallest architecture and implementation needed for the current phase.
4. **Implement** — Make only the approved/specified changes.
5. **Test** — Add or update appropriate tests.
6. **Verify** — Run automated checks and inspect the resulting behavior.
7. **Review** — Review the diff for architecture, security, privacy, hard-coded business rules, accidental scope growth, and regressions.
8. **Manual QA** — Validate the user flow in the appropriate simulator/device/environment.
9. **Commit** — Commit one coherent change with a descriptive message.

For complex changes, prefer Cursor Plan Mode before implementation.

## 4. Mandatory pre-implementation questions

Before implementing a meaningful feature, determine:

### Product
- Which PRD requirement is being implemented?
- What is explicitly in scope?
- What is explicitly out of scope?
- What is the success condition?

### Architecture
- Which feature owns this behavior?
- Which domain concept owns the business rule?
- What repository/service boundary is required?
- What state is UI-only, session-level, persistent domain state, or server state?
- Does this introduce a new cross-feature dependency?

### Data
- What data is authoritative?
- Who owns it?
- What is its scope: user, season, card, entitlement, etc.?
- Is it mutable, immutable, append-only, or derived?
- What happens when it is missing, stale, invalid, or unavailable?

### UX
- Loading state?
- Empty state?
- Error state?
- Disabled state?
- Returning-user state?
- Archived/no-entitlement state where relevant?
- Accessibility implications?

### Security/privacy
- Is authorization enforced on the backend rather than only in UI?
- Is any new personal data being collected?
- Is the data actually necessary?
- Could logs, analytics, or error reports expose Quizzer information?

### Testing
- Domain/unit tests?
- Repository/integration tests?
- Security-rule tests?
- UI interaction tests?
- Manual simulator/device scenarios?

## 5. Definition of Done

A feature is not done because the happy path renders.

A feature is done when:
- The PRD requirement is satisfied.
- Architecture boundaries remain intact.
- No unintended scope was added.
- Loading/empty/error states are intentionally handled.
- Business rules are configuration/domain driven rather than scattered through UI.
- Appropriate tests pass.
- Security/privacy implications were reviewed.
- Accessibility was considered during implementation.
- The feature was manually tested in the intended environment.
- The diff was reviewed for regressions and hard-coded assumptions.
- Documentation/ADR updates were made when a durable decision changed.

## 6. No-Magic-Numbers and No-Hard-Coded-Business-Rules policy

Do not embed season, division, tournament, entitlement, mastery, or other business rules as unexplained literals inside UI or feature code.

Examples that should generally come from configuration/domain policy:
- Season dates and status transitions.
- Division eligibility.
- Card ranges and tournament requirements.
- Season identifiers.
- Product/entitlement identifiers.
- Mastery thresholds and review intervals when defined as product policy.
- Limits that may vary by season or product configuration.

Not every literal is a magic number. Layout spacing, animation values, and implementation constants can be legitimate when named and locally appropriate. The rule targets values that encode product/business behavior or are likely to vary by environment/season.

Every implementation review must include a search for newly introduced hard-coded business rules.

## 7. Environment strategy

Use isolated backend environments so development cannot modify production users or production content.

Recommended environments:

```text
Development -> Firebase development project
Staging     -> Firebase staging project
Production  -> Firebase production project
```

Each Firebase environment can register the corresponding iOS and Android app builds while sharing that environment's Auth, Firestore, rules, and server resources.

### Development
- Fast iteration.
- Disposable/synthetic test users.
- Seed/reset scripts allowed.
- Test curriculum and edge-case data.

### Staging
- Production-like configuration.
- Synthetic users only unless explicitly approved otherwise.
- Release-candidate builds.
- Final integration, purchase sandbox, security, and regression testing.
- Content is promoted here before production.

### Production
- Real users and authoritative published content.
- No casual manual edits.
- Production data changes occur through controlled workflows.
- Destructive scripts must require explicit production safeguards.

Non-production builds should clearly identify their environment to reduce accidental testing against production.

## 8. Realistic test-data strategy

Testing should combine deterministic fixtures and Firebase environments.

### Layer 1 — Unit/domain fixtures
Small deterministic data for fast automated tests.

### Layer 2 — Development Firebase
Large synthetic dataset designed to exercise edge cases.

### Layer 3 — Staging Firebase
Production-like data shape and release-candidate testing.

### Required scenario families
- New unauthenticated user.
- Authenticated user with incomplete onboarding.
- Returning user with completed onboarding.
- Different age/division combinations.
- User with no season entitlement.
- User with active entitlement.
- Purchase restore scenario.
- Active season.
- Archived season.
- Transition period with no active season.
- Multiple seasons containing overlapping Scripture references.
- Long and short cards.
- Multiple books/chapters.
- Annotation/highlight/keyword variations.
- Missing/invalid content rejected by import validation.
- Network/auth/authorization failures.

Use named synthetic personas so manual testing is repeatable.

## 9. Content and season operations

Do not build a large admin UI for the MVP unless the product requires it.

Recommended workflow:

```text
Committee-approved source material
        ↓
Structured source package/template
        ↓
Schema + business-rule validation
        ↓
Dry-run import report
        ↓
Development import/testing
        ↓
Staging import/review
        ↓
Committee/product approval
        ↓
Production publish
        ↓
Active / locked season
```

### Import requirements
- Validate required fields.
- Validate unique card numbers within a season.
- Validate season/card identity.
- Validate division assignments.
- Validate annotations and quiz metadata.
- Validate tournament/rule configuration when provided.
- Refuse invalid content.
- Require explicit target environment.
- Require an additional safeguard for production.
- Produce a readable import summary.

After a season becomes Active/Locked, ordinary tooling must not silently edit authoritative content.

Corrections, if ever required, follow a separate controlled correction runbook with an audit record.

## 10. Account lifecycle principle

Authentication identity and Quizzer domain/profile data are separate concepts.

The app should explicitly model routing states such as:

```text
Signed out
  -> Authentication

Signed in + no profile/onboarding
  -> Onboarding

Profile ready + current season not configured
  -> Season participation setup (age/division)

Season configured + no entitlement
  -> Purchase/access

Active entitlement
  -> Home

Archived season / no new season
  -> Historical/transition experience
```

Account lifecycle planning must also cover before release:
- Credential recovery appropriate to the chosen authentication methods.
- Sign out/sign back in.
- Returning on a new device.
- Account deletion and associated data deletion requirements.
- Season-to-season participation setup.
- Purchase restoration/access recovery.

Avoid storing unnecessary identity data merely to make onboarding easier.

## 11. UX and accessibility shift-left policy

Accessibility is part of feature implementation, not only Sprint 11 cleanup.

Every sprint should consider:
- Screen-reader labels and meaningful control names.
- Logical focus/reading order.
- Dynamic text/font scaling.
- Long-content behavior.
- Keyboard behavior for forms.
- Clear validation/error messages.
- Sufficient contrast.
- Actions that do not rely only on color.
- Motion that does not block comprehension and can respect reduced-motion behavior where applicable.
- Touch controls that are easy to activate.

Sprint 11 performs the final cross-app accessibility review, but each feature should arrive there already reasonably accessible.

## 12. Observability strategy

Ignite should make production failures diagnosable without collecting unnecessary Quizzer data.

### Capture
- App version/build.
- Environment.
- Platform/OS where appropriate.
- Error category/code.
- Feature/operation name.
- Non-sensitive technical context.
- Crash stack traces through an approved crash-reporting integration.

### Do not casually capture
- Scripture learning history in crash logs.
- Full user profiles.
- Real names or contact information unless strictly required for support.
- Authentication tokens.
- Sensitive request/response payloads.

### Error taxonomy
Infrastructure errors should be translated into stable application-level categories such as:
- Authentication
- Authorization
- Content/data
- Entitlement/purchase
- Network
- Validation
- Unexpected

Where useful, generate a non-sensitive incident/support reference that can be included in a bug report.

## 13. Bug workflow

```text
Bug reported / monitoring alert
        ↓
Create issue with reproduction information
        ↓
Triage severity
        ↓
Reproduce in development/staging
        ↓
Create fix branch
        ↓
Cursor/code investigation + plan
        ↓
Add regression test when feasible
        ↓
Implement smallest safe fix
        ↓
Automated verification
        ↓
Manual staging verification
        ↓
Review/merge
        ↓
Release candidate
        ↓
Store/backend release
        ↓
Monitor
        ↓
Close issue after verification
```

Suggested severity:
- **P0:** Security/privacy exposure or destructive data corruption.
- **P1:** Core app unusable, authentication/purchase/access broadly broken, or major data-integrity risk.
- **P2:** Important feature broken with a workaround or limited impact.
- **P3:** Cosmetic/minor usability issue.

## 14. Release discipline

A release candidate should pass:
- Automated tests.
- Required security checks.
- Key end-to-end flows.
- iOS and Android staging testing.
- Purchase/restore sandbox testing when applicable.
- Accessibility checks on changed flows.
- Crash/error review.
- Production configuration validation.

For risky updates, prefer controlled/phased/staged rollout capabilities rather than exposing every user immediately when the platform supports it.

Backend-only fixes can be deployed independently when the client contract does not change. Client-code fixes generally require a new tested mobile build/release through the applicable distribution path.

## 15. Architecture Decision Records (ADRs)

Create an ADR when a decision:
- Is expensive to reverse.
- Establishes a durable architectural boundary.
- Changes data ownership or identity.
- Changes a persistence/synchronization strategy.
- Establishes an external provider boundary.
- Creates an important security/privacy policy.
- Resolves an important ambiguity that future developers/agents may otherwise revisit.

Do not create ADRs for every small implementation choice.

Each ADR should contain:
- Title and status.
- Date.
- Context/problem.
- Decision.
- Rationale.
- Consequences/tradeoffs.
- Alternatives considered if relevant.
- Related PRD sections.
- Superseded-by/supersedes links when applicable.

## 16. Product Operations layer

Product operations covers how Ignite is safely run after code exists.

At minimum, maintain runbooks for:
- Season/content publishing.
- Production release.
- Bug/incident triage.
- Account deletion/data requests.

As the product grows, add runbooks for:
- Purchase/entitlement support.
- Season transition/archival.
- Data migration.
- Security incidents.
- AI/provider operations.

## 17. Sprint execution template

For each sprint:

### A. Sprint overview
- Goal.
- User outcome.
- Architecture introduced.
- Dependencies.
- Explicit non-goals.

### B. Phase breakdown
Each phase should be small enough to review/test independently.

### C. Implementation prompt
Every Cursor implementation prompt should require:
- PRD/playbook/ADR inspection first.
- No destructive unrelated refactors.
- No hard-coded business rules when configuration/domain policy should own them.
- Tests appropriate to the phase.
- Summary of files changed and decisions made.

### D. Verification prompt
After every phase, run a separate verification request that checks:
- PRD alignment.
- Architecture boundaries.
- Tests.
- Error/loading states.
- Accessibility considerations.
- Security/privacy implications.
- Hard-coded business rules/magic numbers.
- Unintended scope.
- Working-tree cleanliness and changed files.

Only proceed when blocking findings are resolved or explicitly accepted.

## 18. Current Sprint 2–4 planning guardrails

### Sprint 2 — Authentication & Onboarding
Explicitly plan:
- Authenticated identity vs Quizzer profile.
- Account-for-self vs adult-helping-Quizzer context.
- Onboarding persistence/resume.
- Age/division eligibility behavior.
- Returning-user routing.
- New-season returning-user behavior.
- Credential recovery for chosen auth methods.
- Account deletion architecture before release.
- Privacy-minimized data collection.
- Accessible form/input/error behavior.

### Sprint 3 — Season & Official Content
Explicitly plan:
- Season lifecycle/configuration.
- Season-scoped division participation.
- Import/validation tooling.
- Active-season selection boundary.
- Locked content enforcement.
- Staging-before-production publishing process.
- Synthetic season fixtures for test coverage.

### Sprint 4 — Purchase & Access
Explicitly plan:
- Provider-independent entitlement domain.
- Store sandbox/testing paths.
- Pending/success/failure/restore states.
- Backend access enforcement.
- Returning user/new device access recovery.
- Archived/expired season handling.
- Purchase support diagnostics without exposing sensitive data.

## 19. Core development principle

**Design for future capabilities, build only what the current sprint requires, and leave a clean boundary for the next implementation.**

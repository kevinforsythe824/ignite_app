# Production release runbook

High-level lifecycle for shipping Ignite to real users.

**Status:** Planning skeleton — detailed App Store Connect, Play Console, and rollout procedures are **future Sprint 11 work**.

**Sources:** [PRD](../product/PRD.md) (§71), [Development Playbook](../development/Ignite_Development_Playbook.md) (§§11, 14, 17), [ENVIRONMENTS.md](ENVIRONMENTS.md), [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md), [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md), [ADRs](../architecture/decisions/README.md).

Related: [CONTENT_PUBLISHING_RUNBOOK.md](CONTENT_PUBLISHING_RUNBOOK.md), [SEASON_TRANSITION_RUNBOOK.md](SEASON_TRANSITION_RUNBOOK.md).

---

## Release lifecycle (intended)

```text
Feature development (feature branches)
        ↓
DEV verification
        ↓
STAGING verification
        ↓
Release candidate
        ↓
iOS beta / testing                    ← Sprint 11: TestFlight details TBD
        ↓
Android beta / testing                ← Sprint 11: Play internal/closed testing TBD
        ↓
Production release (store + backend as needed)
        ↓
Post-release monitoring
```

For **backend-only** fixes (Firestore rules, indexes, functions) with no client contract change, staging verification and explicit production deploy may suffice without a new store build — see [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md).

---

## Branch and integration discipline

- **`main`** is the **production-ready integration branch** (team convention — confirm in repo policy when CI is added).
- Feature and foundation work is developed on branches (e.g. `feature/*`, `chore/*`), validated, then merged to `main` through review.
- Do not merge unverified work that touches auth, persistence, rules, purchases, or privacy boundaries.

---

## Pre-release gates

A release candidate should pass (playbook §14, PRD §71):

| Gate | Requirement |
|------|-------------|
| **Automated tests** | CI/unit/integration tests pass |
| **Environment** | DEV and STAGING verified; production config **explicit** — never casual prod targeting ([ENVIRONMENTS.md](ENVIRONMENTS.md)) |
| **Manual personas** | Relevant [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) flows pass on STAGING |
| **Security / privacy** | Backend authorization reviewed; no unnecessary PII in logs (PRD §§43–44, ADR-006) |
| **Accessibility** | Checked on **changed flows throughout development**; final release readiness includes accessibility review (playbook §11, PRD §71) |
| **Bugs** | Open **P0/P1** bugs **block** release ([BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md)) |
| **Production configuration** | `EXPO_PUBLIC_IGNITE_ENV=prod`, correct Firebase project ID, store/production keys validated |

---

## Environment usage

| Environment | Release role |
|-------------|----------------|
| **Development** (`wpf-bible-qizzing`) | Day-to-day development and first verification |
| **Staging** (`ignite-staging-01`) | Release-candidate builds, integration, purchase sandbox (Sprint 4+), regression |
| **Production** (`ignite-prod-01`) | Real users — deploy only after STAGING sign-off; explicit `--project prod` for CLI |

Never default Firebase CLI or seed tooling to Production. See [ENVIRONMENTS.md](ENVIRONMENTS.md).

---

## Client vs backend release

| Change | Typical path |
|--------|----------------|
| **Mobile app code/UI** | New build → beta testing → store submission |
| **Backend only** (rules, indexes, content import) | STAGING deploy → verify → explicit PROD deploy |
| **Combined** | Coordinate compatibility (old clients vs new rules/content) |

Season **data-only** updates may not require a new binary — see [SEASON_TRANSITION_RUNBOOK.md](SEASON_TRANSITION_RUNBOOK.md).

---

## Post-release monitoring

After production store release and/or backend deploy:

1. Monitor crashes, errors, and support channels (playbook §12, [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md)).
2. Use a defined **monitoring window** (severity-dependent; typically 24–72 hours).
3. Confirm key flows on Production build/version.
4. Track open P0/P1; halt or roll back if criteria met (Sprint 11: formal rollback policy TBD).

---

## Sprint 11 placeholders (NOT documented in detail yet)

Expand this runbook when approaching MVP release:

| Topic | Notes |
|-------|--------|
| **Versioning / build numbers** | Semantic version + native build numbers per platform |
| **TestFlight** | iOS beta distribution and tester groups |
| **Google Play internal/closed testing** | Android beta tracks |
| **Production rollout strategy** | Phased/staged rollout when platform supports it (playbook §14) |
| **Rollback / halt criteria** | When to stop rollout or revert backend deploy |
| **Release notes** | User-facing and internal change summary |
| **Monitoring window** | Duration and owners for post-release watch |
| **Store submission checklists** | App Store Connect and Play Console step-by-step |

PRD **Sprint 11 — MVP Stabilization & Release Readiness** (§71) covers functional, architecture, and quality validation scope for the first public release.

---

## Lightweight release readiness checklist

- [ ] All automated tests green on release candidate.
- [ ] STAGING verification complete (iOS and Android).
- [ ] Relevant test personas pass.
- [ ] No open P0/P1 bugs.
- [ ] Privacy/security review for changed areas.
- [ ] Accessibility checked on changed flows.
- [ ] Production Firebase and client env vars verified — not DEV/STAGING values.
- [ ] Backend deploy (if any) diffed and deployed with explicit prod target.
- [ ] Monitoring and on-call/support path defined for launch window.

---

## Implementation placeholders

| Sprint | Expected work |
|--------|----------------|
| **Sprint 2–4** | Feature releases to STAGING; incremental readiness |
| **Sprint 11** | MVP stabilization, device testing, production config, release build validation, detailed store/beta procedures |
| **Ongoing** | Hotfix path via [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md) |

---

## Related documents

| Document | Role |
|----------|------|
| [Playbook §14](../development/Ignite_Development_Playbook.md) | Release discipline |
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | Production safeguards |
| [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md) | P0/P1 blocking rules, staging verification |
| [PRD §71](../product/PRD.md) | Sprint 11 MVP completion criteria |

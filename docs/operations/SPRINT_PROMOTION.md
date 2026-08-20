# Sprint promotion runbook

How completed sprint work and release candidates move through DEV, STAGING, and PROD.

**Status:** Active — pre-Sprint-2 operational guide.

**Sources:** [PRD](../product/PRD.md), [Development Playbook](../development/Ignite_Development_Playbook.md) (§§5, 14, 17), [ENVIRONMENTS.md](ENVIRONMENTS.md), [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md), [CONTENT_PUBLISHING_RUNBOOK.md](CONTENT_PUBLISHING_RUNBOOK.md), [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md), [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md).

Related: [SEASON_TRANSITION_RUNBOOK.md](SEASON_TRANSITION_RUNBOOK.md).

---

## Purpose

Ignite promotion is **not one automatic pipeline**. Git merge, mobile builds, Firebase backend deploy, and Firestore data/content changes are **four separate concerns**. Each requires an intentional action.

This runbook unifies fragmented guidance from the operations docs into one sprint and release flow. For environment-specific commands and safeguards, see [ENVIRONMENTS.md](ENVIRONMENTS.md).

---

## Four separate concerns

| Concern | What it is | Does NOT happen automatically |
|---------|------------|-------------------------------|
| **Git / source code** | Merge `feature/sX-build` → `main` | Firebase deploy, data migration, mobile build |
| **Mobile build** | EAS or store binary for iOS/Android | Firestore migration, backend deploy |
| **Firebase backend** | Rules, indexes, Cloud Functions | Git merge, data copy between environments |
| **Firestore data / content** | Seed, import, migration, official season publish | Git merge, mobile build creation |

### What is never automatic

- Merging to `main` does **not** deploy Firebase.
- Creating a mobile build does **not** migrate Firestore.
- Firestore data is **not** copied between DEV, STAGING, and PROD.
- Each environment remains **isolated**.
- Only required configuration and content changes are **intentionally promoted** through the steps below.

---

## Normal sprint flow

```text
feature/sX-build
      ↓
DEV
      ↓
Build / Test / Fix
      ↓
Automated verification passes
      ↓
Identify backend/config changes
      ↓
Determine whether migration/data changes are required
      ↓
Merge approved sprint → main
      ↓
Promote required backend changes to STAGING
      ↓
Apply required STAGING config/migrations
      ↓
Create STAGING mobile build when supported
      ↓
Run realistic STAGING verification/regression
      ↓
Sprint accepted
```

### Per-step pointers

**DEV — build / test / fix**

- Local work uses DEV (`.env.dev.example` → `.env.local`). Confirm Metro log: `environment=dev project=wpf-bible-qizzing`.
- See [ENVIRONMENTS.md § Local runbook](ENVIRONMENTS.md).

**Automated verification**

- Run `npm run test:ci` before merge. **CI pipeline not yet in repo** — manual for now.

**Identify backend/config changes**

- Did the sprint change `firestore.rules`, `firestore.indexes.json`, or future Cloud Functions?
- If yes, plan explicit deploy steps per [ENVIRONMENTS.md § backend promotion](ENVIRONMENTS.md).

**Migration / data changes**

- **No migration framework in repo yet.** If existing Firestore documents need transformation, plan an explicit script or manual process per environment.
- Test data seed (`npm run seed:firestore`) is DEV-only by default; prod is always refused. Official content uses a separate import path (Sprint 3+).

**Merge → main**

- Integration branch discipline: [RELEASE_RUNBOOK.md § Branch and integration](RELEASE_RUNBOOK.md).
- Merge updates **source code only**.

**Promote backend to STAGING**

- Deploy the **same git revision** tested on DEV using explicit `--project staging` commands. See [ENVIRONMENTS.md](ENVIRONMENTS.md).
- After STAGING CLI work, reset CLI to DEV: `npm run firebase:use:dev`.

**STAGING mobile build**

- **TBD — future EAS setup.** No `eas.json` or per-environment bundle IDs yet. Until EAS multi-env profiles exist (Sprint 11 area), STAGING verification may use local Expo with `.env.staging.example` → `.env.local` or ad hoc internal builds.

**STAGING verification / regression**

- Required for P0–P2 fixes before release: [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md).
- Use relevant [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) flows.

---

## Release flow (MVP / release candidate)

```text
Completed MVP / release candidate
      ↓
STAGING
      ↓
Release-readiness validation
      ↓
Production backend/config promotion
      ↓
Production content/data promotion where required
      ↓
Production iOS/Android builds
      ↓
TestFlight / Play testing
      ↓
App Store / Google Play release
```

Detailed store procedures are **Sprint 11** work: [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md).

**Production backend** — explicit `--project prod` only, after STAGING sign-off. Never casual prod targeting.

**Production content** — committee-approved import workflow (Sprint 3+): [CONTENT_PUBLISHING_RUNBOOK.md](CONTENT_PUBLISHING_RUNBOOK.md). Not via test seed script.

**Production mobile builds** — **TBD** until EAS profiles and production env wiring exist.

---

## Sprint acceptance checklist

Use before marking a sprint accepted after STAGING verification:

- [ ] Sprint goal and PRD requirements satisfied on DEV.
- [ ] `npm run test:ci` passes.
- [ ] Backend changes (if any) deployed to DEV and exercised.
- [ ] Required STAGING backend deploy completed (if applicable).
- [ ] Required STAGING config/migrations applied (if applicable).
- [ ] STAGING verification complete (manual personas as relevant).
- [ ] No open P0/P1 bugs for sprint scope.
- [ ] Merged to `main` through review.

---

## Related documents

| Document | Role |
|----------|------|
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | DEV/STAGING/PROD layout, CLI aliases, deploy commands, safeguards |
| [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md) | Release candidate gates, client vs backend release |
| [CONTENT_PUBLISHING_RUNBOOK.md](CONTENT_PUBLISHING_RUNBOOK.md) | Official season import DEV → STAGING → PROD (Sprint 3+) |
| [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md) | Fix verification and release path |
| [Development Playbook §17](../development/Ignite_Development_Playbook.md) | Sprint execution template |

# Bug triage runbook

How Ignite investigates, fixes, verifies, and releases bug fixes.

**Sources:** [Development Playbook](../development/Ignite_Development_Playbook.md) (§§12–14), [PRD](../product/PRD.md) (§§43–44, 47–48), [ENVIRONMENTS.md](ENVIRONMENTS.md), [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md), [ADRs](../architecture/decisions/README.md).

Use the GitHub **Bug Report** issue form (`.github/ISSUE_TEMPLATE/bug_report.yml`) for engineering-filed bugs.

**In-app Help & Feedback** (Settings → Help & Feedback, ADR-012) is **intake for manual review** in the Firebase Console (`feedbackSubmissions`). It does **not** auto-create GitHub issues, store GitHub tokens, or replace this runbook. After a person reviews a submission, follow the existing reproduce → layer → smallest fix → regression → DEV → STAGING path. Create a GitHub issue from the Bug Report form only when that review warrants one.

---

## Severity definitions

Severity is confirmed during triage. The reporter’s estimate is a starting point.

| Severity | Definition | Response expectation |
|----------|------------|----------------------|
| **P0** | Active or imminent **security/privacy exposure**, unauthorized data access, credential leakage, or **destructive data corruption** (loss or irreversible mutation of user/domain data). | Stop other work. Triage immediately. No production debugging with real user data unless explicitly authorized. |
| **P1** | **Core app unusable** for most users, **authentication / purchase / access** broadly broken, or **major data-integrity risk** (wrong learning state, cross-user leakage, entitlement errors at scale). | Same-day triage. Fix or mitigate before the next release candidate when possible. |
| **P2** | Important feature broken with a **workaround** or **limited impact** (single platform, single flow, non-destructive incorrect behavior). | Schedule in the current or next sprint. |
| **P3** | **Cosmetic** or minor usability issue; no meaningful impact on correctness, security, or data. | Backlog; fix when touching the area or during polish. |

When in doubt between two levels, choose the **higher** severity until investigation proves otherwise.

---

## Minimum information before investigation

Do not start code changes until the issue has enough context to reproduce or narrow the failure. Required from the bug report (or added in a triage comment):

| Field | Why it matters |
|-------|----------------|
| **Short summary** | Confirms the problem is one issue, not several. |
| **Environment** | Development, Staging, or Production — determines which Firebase project and rules apply. |
| **Platform** | iOS, Android, or Both — isolates native vs shared React Native issues. |
| **App version** | Matches the client build under test. |
| **Build number** | Distinguishes store builds, internal builds, and OTA updates. |
| **Severity (estimate)** | Prioritizes queue order. |
| **Feature / area** | Routes to the right feature folder and PRD section. |
| **Steps to reproduce** | Enables reproduce-first workflow. |
| **Expected vs actual** | Defines pass/fail for verification. |
| **Reproducibility** | Sets confidence for regression tests and release urgency. |

Optional but valuable:

- **Non-sensitive error code or support reference** — maps to application error taxonomy (playbook §12).
- **Redacted screenshot or log excerpt** — no tokens, credentials, or real Quizzer PII.

If information is missing, **request it on the issue** before assigning engineering time. For Production-only reports, confirm whether the issue reproduces on **Staging** with a synthetic persona before touching production data.

---

## Reproduce-first workflow

```text
Issue opened (Bug Report form)
        ↓
Triage: confirm severity + minimum fields present
        ↓
Reproduce in Development (preferred) or Staging
        ↓
If not reproducible → request more steps / version / persona; do not guess a fix
        ↓
Classify failure layer (see below)
        ↓
Identify root cause
        ↓
Smallest safe fix + regression test (when feasible)
        ↓
Automated verification
        ↓
Manual DEV verification
        ↓
Manual STAGING verification (required before release for P0–P2)
        ↓
Review / merge
        ↓
Release decision (client build vs backend-only)
        ↓
Post-release monitoring
        ↓
Close issue after verification in the affected environment
```

**Rules:**

- Prefer **Development** (`wpf-bible-qizzing`) for first reproduction and fixes.
- Use **Staging** (`ignite-staging-01`) for release-candidate verification with synthetic users only.
- **Never** seed, reset, or casually edit **Production** (`ignite-prod-01`). Production changes follow controlled workflows in [ENVIRONMENTS.md](ENVIRONMENTS.md).
- Use [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) for synthetic accounts; do not use real child or Quizzer data in issues, logs, or fixtures.

---

## Environment and build identification

Before investigating, record on the issue:

1. **Environment** — `dev` / `staging` / `prod` and matching Firebase project ID from [ENVIRONMENTS.md](ENVIRONMENTS.md).
2. **App version and build number** — from the About/build screen or CI artifact name.
3. **Platform and OS version** — e.g. iOS 18.2, Android 15.
4. **Client config sanity** — for local runs, confirm Metro log shows the expected line:

   ```text
   [Ignite] Firebase environment=dev project=wpf-bible-qizzing
   ```

5. **Backend deploy state** — if the bug may involve Firestore rules, indexes, or Cloud Functions, note whether Staging/Production backend was recently deployed and whether `firestore.rules` in git matches the target project.

Misidentified environment is a common false lead. Confirm early.

---

## Client vs repository / backend / data investigation

Determine which layer owns the failure before editing code.

| Layer | Typical symptoms | Where to look |
|-------|------------------|---------------|
| **Presentation (UI)** | Layout, navigation, accessibility, wrong screen shown | Feature screens/components, routing |
| **Feature / application** | Wrong flow, missing state handling, orchestration bugs | Feature hooks, reducers, application services |
| **Domain** | Incorrect business rule, eligibility, season isolation | Domain modules, policy — check PRD and ADRs |
| **Repository / persistence** | Mapping errors, query shape, sync timing | Repository implementations — not UI |
| **Firebase / Firestore rules** | Permission denied, unexpected public read, writes blocked | `firestore.rules`, Security Rules tests, console vs git diff |
| **Seed / tooling** | Wrong test data, script targeted wrong project | `scripts/firestore-seed/`, `assertSeedTarget.ts` |
| **Configuration** | Wrong env vars, project ID mismatch, missing `EXPO_PUBLIC_IGNITE_ENV` | `.env.local`, `firebaseEnvironments.ts`, [ENVIRONMENTS.md](ENVIRONMENTS.md) |
| **External provider** | Auth, store, crash reporting | Provider-specific service boundaries (ADR-005 for AI) |

**Dependency direction** (PRD §§27–28): Presentation → Feature/Application → Domain → Repository → Persistence. Fixes should respect this boundary; do not patch UI-only when the repository or rules are wrong.

---

## Logging and error inspection

Follow playbook §12 and PRD §§44, 47.

**May use for diagnosis:**

- App version, build, environment, platform/OS
- Application **error category/code** (Authentication, Authorization, Content/data, Entitlement/purchase, Network, Validation, Unexpected)
- Feature or operation name
- Non-sensitive technical context
- Approved crash stack traces (when integrated)

**Do not collect or paste into issues:**

- Authentication tokens or refresh tokens
- Firebase Admin credentials or API keys
- Full Firestore documents containing real Quizzer profiles or learning history
- Real names, emails, or contact information
- Detailed Scripture learning history unless strictly necessary — and never for Production users in a public issue

If deeper logs are required, use **private, access-controlled** channels and redact before any GitHub update.

Infrastructure errors must be translated to application-level categories before UI display (PRD §47). When filing or updating bugs, cite the **stable category/code**, not raw Firebase error strings, when possible.

---

## Root-cause identification

1. Reproduce with the smallest scenario (one persona, one card, one screen).
2. Read the relevant **PRD** section, **ADR**, and **playbook** guardrails for that feature.
3. Trace data flow: user action → feature logic → domain rule → repository → Firestore/rules.
4. Form a **single hypothesis** and confirm with one targeted experiment (log line, breakpoint, rules test, unit test).
5. Document root cause on the issue in plain language before opening the fix PR.

Avoid fixing symptoms in the wrong layer (e.g. hiding a permission error in UI when rules are incorrect).

---

## Smallest safe fix

- Implement the **minimum change** that correctly addresses the root cause.
- Do not bundle unrelated refactors, feature work, or rule loosening “while you’re here.”
- Preserve architecture boundaries and season isolation invariants.
- For Security Rules, prefer **tightening** or **precise** fixes over broad `allow read, write: if true`.
- If the fix requires an unresolved product decision (see [ADR Open Decisions](../architecture/decisions/README.md)), **stop** and get an explicit product-owner decision — do not encode a guess.

---

## Regression test requirement

When feasible, add or update an automated test that would have caught the bug:

- **Domain / application logic** — unit tests for the rule or transformation that failed.
- **Repository** — mapping or query tests with fixtures.
- **Security Rules** — rules unit tests with synthetic personas (Sprint 3+).
- **Routing / onboarding** — integration or E2E tests with [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) identifiers.

If a test is not practical (e.g. native-only rendering glitch), document **manual regression steps** on the issue and in the PR.

---

## DEV verification

After the fix branch passes CI:

1. Run the app against **Development** with the same persona and steps from the bug report.
2. Confirm expected behavior and that adjacent flows still work.
3. For env-sensitive bugs, confirm startup log shows the intended Firebase project.
4. Note device/simulator and OS version on the PR or issue.

---

## STAGING verification

Required for **P0–P2** before release, and recommended for any fix touching auth, rules, purchases, or persistence:

1. Deploy backend changes to **Staging** only through explicit `--project staging` (or approved pipeline) — see [ENVIRONMENTS.md](ENVIRONMENTS.md).
2. Install or run the **staging-configured** client build.
3. Re-run reproduction steps with **synthetic personas only**.
4. Confirm fix and scan for regressions on the affected feature/area.

Do not copy Production Firestore into Staging. Do not create synthetic personas in Production.

---

## Production release decision

| Fix type | Typical path |
|----------|----------------|
| **Client-only** | New mobile build through release candidate → store submission after Staging sign-off. |
| **Backend-only** (rules, indexes, functions) | Deploy to Production with explicit `--project prod` only after Staging verification and review. Diff rules against git first. |
| **Combined** | Backend first if the old client depends on new rules; otherwise coordinate version compatibility. |

**P0 / P1:** expedited review; still require Staging verification unless the issue is Production-only and cannot be simulated (document why).

**Never:**

- Run general seed scripts against Production (`assertSeedTarget` blocks this by design).
- Deploy Firestore rules to Production without reconciling `firestore.rules` in git.
- Leave a known P0/P1 open across a wide Production release without mitigation.

---

## Post-release monitoring

After Production deploy or store release:

1. Watch crash/error rates and support channels for 24–72 hours (duration scales with severity).
2. Confirm the original reproduction steps **fail to reproduce** on the fixed version in Production (or accept Staging proof for backend-only fixes).
3. Close the GitHub issue with: fix version/build, environment verified, and link to PR.
4. If the issue recurs, reopen or create a linked issue — do not silently patch again without updating the regression test.

---

## Privacy requirements during debugging

Aligned with PRD §§43–44 and playbook §§11–12.

- **Backend authorization is required** — UI hiding is not a fix for unauthorized data access (PRD §43).
- Use **synthetic personas** in Development and Staging; never debug with real child data in public tickets.
- **Minimize** what is logged during investigation; delete temporary debug logs before merge.
- Do not attach `.env`, service account JSON, or Firebase config exports to GitHub.
- If a bug involves a **privacy or security exposure (P0)**, restrict issue visibility if the platform allows, rotate affected credentials if applicable, and document remediation without exposing exploit details in public comments.

When crash or analytics tooling is added, verify it does not ship Scripture learning history or unnecessary PII (PRD §44).

---

## Recommended Cursor bug-investigation workflow

Use this sequence when fixing bugs with Cursor-assisted development:

```text
Bug report (GitHub issue)
        ↓
Inspect relevant PRD section, ADRs, playbook, and current implementation
        ↓
Reproduce locally (Development preferred)
        ↓
Determine affected architectural layer
        (Presentation → Feature → Domain → Repository → Persistence / rules)
        ↓
Identify root cause (single hypothesis, confirm with test or trace)
        ↓
Propose smallest safe fix (Plan Mode for non-trivial changes)
        ↓
Add regression test when feasible
        ↓
Implement
        ↓
Verify (automated tests + manual DEV)
        ↓
Staging verification (P0–P2 or persistence/auth/rules changes)
        ↓
Release (client build and/or explicit backend deploy)
        ↓
Monitor and close issue
```

Cursor is an implementation assistant, not the source of product decisions (playbook §3). If reproduction requires an **UNRESOLVED** business rule from [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) or [ADR Open Decisions](../architecture/decisions/README.md), pause and get a product-owner decision before coding.

---

## Related documents

| Document | Role |
|----------|------|
| [Ignite_Development_Playbook.md](../development/Ignite_Development_Playbook.md) | Bug workflow (§13), observability (§12), release discipline (§14) |
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | Firebase project mapping and production safeguards |
| [ACCOUNT_DELETION_RUNBOOK.md](ACCOUNT_DELETION_RUNBOOK.md) | Account-owned vs local cleanup inventory; privacy/destructive deletion planning (no Delete Account in Sprint 2) |
| [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) | Synthetic users for reproduction and tests |
| [PRD.md](../product/PRD.md) | Product rules, error handling, privacy |
| [ADR index](../architecture/decisions/README.md) | Durable architectural boundaries |

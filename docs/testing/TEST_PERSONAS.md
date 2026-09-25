# Ignite Test Personas

Synthetic, reusable personas for repeatable functional, routing, security, and later entitlement testing.

**Sources:** [`docs/product/PRD.md`](../product/PRD.md) (§§4, 8, 48, 62–64), [Development Playbook](../development/Ignite_Development_Playbook.md) (§§8–10, 18), [ADRs](../architecture/decisions/README.md), [`ENVIRONMENTS.md`](../operations/ENVIRONMENTS.md).

## Purpose

- Give manual QA, automated tests, and future Security Rules tests a **shared vocabulary**.
- Keep synthetic data out of production.
- Make unresolved business rules visible instead of guessing them in fixtures.

## Rules of use

- Use **synthetic identifiers only** — no real names, emails, passwords, or child information.
- Create personas in **Development** (`wpf-bible-qizzing`) or **Staging** (`ignite-staging-01`) only. Never create production users.
- Personas describe **intended** behavior. If Sprint 3/4 features are not built yet, treat those personas as placeholders.
- When a persona depends on an **open product decision**, mark it **UNRESOLVED** and do not encode a guessed rule in tests or seeds.

## Environments

| Environment | Firebase project | Persona use |
|-------------|------------------|-------------|
| Development | `wpf-bible-qizzing` | Primary synthetic users and edge-case data |
| Staging | `ignite-staging-01` | Release-candidate verification with synthetic users |
| Production | `ignite-prod-01` | **No synthetic personas** |

## Persona record fields

Each persona below includes:

| Field | Meaning |
|-------|---------|
| **Persona ID** | Stable synthetic name for docs, tests, and tickets |
| **Intended scenario** | What product behavior is being exercised |
| **Age / eligibility** | Division-relevant data where applicable |
| **Authentication** | Signed out / signed in / persistence state |
| **Onboarding** | Profile and Quizzer setup progress |
| **Season** | Active season context (Sprint 3+) |
| **Entitlement** | Purchase/access state (Sprint 4+) |
| **Expected routing / result** | Where the app should send the user |
| **Security expectation** | Backend/UI boundary to verify |
| **Sprint** | Earliest sprint that can exercise the persona |
| **Testing use** | Manual, automated, Security Rules, or combination |

---

## Sprint 2 — Authentication & Onboarding

Sprint 2 delivers account creation, sign-in/out, auth persistence, Quizzer name onboarding, parental-consent claim, returning-user **routing** from Auth + consent + profile (PRD §62, ADR-011), and authenticated Help & Feedback (ADR-012). Phase 9 documents account-deletion **architecture** in [`ACCOUNT_DELETION_RUNBOOK.md`](../operations/ACCOUNT_DELETION_RUNBOOK.md) but does **not** ship Delete Account. Age collection, division selection, and eligibility validation belong to **Sprint 3** (season / eligibility). Use S2-001, S2-002, S2-009, S2-010 plus the named consent and feedback personas below for Sprint 2 routing and intake. Age/division personas (S2-003+) are Sprint 3 placeholders, not Phase 7 routing cases. Sprint 2 does **not** deliver season lifecycle, official publishing, or purchase/access (Sprints 3–4).

### S2-001 — New unauthenticated user

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-guest-001` |
| **Intended scenario** | First launch with no account |
| **Age / eligibility** | N/A |
| **Authentication** | Signed out |
| **Onboarding** | Not started |
| **Season** | N/A (Sprint 3) |
| **Entitlement** | N/A (Sprint 4) |
| **Expected routing / result** | Authentication / sign-up entry (playbook §10) |
| **Security expectation** | No access to Quizzer profile or learning data |
| **Sprint** | 2 |
| **Testing use** | Manual, automated (routing), Security Rules (no user-scoped reads) |

### S2-002 — Authenticated, onboarding incomplete

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-auth-onboard-incomplete-001` |
| **Intended scenario** | Account exists but Quizzer profile/onboarding not finished |
| **Age / eligibility** | Not collected yet |
| **Authentication** | Signed in, session persisted |
| **Onboarding** | Incomplete (resume required) |
| **Season** | N/A |
| **Entitlement** | N/A |
| **Expected routing / result** | Onboarding flow; must not enter main app tabs |
| **Security expectation** | Auth identity exists; Quizzer domain data not treated as complete |
| **Sprint** | 2 |
| **Testing use** | Manual, automated, Security Rules (auth vs profile boundary) |

### S2-003 — Beginner-age Quizzer

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-quizzer-beginner-001` |
| **Intended scenario** | Age-eligible for Beginner division |
| **Age / eligibility** | Age **7** → eligible: Beginner only (PRD §8.1) |
| **Authentication** | Signed in |
| **Onboarding** | Age collected; division selection in progress or complete |
| **Season** | Division association pending Sprint 3 season context |
| **Entitlement** | N/A until Sprint 4 |
| **Expected routing / result** | Only Beginner offered as eligible division; invalid division choice rejected |
| **Security expectation** | Eligibility enforced by app/domain policy, not UI hiding alone |
| **Sprint** | 2 |
| **Testing use** | Manual, automated (eligibility unit/domain tests) |

### S2-004 — Junior-age Quizzer

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-quizzer-junior-001` |
| **Intended scenario** | Age-eligible for Junior division |
| **Age / eligibility** | Age **10** → eligible: Junior (PRD §8.1) |
| **Authentication** | Signed in |
| **Onboarding** | Age + division flow |
| **Season** | Pending Sprint 3 |
| **Entitlement** | N/A until Sprint 4 |
| **Expected routing / result** | Junior selectable; Beginner not offered if age excludes it |
| **Security expectation** | Same as S2-003 |
| **Sprint** | 2 |
| **Testing use** | Manual, automated |

### S2-005 — Intermediate Quizzer

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-quizzer-intermediate-001` |
| **Intended scenario** | Age-eligible for Intermediate division |
| **Age / eligibility** | Age **13** → eligible: Intermediate (PRD §8.1, ages 12–14) |
| **Authentication** | Signed in |
| **Onboarding** | Age + division flow |
| **Season** | Pending Sprint 3 |
| **Entitlement** | N/A until Sprint 4 |
| **Expected routing / result** | Intermediate selectable |
| **Security expectation** | Same as S2-003 |
| **Sprint** | 2 |
| **Testing use** | Manual, automated |

### S2-006 — Age 15–18 first-year Quizzer

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-quizzer-firstyear-15-18-001` |
| **Intended scenario** | First-year Quizzer in the 15–18 age band eligible for Intermediate |
| **Age / eligibility** | Age **16**, **first-year** → PRD §8.1 includes first-year Quizzers ages 15–18 in Intermediate |
| **Authentication** | Signed in |
| **Onboarding** | Age + first-year/eligibility context + division selection |
| **Season** | Pending Sprint 3 |
| **Entitlement** | N/A until Sprint 4 |
| **Expected routing / result** | Intermediate offered; Experienced/Senior not auto-selected |
| **Security expectation** | Eligibility must use explicit product rule once “first-year” is modeled — see **UNRESOLVED** below |
| **Sprint** | 2 |
| **Testing use** | Manual, automated |

**UNRESOLVED:** How the product records “first-year” vs returning/advanced 15–18 eligibility is not fully specified. Do not guess Experienced/Senior vs Intermediate boundaries beyond PRD §8.1 wording.

### S2-007 — Experienced / Senior eligibility placeholder

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-quizzer-experienced-placeholder-001` |
| **Intended scenario** | Placeholder for advanced Quizzers ages 12–18 |
| **Age / eligibility** | Age **17**, **advanced / non-first-year** — **UNRESOLVED official rule** |
| **Authentication** | Signed in |
| **Onboarding** | Blocked or incomplete until product owner confirms eligibility logic |
| **Season** | Pending Sprint 3 |
| **Entitlement** | N/A until Sprint 4 |
| **Expected routing / result** | **Do not automate expected division outcome yet.** Document-only until Experienced/Senior rule is decided (ADR Open Decisions) |
| **Security expectation** | N/A until rule is accepted |
| **Sprint** | 2 (planning/manual only until rule closed) |
| **Testing use** | Manual (exploratory only); **not** automated until rule is canonical |

**UNRESOLVED:** Exact rule distinguishing first-year Intermediate vs Experienced/Senior (PRD §8, ADR Open Decisions).

### S2-008 — Adult assisting a Quizzer

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-adult-assisting-quizzer-001` |
| **Intended scenario** | Adult creates/uses account to help a Quizzer |
| **Age / eligibility** | Adult account holder; Quizzer age collected during onboarding |
| **Authentication** | Signed in |
| **Onboarding** | Account creation context = “adult helping a Quizzer” (PRD §4.2); **same core app experience**, no Parent Portal |
| **Season** | Pending Sprint 3 |
| **Entitlement** | N/A until Sprint 4 |
| **Expected routing / result** | Same onboarding/routing model as self-use; context stored for consent/privacy only |
| **Security expectation** | No separate parent dashboard; minimum necessary data (ADR-006) |
| **Sprint** | 2 |
| **Testing use** | Manual, automated (onboarding context persistence) |

### S2-009 — Returning authenticated Quizzer

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-returning-authenticated-001` |
| **Intended scenario** | Previously completed onboarding; app relaunch or session restore |
| **Age / eligibility** | e.g. age **12**, division **Intermediate** (already saved) |
| **Authentication** | Signed in, persisted session |
| **Onboarding** | Complete |
| **Season** | Sprint 3 will add active-season context; until then route to post-onboarding shell |
| **Entitlement** | N/A until Sprint 4 |
| **Expected routing / result** | Skip auth/onboarding; land in appropriate post-onboarding destination (Home placeholder or next required step per sprint) |
| **Security expectation** | Profile loaded for authenticated user only |
| **Sprint** | 2 |
| **Testing use** | Manual, automated |

### S2-010 — Signed-out returning user

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-returning-signed-out-001` |
| **Intended scenario** | User who previously had an account signs out and returns |
| **Age / eligibility** | N/A at sign-in screen |
| **Authentication** | Signed out (prior account exists in Firebase Auth) |
| **Onboarding** | Complete on server, not visible until sign-in |
| **Season** | N/A until signed in |
| **Entitlement** | N/A until signed in |
| **Expected routing / result** | Authentication / sign-in; after sign-in, resume as S2-009 without repeating onboarding |
| **Security expectation** | Sign-in required before profile access |
| **Sprint** | 2 |
| **Testing use** | Manual, automated |

### S2-011 — Consent pending (under-13)

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-consent-pending-001` |
| **Intended scenario** | Under-13 privacy path; parent approval not yet received |
| **Age / eligibility** | Privacy choice “Under 13” (not a persisted DOB) |
| **Authentication** | Signed out until claim; local consent capability present |
| **Onboarding** | Blocked on parent approval (`pending` / waiting presentation) |
| **Season** | N/A |
| **Entitlement** | N/A |
| **Expected routing / result** | Consent pending; must not reach CreateAccount, QuizzerName, or MainTabs |
| **Security expectation** | Capability in SecureStore only; no local `approved=true`; Firestore consent docs client-denied |
| **Sprint** | 2 |
| **Testing use** | Automated (consent provider/screens), manual DEV |

### S2-012 — Consent approved, unclaimed

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-consent-approved-unclaimed-001` |
| **Intended scenario** | Parent approved; claim not yet bound to an Auth UID |
| **Age / eligibility** | Privacy choice “Under 13” |
| **Authentication** | Unauthenticated or signing in to claim |
| **Onboarding** | Approved + unbound → CreateAccount (no recovery UID) or Sign In to claim (recovery UID) |
| **Season** | N/A |
| **Entitlement** | N/A |
| **Expected routing / result** | Claim gate before profile/MainTabs (ADR-010 / ADR-011) |
| **Security expectation** | Client never sends claim UID; `request.auth.uid` binds on the server |
| **Sprint** | 2 |
| **Testing use** | Automated, manual DEV |

### S2-013 — Consent claimed, profile complete

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-consent-complete-001` |
| **Intended scenario** | Claim succeeded and Quizzer profile is ready |
| **Age / eligibility** | Privacy choice already completed; no age stored on profile |
| **Authentication** | Signed in, session persisted |
| **Onboarding** | Complete |
| **Season** | N/A |
| **Entitlement** | N/A |
| **Expected routing / result** | MainTabs (same as S2-009) |
| **Security expectation** | Profile is `quizzerId` + names + avatar only; no consent status on the profile document |
| **Sprint** | 2 |
| **Testing use** | Automated (lifecycle), manual DEV |

### S2-014 — User A → User B switch

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-user-switch-001` |
| **Intended scenario** | Authenticated User A is replaced by User B on the same device |
| **Age / eligibility** | N/A |
| **Authentication** | Signed in as B after A |
| **Onboarding** | Each UID has its own profile presence |
| **Season** | N/A |
| **Entitlement** | N/A |
| **Expected routing / result** | No User A ready/missing/error flash; remount key `authenticated:${uid}` (ADR-011) |
| **Security expectation** | Stale profile fetch and provision/updateName mutations must not overwrite B’s session |
| **Sprint** | 2 |
| **Testing use** | Automated (`QuizzerProfileProvider`) |

### S2-015 — Profile load error

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-profile-error-001` |
| **Intended scenario** | Authenticated user; `getProfile` fails |
| **Age / eligibility** | N/A |
| **Authentication** | Signed in |
| **Onboarding** | Unknown — error is not treated as missing |
| **Season** | N/A |
| **Entitlement** | N/A |
| **Expected routing / result** | Profile load-error screen with Retry / Sign Out; never QuizzerName or MainTabs |
| **Security expectation** | Translated error only; no raw Firebase strings |
| **Sprint** | 2 |
| **Testing use** | Automated (lifecycle + profile screens) |

### S2-016 — Authenticated Help & Feedback

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-feedback-submit-001` |
| **Intended scenario** | Completed profile submits Settings → Help & Feedback |
| **Age / eligibility** | N/A (must not appear on the feedback document) |
| **Authentication** | Signed in, profile ready |
| **Onboarding** | Complete |
| **Season** | N/A |
| **Entitlement** | N/A |
| **Expected routing / result** | Settings → Help & Feedback → compose; callable accepts; no signed-out support path |
| **Security expectation** | Document has category/message/safe metadata only — **no** UID, name, email, consent, or profile (ADR-012) |
| **Sprint** | 2 |
| **Testing use** | Automated (UI + Functions + rules); manual DEV after Functions deploy |

### S2-017 — Account deletion (placeholder)

| Field | Value |
|-------|-------|
| **Persona ID** | `s2-account-deletion-001` |
| **Intended scenario** | Authenticated Quizzer requests permanent account deletion from Settings |
| **Age / eligibility** | N/A for Phase 9 |
| **Authentication** | Signed in (method **UNRESOLVED** for re-auth) |
| **Onboarding** | Profile complete |
| **Season** | N/A until Sprint 3+ inventory rows exist |
| **Entitlement** | N/A until Sprint 4 |
| **Expected routing / result** | **UNRESOLVED / not executable in Phase 9** — Delete Account UI and callable do not exist. After a future successful deletion, Auth session is gone → lifecycle `unauthenticated` (ADR-011). |
| **Security expectation** | Server-enforced cleanup per [`ACCOUNT_DELETION_RUNBOOK.md`](../operations/ACCOUNT_DELETION_RUNBOOK.md); no cross-user impact; parental-consent server retention still **UNRESOLVED** |
| **Sprint** | 2 (architecture only) / pre–public release (implementation) |
| **Testing use** | Planning placeholder only — do not automate or run manually as a Phase 9 E2E |

### Sprint 2 cross-cutting notes

| Topic | Status |
|-------|--------|
| Authentication methods (Apple, Google, email, etc.) | **UNRESOLVED** — personas are method-agnostic |
| Account deletion / retention | **UNRESOLVED** — Phase 9 inventory/contract in runbook; behavior not specified; S2-017 not executable |
| Credential recovery | **UNRESOLVED** — depends on chosen auth methods |
| Entitlement / purchase routing | Deferred to Sprint 4 — personas stop at onboarding-complete routing |

---

## Sprint 3 — Season & Official Content (placeholders)

Do not implement these personas in production behavior yet. Use for test planning, Security Rules design, and fixture naming.

### S3-001 — Current active season

| Field | Value |
|-------|-------|
| **Persona ID** | `s3-season-active-001` |
| **Intended scenario** | App has one Active/Locked season configured |
| **Season** | `status = Active/Locked`; curriculum readable by an authenticated client (ADR-015) |
| **Expected routing / result** | Active season selected as study context |
| **Security expectation** | Signed-in reads of known curriculum paths; signed-out reads denied; client curriculum writes denied |
| **Sprint** | 3 |
| **Testing use** | Manual, automated, Security Rules |

### S3-002 — No active season

| Field | Value |
|-------|-------|
| **Persona ID** | `s3-season-none-active-001` |
| **Intended scenario** | Transition period with no active season |
| **Season** | No Active season in configuration |
| **Expected routing / result** | Transition / empty / awaiting-next-season experience (PRD §10, §48) |
| **Security expectation** | No cross-season data leakage |
| **Sprint** | 3 |
| **Testing use** | Manual, automated |

### S3-003 — Previous season archived

| Field | Value |
|-------|-------|
| **Persona ID** | `s3-season-archived-001` |
| **Intended scenario** | Prior season ended; study disabled, history read-only |
| **Season** | Archived season; learning state historical |
| **Expected routing / result** | Archived state UI; no active Flashcard study for that season (PRD §10) |
| **Security expectation** | Historical read rules; no active-season mutation |
| **Sprint** | 3 |
| **Testing use** | Manual, Security Rules |

### S3-004 — New season available

| Field | Value |
|-------|-------|
| **Persona ID** | `s3-season-new-available-001` |
| **Intended scenario** | Returning Quizzer when next season is published |
| **Season** | New season Published/Active; prior season Archived |
| **Expected routing / result** | Season participation setup for new season; no progress transfer (ADR-002) |
| **Security expectation** | Strict season isolation |
| **Sprint** | 3 |
| **Testing use** | Manual, automated |

### S3-005 — Season content edge cases

| Field | Value |
|-------|-------|
| **Persona ID** | `s3-content-edgecases-001` |
| **Intended scenario** | Synthetic curriculum covering numbering, long/short cards, annotations, keywords, cross-references (playbook §8, PRD §49) |
| **Season** | Dev/staging test season (e.g. existing `test-season` seed) |
| **Expected routing / result** | Curriculum loads and renders without domain identity collisions |
| **Security expectation** | Authenticated read-only client access to official nested paths; signed-out reads denied |
| **Sprint** | 3 |
| **Testing use** | Manual, automated |

### S3-006 — Cross-user season data access attempt

| Field | Value |
|-------|-------|
| **Persona ID** | `s3-security-cross-user-001` |
| **Intended scenario** | Authenticated user A attempts to read/write user B's season-scoped learning data |
| **Authentication** | Signed in as synthetic user A |
| **Expected routing / result** | Denied at backend; UI must not rely on hiding alone (PRD §43, ADR-006) |
| **Security expectation** | **Security Rules + server enforcement** — primary persona for Sprint 3 rules tests |
| **Sprint** | 3 |
| **Testing use** | Security Rules, automated (when emulator tests exist) |

### S3-007 — Cross-season access attempt

| Field | Value |
|-------|-------|
| **Persona ID** | `s3-security-cross-season-001` |
| **Intended scenario** | User with entitlement/learning in season A attempts access to season B data |
| **Season** | Two synthetic seasons with overlapping Scripture references but distinct card IDs (ADR-002) |
| **Expected routing / result** | Denied or empty for unauthorized season; no progress transfer |
| **Security expectation** | Season isolation in rules and queries |
| **Sprint** | 3 |
| **Testing use** | Security Rules, automated |

### S3-008 — Official curriculum client-write attempt

| Field | Value |
|-------|-------|
| **Persona ID** | `s3-security-curriculum-write-001` |
| **Intended scenario** | Client attempts create/update/delete on a Season, MaterialSet, Section, nested Card (including an embedded annotation), or transitional flat `seasons/{seasonId}/cards/{cardId}` |
| **Authentication** | Signed in (any); a signed-out client is also denied |
| **Expected routing / result** | Write denied. Signed-out reads of those paths are denied. Signed-in reads of the nested paths and the transitional flat Card path succeed (ADR-015) |
| **Security expectation** | `allow write: if false` on known curriculum paths. Admin import bypasses client Rules. Entitlement and publication status are not enforced here |
| **Sprint** | 3 |
| **Testing use** | Security Rules |

---

## Sprint 4 — Purchase & Access (placeholders)

Entitlement personas require Sprint 4 purchase/access implementation. Use for planning only until then.

### S4-001 — No entitlement

| Field | Value |
|-------|-------|
| **Persona ID** | `s4-entitlement-none-001` |
| **Intended scenario** | Onboarded Quizzer without season purchase |
| **Entitlement** | None for current season |
| **Expected routing / result** | Purchase/access flow (PRD §48 No Entitlement) |
| **Security expectation** | Backend denies entitled features |
| **Sprint** | 4 |
| **Testing use** | Manual, automated, Security Rules |

### S4-002 — Successful purchase

| Field | Value |
|-------|-------|
| **Persona ID** | `s4-entitlement-purchased-001` |
| **Intended scenario** | Completed season purchase |
| **Entitlement** | Active season entitlement |
| **Expected routing / result** | Home / core app access |
| **Security expectation** | Entitlement enforced server-side |
| **Sprint** | 4 |
| **Testing use** | Manual (sandbox), automated, Security Rules |

### S4-003 — Pending purchase

| Field | Value |
|-------|-------|
| **Persona ID** | `s4-entitlement-pending-001` |
| **Intended scenario** | Store purchase in pending state |
| **Entitlement** | Pending |
| **Expected routing / result** | Pending UI; no full access until confirmed |
| **Security expectation** | No entitlement granted while pending |
| **Sprint** | 4 |
| **Testing use** | Manual (sandbox), automated |

### S4-004 — Cancelled / failed purchase

| Field | Value |
|-------|-------|
| **Persona ID** | `s4-entitlement-failed-001` |
| **Intended scenario** | Purchase cancelled or failed |
| **Entitlement** | None |
| **Expected routing / result** | Purchase/access with clear error/recovery |
| **Security expectation** | No access without valid entitlement |
| **Sprint** | 4 |
| **Testing use** | Manual (sandbox), automated |

### S4-005 — Restored purchase

| Field | Value |
|-------|-------|
| **Persona ID** | `s4-entitlement-restored-001` |
| **Intended scenario** | User restores prior season purchase on same or new device |
| **Entitlement** | Restored active entitlement |
| **Expected routing / result** | Access recovered without repurchasing |
| **Security expectation** | Restore validated against store/backend; no cross-user restore |
| **Sprint** | 4 |
| **Testing use** | Manual (sandbox), Security Rules |

### S4-006 — New-device entitlement recovery

| Field | Value |
|-------|-------|
| **Persona ID** | `s4-entitlement-new-device-001` |
| **Intended scenario** | Returning user on new device with existing account |
| **Authentication** | Signed in |
| **Entitlement** | Recover via restore flow |
| **Expected routing / result** | Access after sign-in + restore |
| **Security expectation** | Entitlement tied to authenticated identity |
| **Sprint** | 4 |
| **Testing use** | Manual, automated |

### S4-007 — Locked season content without entitlement

| Field | Value |
|-------|-------|
| **Persona ID** | `s4-security-no-entitlement-access-001` |
| **Intended scenario** | User attempts Flashcard/study access without entitlement |
| **Entitlement** | None |
| **Expected routing / result** | Blocked with No Entitlement state; no curriculum bypass |
| **Security expectation** | **Security Rules** must deny study access without entitlement once Sprint 4 rules ship. Slice 5 authenticates curriculum reads and does not check entitlement (ADR-015) |
| **Sprint** | 4 |
| **Testing use** | Security Rules, manual |

**UNRESOLVED:** Store SKU / product ID mapping (ADR Open Decisions). Sandbox personas must not hard-code production product identifiers.

---

## Personas for later Firestore Security Rules tests

| Persona ID | Sprint | Rule focus |
|------------|--------|------------|
| `s3-security-curriculum-write-001` | 3 | Client cannot mutate official curriculum |
| `s3-security-cross-user-001` | 3 | User A cannot read/write user B learning data |
| `s3-security-cross-season-001` | 3 | Season isolation for reads/writes |
| `s4-security-no-entitlement-access-001` | 4 | Entitlement required for protected study paths |
| `s4-entitlement-restored-001` | 4 | Restore does not grant cross-user access |

Committed rules (not yet a statement about what is deployed) require a signed-in client to read Season, MaterialSet, Section, nested Card, and the transitional flat `seasons/{seasonId}/cards/{cardId}` path. Signed-out reads are denied. Client writes on those paths are denied. Unknown Season subpaths fail closed. Profile, parental consent, and feedback rules are unchanged. Run `npm run test:firestore-rules` (requires Java + Firestore emulator). Entitlement-aware curriculum rules remain Sprint 4 ([ADR-015](../architecture/decisions/ADR-015-curriculum-client-security-boundary.md), [`ENVIRONMENTS.md`](../operations/ENVIRONMENTS.md)).

---

## Unresolved business-rule dependencies

| Dependency | Affected personas | Where tracked |
|------------|-------------------|---------------|
| Experienced/Senior vs first-year 15–18 eligibility | `s2-quizzer-firstyear-15-18-001`, `s2-quizzer-experienced-placeholder-001` | PRD §8; ADR Open Decisions |
| Authentication methods | All Sprint 2 auth personas | PRD §42; ADR Open Decisions |
| Account deletion / retention | All persisted personas | Playbook §10; ADR Open Decisions |
| Store product mapping | All Sprint 4 entitlement personas | PRD §9; ADR Open Decisions |
| Production content import format | Sprint 3 publishing personas | PRD §50; Sprint 3 |

Do not encode guessed values for these in automated tests until the product owner closes the decision.

---

## Seeds and fixtures

This document does **not** add user seed scripts. The existing **`npm run seed:firestore`** path seeds **test curriculum only** (Admin SDK, dev/staging). User/auth personas remain manual or test-fixture responsibilities until Sprint 2 introduces a safe, documented provisioning approach.

Automated unit/domain tests should continue using deterministic in-memory fixtures under `__tests__/`.

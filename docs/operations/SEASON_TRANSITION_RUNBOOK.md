# Season transition runbook

How Ignite should **operationally** move from one Bible Quiz season to the next.

**Status:** Planning skeleton — season automation, import tooling, and purchase integration are **future Sprint 3/4 work**.

**Sources:** [PRD](../product/PRD.md) (§§5–9, 50), [Development Playbook](../development/Ignite_Development_Playbook.md) (§§9–10, 17), [ADR-002](../architecture/decisions/ADR-002-season-isolation-and-card-identity.md), [ENVIRONMENTS.md](ENVIRONMENTS.md), [CONTENT_PUBLISHING_RUNBOOK.md](CONTENT_PUBLISHING_RUNBOOK.md), [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md).

---

## Intended transition flow

```text
Previous active season reaches configured end date
        ↓
Previous season becomes Archived
        ↓
Learning for that season becomes historical / read-only
        ↓
New Board-approved season is prepared (see CONTENT_PUBLISHING_RUNBOOK)
        ↓
Validate in DEV
        ↓
Validate in STAGING
        ↓
Configure required Apple/Google season purchase product   ← Sprint 4 (store mapping UNRESOLVED)
        ↓
Prepare production season (import + status/dates)
        ↓
Publish / activate based on configured dates and status
        ↓
Returning users complete new-season setup
        ↓
Eligible division is selected (season-scoped; may differ from prior season)
        ↓
New season is purchased (when entitlement required)
        ↓
New season becomes active learning context
```

**Routing context (playbook §10):** Archived season / no new season → historical or transition experience. Profile ready + current season not configured → season participation setup.

---

## Architecture: new season data vs new app capability

### New season data (normal case)

New season curriculum should normally be **data/configuration driven** (PRD §§5.2, 5.3):

- Season metadata (`seasonId`, name, dates, status)
- Cards, divisions, rules, tournament configuration
- Published availability and activation dates

Adding a new season should **not normally require**:

- Rewriting React Native feature code
- Submitting a new mobile binary
- Forcing users to reinstall or update the app

The **installed app** should discover a newly published season from **backend configuration** when the client’s supported **data contract has not changed**.

### New app capability (exception)

A **new mobile release** may still be required when:

- The new season requires a **new application capability** not present in the installed client
- The **data contract changes incompatibly** (schema or API the old client cannot read)
- **New native functionality** is required (platform APIs, permissions, store SDK behavior)
- A **new screen or interaction** is required that the installed client does not support

| Change type | Typical delivery |
|-------------|------------------|
| **New season data only** | Import/publish via [CONTENT_PUBLISHING_RUNBOOK.md](CONTENT_PUBLISHING_RUNBOOK.md); optional store product setup |
| **New app capability** | Mobile release through [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md) **plus** season data publish |

Document which case applies **before** each season transition.

---

## Store products (even when the binary does not change)

Each season’s **core access** is purchased once per season (PRD §9.1). Even when the mobile binary is unchanged:

- **Apple App Store Connect** and **Google Play Console** season product setup/review may still be required for the new season SKU.
- Store product IDs and mapping are **UNRESOLVED** — see [ADR Open Decisions](../architecture/decisions/README.md) (Store-product mapping).

Sprint 4 owns entitlement domain, sandbox testing, and backend access enforcement. This runbook only records the **operational dependency**: season transition planning must include store lead time.

---

## Season isolation during transition

Per ADR-002 and PRD §§3.3, 7:

- Previous-season learning state must **never** participate in current-season calculations.
- Card identity is **`seasonId + materialSetId + cardId`** — no cross-season or cross-MaterialSet progress copy.
- Overlapping Scripture references across seasons or MaterialSets are **independent curriculum entities**.

Archived seasons remain available as **historical/read-only** learning context where product rules allow; they do not become the active season automatically.

---

## Division and returning users

- Division is **season-scoped** (PRD §8). A Quizzer’s division does **not** change mid-season in V1; it may change when the **next** season is established.
- Returning users need explicit **new-season setup** (age/eligibility, division selection) per playbook §10 and Sprint 2 personas (e.g. `s2-returning-authenticated-001`).
- User-facing division name is **Experienced** (PRD §8.1). **UNRESOLVED:** exact first-year vs advanced 15–18 eligibility — do not invent additional eligibility rules ([TEST_PERSONAS.md](../testing/TEST_PERSONAS.md), ADR Open Decisions).

---

## Environment progression

Use the same DEV → STAGING → PROD discipline as content publishing:

1. **DEV** — synthetic seasons, edge cases, import validation.
2. **STAGING** — production-like season config, purchase sandbox (Sprint 4+), regression with synthetic personas.
3. **PROD** — explicit target only; real users and authoritative seasons.

See [ENVIRONMENTS.md](ENVIRONMENTS.md).

---

## Pre-transition checklist (lightweight)

- [ ] Previous season **end date** and **Archived** status configured.
- [ ] New season imported and validated per [CONTENT_PUBLISHING_RUNBOOK.md](CONTENT_PUBLISHING_RUNBOOK.md).
- [ ] Confirmed whether transition is **data-only** or requires **new app release**.
- [ ] Store products planned/submitted if Sprint 4 entitlements apply (**UNRESOLVED** SKU mapping).
- [ ] Returning-user routing and new-season setup tested on STAGING.
- [ ] No cross-season learning-state leakage in tests (ADR-002).

---

## Implementation placeholders

| Sprint | Expected work |
|--------|----------------|
| **Sprint 2** | Returning-user routing; new-season setup UX planning; age/division eligibility |
| **Sprint 3** | Season lifecycle/configuration, import tooling, active-season selection, locked content, archival behavior |
| **Sprint 4** | Season purchase products, entitlements, restore/access recovery, archived/expired season handling |
| **Sprint 11** | End-to-end season access and transition validation before MVP release |

---

## Related documents

| Document | Role |
|----------|------|
| [CONTENT_PUBLISHING_RUNBOOK.md](CONTENT_PUBLISHING_RUNBOOK.md) | Import and publish official content |
| [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md) | When a mobile release is required |
| [PRD §5](../product/PRD.md) | Season model and lifecycle |
| [Playbook §10](../development/Ignite_Development_Playbook.md) | Account lifecycle routing states |

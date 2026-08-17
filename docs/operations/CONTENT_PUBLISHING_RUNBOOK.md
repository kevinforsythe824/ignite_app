# Content publishing runbook

Intended workflow for importing and publishing **official season content** into Ignite.

**Status:** Planning skeleton — import tooling and lifecycle automation are **future Sprint 3 work**.

**Sources:** [PRD](../product/PRD.md) (§§5–7, 50), [Development Playbook](../development/Ignite_Development_Playbook.md) (§9), [ADR-002](../architecture/decisions/ADR-002-season-isolation-and-card-identity.md), [ENVIRONMENTS.md](ENVIRONMENTS.md), [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md).

Related runbooks: [SEASON_TRANSITION_RUNBOOK.md](SEASON_TRANSITION_RUNBOOK.md), [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md), [BUG_TRIAGE_RUNBOOK.md](BUG_TRIAGE_RUNBOOK.md).

---

## Canonical product decisions

- Official season content is created by the **Bible Quizzing Board**.
- The **Bible Quizzing Board committee** decides what material is authoritative for a season.
- Approved material is provided to the **Ignite developer**.
- The developer is responsible for **entering/importing** approved material into Ignite — not end users or Quizzers.
- The **MVP does not require a large admin dashboard** (PRD §50, playbook §9).
- Content should eventually use a **repeatable, validated developer/import workflow** rather than ad hoc Firestore edits.

Each season is a **new authoritative content environment**, not an update to the previous season (PRD §§3.4, 7; ADR-002).

---

## Intended lifecycle flow

```text
Bible Quizzing Board creates material
        ↓
Bible Quizzing Board committee approves authoritative material
        ↓
Developer receives approved material
        ↓
Structured import source/package          ← Sprint 3: format TBD (ADR Open Decisions)
        ↓
Schema + business-rule validation
        ↓
Dry-run import report (when tooling exists)
        ↓
DEV import (wpf-bible-qizzing)
        ↓
Developer / product review
        ↓
STAGING import (ignite-staging-01)
        ↓
Final verification (synthetic personas, Security Rules as applicable)
        ↓
PROD import (ignite-prod-01) — explicit production target only
        ↓
Published
        ↓
Active / Locked (by configured season status/dates)
```

**Environment rules:** See [ENVIRONMENTS.md](ENVIRONMENTS.md). Content is **promoted through the import workflow**, not by copying Firestore databases between projects. General seed scripts must not target Production.

**Season status alignment (PRD §5.3):** Draft → Committee Validated → Published → Active / Locked → Archived. This runbook focuses on the **import and publish** path into Firebase; committee approval happens **before** developer import.

---

## Validation (intended)

Invalid content must **fail before publication** (PRD §50). When import tooling exists, validation should eventually cover at least:

| Area | Examples |
|------|----------|
| **Card identity** | Unique card numbers within a season; season/card identity (ADR-002) |
| **Scripture** | Required reference and text |
| **Divisions** | Division assignments and requirements |
| **Annotations** | Structure and required fields |
| **Quiz metadata** | Quiz-relevant card metadata |
| **Tournament configuration** | Tournament settings when provided |
| **Rules configuration** | Season rules configuration when provided |

The tooling should produce a **readable import summary** and require an **explicit target environment**. Production import requires an **additional safeguard** beyond DEV/STAGING (playbook §9).

**UNRESOLVED:** Concrete import file/package format and toolchain — see [ADR Open Decisions](../architecture/decisions/README.md).

---

## Active / Locked immutability (MVP)

Once a season becomes **Active / Locked**, official season content is **immutable** for the active period (PRD §6, ADR-002):

- Curriculum, cards, numbering, Scripture content, annotations, quiz metadata, division requirements, tournament configuration, and related official configuration must not be modified through normal product or tooling paths.

**Do not create an ordinary “Edit Active Season” workflow for MVP.**

Ordinary users, Quizzers, and future Coaches cannot modify authoritative season content.

---

## Future fail-safe: official correction (NOT MVP)

If a **genuine official correction** is ever required during an active season:

- It must use a **tightly controlled administrative correction process** outside ordinary user functionality.
- It must preserve an **audit trail**.
- It is **not** an ordinary MVP feature (PRD §6, playbook §9).

When that process is defined, document it here as a separate subsection — do not conflate it with routine publishing.

---

## Pre-publish checklist (lightweight)

Use before each environment promotion:

- [ ] Material is **committee-approved** and matches the intended `seasonId`.
- [ ] Target environment is **explicit** (DEV → STAGING → PROD).
- [ ] Validation report shows **no blocking errors**.
- [ ] Synthetic review uses [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) where applicable.
- [ ] `firestore.rules` in git is reconciled before any rules deploy ([ENVIRONMENTS.md](ENVIRONMENTS.md)).
- [ ] Production step is **intentional** — not CLI default, not seed script.

---

## Implementation placeholders

| Sprint | Expected work |
|--------|----------------|
| **Sprint 3** | Import/validation tooling, season lifecycle configuration, locked-content enforcement, staging-before-production publishing process, synthetic season fixtures |
| **Sprint 4+** | Entitlement-gated access to published seasons (purchase before full access) |
| **Post-MVP** | Controlled in-season correction workflow (if ever required) |

---

## Related documents

| Document | Role |
|----------|------|
| [PRD §50](../product/PRD.md) | Content import requirements |
| [Playbook §9](../development/Ignite_Development_Playbook.md) | Recommended import workflow |
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | DEV / STAGING / PROD promotion rules |
| [SEASON_TRANSITION_RUNBOOK.md](SEASON_TRANSITION_RUNBOOK.md) | Moving from one season to the next |

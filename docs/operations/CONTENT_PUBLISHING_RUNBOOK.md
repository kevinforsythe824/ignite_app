# Content publishing runbook

Intended workflow for importing and publishing **official season content** into Ignite.

**Status:** Planning skeleton — Phase 0 documents the settled authoring → generate → validate → promote contract. Spreadsheet schema, converters, import CLI, and lifecycle automation remain **Sprint 3 Phase 2** (after Phase 1 domain contracts).

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

Each season has **five independent division MaterialSets** (Cadet, Beginner, Junior, Intermediate, Experienced). Do **not** assume one MaterialSet is a subset of another (PRD §§12.3, 37; ADR-002).

### Authoring source vs generated package (settled direction)

Ignite’s official season material uses a **controlled deterministic content pipeline**:

| Role | What it is |
|------|------------|
| **Authoritative human-maintained authoring source** | Standardized, human-readable **spreadsheet/template** per division MaterialSet |
| **App-ready JSON / content package** | **Generated artifact** — derived output, not a manually maintained authoritative source |

**Corrections** should normally be made in the authoritative spreadsheet/template and **regenerated**, not by manually patching generated JSON or Firebase.

**Determinism:** the same validated source input should produce the same logical generated output.

**Provenance:** the generated package should ultimately carry a stable package identity / fingerprint / hash (or equivalent) so Ignite can confirm that the exact package tested and approved in DEV/STAGING is the package promoted to PROD. Exact hashing/algorithm design is **not** Phase 0 work.

**AI:** may assist humans in preparation outside the authoritative pipeline if intentionally used later, but AI must **not** be responsible for authoritative Scripture conversion, interpretation, validation, or publishing.

Exact spreadsheet columns, workbook format, JSON schema, CLI commands, package layout, and hashing implementation remain **Phase 2** design work (after Phase 1 domain contracts). See [ADR Open Decisions](../architecture/decisions/README.md).

---

## Intended lifecycle flow

```text
Committee-approved material
        ↓
Standardized MaterialSet authoring spreadsheets/templates
        ↓
Human content review
        ↓
Automated schema / business validation
        ↓
Deterministic app-ready package / JSON generation
        ↓
Generated-package validation and source reconciliation
        ↓
Dry-run import (when tooling exists)
        ↓
DEV import and QA (wpf-bible-qizzing)
        ↓
Promote the exact validated package to STAGING (ignite-staging-01)
        ↓
Committee / product approval
        ↓
Publish the same approved package to PROD (ignite-prod-01) — explicit production target only
        ↓
Active / Locked MaterialSets (by configured season status/dates)
```

**Environment rules:** See [ENVIRONMENTS.md](ENVIRONMENTS.md). Content is **promoted through the import workflow** as the **exact validated package**, not by copying Firestore databases between projects. General seed scripts must not target Production.

**Season status alignment (PRD §5.3):** Draft → Committee Validated → Published → Active / Locked → Archived. This runbook focuses on the **import and publish** path into Firebase; committee approval of material happens **before** developer import; committee/product approval of the validated package happens before PROD publish.

---

## Validation (intended)

Invalid content must **fail before publication** (PRD §50). When import tooling exists, validation should eventually cover at least:

| Area | Examples |
|------|----------|
| **Card identity** | Unique card numbers within a MaterialSet; identity is `seasonId + materialSetId + cardId` (ADR-002) |
| **Scripture** | Required reference and text |
| **Divisions** | Division assignments and requirements |
| **Annotations** | Structure and required fields |
| **Quiz metadata** | Quiz-relevant card metadata |
| **Tournament configuration** | Tournament settings when provided |
| **Rules configuration** | Season rules configuration when provided |

The tooling should produce a **readable import summary** and require an **explicit target environment**. Production import requires an **additional safeguard** beyond DEV/STAGING (playbook §9).

**Phase ownership (Sprint 3):** Phase 0 documents this contract only. **Phase 1 — Domain Model & Business Rules** establishes the domain/content contracts imported material must satisfy. **Phase 2 — Official Content Persistence, Import & Validation** owns spreadsheet/schema design, source validation, deterministic conversion, generated package schema, reconciliation, readable reports, dry-run, DEV import, package provenance/fingerprinting, STAGING promotion foundations, and production safeguards. Do not move those implementations into Phase 0. Later final integration/security verification should confirm production controls before release.

Exact columns/schema/CLI remain open for Phase 2 — see [ADR Open Decisions](../architecture/decisions/README.md).

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
- [ ] Promotion uses the **exact validated package** (same provenance/fingerprint when tooling exists) — not a divergent rebuild or Firestore copy.
- [ ] Validation report shows **no blocking errors**.
- [ ] Synthetic review uses [TEST_PERSONAS.md](../testing/TEST_PERSONAS.md) where applicable.
- [ ] `firestore.rules` in git is reconciled before any rules deploy ([ENVIRONMENTS.md](ENVIRONMENTS.md)).
- [ ] Production step is **intentional** — not CLI default, not seed script.

---

## Implementation placeholders

| Sprint / phase | Expected work |
|----------------|----------------|
| **Sprint 3 Phase 0** | Documentation / contract only (this runbook + playbook alignment) — no spreadsheet, schema, converter, or import implementation |
| **Sprint 3 Phase 1** | Domain model & business rules — content contracts imported material must satisfy |
| **Sprint 3 Phase 2** | Spreadsheet/template authoring source, validation, deterministic generation, package provenance, dry-run/DEV import, STAGING promotion foundations, production safeguards |
| **Sprint 3 (broader)** | Season lifecycle configuration, locked-content enforcement, synthetic season fixtures |
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

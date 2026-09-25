# Content publishing runbook

Intended workflow for importing and publishing **official season content** into Ignite.

**Status:** Phase 2A.1 complete for authoring → validate → deterministic package. Phase 2A.2 can print an offline Firestore plan and a DEV-only read-only diff from a validated package ([ADR-014](../architecture/decisions/ADR-014-package-import-planning-and-dev-diff.md)). Slice 4B adds DEV apply tooling that runs only after the draft, environment, named-app, and confirmation gates. The first live DEV apply has not been performed (Slice 4C human checkpoint). STAGING promotion and production publish are not implemented. Official committee source mapping remains **Phase 2B**.

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

**Provenance:** the generated package carries a SHA-256 fingerprint of canonical `content.json` (sorted keys, stable array order). `manifest.json` may include `generatedAt`; that timestamp must not change the fingerprint. See [ADR-013](../architecture/decisions/ADR-013-content-package-and-authoring-source-boundary.md).

**AI:** may assist humans in preparation outside the authoritative pipeline if intentionally used later, but AI must **not** be responsible for authoritative Scripture conversion, interpretation, validation, or publishing.

### Phase 2A.1 implemented contract

Human workflow (no Google Sheets API, no credentials, no network):

```text
Ignite standardized workbook template
        ↓
Google Sheets or compatible spreadsheet editor
        ↓
Export / download as .xlsx
        ↓
Local Ignite content tooling
        ↓
Source validation → IR → package validation → reconciliation
        ↓
content/packages/{seasonId}/{content,manifest,validation-report}.json
```

| Piece | Location |
|-------|----------|
| Tooling | [`scripts/content-pipeline/`](../../scripts/content-pipeline/) |
| Template | [`content/authoring/templates/ignite-materialset-workbook-v1.xlsx`](../../content/authoring/templates/ignite-materialset-workbook-v1.xlsx) |
| Synthetic DEV workbooks | [`content/authoring/synthetic/`](../../content/authoring/synthetic/) — **NOT official material** |
| Authoring guide | [`content/authoring/README.md`](../../content/authoring/README.md) |

Workbook sheets: `README`, `Package`, `MaterialSet`, `Sections`, `Cards`, `Annotations`, `QuizMetadata`, `CrossReferences`.

Developer commands: `npm run content:validate-source`, `content:generate-package`, `content:validate-package`. These never write Firebase and have no STAGING/PROD publish path.

Identifier policy (synthetic/DEV): humans enter season/material/division identity, card numbers, Scripture, section slugs, and annotation targeting. `cardId` is optional and otherwise derived as `c{cardNumber}`. `annotationId` is derived. Official ID mapping is Phase 2B.

Annotation targeting (provisional): Phase 2A.1 supports `phraseOccurrence`. `occurrenceIndex` is optional when the exact phrase occurs once in the verse. If the phrase occurs more than once, enter the 1-based occurrence number that identifies the intended match. The pipeline does not guess among repeated phrases. Unresolved or ambiguous targets fail. Official committee mapping is Phase 2B.

`scripts/firestore-seed/` is unchanged and is not a publisher.

### Phase 2A.2 Slice 3 — plan and DEV read-only diff

The importer reads `content/packages/{seasonId}/` only. It does not parse workbooks.

```text
npm run content:import -- --package content/packages/{seasonId}
npm run content:import:plan -- --package content/packages/{seasonId}
npm run content:import:diff -- --package content/packages/{seasonId}
```

`content:import` and `content:import:plan` print an offline plan. They do not access Firebase and do not classify documents as creates, updates, or deletes.

`content:import:diff` is a DEV read-only dry run. It refuses a missing environment, staging, production, a missing project id, and any project other than the configured DEV project before it reads. It may then read `seasons/{seasonId}` and nested material set, section, and card documents. It does not write.

DEV apply tooling exists after those gates plus a draft-only check, a fresh diff, and confirmation of the DEV project. The live CLI refuses to run when `FIRESTORE_EMULATOR_HOST` is set. Emulator tests call the writer in-process. The first live DEV apply has **not** been performed. That command is the Slice 4C manual checkpoint, not a step to run as part of this slice:

```text
npm run content:import -- --package content/packages/{seasonId} --apply --confirm-dev wpf-bible-qizzing
```

Do not run that command until the Slice 4C human checkpoint. STAGING and PROD import are unsupported.

Local authoring workbooks under `content/authoring/local/` are intentionally not committed. Generated real-season packages under `content/packages/` (other than the tracked synthetic `dev-synthetic-s3` fixture) are local derived artifacts during this phase. Templates and synthetic fixtures stay in version control. The spreadsheet remains the human source; the generated package remains derived. Official promotion and version-control policy for production content is still a later decision. STAGING and PROD publishing are not implemented.

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
Dry-run import (offline plan and DEV read-only diff — the dry run does not write)
        ↓
DEV import and QA (wpf-bible-qizzing) — tooling exists; first live DEV apply not yet performed
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

**Phase ownership (Sprint 3):** Phase 0 documented the contract. Phase 1 established domain contracts. **Phase 2A.1** implemented workbook schema, source validation, deterministic conversion, generated package schema, reconciliation, readable reports, and SHA-256 fingerprinting against synthetic DEV material. **Phase 2A.2 Slice 3** implemented the offline plan and DEV read-only diff (ADR-014). **Slice 4A** added the draft-only safety checks and an in-memory replacement model. **Slice 4B** implements the DEV apply writer behind those gates. The first live DEV apply has not been performed. Repository cutover and seed replacement are not implemented. **Phase 2B** owns official committee source mapping. STAGING promotion foundations and production safeguards remain later. See [ADR Open Decisions](../architecture/decisions/README.md).

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
| **Sprint 3 Phase 2A.1** | Spreadsheet/template authoring source, validation, deterministic generation, package provenance/fingerprinting (complete) |
| **Sprint 3 Phase 2A.2** | Offline plan and DEV read-only diff (Slice 3). Slice 4A safety and in-memory apply model. Slice 4B DEV apply tooling after the gates. The first live DEV apply is the Slice 4C human checkpoint and has not been performed. Repository cutover and seed replacement are not implemented |
| **Sprint 3 Phase 2B** | Official committee source mapping and official annotation targeting |
| **Sprint 3 (broader)** | Season lifecycle configuration, locked-content enforcement, synthetic season fixtures |
| **Sprint 4+** | Entitlement-gated access to published seasons (purchase before full access) |
| **Post-MVP** | Controlled in-season correction workflow (if ever required) |

---

## Related documents

| Document | Role |
|----------|------|
| [PRD §50](../product/PRD.md) | Content import requirements |
| [ADR-013](../architecture/decisions/ADR-013-content-package-and-authoring-source-boundary.md) | Authoring source vs generated package boundary |
| [ADR-014](../architecture/decisions/ADR-014-package-import-planning-and-dev-diff.md) | Package import planning and DEV read-only diff |
| [Playbook §9](../development/Ignite_Development_Playbook.md) | Recommended import workflow |
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | DEV / STAGING / PROD promotion rules |
| [SEASON_TRANSITION_RUNBOOK.md](SEASON_TRANSITION_RUNBOOK.md) | Moving from one season to the next |

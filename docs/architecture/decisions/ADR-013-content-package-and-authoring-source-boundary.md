# ADR-013: Content package and authoring-source boundary

- **Status:** Accepted
- **Date:** 2026-09-18
- **Related PRD:** §§5–7, 12, 12.3, 37, 49–50, 63
- **Related:** ADR-001, ADR-002; [`CONTENT_PUBLISHING_RUNBOOK.md`](../../operations/CONTENT_PUBLISHING_RUNBOOK.md)

## Context

Sprint 3 needs a trusted path from human-maintained season material to an app-ready artifact. Phase 0 settled the direction (spreadsheet authoring source → generated package) but left schema, toolchain, and hashing open. Phase 1 established Season / MaterialSet / CurriculumSection / Card identity. Phase 2A.1 must produce a Firebase-independent package that later import work can persist without treating generated JSON or Firestore as the authoring source.

Official committee source-file mapping is not finalized.

## Decision

- The **authoritative human-maintained authoring source** for each independent division MaterialSet is a versioned Ignite workbook (`.xlsx`) maintained in Google Sheets or a compatible editor and exported locally. Ignite does not call the Google Sheets API.
- The **generated content package** is a derived artifact:

  ```text
  content/packages/{seasonId}/
    content.json            # canonical logical content (fingerprint input)
    manifest.json           # provenance, including generatedAt
    validation-report.json
  ```

- A Firebase-independent **content IR** sits between parse and package. Spreadsheet row shapes are tooling types only — they are not application domain types and are not persisted.
- **Card identity** remains `seasonId + materialSetId + cardId` (`makeCardKey`). Package annotations are structured records with an extensible source-target abstraction. They are not forced into Flashcard `matchedRules`.
- **Determinism:** equivalent validated source produces equivalent canonical `content.json`. Fingerprint is SHA-256 over canonical JSON (sorted keys; arrays already in authoritative/stable order). Timestamps, usernames, local paths, and execution metadata are excluded from the hash. `generatedAt` may appear on the manifest only.
- **Fail-closed validation** covers source workbooks, generated packages (reusing Phase 1 section invariants), and source-to-package reconciliation. The pipeline does not silently repair authoritative source.
- Phase 2A.1 identifier and annotation-target rules are a **stable synthetic/DEV policy**. Official committee ID policy and official annotation-source mapping remain **open for Phase 2B**. Adding a later mapping strategy must not require redesigning Card identity, package ownership, Firestore Card ownership, or presentation architecture.

## Rationale

A durable authoring-source vs generated-package boundary keeps corrections in human-readable workbooks, makes DEV→STAGING→PROD promotion of an exact package possible, and keeps Firebase out of content authoring. Leaving official mapping explicitly open prevents a synthetic phrase-occurrence strategy from becoming an accidental permanent contract.

## Consequences

- Developers run local/CI scripts (`content:validate-source`, `content:generate-package`, `content:validate-package`) with no Google or Firebase credentials.
- `scripts/firestore-seed/` remains a test-curriculum importer, not a publisher.
- Phase 2A.2 Slice 3 plans and diffs a validated package (ADR-014). It must not invent a second authoring source, and it does not write to Firebase.
- Official WPF/Board file mapping, production import, and Flashcard presentation of package annotations are out of scope here.

## Alternatives considered

- Treat generated JSON as the maintained source — rejected; corrections would drift from the human workbook.
- Put spreadsheet row types in `src/features/flashcards` — rejected; tooling must not leak into the application domain.
- Make `phrase + occurrenceIndex` the permanent official contract — rejected; it is a Phase 2A.1 synthetic strategy only.
- Google Sheets API as the runtime source — rejected; local `.xlsx` export keeps CI and laptops credential-free.

## Open for Phase 2B

- Official committee content-source mapping and identifier policy
- Official annotation types and targeting strategies beyond the synthetic `phraseOccurrence` strategy
- DEV apply/replacement and repository cutover remain later Phase 2A.2 slices (ADR-014). Official mapping stays Phase 2B.

## Amendment (2026-10-02) — live test-season writer retired

The consequence that `scripts/firestore-seed/` remains a test-curriculum importer described the live writer that stored `seasons/test-season`. That writer is retired and exits before Firebase initialization. Local fixture helpers in that folder may still build in-memory test documents. Live curriculum writes use the content import workflow. Current procedure is in [`ENVIRONMENTS.md`](../../operations/ENVIRONMENTS.md) and [`CONTENT_PUBLISHING_RUNBOOK.md`](../../operations/CONTENT_PUBLISHING_RUNBOOK.md). The decision above is otherwise unchanged.

## Amendment (2026-10-24) — sponsor workbooks are authoritative for official curriculum

The 2026-09-18 decision remains the historical record of the Ignite workbook, package, fingerprint, and importer boundary. Synthetic and other Ignite-shaped workbooks still use that path. For official curriculum, the source-of-truth sentence in that decision is superseded as follows. Slice A does not change package schema, annotation mapping, or DEV contents.

1. Sponsor Excel workbooks are authoritative for official curriculum.
2. An Ignite authoring-shaped representation may be generated from those workbooks. It is not a second manually maintained source.
3. Package generation, validation, fingerprints, and the importer boundary stay as decided above.
4. The Cadet workbook is a separate sponsor file and is still pending. Slice A does not invent Cadet cards.
5. Intermediate and Experienced stay distinct MaterialSets produced from the one Senior sponsor workbook.
6. Annotation conversion and content schema 1.1.0 are later slices. Slice A only reads Verse List rows into sponsor source data.
7. Replacing DEV curriculum is not authorized in Slice A.

## Amendment (2026-10-24) — content schema 1.1.0

Slice B applies the schema split. Synthetic Ignite workbooks still convert at schema `1.0.0` (`CONTENT_SCHEMA_VERSION`). Official sponsor mapping writes schema `1.1.0` (`OFFICIAL_CONTENT_SCHEMA_VERSION`). Both versions validate. An unknown version fails closed.

Optional `studyContext` stores battlefield, topic, and thematic question. A blank sponsor cell is omitted. Thematic questions are study metadata, not quiz hints. Battlefield keeps the sponsor cell's number or text. `frequencyTier` is required on `frequency` annotations in a `1.1.0` package and must be 1, 2, 3, 4, or 5. Schema `1.0.0` frequency annotations stay valid without a tier. Other annotation types do not receive a tier.

This slice does not generate official annotations. Official cards carry an empty annotations array until annotation generation. A four-MaterialSet draft is not a complete season package. The importer still requires every official division, so that draft is not applied. Cadet remains absent until its workbook exists.

## Amendment (2026-10-27) — Cadet is part of the official 2027 draft

The 2026-10-24 sentence that Cadet remains absent is superseded. The received Cadet workbook is an entry in the official 2027 sponsor profile, ordered Cadet, Beginner, Junior, then Senior. Senior is still one workbook read and still produces the Intermediate and Experienced MaterialSets. The generated draft therefore contains five MaterialSets and stays `draft`.

A package that passes structural validation, manifest checks, and fingerprint verification is still not authorization to import, activate, publish, or replace Firebase content. An intentionally incomplete package that omits an official division still fails the default validator. This amendment does not change package schema, annotation targeting, or the importer authorization gates.

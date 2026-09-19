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
- Phase 2A.2 may persist/import a validated package later; it must not invent a second authoring source.
- Official WPF/Board file mapping, production import, and Flashcard presentation of package annotations are out of scope here.

## Alternatives considered

- Treat generated JSON as the maintained source — rejected; corrections would drift from the human workbook.
- Put spreadsheet row types in `src/features/flashcards` — rejected; tooling must not leak into the application domain.
- Make `phrase + occurrenceIndex` the permanent official contract — rejected; it is a Phase 2A.1 synthetic strategy only.
- Google Sheets API as the runtime source — rejected; local `.xlsx` export keeps CI and laptops credential-free.

## Open for Phase 2B

- Official committee content-source mapping and identifier policy
- Official annotation types and targeting strategies beyond the synthetic `phraseOccurrence` strategy
- Dry-run / DEV importer and seed replacement (Phase 2A.2)

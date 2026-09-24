# ADR-014: Package import planning and DEV read-only diff

- **Status:** Accepted
- **Date:** 2026-09-24
- **Related PRD:** §§5–7, 12, 27–28, 37, 49–50
- **Related:** ADR-001, ADR-002, ADR-013; [`CONTENT_PUBLISHING_RUNBOOK.md`](../../operations/CONTENT_PUBLISHING_RUNBOOK.md)

## Context

Phase 2A.1 produces a validated content package from human-maintained workbooks. Persistence still needs a target shape, a way to preview that shape without Firebase, and a way to compare it with DEV without writing. Official committee annotation mapping is still open. STAGING and PROD publishing are still later work.

## Decision

- Workbooks remain the human source. The importer reads only a generated package at `content/packages/{seasonId}/`. It does not parse workbooks, reinterpret spreadsheets, or define a second package schema.
- The Firestore target for one season is nested curriculum, with package fields in camelCase:

  ```text
  seasons/{seasonId}
    materialSets/{materialSetId}
      sections/{sectionId}
      cards/{cardId}
  ```

- Card identity stays `seasonId + materialSetId + cardId`. Scripture reference is stored data, not identity. Shared verse text across divisions stays on separate card documents.
- Annotations are embedded on the owning card document. They are not a separate collection. Official annotation mapping remains Phase 2B.
- Provenance lives on the season document only. It records schema, source version, fingerprint, converter version, importer version, environment, import time, and import status. It is not part of card identity. The offline plan uses deterministic placeholders for values that exist only at import time.
- Slice 3 has two non-writing modes. The offline plan validates the package and prints the expected tree and counts. It does not access Firebase and does not classify creates, updates, or deletes. The DEV-aware diff may read `seasons/{seasonId}` and its material set, section, and card documents only after a DEV environment gate. That gate uses the Ignite environment and configured project id. It does not trust the Firebase CLI alias. Staging, production, a missing environment, a missing project id, and any project other than the configured DEV project fail before a reader is opened.
- A matching provenance fingerprint is not proof the tree is intact. The diff still compares authoritative curriculum fields. Operational timestamps are ignored.
- Slice 3 performs zero writes. Draft-only DEV apply and replacement, including removal of stale curriculum documents, belong to a later slice. `scripts/firestore-seed/` stays fixture and test infrastructure, not the publisher.
- STAGING and PROD import are unsupported.

## Rationale

Planning from the generated package keeps authoring, validation, and persistence separate. A read-only DEV diff can show drift, including drift under a matching fingerprint, before any write tool exists. Keeping the reader behind an interface lets the diff and the environment gate be tested without a live project.

## Consequences

- `scripts/content-import/` plans and diffs. Slice 4A models draft-only replacement in memory. It still has no Firestore write API, and live DEV apply stays disabled until Slice 4B.
- Domain types stay independent of Firestore documents. This ADR does not cut the curriculum repository over to nested paths.
- Firestore rules, Study Hub, entitlement checks, and Phase 2B annotation mapping are unchanged.
- Slice 4A owns the draft-only apply model. Nothing in this workflow writes season content until Slice 4B.

## Alternatives considered

- Extend `scripts/firestore-seed/` into the publisher — rejected; seed remains fixture infrastructure.
- Treat a matching fingerprint as “already installed” without reading the tree — rejected; hand-edited DEV documents would be invisible.
- Parse workbooks inside the importer — rejected; package validation already consumed the workbook boundary in ADR-013.

## Slice 4A (2026-09-24)

- The CLI is strict. Recognized flags are `--package`, `--dev-diff`, `--apply`, and `--confirm-dev`. Unknown flags, `--flag=value`, stray arguments, duplicate flags, and a confirmation token other than the configured DEV project id fail in the parser. Default mode remains the offline plan. `--dev-diff` remains read-only.
- A draft-only gate exists. The package status must be `draft`. A missing installed season is eligible. An installed season is eligible only while its status is `draft`. The gate does not publish or transition a season, and it does not modify the package.
- Admin access for a later writer uses a named app, `ignite-content-import`. It must not reuse the default app. A project-id mismatch on that named app fails before a reader or writer is used. The reader stays read-only.
- Serialization is the contract Slice 4B will persist: authored dates stay strings, array order is preserved, absent optional fields stay omitted, and unexpected nulls and non-plain values are rejected. Fingerprint remains the primary installed-package identity and stays visible in the diff outcome. `schemaVersion` and `sourceVersion` participate in season equality. `environment`, `importedAt`, `importStatus`, `importerVersion`, and `converterVersion` do not by themselves classify a curriculum UPDATE.
- Write orchestration is modeled and tested against an in-memory port: season `importing`, then material set, section, and card upserts for creates and updates, then stale card, section, and material set removal, then season `complete`. Unchanged curriculum documents are not rewritten. A failed write does not record `complete`.
- Real DEV write capability is not enabled. A syntactically valid apply request fails closed with `DEV apply is not enabled until Slice 4B` and does not open a reader or writer.
- Slice 4B will implement Firestore writes and emulator validation. STAGING and PROD remain unsupported.
- A missing MaterialSet parent with orphaned subcollections cannot be discovered by the existing reader. Collection-group and recursive scans are deferred and are not part of this slice.

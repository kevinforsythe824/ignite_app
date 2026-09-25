# ADR-015: Curriculum client security boundary

- **Status:** Accepted
- **Date:** 2026-09-24
- **Related PRD:** §§5–7, 12, 27–28, 37, 43, 49–50
- **Related:** ADR-001, ADR-002, ADR-007, ADR-013, ADR-014; [`ENVIRONMENTS.md`](../../operations/ENVIRONMENTS.md)

## Context

Official curriculum lives under `seasons/{seasonId}` and, after the package import shape in ADR-014, under nested MaterialSet, Section, and Card documents. Client Firestore rules previously allowed public reads of a Season and its legacy flat cards, and denied client writes.

Sprint 3 Slice 5 needs a durable client boundary before nested curriculum is the read path. Entitlement, season publication status, and MaterialSet selection are not settled as Rules checks in this slice. User-owned participation and learning data are a different collection boundary and are not part of official curriculum.

## Decision

- Known official curriculum paths require an authenticated client read. `canReadCurriculum()` is `isSignedIn()` only.
- Those paths are:
  - `seasons/{seasonId}`
  - `seasons/{seasonId}/materialSets/{materialSetId}`
  - `seasons/{seasonId}/materialSets/{materialSetId}/sections/{sectionId}`
  - `seasons/{seasonId}/materialSets/{materialSetId}/cards/{cardId}`
  - transitional `seasons/{seasonId}/cards/{cardId}`
- All normal client curriculum writes are denied (`allow write: if false`) on each of those paths.
- Admin content tooling uses the Admin SDK and bypasses Firestore client Rules. Import does not deploy Rules, and Rules deployment is a separate operational action.
- MaterialSet selection is not enforced in Rules during Sprint 3. A signed-in client may read every MaterialSet under a Season.
- Entitlement checks are deferred to Sprint 4. Rules do not inspect purchases, claims, or roles.
- Season publication and status checks are not enforced in Slice 5. A signed-in client may read a Season document regardless of `status`.
- Rules use explicit nested matches. There is no recursive `/{document=**}` wildcard under `seasons`.
- Unknown or future Season paths fail closed. A path such as `seasons/{seasonId}/foo/{documentId}` is denied for read and write.
- Embedded card annotations have no separate collection or rules. They travel with the nested Card document.
- User-owned participation and learning data remain a separate security boundary. This decision does not add `users/{userId}/seasons/...` rules.
- Legacy flat Card access remains temporarily so the current Study path can keep reading `seasons/{seasonId}/cards/{cardId}` until Slice 6. The same authenticated-read, write-denied policy applies. Slice 6 owns removal.
- The same `firestore.rules` file is the source of truth for DEV, STAGING, and PROD. Rules do not branch on project ID.

### Draft curriculum in PROD (guardrail)

Allowing any authenticated client to read curriculum, including documents whose season status is still draft, is a Sprint 3 and DEV-compatible posture. It is not a publication policy.

**Publication/status enforcement must be revisited before draft curriculum is made available in PROD.** This ADR does not define that future policy.

## Rationale

The app reaches Study, the only runtime curriculum reader, only after Firebase Authentication is established. Signed-out entry, auth, consent, and profile screens do not read Season or Card documents. Public curriculum reads are therefore unnecessary.

Explicit matches keep future Season subcollections denied until a later ADR names them. Leaving writes denied keeps official content on the Admin import path from ADR-014.

## Consequences

- Signed-out clients cannot read or write official curriculum.
- Signed-in clients can read known curriculum paths, including a second MaterialSet and the transitional flat Card path, and cannot mutate them.
- Deploying these rules is a manual environment action. This slice does not deploy them.
- Slice 6 may remove the legacy flat Card match after the runtime repository reads nested cards.
- Sprint 4 entitlement work and a later publication/status decision must not assume this read posture is final for PROD drafts.

## Alternatives considered

- Keep public curriculum reads — rejected; no signed-out runtime flow needs them.
- Recursive Season wildcard — rejected; unknown paths must fail closed.
- Encode entitlement, division, or season status in this slice — rejected; those policies are not decided here, and a guessed rule would be hard to unwind.

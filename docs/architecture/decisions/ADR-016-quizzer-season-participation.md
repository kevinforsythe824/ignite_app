# ADR-016: QuizzerSeasonParticipation create-only persistence

- **Status:** Accepted
- **Date:** 2026-09-30
- **Related PRD:** §§8, 11, 36, 43–44
- **Related:** ADR-001, ADR-002, ADR-006, ADR-007, ADR-015; [`PARTICIPATION_CORRECTION_RUNBOOK.md`](../../operations/PARTICIPATION_CORRECTION_RUNBOOK.md)

## Context

Season participation is user-owned and season-scoped. It is not part of QuizzerProfile and it is not official curriculum. Eligibility needs a January 1 age and, for ages 15–18, a first-year answer, but those inputs must not be stored. Firestore Rules cannot enforce the eligibility matrix without storing the age. A client that can write `divisionId` could store a placement the matrix does not allow.

The participation document path is already fixed by the PRD: `users/{userId}/seasons/{seasonId}`. That document is the participation record.

## Decision

- The participation record lives at `users/{userId}/seasons/{seasonId}`. There is no `participation/main` child document.
- A ready competitive record stores `quizzerId`, `seasonId`, `regionId`, `readiness: 'ready'`, `participationType: 'competitive'`, and `divisionId`.
- A ready Study Track record stores `quizzerId`, `seasonId`, `regionId`, `readiness: 'ready'`, `participationType: 'studyTrack'`, and `studyTrackMaterialSetId`.
- `quizzerId` must equal the path uid. `seasonId` must equal the path id. The opposite placement field is absent.
- Date of birth, eligibility age, first-year status, and wizard progress are not fields of the record.
- Normal clients may read their own document. Client create, update, and delete are denied.
- Another user cannot read or write the document. Signed-out access is denied.
- Creation is a callable, `createQuizzerSeasonParticipation`. The uid comes from `request.auth`. The callable recomputes eligibility with the existing `resolveParticipationOptions` module, checks the current Season, MaterialSet, and active Region, and writes through the Admin SDK.
- The callable is create-only. A valid existing record is returned unchanged. A malformed existing record is not overwritten.
- There is one eligibility source. Functions compile the pure season domain modules from `src/features/season/domain` into the functions output. The matrix is not copied into `functions/src`.
- `functions/tsconfig.json` sets `rootDir` to the repository root so those pure files typecheck and emit under `functions/lib` without a second package. `functions/package.json` `main` is `lib/functions/src/index.js`.
- DEV composition may inject `DEV_SEASON_SELECTION_POLICY`. STAGING and PROD inject `RELEASE_SEASON_SELECTION_POLICY`. `resolveCurrentSeason` does not read the environment.
- The callable receives an injected `YYYY-MM-DD`. It does not accept a client clock, client date, or client timezone. The canonical Ignite Season timezone is `America/Chicago`, and it does not vary by environment. That zone converts the current instant into the date passed to `resolveCurrentSeason`. `igniteAvailabilityDate` stays date-only: October 1 means October 1 in America/Chicago, including daylight-saving transitions from the IANA zone. `resolveCurrentSeason` does not import a timezone. Tournament local time is outside this decision and should later use the tournament's local timezone.
- Official regions live at `seasons/{seasonId}/regions/{regionId}` and are checked as a whole catalog against `OFFICIAL_REGIONS` before a `regionId` is trusted.
- A trusted correction process is required before public launch. This decision does not build that tool. See the participation correction runbook.
- Account deletion must remove `users/{uid}/seasons/{seasonId}` with the account. Official region documents are not account-owned.

## Rationale

Rules-only writes would either store eligibility inputs or accept a client-supplied division. The callable keeps one tested matrix, stores only the placement result, and leaves correction to an authorized server path. Sharing the domain files by compilation avoids a second copy that can drift. Changing `rootDir` is smaller than adding a bundler dependency or a workspace.

## Consequences

- Season Setup (Phase 3C) submits eligibility inputs and does not write Firestore itself.
- Lifecycle and Study cutover (Phase 3D) read participation through the repository. A missing document is setup-required. A malformed document is an error, not an empty Study target.
- Deploying the callable or the rules is a separate operational action. This decision does not deploy them.
- Season calendar boundaries use `America/Chicago` as application configuration. Season documents do not store a timezone. An invalid instant fails closed. Deploying the callable or the rules remains a separate operational action.
- Future progress collections under the participation document stay denied until a later rule names them.

## Alternatives considered

- Client writes plus Rules shape checks — rejected; a tampered client could store Experienced.
- Copy the eligibility matrix into `functions/src` — rejected; the two copies would drift.
- Store age or first-year status so Rules can recompute — rejected; those inputs are not persisted.
- `users/{uid}/seasons/{seasonId}/participation/main` — rejected; the PRD path is the participation document itself.

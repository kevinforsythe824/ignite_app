# ADR-016: QuizzerSeasonParticipation create-only persistence

- **Status:** Accepted (clarified 2026-10-13)
- **Date:** 2026-09-30
- **Clarified:** 2026-10-13
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
- Lifecycle and Study cutover (Phase 3D) are now in the client. After profile readiness, the app resolves the current Season with `resolveAppCurrentSeason`, reads this Quizzer's participation for that Season only, and resolves one Study target. A missing document is Season Setup. A malformed document is an error, not an empty Study target. Study calls `getCurriculum` with that target. The client does not write participation during hydration. Entitlement stays dormant until Sprint 4.
- Deploying the callable or the rules is a separate operational action. This decision does not deploy them.
- Season calendar boundaries use `America/Chicago` as application configuration. Season documents do not store a timezone. An invalid instant fails closed. Deploying the callable or the rules remains a separate operational action.
- Future progress collections under the participation document stay denied until a later rule names them.

## Alternatives considered

- Client writes plus Rules shape checks — rejected; a tampered client could store Experienced.
- Copy the eligibility matrix into `functions/src` — rejected; the two copies would drift.
- Store age or first-year status so Rules can recompute — rejected; those inputs are not persisted.
- `users/{uid}/seasons/{seasonId}/participation/main` — rejected; the PRD path is the participation document itself.

## Clarification (2026-10-13) — official eligibility matrix

The 2026-09-30 decision remains in force. Creation stays create-only. Date of birth, eligibility age, and first-year status stay off the stored record. Client writes stay denied. The Cloud Function and the client keep using one shared `resolveParticipationOptions` module. This note does not replace that rationale.

This ADR did not freeze a division matrix. The working eligibility bands then recorded in the PRD are superseded by PRD §8.2. Those earlier bands included ages 2–4 as Cadet or Beginner only, ages 5–8 as Beginner only, ages 12–14 as Intermediate only, and ages 15–18 first-year as Intermediate only.

Current policy:

- The shared resolver implements the official January 1 matrix in PRD §8.2. It is the eligibility source of truth. The matrix is not copied into `functions/src`.
- First-year means first time ever participating in Bible Quizzing. It is required only for ages 15–18. First-year Yes is a real division choice between Intermediate and Experienced. Neither is auto-selected, so the create request includes `divisionId`. First-year No derives Experienced, so the client omits `divisionId`.
- Several allowed divisions: the request includes the selected `divisionId`. One allowed division: the client omits `divisionId` and the server derives it.
- Request fields are not persisted fields. A valid existing record is returned unchanged.
- Intermediate and Experienced stay separate MaterialSets even though the sponsor confirmed they use the same official Scripture and questions. This clarification adds no sync or sharing requirement.
- Current MVP implementation assumes a minimum competitive eligibility age of 2, pending explicit sponsor confirmation. That assumption is not a newly confirmed official minimum.

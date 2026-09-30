# Participation correction runbook

Foundation for correcting a QuizzerSeasonParticipation record after it has been created. **This document does not implement a correction tool.**

**Status:** Required before public production launch. Phase 3 does not ship the tool, a Settings editor, or a client update path.

**Sources:** [ADR-016](../architecture/decisions/ADR-016-quizzer-season-participation.md), [PRD](../product/PRD.md) §§8, 43, [ACCOUNT_DELETION_RUNBOOK.md](ACCOUNT_DELETION_RUNBOOK.md).

## What the normal client can do

- Submit eligibility inputs once, through `createQuizzerSeasonParticipation`.
- Read the caller's own `users/{uid}/seasons/{seasonId}` document.
- Receive the existing ready record on a repeat call. The repeat call does not change division, Study Track, or region.

The normal client cannot create, update, or delete the document directly. Firestore Rules deny those writes. Firestore Console editing is not the correction workflow.

## What a future correction tool must do

Corrections go through a trusted, authorized, server or admin-controlled process.

Before it writes, the tool must:

- revalidate eligibility where a corrected placement still depends on eligibility inputs
- revalidate that the region belongs to that season and is an allowed official region
- revalidate that the MaterialSet belongs to that season
- revalidate that the season id is the participation document's season
- write through trusted authority (Admin SDK or a later privileged callable), not through a client SDK write
- record an audit of what changed, who authorized it, and when

Admin authentication and the audit store are **not decided here**. Do not invent them in the client.

## What stays denied

- Client `update` and `delete` on `users/{uid}/seasons/{seasonId}` stay denied.
- Rules are not relaxed so a coach or the Quizzer can patch the document from the app.
- Official `seasons/{seasonId}/regions/{regionId}` documents are not a place to store a personal correction.

Shipping public production without this tool leaves a mistaken setup record stuck. Build the tool before that launch. Do not build it as part of Phase 3.

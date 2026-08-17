# ADR-002: Season isolation and card identity

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related PRD:** §§3.3–3.4, 5–7, 12, 56

## Context

Each Bible Quiz year has its own official material, numbering, annotations, and rules. The same Scripture reference can appear in multiple years with different season-specific content. Learning progress must not leak across years.

## Decision

- A **Season** is the curriculum and configuration boundary for one quiz year. A new season is a new authoritative content environment, not an update to the previous season.
- Seasons are **strictly isolated**. Curriculum, cards, and learning state are never shared or transferred across seasons.
- Card identity is **`seasonId + cardId`**. Card number is unique within a season only. It is not a global identifier.
- Scripture reference is content metadata, not cross-season identity. There is no global Verse identity for learning state.
- When a season is **Active / Locked**, authoritative season content is **immutable** (curriculum, cards, annotations, quiz metadata, division and tournament configuration, and other official season configuration).
- Ordinary users cannot modify authoritative season content. In-season administrative correction is out of V1 scope.

## Rationale

Committee material and quiz rules change by year. Using Scripture reference or card number as a global key would merge unrelated learning objects and make isolation unenforceable.

## Consequences

- Queries, caches, entitlements, and progress records must always be season-scoped.
- Copying last season’s progress into a new season is forbidden.
- Content tooling must not silently edit Active/Locked material.

## Alternatives considered

- Treat a new year as a patch to the previous curriculum — rejected in PRD §§3.3–3.4, 7.
- Identify cards by Scripture reference globally — rejected in PRD §§12.2–12.3, 56.

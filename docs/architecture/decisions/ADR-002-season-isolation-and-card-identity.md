# ADR-002: Season isolation and card identity

- **Status:** Accepted (amended 2026-09-15)
- **Date:** 2026-08-17
- **Amended:** 2026-09-15
- **Related PRD:** §§3.3–3.4, 5–7, 12, 12.3, 12.5, 37, 56, 63

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

## Amendment (2026-09-15)

Sprint 3 requires MaterialSet-aware Card identity. The 2026-08-17 decision remains in force for **season isolation**, **Active / Locked immutability**, and **no global Verse identity**. The Card identity clause above is refined; it is no longer the canonical identity.

This is an in-place amendment, not a replacement ADR. Runtime Card types and queries are unchanged until Sprint 3 Phase 1 implements them.

### Previous identity (pre-Sprint 3)

Card identity was **`seasonId + cardId`**. Card number was treated as unique within a season only.

### Why Sprint 3 requires this refinement

Each Season contains **five independent MaterialSets** (Cadet, Beginner, Junior, Intermediate, Experienced). The same Scripture reference may exist independently across multiple MaterialSets with different Card/order numbers, Curriculum Sections, annotations, and official metadata (PRD §§12.3, 37, 63).

Keeping `seasonId + cardId` as the canonical key would let those independent Cards collide.

### Canonical identity (in force)

- Card identity is **`seasonId + materialSetId + cardId`**.
- Card number/order is unique **within a MaterialSet**, not necessarily across the entire Season.
- Card number is not a global identifier.
- **Scripture reference remains metadata**, not Card identity across seasons or MaterialSets. There is no global Verse identity for learning state.
- **MaterialSets are independent curriculum boundaries** inside a Season. Cards must not accidentally collide across MaterialSets.

Season isolation is unchanged: curriculum and learning state are never shared or transferred across seasons. MaterialSet isolation is additional: Cards from different MaterialSets in the same Season are distinct objects even when the Scripture reference matches.

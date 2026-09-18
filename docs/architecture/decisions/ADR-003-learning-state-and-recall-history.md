# ADR-003: Learning-state ownership and recall history

- **Status:** Accepted (amended 2026-09-15)
- **Date:** 2026-08-17
- **Amended:** 2026-09-15
- **Related PRD:** §§13.3–13.4, 15–17, 32–35, 37, 56, 63

## Context

A Card can appear in official material and in multiple user decks. Flashcard study produces both a historical record of attempts and a current mastery/progress view. Multi-device retries must not inflate results.

## Decision

- Learning state (progress and mastery) is owned by **Quizzer + Season + Card**, not by Quizzer + Deck + Card.
- Decks hold membership references to Cards. They do not copy Cards and do not own mastery. Smart collections (Needs Work, Mastered, Review Due, and similar) are **derived**, not duplicated card storage.
- **RecallEvents** are the authoritative learning history. Each meaningful recall is a unique, stable, idempotent event (`eventId`, `userId`, `seasonId`, `cardId`, result, timestamp, and related session/device metadata as specified in the PRD).
- **Progress / Mastery** is a **materialized snapshot** derived from those events, used for efficient reads. The Flashcard screen must not rebuild the entire history on every open.
- After processing, the server is authoritative for synchronized learning events and progress/mastery. Local UI or pending offline state must never overwrite official season content.
- “Last device to sync wins” is not the merge rule. Independent legitimate RecallEvents are retained; snapshots are updated from that history.

## Rationale

Deck-owned mastery would fork state whenever a card appears in multiple decks. Event-sourced history plus a snapshot keeps retries, multi-device use, and later rebuilds coherent.

## Consequences

- Persist and authorize learning records by user, season, and card.
- Treat duplicate event delivery as the same event.
- Do not store a second mastery copy on the deck.

## Alternatives considered

- Mastery owned by deck membership — rejected in PRD §§13.4, 56.
- Recalculating full history on every Flashcard open — rejected in PRD §17.
- Last-write-wins device sync — rejected in PRD §33.

## Amendment (2026-09-15)

Sprint 3 requires MaterialSet-aware learning ownership. The 2026-08-17 decision remains in force for **deck-independent mastery**, **RecallEvents as authoritative history**, **materialized Progress / Mastery snapshots**, **server authority after processing**, and **not last-write-wins**. The ownership clause above is refined; it is no longer the canonical learning key.

This is an in-place amendment, not a replacement ADR. This document does not implement Progress, RecallEvent, Mastery, or Study activity/history (Sprints 6–7). It records the ownership boundary so later systems do not treat Cards from different MaterialSets as the same learning object.

### Previous ownership (pre-MaterialSet)

Learning state was owned by **Quizzer + Season + Card**. RecallEvent identity fields were described as `eventId`, `userId`, `seasonId`, `cardId`, plus result, timestamp, and related session/device metadata.

### Why Sprint 3 requires this refinement

Card identity is now **`seasonId + materialSetId + cardId`** (ADR-002 amendment; PRD §§12.3, 15, 37, 63). The same Scripture reference in two MaterialSets is two independent Cards. Learning records keyed only by Quizzer + Season + Card would merge those Cards.

### Canonical ownership (in force)

- Learning state (Progress, RecallEvent, Mastery, and Study activity/history) is owned by **Quizzer + Season + MaterialSet + Card**, not by Quizzer + Deck + Card, and not by Quizzer + Season + Card alone.
- Decks still hold membership references only. They do not copy Cards and do not own mastery.
- Future RecallEvents, Progress snapshots, and Mastery records must include MaterialSet in their identity/authorization boundary so Cards from different MaterialSets cannot collide.

Persist and authorize future learning records by quizzer, season, material set, and card.

# ADR-003: Learning-state ownership and recall history

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related PRD:** §§13.3–13.4, 15–17, 32–35, 56

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

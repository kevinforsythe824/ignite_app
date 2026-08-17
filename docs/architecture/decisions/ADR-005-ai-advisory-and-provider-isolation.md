# ADR-005: AI is optional, advisory, and provider-isolated

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related PRD:** §§9.1–9.2, 26, 54–56

## Context

AI may later help with coaching, songs, or practice, but Ignite’s core product is Flashcard memorization plus Practice. Vendor APIs and subscriptions must not become the source of curriculum or learning truth.

## Decision

- AI is **optional**. The core product must work when AI is disabled, unavailable, or unpurchased.
- AI is **advisory only**. It must not modify Quizzer learning data, official curriculum, mastery, or official rules, and must never become the source of truth.
- AI is isolated behind an **application-level AI service**. Features (including Flashcards) must not depend on a specific vendor.
- Season entitlement and AI entitlement are **separate**. A season purchase does not include premium AI.
- Concrete AI product features (AI Coach, generated questions, songs, tournament quizmaster) remain **deferred** until their sprints. This ADR records the boundary, not a license to build those features now.

## Rationale

Provider lock-in and “AI said so” mutations would undermine official committee content and mastery integrity. A service interface keeps the core app shippable without AI.

## Consequences

- Do not call an AI vendor from UI or from Flashcard domain code.
- Do not gate Flashcards, Practice, or season access on AI availability.
- Do not implement deferred AI features merely because the boundary exists (PRD §55).

## Alternatives considered

- AI as a required companion to study — rejected in PRD §§9.2, 26.1.
- AI allowed to write mastery or curriculum — rejected in PRD §26.2.

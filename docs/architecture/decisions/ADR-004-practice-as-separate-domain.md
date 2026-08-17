# ADR-004: Practice is a separate domain

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related PRD:** §§3.2, 18, 22, 30, 56

## Context

Ignite has two permanent pillars: memorization (Flashcards) and application (Practice). Practice games will grow, but they must not reuse Flashcard session or scoring concepts as if they were the same system.

## Decision

- **Practice is a separate domain** from Flashcard study.
- Flashcard memorization is a **Study Session**. Practice activity is a **Practice Session** with game → question → attempt → result → score.
- Flashcard outcomes are Correct / Needs Work. Practice games define their own scoring rules.
- Practice questions for the initial product are committee/quiz-board sets. AI-generated questions are deferred.
- Practice offline is **not** part of V1 offline learning. Post-MVP offline, when built, is Flashcard study and progress only.

## Rationale

A shared “session/score” blob would couple memorization rules to game rules and make later games require a rewrite. Keeping Practice as its own model matches the product split and the PRD’s common Practice framework.

## Consequences

- Do not store Practice results as Flashcard RecallEvents or mastery transitions.
- New games should extend the Practice model rather than invent a parallel stack.
- Do not pull tournament simulation or AI questions into early Practice work (PRD §§23, 55).

## Alternatives considered

- Treat Practice as another Flashcard study mode — rejected in PRD §22.
- Practice offline in the first offline release — rejected in PRD §§30, 56.

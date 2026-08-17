# ADR-001: Persistence, domain ownership, and repository boundary

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related PRD:** §§11, 27–31, 39, 56, 61

## Context

Ignite needs durable remote persistence, a domain model that can grow into Practice, entitlements, and later offline study, and a boundary that keeps UI and business rules from depending on a vendor SDK.

## Decision

- Cloud Firestore is the canonical **remote** persistence system. Firebase Realtime Database is not the primary store.
- Firebase is **infrastructure**, not the Ignite domain model. Application domain types are owned by Ignite.
- Persistence is accessed only through **repository interfaces**. The domain/application layer depends on those interfaces; Firestore adapters live below them.
- UI must never call Firestore or Firebase APIs directly.
- Dependency direction is: Presentation → Feature/Application → Domain → Repository → Persistence.
- The Core MVP is **online-first**. SQLite and offline Flashcard learning are **post-MVP**. Repository contracts must allow a later local data source without rewriting Flashcard domain or application layers.

## Rationale

The PRD requires structured user/season/card data, season-scoped access, security rules, and a replaceable persistence implementation. Treating Firebase as the domain would freeze vendor documents into product concepts and block a later SQLite adapter.

Online-first MVP is explicit: offline study, sync, conflict resolution, and a SQLite learning database are out of Core MVP scope (PRD §§29–30, 61).

## Consequences

- Features map to/from persistence DTOs inside repository adapters, not in screens.
- Adding SQLite later is an additional adapter behind existing repository contracts, not a domain rewrite.
- PRD §56’s “Local V1 persistence = SQLite” and “Flashcard offline = Yes” refer to **post-MVP V1 offline learning**, not the current MVP.

## Alternatives considered

- Firebase Realtime Database as the primary store — rejected in PRD §27.1.
- UI or feature code calling Firestore directly — rejected in PRD §§27.2, 28, 39.
- Shipping SQLite/offline in Core MVP — rejected in PRD §§29–30, 61.

# Ignite Architecture

Ignite is an Expo SDK 57 React Native app (TypeScript) for competitive Bible quiz study. Today the shipped feature is **Flashcards** on the Study tab; other PRD modules are scaffolded as placeholders behind a 5-tab shell.

**Sources of truth:** product/features/sprints → [`docs/product/PRD.md`](docs/product/PRD.md); how we build and verify → [`docs/development/Ignite_Development_Playbook.md`](docs/development/Ignite_Development_Playbook.md); engineering layout → this file. Also read `AGENTS.md` and `.cursor/rules/` before changing code. Prefer [Expo SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/).

---

## 1. Folder structure

```text
ignite_app/
├── App.tsx                      # Root: AppProviders + RootNavigator
├── AGENTS.md                    # Expo SDK 57 reminder
├── ARCHITECTURE.md              # This file (engineering source of truth)
├── docs/
│   ├── product/PRD.md           # Product source of truth
│   ├── development/             # Development Playbook (how we build/verify)
│   ├── architecture/decisions/  # ADRs
│   ├── operations/              # Runbooks (incl. Firebase environments)
│   └── testing/                 # Test-strategy notes
├── .firebaserc                  # Firebase CLI aliases: dev / staging / prod
├── firebase.json                # Firestore rules/indexes paths (do not deploy casually)
├── firestore.rules              # Local baseline; reconcile before first deploy
├── firestore.indexes.json
├── __tests__/                   # Jest business-logic & smoke tests
├── scripts/                     # Developer tooling (not shipped in the app)
│   └── firestore-seed/          # Admin SDK import of the JSON test curriculum
├── .cursor/rules/               # AI coding rules (incl. project-philosophy)
├── src/
│   ├── app/                     # App shell only
│   │   ├── navigation/          # React Navigation (stack + tabs)
│   │   └── providers/           # Gesture/safe-area + AuthProvider
│   ├── features/                # Feature modules (feature-first)
│   │   ├── auth/                # Authentication application layer + Firebase adapter
│   │   │   ├── domain/          # AuthenticatedIdentity (not Quizzer profile)
│   │   │   ├── errors/          # Application-facing AuthenticationError
│   │   │   ├── hooks/           # useAuth
│   │   │   ├── repositories/    # AuthRepository; Firebase Auth live adapter
│   │   │   └── state/           # Session reducer + AuthProvider
│   │   └── flashcards/          # Full Study/Flashcards feature
│   │       ├── components/      # Presentation UI
│   │       ├── data/            # JSON + Firestore persistence DTOs → Card mappers
│   │       ├── hooks/           # Feature hooks (useFlashcards)
│   │       ├── repositories/    # CurriculumRepository; Firestore live, JSON for tests
│   │       ├── screens/         # Feature routes (provider + screen)
│   │       ├── state/           # Reducer, context, derived view
│   │       ├── types/           # Domain types
│   │       └── utils/           # Pure domain helpers (parsing, caches)
│   ├── screens/                 # App-level / placeholder screens
│   ├── shared/                  # Cross-feature only (theme, utils, …)
│   ├── services/                # Firebase JS SDK init + storage/API stubs
│   └── data/                    # Shared mock JSON (e.g. curriculum fixtures)
```

**Rule of thumb:** if only flashcards use it, it belongs under `features/flashcards/`. If two features need it, promote it to `shared/` or `services/`.

---

## 2. Data flow (Flashcards / Study)

```text
AppProviders
  └─ AuthProvider (app-wide auth session; does not gate routing in Phase 1)
       └─ RootNavigator (native stack)
            └─ MainTabs (bottom tabs, initial = Study)
                 └─ FlashcardStudyRoute
                      ├─ useFlashcardCurriculum(test-season, firestoreCurriculumRepository)
                      ├─ FlashcardSessionProvider   ← feature-local state
                      └─ FlashcardStudyScreen       ← thin: hooks + components
                           ├─ useFlashcards()
                           │    ├─ session state + actions (context)
                           │    ├─ deriveFlashcardSession()   (counts, progress, flags)
                           │    └─ getVerseSegments()         (cached parse)
                           ├─ StudyHeader
                           └─ FlashcardStudyActive / SessionComplete
                                └─ Flashcard → Front (Locate) / Back (Quote + RichVerseText)
```

User swipe → `markCorrect` / `markNeedsWork` → reducer updates `statusById` + index → hook derives view → UI re-renders. **Parsing never runs inside UI components.** Session grades are Correct / Needs Work. Mastered is reserved for the Sprint 7 Mastery domain.

---

## 3. Feature architecture

Each feature is a vertical slice:

| Folder | Responsibility |
|--------|----------------|
| `components/` | Presentation only |
| `hooks/` | Compose state + domain for screens |
| `state/` | Reducer, context, pure selectors |
| `utils/` | Pure domain logic (no React) |
| `types/` | Feature domain types |
| `data/` | Feature fixtures / defaults |
| `screens/` | Route entry (providers + thin screen) |

**Flashcards specifics**

- Session state lives under Study (`FlashcardStudyRoute`), not the app root — other tabs do not re-render on every swipe.
- State and actions are split contexts; actions stay stable via refs.
- Verse highlighting: `parseVerseToSegments` (pure) → cached by `getVerseSegments`.

---

## 4. Dependency rules

Allowed direction (import arrows point toward dependencies):

```text
screens / app/navigation
        → features/*
        → shared/*
        → services/*

features/*  → shared/*, services/*, own folders
shared/*    → (almost nothing; no features, no services UI)
services/*  → (SDK-agnostic types only; no features, no UI)
```

**Do**

- Keep Firebase / network / storage behind `src/services` interfaces.
- Import theme from `src/shared/theme`.
- Let features own their domain types and parsing.

**Don’t**

- Import `features/flashcards` from `shared` or `services`.
- Call Firebase or AI APIs from components.
- Put business rules in screens.
- Create shared abstractions until a second real use case exists.

---

## 5. Naming conventions

| Kind | Convention | Example |
|------|------------|---------|
| Components | PascalCase file + named export | `StudyHeader.tsx` |
| Hooks | `use` + camelCase | `useFlashcards.ts` |
| Pure utils | camelCase verb | `parseVerseToSegments.ts` |
| Types | PascalCase interfaces / unions | `Verse`, `CardStatus` |
| Context / provider | Feature + Session | `FlashcardSessionProvider` |
| Screens | `*Screen` / feature `*Route` | `FlashcardStudyScreen`, `FlashcardStudyRoute` |
| Tests | mirror subject under `__tests__/` | `flashcardSessionReducer.test.ts` |
| Barrels | `index.ts` re-exports | prefer deep imports when clearer |

Prefer **named exports**; default exports are used for some screens/components for navigator convenience.

---

## 6. State management

- **No global Redux/Zustand.** Feature React Context + `useReducer`.
- **Flashcards**
  - `flashcardSessionReducer` — pure transitions (`answer`, `next`, `previous`, `goToIndex`, `reset`)
  - `deriveFlashcardSession` — counts, progress, `showCard`, `isComplete`
  - `useFlashcards` — the screen-facing API
- Mount providers **next to the feature route**, not in `AppProviders`, unless state is truly app-wide.
- **Authentication** session state is app-wide via `AuthProvider` in `AppProviders` (`src/features/auth/`).
- Derived values belong in pure functions or hooks — not duplicated in components.

---

## 7. Navigation

- **Library:** React Navigation (not Expo Router).
- **Root:** native stack (`MainTabs`, `TournamentDetails` placeholder).
- **Tabs (MVP):** Home · Study · Practice · Profile. AI Coach is Post-MVP and is not shown.
- **Default entry:** Study → Flashcards (current product experience).
- Placeholder tabs live in `src/screens/*` until their features exist.
- Tab screens are `lazy: true`.

Route param lists: `src/app/navigation/types.ts`.

---

## 8. Services

`src/services` holds Firebase JS SDK initialization plus remaining service stubs. Unwired methods (storage, AI) still throw `ServiceNotConnectedError`.

| Package | Purpose |
|---------|---------|
| `firebase/` | Firebase JS SDK app, Firestore, and Auth singleton init (`getFirebaseApp`, `getFirebaseFirestore`, `getFirebaseAuth`). Authentication application logic lives in `src/features/auth/`. The client must set `EXPO_PUBLIC_IGNITE_ENV` (`dev` / `staging` / `prod`) and a matching project ID; there is no production default. Live Study loads `test-season` through `FirestoreCurriculumRepository`. `JsonCurriculumRepository` remains for tests/fixtures. Firebase Admin (`scripts/firestore-seed`) is developer tooling only — not part of the mobile runtime. See [`docs/operations/ENVIRONMENTS.md`](docs/operations/ENVIRONMENTS.md). |
| `storage/` | Local preference key-value stub (no offline study) |
| `api/` | HTTP facade + `AiGateway` (distractors, coaching, songs, chat) |

The MVP is online-first. SQLite, offline Flashcard study, and synchronization remain deferred.

Features should depend on repository/service boundaries — never on SDKs directly in UI.

---

## 9. How to add a new feature

Example: **Practice**

1. Create `src/features/practice/` with `components/`, `hooks/`, `state/`, `types/`, `utils/`, `screens/` as needed.
2. Keep the screen thin: hooks + components (+ navigation params).
3. Put quiz/domain rules in `utils/` or `state/` reducers — not in JSX.
4. Add a feature route (provider wrapper if the feature has session state).
5. Point the Practice tab in `BottomTabNavigator` at that route.
6. Use `shared/` only for truly cross-cutting pieces (theme first).
7. Use `services/` for remote/offline I/O.
8. Add Jest tests for reducer/utils/hooks under `__tests__/`.
9. Update Cursor rules / this doc if conventions change.

Move code before rewriting it. Preserve behavior. Prefer small commits.

---

## 10. Best practices

1. **Screens are thin** — compose hooks and components; no parsing or Firebase.
2. **Business logic is pure when possible** — easy to unit test (`__tests__/` focuses here, not chrome UI).
3. **Feature-first** — colocate by product capability.
4. **Composition over inheritance**; small components; memoize when props are stable and re-renders are real (see flashcard leaves + segment cache).
5. **Expo SDK 57 APIs only** — check versioned docs; avoid deprecated APIs.
6. **Functional components + hooks** — no class components.
7. **Refactor with a plan** — list files/risks first; no large rewrites without agreement.
8. **Cursor rules** — `.cursor/rules/architecture.mdc`, `react-native.mdc`, `flashcards.mdc`, `refactoring.mdc` encode the same constraints for AI-assisted work.

---

## Quick map for onboarding

| I need to… | Start here |
|------------|------------|
| Change flip/swipe UI | `features/flashcards/components/Flashcard.tsx` |
| Change session grading / flow | `state/flashcardSessionReducer.ts` |
| Change keyword/slash rendering rules | `utils/parseVerseToSegments.ts` |
| Change Study screen layout | `screens/FlashcardStudyScreen.tsx` (thin) + components |
| Add a tab destination | `app/navigation/BottomTabNavigator.tsx` + feature route |
| Add backend calls | `services/*` interfaces, then a real adapter |
| Change colors/spacing | `shared/theme/` |

When in doubt: **feature folder first, shared only when reused twice, services for I/O, screens stay thin.**

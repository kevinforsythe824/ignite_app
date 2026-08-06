# Product Requirement Document: Ignite

Permanent · Bible Quiz Mobile App.

Structural and engineering sections updated to match the feature-first Expo SDK 57 foundation. Product vision, module requirements, sprint sheet, and KPIs retained from the original PRD.

**Document control**

- Engineering source of truth for code layout: [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- Product source of truth for features and sprints: **this file** (`docs/PRD.md`)
- Cursor operating rules: `.cursor/rules/`

---

## 1. Executive Summary & Vision

### 1.1 Product Vision

Ignite is an AI-laced, high-performance mobile study platform engineered specifically for competitive Bible quiz teams and serious verse memorization. By combining gamified flashcard mechanics, targeted quiz algorithms, deep performance analytics, and advanced AI features (voice-driven AI coaching, distractor generation, and custom mnemonic verse songs), Ignite bridges the gap between daily practice and competitive tournament mastery.

### 1.2 Core Objectives

- **Rapid Memorization** — Custom visual rendering (bolding, keyword highlighting, slash markers / \, unique beginnings/endings) tuned to competitive quizzing standards.
- **AI Integration from Day One** — Embed lightweight AI tools early (distractor generators, dynamic error diagnostics) while establishing backend plumbing for heavy AI (voice coaching, mock tournaments, music generation).
- **Vibe-Coding Efficiency** — Built using Cursor and Expo for an accelerated path from MVP to production-ready features.

---

## 2. Technical Architecture & Stack

Updated to the implemented foundation (replaces SDK 51+ / Reanimated v3 / flat `src` layout from the original draft).

| Layer | Specification |
| --- | --- |
| Framework | React Native with Expo SDK 57 (versioned docs required before coding) |
| Language | TypeScript (strict mode) |
| App architecture | Feature-first: `src/features/*`, `src/shared/*`, `src/services/*`, `src/app/`. See `ARCHITECTURE.md` |
| Animation | react-native-reanimated 4.x — `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring` |
| Gestures | react-native-gesture-handler v2 — `Gesture.Pan()`, `Gesture.Tap()`, `GestureDetector` |
| Navigation | React Navigation — Native Stack + 5-slot Bottom Tabs (Home, Study, AI Coach, Practice, Profile). Study is the default entry hosting Flashcards. |
| Backend & Auth | Firebase (Firestore + Auth) — planned. Interfaces stubbed in `src/services/firebase` (not connected yet) |
| AI Gateway | Serverless proxy (Vercel AI SDK / Cloud Functions) to OpenAI / Gemini Flash — `AiGateway` stubbed in `src/services/api` |
| Voice & Audio | WebSockets / WebRTC streaming; Suno / ElevenLabs for song generation (Heavy AI phase) |
| Local Storage | SQLite / AsyncStorage for offline sync — interface stubbed in `src/services/storage` |
| AI / Cursor workflow | `.cursor/rules`: architecture, react-native, flashcards, refactoring, project-philosophy |

---

## 3. Feature Specifications by Module

### Module A: Flashcard Core Engine & Active Settings

Status: **Core shipped · Settings open**

- **3D Card Flip** — Tap rotates 180° on Y-axis with `perspective: 1000` and `backfaceVisibility: 'hidden'`.
- **Gesture Swipe**
  - Swipe right (> 120px): Mastered (green check pill).
  - Swipe left (< -120px): Practicing (red X pill).
- **Rich Verse Text Renderer** — Inline segments with keyword tiers, mark underlines, and slashes (/ \) that wrap cleanly. Competitive index code shown on Quote side.
- **Header Bar** — Animated progress bar and live Mastered / Practicing counters.
- **In-Session Settings Modal (Gear) — Sprint 1.5** — Index legend (1x/2x/3x keyword categories), category filter tabs (Unique Beg., Unique End., Questions, Exclamations), Shuffle Cards / Play Audio toggles, Locate vs Quote default side switcher, Restart Flashcards.
- **Session Reset** — Restart clears current deck progress (shipped on session-complete screen; gear entry still Sprint 1.5).

### Module B: Navigation, Home Dashboard & Tournament Details

Status: **Shell shipped · Home TBD**

- **Bottom Navigation Shell** — 5-slot tab bar: Home, Study, AI Coach (center), Practice, Profile. Implemented with React Navigation; Study is default.
- **Home Dashboard** — Avatar + greeting + search + weekly streak badge; Recent Decks carousel; Weekly Verses Learned chart container; Upcoming Tournament card (title, countdown, location, Details).
- **Tournament Details** — Map header with venue pin; address (e.g. Greater Bakersfield First Pentecostal Church, 1418 W Columbus St, Bakersfield, CA 93301); event date/countdown; Required Material card (reference range, coverage, Study Now); Get Directions CTA to native maps. Stack route registered; UI still placeholder.

### Module C: Study Hub & Database Streaming

- **Category Filters** — Scrollable pills: Recents, My Decks, Tournaments, Quizzes.
- **Deck List View** — Deck cards with progress %, verse counts, performance tags (e.g. 12 Correct, 3 Wrong).
- **Real-time Sync** — Firestore listeners for decks and progress (service interfaces stubbed; not wired).

### Module D: Practice Engine & Quiz Configurations

- **Practice Hub** — Completed count and study streak header stats.
- **Quiz Setup** — How to Play card; verse range dropdowns; charting type selector; Easy / Medium / Hard pills.
- **Practice Modes**
  1. Multiple Choice with AI distractors
  2. Fill in the Blank
  3. Verse Matching
  4. Subtract-a-Word
  5. Verse Completion
- **AI Error Diagnostics** — One-line coaching notes on wrong answers.

### Module E: Analytics & Micro-Coaching

- **Stat tiles** — Study time, verses learned, focus score.
- **Session insights** — Best day, peak window, average session length.
- **AI Micro-Coaching Card** — Natural-language recommendations from history.

### Module F: User Management, Account Security & Preferences

- Firebase Email/Password signup and login; profile overview with streak and scores.
- Account security — change username, email (re-auth), password; delete account with multi-step confirmation.
- Offline study toggles; push reminders; Dark Mode; footer with session state, Log Out, Version 2.1.0.

### Module G: Heavy AI Layer

- **Custom AI Verse Songs** — Generate Song CTA on flashcards; Suno / ElevenLabs via job queues; synced lyric highlighting player.
- **AI Coach tab** — Streaming voice/text chat; mock tournament quizmaster; freeform Q&A assistant.

---

## 4. Master Development Sprint Sheet & Timeline

Unchanged from the original PRD. Timelines assume accelerated Cursor + Expo delivery. Dependency note: animation stack in repo is Reanimated 4.x (see Section 2); sprint rows may still list historical dependency names.

| Phase | Sprint | Name | Estimate | Core deliverables | Priority | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Phase 1 MVP | 1 | Flashcard Core Engine | 2–3 days | 3D flip, swipe Mastered/Practicing, rich verse renderer, progress header | P0 | Reanimated, Gesture Handler, Mock JSON |
| Phase 1 MVP | 1.5 | Active Flashcard Settings | 1–2 days | Settings modal, index legend, category tabs, shuffle/audio, Locate/Quote, restart | P0 | Modal, local state |
| Phase 1 MVP | 2 | Navigation & Home Dashboard | 2–3 days | 5-slot bottom nav, streak header, tournament preview, recent decks, weekly chart | P0 | React Navigation, SVG chart |
| Phase 1 MVP | 2.5 | Tournament Details View | 1 day | Map header, address, countdown, Required Material + Study Now, directions CTA | P0 | Maps / Linking |
| Phase 1 MVP | 3 | Study Hub & Early AI Gateway | 2–3 days | Category pills, deck list + scores, Firestore streaming, AI gateway setup | P0 | Firestore, AI SDK / Functions |
| Phase 1 MVP | 4 | Profile & Basic Auth | 1–2 days | Email/password auth, profile header, streak, settings entry, Log Out, Version 2.1.0 | P0 | Firebase Auth |
| Phase 1.5 | 5 | Account Security & Personal Info | 1–2 days | Change username/email/password; delete account confirmation | P1 | Firebase Auth user APIs |
| Phase 2 | 6 | Practice: Quiz Config & Basic Modes | 2–3 days | Practice hub, quiz setup, Multiple Choice + Fill-in-blank | P1 | Quiz config state, AI distractors |
| Phase 2 | 7 | Practice: Advanced Modes | 3–4 days | Matching, Subtract-a-word, Verse Completion, AI error tips | P1 | String algorithms, Gemini Flash |
| Phase 3 | 8 | Analytics & Micro-Coaching | 2–3 days | Stat cards, session insights, focus score, AI summary card | P2 | Analytics aggregator, LLM summarizer |
| Phase 3 | 9 | Offline Sync & Preferences | 2–3 days | Download decks, Wi-Fi auto-download, push toggles, Dark Mode | P2 | AsyncStorage/SQLite, Notifications, Theme |
| Phase 4 | 10 | AI Verse Songs | 3–5 days | Generate Song CTA, Suno/ElevenLabs pipeline, synced audio highlights | P3 | Streaming audio, job queue |
| Phase 4 | 11 | AI Coach & Mock Tournament | 4–6 days | Center tab, voice/text chat, quizmaster simulator, Q&A | P3 | WebRTC/WebSockets, speech hooks |

---

## 5. System Directory Structure

Replaces the original layered `components/hooks/context` tree with the implemented feature-first layout.

```text
ignite_app/
├── App.tsx                         # Root: AppProviders + RootNavigator
├── AGENTS.md                       # Expo SDK 57 coding gate
├── ARCHITECTURE.md                 # Engineering source of truth
├── docs/
│   └── PRD.md                      # This file — product source of truth
├── .cursor/rules/                  # architecture, react-native, flashcards, refactoring, project-philosophy
├── __tests__/                      # Jest (reducer, derive, parser, hooks, smoke)
├── app.json · package.json · tsconfig.json
└── src/
    ├── app/
    │   ├── navigation/             # RootNavigator, BottomTabNavigator, types
    │   └── providers/              # GestureHandler, SafeArea, StatusBar
    ├── features/
    │   ├── flashcards/             # components, data, hooks, screens, state, types, utils
    │   └── (future modules)/       # home, study, practice, tournament, analytics, auth, profile, ai
    ├── shared/                     # theme, utils; later shared components/hooks/types
    ├── services/
    │   ├── firebase/               # Auth + Database interfaces (stub)
    │   ├── api/                    # ApiService + AiGateway (stub)
    │   └── storage/                # Offline / preferences (stub)
    ├── screens/                    # App-level / placeholder screens
    └── data/                       # Mock verse JSON (until fully colocated in features)
```

### Standard feature module

| Path | Responsibility |
| --- | --- |
| `components/` | Presentation UI only |
| `hooks/` | Compose state + domain for screens |
| `state/` | Reducer, context, pure derived selectors |
| `utils/` | Pure domain logic (no React, no I/O) |
| `types/` | Feature domain TypeScript types |
| `data/` | Fixtures / default decks |
| `screens/` | Route entry (providers + thin screen) |

### Dependency rules

`app` → `features` → `shared` / `services`. UI never calls Firebase or AI SDKs directly. Prefer extending existing patterns; confirm before new dependencies or folder-structure changes.

---

## 6. Key Performance Metrics (KPIs)

- **Engagement** — DAU maintaining a streak (≥ 3 consecutive days).
- **Mastery Speed** — Average sessions to take a deck from 0% to 100% Mastered.
- **Practice Accuracy** — % correct on AI-generated distractors in practice quizzes.
- **AI Usage** — AI Coach interactions and custom verse songs generated per active user per week.

---

## Changelog vs original PRD draft

- Section 2 stack/versions and architecture notes updated.
- Section 5 directory replaced with feature-first layout + services stubs.
- Module sections keep original requirements with light implementation status notes on A/B.
- Sections 1, 4, and 6 match the original product intent and sprint plan.

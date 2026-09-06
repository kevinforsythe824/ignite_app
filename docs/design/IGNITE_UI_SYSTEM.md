# Ignite UI System

Permanent visual-language specification for the Ignite app UI redesign. This document defines how Ignite should look and feel across screens. It does **not** authorize product features, change navigation behavior, or modify theme/application code by itself.

**Status:** Batch 0 semantic tokens implemented — theme and this document are synchronized. Screen migration begins in later batches.  
**Branch context:** `feature/s2-ui-redesign`  
**Theme sources of truth:**

- `src/shared/theme/theme.ts`
- `src/shared/theme/fonts.ts`
- `src/shared/theme/spacing.ts`

Semantic tokens are **additive** (extend theme; do not break existing consumers overnight). Auth UI primitives remain the de-facto shared layer for now; do **not** move or rename Auth UI, restructure feature folders, or create a parallel UI kit solely for visual cleanup. Shared components may be introduced or generalized only when an implementation batch demonstrates real duplication.

---

## 1. Purpose and Scope

### Purpose

Establish one coherent Ignite visual system so Entry, Auth, consent, onboarding, loading/recovery, Home, Study, Practice, Profile, Settings, account forms, Help & Feedback, placeholders, and related surfaces share the same cool white / near-white canvas, color roles, type hierarchy, spacing rhythm, surfaces, and interaction patterns — while product behavior stays governed by the PRD and existing application logic.

### In scope

- Visual language derived from Figma reference screens (Home, Profile, Activity, Settings, Study)
- Semantic design roles (color, type, spacing, shape, controls)
- Screen-family guidance and migration sequencing
- Rules for interpreting Figma vs product requirements
- Accessibility and application-state expectations for UI presentation

### Out of scope (this document)

- Implementing or authorizing features that appear only in Figma
- Changing Firebase / Auth / Firestore / Functions
- Relocating or renaming Auth UI modules, restructuring feature folders, or creating a parallel UI kit without demonstrated duplication

### Relationship to product truth

Product requirements live in `docs/product/PRD.md`. Figma screenshots are **visual language only**. If a Figma mock shows Offline Study, Dark Mode, streaks, analytics, tournaments, or similar, that does not make those features in-scope for implementation unless the PRD already requires them and a separate product authorization exists.

### Current functionality rule

> The UI redesign styles the product that exists today. Figma determines visual language, not implementation scope. A visual migration must never make a future feature appear implemented.

---

## 2. Figma Visual Analysis

Five Figma reference screens were reviewed as visual-language sources. Sample names, avatars, locations, stats, and copy are illustrative only.

### Home

- Light off-white canvas; white rounded cards with thin borders
- Header: circular avatar + greeting (“Hi, …”) left; compact streak-style pill right (visual motif only)
- Full-width search field with muted placeholder (“Search your material”)
- Section rhythm: titled blocks (“Upcoming Tournament,” “Recent Decks,” “Study Overview”)
- Horizontal scroll of deck-like cards with colored icon tiles, titles, relative timestamps, and Correct/Wrong soft pills
- Chart card with “Weekly” selector, accent callout text, rounded bars
- Bottom tab bar: Home / Study / Practice / Profile; active tab in accent red

### Profile

- Large left-aligned page title “Profile”
- Centered avatar + bold display name
- Full-width navigation cards (Settings, Notifications) with leading icon, bold label, trailing chevron
- Section header with optional accent text action (“View All” — visual pattern only)
- Large activity/streak-style card: title, large accent metric, muted encouragement, divider, day columns with flame motifs
- Same bottom tab language; Profile active in accent red

### Activity

- Stack header: back chevron + centered title
- Twin summary metric cards (icon + muted label + large value + muted sub-label)
- Large analytics card: section title, period dropdown, chart, then icon+label+value rows
- Accent used on icons, trend callouts, and peak chart emphasis
- Progress-style row with gradient fill (visual motif only)

### Settings

- Stack header: back + centered “Settings”
- Grouped white cards; each card has a bold section title then rows
- Rows: leading line icon, label, trailing chevron **or** toggle
- Thin in-card dividers; muted secondary line for version/meta
- Large corner radii and generous row height for touch

### Study

- Large left-aligned “Study” title; trailing utility icons (search, add)
- Horizontal top tabs with underline active state (navy underline, not accent red)
- Vertical list of recent-study cards matching Home deck card language (icon tile, title, timestamp, Correct/Wrong pill strip)
- Bottom tab: Study active in accent red

### Cross-screen visual constants observed

| Pattern | Observation |
| --- | --- |
| Canvas | Very light cool/near-white background behind white surfaces — **canonical across the full product** |
| Surfaces | White cards, thin light borders, large rounding (~16–20 visual range) |
| Text | Dark navy primary; mid gray secondary/muted |
| Accent | One vibrant red/coral for active nav, links, emphasis icons, trend callouts |
| Semantic pills | Soft green “Correct”; soft pink/red “Wrong” |
| Type | Rounded geometric sans (Nunito Sans); bold titles, regular supporting |
| Nav | Four-tab bar; inactive muted gray; active accent red (except Study top tabs use navy underline) |
| Elevation | Borders + background contrast first; shadows restrained or absent |

---

## 3. Design Principles

1. **One system, many screens** — Entry, Auth, consent, onboarding, Home, Profile, Settings, Study, Practice, and stacks should feel like the same product family, not separate apps.
2. **One canvas** — One consistent cool white / near-white application background across the full product. Brand identity comes from typography, the flame mark, navy, Ignite red, spacing, and component language — not from a separate warm onboarding background.
3. **Semantic first** — Prefer roles (`background`, `surface`, `textPrimary`, `accent`) over ad-hoc hex picks or screen-local color literals.
4. **Quiet structure** — Depth comes from background vs surface contrast and thin borders, not heavy shadows or decorative chrome.
5. **Soft geometry** — Large card radii, pill controls, and rounded icon tiles; avoid sharp, dense, dashboard clutter.
6. **Accent restraint** — One accent red for interactive emphasis and active chrome; do not invent multiple “brand reds” for the same job.
7. **Hierarchy over decoration** — Type weight/size and spacing carry hierarchy; avoid competing badges, chips, and callouts in the same viewport.
8. **Figma is language, not backlog** — Visual patterns may be adopted; feature content may not. Do not add Figma-only features (including disabled / “Coming Soon” shells) unless separately authorized.
9. **Current functionality only** — The UI redesign styles the product that exists today. A visual migration must never make a future feature appear implemented.
10. **Behavior stability** — UI passes may change appearance; they must not change actions, data behavior, or destinations for the same state and interaction.
11. **Additive evolution** — New tokens extend `src/shared/theme/*`; do not force a big-bang rename of Auth or existing consumers. Do not proactively move/rename Auth components, restructure feature folders, or create a parallel UI kit solely for visual cleanup. Shared components may be generalized only when a batch demonstrates real duplication.
12. **Inclusive by default** — Meet touch, contrast, and state requirements as first-class design constraints, not polish.

---

## 4. Color System

Semantic roles are **locked** in Batch 0 (`src/shared/theme/theme.ts`). Flat keys only — no nested `colors.semantic.*`. Hex coincidence with legacy/domain keys is OK; ownership stays separate (see §4.1).

### Canonical application background

**ONE consistent cool white / near-white application background** across the full product: Entry, Auth, consent, onboarding, loading/recovery, Home, Study, Practice, Profile, Settings, account forms, Help & Feedback, placeholders, and all surfaces.

Background consistency is intentional across Ignite. Authentication, onboarding, consent, and the authenticated product use the same cool white / near-white application canvas. Brand identity comes from typography, the flame mark, navy, Ignite red, spacing, and component language — not from a separate warm onboarding background.

- `colors.background` (`#F5F5F7`) is the sole application-canvas role.
- There is no target warm onboarding canvas. Do not introduce `background.brand` as a cream mode.
- `colors.brandWarmBackground` (`#F7F3EE`) remains in code as a **legacy / deprecated** token for existing Auth/entry/consent/loading covers. It is **not** part of the target Ignite UI system. Migrate consumers off it in Batches 1–3; remove only after audit (Batch 8+).

### Locked semantic roles (Batch 0)

| Role | Theme key | Locked value | Purpose |
| --- | --- | --- | --- |
| `background` | `colors.background` | `#F5F5F7` | Canonical app canvas behind cards — cool white / near-white across **all** product families |
| `surface` | `colors.surface` | `#FFFFFF` | Cards, sheets, tab bar |
| `text.primary` | `colors.textPrimary` | `#0A2540` | Titles, primary labels, values |
| `text.secondary` | `colors.textSecondary` | `#6B7280` | Supporting body, subtitles |
| `text.muted` | `colors.textMuted` | `#9CA3AF` | Placeholders, inactive chrome, meta |
| `accent` | `colors.accent` | `#E85D4A` | Active tab, text links, emphasis icons, positive trend callouts |
| `danger` | `colors.danger` | `#EF4444` | Destructive actions and error emphasis (general UI) |
| `danger.soft` | `colors.dangerSoft` | `#FEE2E2` | Soft error / Wrong-pill fill (general UI) |
| `success` | `colors.success` | `#22C55E` | Positive confirmation, Correct emphasis (general UI) |
| `success.soft` | `colors.successSoft` | `#DCFCE7` | Soft success / Correct-pill fill (general UI) |
| `border` | `colors.border` | `#E5E7EB` | Card outlines, dividers, outlined controls |
| `disabled` fill | `colors.disabledBackground` | `#E5E7EB` | Disabled control fill |
| `disabled` text | `colors.disabledText` | `#9CA3AF` | Disabled label |

No separate `divider` token — use `border`. Soft accent (`accent.soft`) is deferred.

Legacy keys (`accentRed`, `cardWhite`, `navy`, `borderLight`, `practicingRed`, `masteredGreen`, `brandWarmBackground`, etc.) remain exported with unchanged values for existing consumers.

### 4.1 General semantic vs study-domain ownership

Approved hex coincidence is OK; ownership must stay separate. Semantic keys are **independent string literals**, not references to study/mastery keys.

| General UI semantic | Literal | Related legacy/domain key (unchanged) | Ownership rule |
| --- | --- | --- | --- |
| `danger` | `#EF4444` | `practicingRed` | Semantic is **not** an alias of practicingRed; Study may later change mastery reds without redefining global error |
| `dangerSoft` | `#FEE2E2` | `practicingRedBg` | Same independence |
| `success` | `#22C55E` | `masteredGreen` | Semantic is **not** owned by mastery green |
| `successSoft` | `#DCFCE7` | `masteredGreenBg` | Same independence |
| `accent` | `#E85D4A` | `accentRed` | Brand accent; Study must not redefine for mastery |
| `markQuestion` etc. | domain | — | Never promote to general chrome |

Study/mastery tokens continue to be imported only by flashcard/study UI. General screens should migrate to `danger` / `success` / `accent` in later batches.

### Accent policy

- **One interactive accent red** (`#E85D4A`) for active navigation, primary emphasis links, and non-destructive highlight callouts.
- **Danger is separate** (`#EF4444`). Do not use accent for errors/destructive actions.
- Soft semantic pills (Correct / Wrong) use soft fills + darker semantic text; they are not a second brand accent.

### Domain colors (out of chrome system)

Keyword marks, verse highlights, mastery states, and similar learning-domain colors remain specialized tokens. They must not be used as general UI chrome.

---

## 5. Typography

### Family

**Nunito Sans** is the Ignite UI typeface (see `src/shared/theme/fonts.ts`: regular / medium / bold / extraBold).

### Locked semantic type roles (Batch 0)

| Role | Theme key | Family | Weight | Size | Line height | Use |
| --- | --- | --- | --- | --- | --- | --- |
| Screen title | `typography.screenTitle` | extraBold | 800 | 28 | 34 | Large root/tab page titles (Profile, Study, greeting-scale) |
| Stack title | `typography.stackTitle` | bold | 700 | 18 | 24 | Centered/secondary stack headers (Settings, About, Edit Name, Change Email/Password, Help & Feedback subpages) |
| Section title | `typography.sectionTitle` | bold | 700 | 18 | 24 | In-content section headers (“Activity”, “Recently Studied”) |
| Card title | `typography.cardTitle` | bold | 700 | 16 | 22 | In-card / row primary labels |
| Body | `typography.body` | regular | 400 | 16 | 24 | App body (not verse body) |
| Body secondary | `typography.bodySecondary` | regular | 400 | 14 | 20 | Supporting sentences |
| Label | `typography.label` | medium | 500 | 13 | 18 | Meta, timestamps, field chrome labels |
| Action | `typography.action` | bold | 700 | 16 | 22 | Text action / link label weight |
| Input | `typography.input` | regular | 400 | 16 | 22 | Form value text |
| Helper | `typography.helper` | regular | 400 | 13 | 18 | Helper under fields |
| Error | `typography.error` | regular | 400 | 13 | 18 | Error copy (`danger` color) |

**`screenTitle` vs `stackTitle`:** root/tab surfaces use `screenTitle` (large, often left-aligned). Stack-pushed account/settings surfaces use `stackTitle` (smaller, typically centered in a nav header).

**`stackTitle` vs `sectionTitle`:** both may share 18/700 metrics; they are separate roles so later batches can diverge without conflating nav headers with in-page section labels.

Existing styles (`verseReference`, `verseBody`, `title`, `hint`, `brandWordmark`, etc.) are **unchanged**. Do not add `metric` / chart type roles in Batch 0. Optional `navLabel` waits for Batch 6.

### Explicit ban

**Do not use `typography.verseReference` (or any verse-reference token) as a generic H1 / page title.**  
`verseReference` is for verse citations. Page and stack titles use `screenTitle` / `stackTitle`. Misuse of `verseReference` as generic heading is a known anti-pattern to eliminate during migration.

---

## 6. Spacing and Layout

### Principles

- Consistent **horizontal screen padding** across main shells
- Generous **section gaps** between titled blocks
- Comfortable **card internal padding**
- List rows tall enough for touch (see §8)
- Horizontal carousels may peek the next card; vertical lists use even gutters

### Locked spacing (Batch 0)

From `src/shared/theme/spacing.ts`:

| Token | Value | Notes |
| --- | --- | --- |
| `screenPaddingH` | 20 | Locked horizontal inset |
| `cardPadding` | 24 | Locked card internal padding |
| `sectionGap` | 24 | Semantic alias (`xl`) |
| `formFieldGap` | 16 | Semantic alias (`lg`) |
| `rowGap` | 12 | Semantic alias (`md`) |
| `minTouchTarget` | 44 | Minimum touch target (pt) |
| Scale | `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `xxl` 32 | Unchanged |

Raw `borderRadius: 12` in Settings/Help and duplicated local `MIN_TOUCH_TARGET = 44` remain later-batch consumer debt.

### Layout rules

- Prefer single-column vertical scroll for primary shells
- Use two-up only for equal summary metrics (Activity pattern)
- Avoid dashboard density (stat strips + multiple competing modules) in first viewport unless the screen’s job requires it

---

## 7. Shape and Surface

### Cards

- Corner radius: `radius.card` = **16** (locked)
- Fill: `surface` on `background`
- Stroke: thin `border` (~1pt visual)
- Shadow: **restrained**; prefer border + canvas contrast. `shadows.card` is preserved unchanged in Batch 0; later batches may drop shadow *usage* for Figma parity

### Controls

- `radius.control` = **8** (semantic control radius; independent of legacy `badge`, which remains `8` for existing consumers)

### Pills and chips

- `radius.pill` = **20** (locked)
- Fully rounded / high radius for search fields, streak-style chips, Correct/Wrong badges, period selectors
- Soft semantic pills sit inside a muted track pill on deck cards (Home / Study)

### Icon tiles

- Rounded square tiles with solid fill and contrasting glyph
- Tile color is categorical decoration, not interactive accent by default

### Dividers

- Thin hairlines using `border` color inside grouped cards (Settings, Activity streak header)

### Sheets / tab bar

- Tab bar: `surface` with thin top border; no heavy elevation required

Settings raw `borderRadius: 12` migrates to `radius.card` in Batch 4.

---

## 8. Buttons and Interactive Controls

### Canonical hierarchy (locked for later migration)

Do **not** redesign `AuthPrimaryButton` in Batch 0. Wire these roles in later screen batches:

| Role | Visual | Use |
| --- | --- | --- |
| **Primary CTA** | Filled Ignite **accent** `#E85D4A`, white label, pill radius | Highest-priority action; matches existing Auth filled CTA + brand |
| **Secondary CTA** | **Outlined**: subtle `border`, navy text/icon, transparent/white fill | Canonical secondary container treatment (Figma “Details”-style) |
| **Text action / link** | No container; text only; accent or navy by emphasis | Inline navigation / low emphasis |
| **Destructive action** | `danger` fill or `danger` text | Never use `accent` for errors/destructive |
| **Disabled action** | `disabledBackground` / `disabledText` (or reduced interactivity) | Tokens exist from Batch 0; wire in later batches |

**Auth migration mapping (conceptual, later batches):** existing Auth `variant="secondary"` that is text-only / transparent maps to **Text action / link**, not to the canonical outlined Secondary CTA. Do not invent a second “secondary” brand style. When an outlined secondary is needed, use the Secondary CTA role above.

### Toggles

- Off: light gray track, white thumb (Settings Figma)
- On: accent track (exact specialty deferred; use `accent` when Batch 4 needs it)

### Touch

- **Minimum 44×44 pt** touch target (`spacing.minTouchTarget`) for tappable controls, rows, and icon buttons
- Settings / Profile rows should feel tall (~44–48+), not compact list density

### Feedback

- Pressed states: slight opacity or surface shift; avoid large scale bounces as default
- Do not rely on color alone for state (pair with label / icon)

---

## 9. Inputs and Forms

### Search

- Full-width field on light muted fill (not necessarily a bordered white card)
- Leading magnifying-glass icon; muted placeholder
- Large rounding / pill-like ends

### Text fields (Auth and settings forms)

- Prefer clear label + field; reuse existing Auth form patterns where they already work. Introduce shared form primitives only when an implementation batch demonstrates real duplication — do not create a parallel form kit for visual cleanup alone.
- Borders: thin `border` or soft fill consistent with search
- Error: `danger` text below field (`typography.error`); do not use accent red for errors
- Disabled: `disabledBackground` / `disabledText`; still readable

### Selects / dropdowns

- Compact outlined control with label + chevron (“Weekly”)
- Same radius language as secondary buttons / pills

### Forms guidance

- One primary submit per form view
- Preserve existing Auth validation and navigation behavior during visual passes
- Auth, consent, and account forms use the same cool white / near-white canvas as the rest of the product

---

## 10. Headers and Navigation

### Page headers

- **Root tabs:** Large left-aligned titles via `screenTitle` (Profile, Study) or greeting header (Home)
- **Stacks:** Centered title via `stackTitle` + leading back chevron (Settings, About, account forms, Help & Feedback)
- Trailing icon actions (search, add) use primary text/icon color; adequate hit area

### Top tabs (Study)

- Horizontal tabs; **active = navy text + navy underline** (not accent red)
- Inactive = muted text
- This differs from bottom-tab active treatment and is intentional in Figma
- **Migration note:** Do not add Study top-tabs (or other Study Hub chrome) unless they already exist in product. Style only existing Study functionality (see Batch 7).

### Bottom tab bar

- Items: Home, Study, Practice, Profile (visual language)
- Active: accent icon + accent label
- Inactive: muted icon + muted label
- Surface bar with thin top border

### Visual consistency without behavior change

This system governs **appearance** of headers and tabs. It does **not** authorize changing route structure, tab order, auth gates, deep links, or navigation actions. A visual pass may restyle the tab bar and headers only if destinations and interactions remain identical for the same app state.

---

## 11. Cards, Sections and Rows

### Family resemblance (all product families)

Entry, Auth, consent, onboarding, Home, Profile, Settings, Study, Practice, account forms, Help & Feedback, and placeholders should share:

- Same cool white / near-white canvas / surface / border / radius language
- Same section title weight and horizontal inset
- Same row/card padding rhythm
- Same chevron and icon sizing for navigational rows
- Same soft pill language when showing Correct/Wrong-style stats

### Card types

| Type | Structure | Seen on |
| --- | --- | --- |
| Content card | Title block + body + optional secondary button | Home tournament |
| Media/list card | Icon tile + title + meta + stats strip | Home decks, Study recents |
| Nav row card | Icon + label + chevron (single action) | Profile |
| Grouped settings card | Section title + divided rows + chevron/toggle | Settings |
| Metric card | Icon + labels + large value | Activity |
| Analytics card | Header controls + chart + definition list rows | Activity |

### Sections

- Section title outside or above the card group, left-aligned
- Optional trailing text action in accent (visual pattern; wire only if product already has the destination)

### Rows

- Leading icon (navy for settings chrome; accent for analytics emphasis — be consistent within a family)
- Primary label; optional secondary meta
- Trailing chevron, value, or control
- Dividers between rows inside a grouped card

---

## 12. Iconography

### Style

- Prefer **thin outline / line** icons for navigation and settings chrome
- Accent-filled or accent-tinted icons for emphasis metrics and active tab
- White glyphs on solid rounded tiles for category markers (trophy, heart, etc.)

### Weight and size

- Keep stroke weight consistent within a screen
- Tab icons optically balanced; labels required for clarity
- Settings row icons: monochromatic primary/secondary, not accent (per Settings Figma)

### Semantics

- Do not use decorative category tile colors as status meaning
- Status meaning uses success/danger soft pills or explicit labels
- Flame / streak / trophy motifs in Figma are visual only unless product already implements those concepts

---

## 13. Application States

UI must support required product states (see PRD §48) with system-consistent presentation:

| State | Presentation guidance |
| --- | --- |
| Loading | Skeleton or inline spinner on `surface`/`background`; preserve layout so content does not jump wildly |
| Empty | Calm title + short explanation + optional single primary action; no fake charts/stats |
| Error | Clear message; danger styling for errors; retry action if applicable |
| Access / entitlement | Honest locked/unavailable messaging; do not fake data; UI hide ≠ authorization |
| Success / confirmation | Success soft color sparingly; prefer explicit copy |
| Disabled | Disabled controls per §8; explain why when critical |
| Offline (if product supports) | Banner or inline notice — **only if PRD/product already defines offline**; Figma Offline Study does not authorize it |

Do not invent streak/analytics empty states for features that are not productized. Do not present Figma-only features as disabled or “Coming Soon” unless separately authorized.

---

## 14. Accessibility

- Minimum **44×44 pt** touch targets for interactive elements (`spacing.minTouchTarget`)
- Text contrast: primary text on surface/background must meet readable contrast; muted text only for non-essential meta
- Do not convey meaning by color alone (Correct/Wrong pills include text; errors include text)
- Support Dynamic Type / large content where React Native patterns allow without breaking critical layouts — prefer wrapping over truncation where possible
- Icon-only buttons need accessibility labels
- Tab bar: expose selected state to assistive tech
- Focus order follows visual reading order on web targets
- Motion: keep transitions subtle; respect reduced-motion platform settings when animating

Accessibility and mobile UX are sprint-normal requirements (playbook §11), not deferred polish.

---

## 15. Screen Families

All families belong to the **same** Ignite UI system and use the **same** cool white / near-white application canvas. Differences are layout jobs, not alternate brands or alternate background modes.

| Family | Job | Shared system usage |
| --- | --- | --- |
| Auth / entry / consent / onboarding | Sign-in, registration, recovery, consent, quizzer setup | Same cool white / near-white `background`; Nunito; existing Auth form patterns; primary/secondary buttons |
| Loading / recovery | Profile load, consent recovery, claim pending | Same canvas; system-consistent loading/error presentation |
| Home | Orient + resume | Greeting header, search, section cards — **style only what exists**; omit Figma-only modules |
| Study | Existing flashcard / study presentation | Same type/color/radius; style existing Study screens only — **do not** build future Study Hub |
| Practice | Active learning / quiz flows | Same type/color/radius; denser content OK; preserve domain verse styles correctly |
| Profile | Identity + account entry points | Page title (`screenTitle`), avatar, nav cards — wire only real destinations |
| Settings / account / Help | Configuration and account forms | Centered stack header (`stackTitle`), grouped cards, rows, toggles; same canvas |
| Placeholders | Home / Practice / TournamentDetails placeholders | Style existing placeholders only; do not invent dashboard content |
| Activity / progress (Figma-only today) | Metrics presentation | Visual patterns for a **future** sprint — **do not build now** |
| Modals / sheets | Focused tasks | Surface, radius, primary/secondary actions |

Study is part of the system from day one of the spec. Existing Study / flashcard presentation migrates in Batch 7; future Study Hub features from Figma are out of scope until their sprint arrives.

---

## 16. Figma Interpretation Rules

### Screenshots = visual language only

Use Figma to learn:

- Color roles and accent restraint
- Type hierarchy and Nunito Sans character
- Spacing rhythm and card geometry
- Row/card/nav patterns
- Soft semantic pills and chart styling motifs

### Screenshots ≠ product requirements

**If something exists only in Figma and is not implemented, do not add it** — including disabled or “Coming Soon” shells — unless separately authorized.

**Do not authorize or implement from Figma alone (examples):**

- Dark Mode
- Notifications
- Offline Study / Download Cards / Auto-download
- Streaks / weekly streak flames / streak counters / future streak visualization
- Study analytics / Focus Score / Break Pattern / verses-learned charts / Activity metrics
- Tournament dashboard modules / upcoming tournament product surfaces
- Future Practice product surfaces beyond what exists today
- Future Study Hub (Study top-tabs, Recently Studied browser, deck browser, global search, tournament material, smart collections, new Study navigation)
- AI Coach
- Search-your-material as a new global search product
- Sample user names, avatars, addresses, verse ranges, stats, version numbers

**Figma = how future features may look when their sprint arrives; not what gets built now.**

### Illustrative content

All names (“Faith Forsythe”), pets/avatars, locations (“Bakersfield”), counts, and timestamps are **placeholders**.

### When Figma and PRD conflict

**PRD wins** for behavior and scope. Figma wins only for visual treatment of in-scope surfaces.

### When Figma and current theme conflict

Establish semantic roles from Figma language; map or replace tokens in a deliberate token pass. Do not blindly keep a legacy color because it already exists (e.g., dual reds, leftover warm onboarding backgrounds after migration, `verseReference` as H1).

---

## 17. Anti-Patterns

1. Using `verseReference` typography as a generic page H1  
2. Multiple arbitrary reds for the same interactive accent job  
3. Using accent red for error/destructive messaging  
4. Heavy multi-layer shadows or glow effects as default elevation  
5. Sharp small-radius cards that break family resemblance  
6. Dashboard clutter: too many competing modules in the first viewport  
7. Cards-for-decoration (if removing border/fill does not hurt understanding or interaction, reconsider)  
8. Hard-coding hex/spacing in screen files instead of theme tokens  
9. Treating Figma-only features as committed backlog — including disabled / “Coming Soon” unless separately authorized  
10. Changing navigation destinations or auth behavior during a “visual only” pass  
11. Logging or displaying sensitive data in UI chrome  
12. UI-only entitlement hiding without backend authorization  
13. Inconsistent screen backgrounds across product families  
14. Legacy warm onboarding backgrounds remaining after migration (target is one cool-white canvas; `brandWarmBackground` is temporary legacy only, not a target role)  
15. Screen-local background colors that bypass the canonical semantic `background` token  
16. Inventing false precision (“exactly 18px radius”) without token confirmation  
17. Moving/renaming Auth UI modules, restructuring feature folders, or creating a parallel UI kit solely for visual cleanup  
18. Making a future feature appear implemented during a visual migration  
19. Defining general `danger` / `success` as references to study-domain mastery keys  

---

## 18. Migration Plan

Documentation and tokens first; screens in batches. Future semantic tokens are **additive**. Do not move/rename Auth UI, restructure feature folders, or create a parallel UI kit solely for visual cleanup. Shared components may be introduced or generalized only when an implementation batch demonstrates real duplication.

### Batch 0 — Semantic Tokens & Foundation

Establish the target semantic design roles additively. No full screen redesign yet. **Implemented:** semantic colors, typography roles (incl. `screenTitle` / `stackTitle`), spacing aliases (incl. `minTouchTarget`), `radius.control`, legacy JSDoc on `brandWarmBackground`, and this document synced.

### Batch 1 — Entry + Authentication

- IgniteEntry, Welcome, SignIn, ForgotPassword

All use canonical cool-white application canvas.

### Batch 2 — Privacy + Parental Consent + Create Account

- PrivacyAge, ParentConsentIntro, ParentEmail, ConsentPending, ConsentChangeEmail, ConsentRecovery, CreateAccount, ConsentClaimPending

Same visual system; do not touch consent/authentication behavior.

### Batch 3 — Quizzer Onboarding + Lifecycle States

- QuizzerName, QuizzerProfileLoading, QuizzerProfileLoadError

### Batch 4 — Profile + Settings + About

- ProfileHome, Settings, About, SettingsRow presentation

### Batch 5 — Account Forms + Help & Feedback

- EditName, ChangeEmail, ChangePassword, HelpAndFeedback, FeedbackCompose

### Batch 6 — Main Navigation + Existing Placeholder Surfaces

- BottomTabNavigator, Home/Practice/TournamentDetails placeholders, PlaceholderScreen

IMPORTANT: remain placeholders. Do NOT build Figma Home/Practice/Tournament/Activity/analytics/streak/dashboard functionality. Style only what currently exists.

### Batch 7 — Existing Study / Flashcard Presentation

- FlashcardStudyRoute UI states, FlashcardStudyScreen, existing Study components, loading/empty/error/session-complete

IMPORTANT: Do NOT implement future Study Hub from Figma. Do NOT add Study top-tabs, Recently Studied, deck browser, global search, tournament material, smart collections, new Study navigation. Only style existing functionality.

### Batch 8 — Full Existing-Screen Consistency Audit

Re-inventory every reachable screen and loading/empty/error/success/recovery/nav/header/tab states vs IGNITE_UI_SYSTEM.md. No legacy visual treatment left accidental.

### Migration rules

- One batch → review → next  
- No feature scope creep mid-visual-pass  
- Do not add Figma-only features (including disabled / “Coming Soon”) unless separately authorized  
- Automated tests / visual checks appropriate to each batch  
- Report what was and was not manually tested  

---

## 19. Visual Regression Rule

A UI redesign pass is allowed to change layout, color, type, and component styling. It is **not** allowed to change product behavior.

> "A screen may look substantially different after a UI pass, but given the same application state and the same user interaction, it must perform the same action, preserve the same data behavior, and navigate to the same destination as before."

If a visual change would require a new destination, new data write, or new entitlement rule, stop and treat that as a product change outside this UI system document.

---

## 20. Token Decisions (Batch 0 locked)

### LOCKED IN BATCH 0

| Decision | Locked value / key |
| --- | --- |
| Canonical canvas | `colors.background` = `#F5F5F7` |
| Surface | `colors.surface` = `#FFFFFF` |
| Primary text | `colors.textPrimary` = `#0A2540` |
| Secondary text | `colors.textSecondary` = `#6B7280` |
| Muted text | `colors.textMuted` = `#9CA3AF` |
| Accent | `colors.accent` = `#E85D4A` |
| Danger / soft | `colors.danger` = `#EF4444`; `colors.dangerSoft` = `#FEE2E2` |
| Success / soft | `colors.success` = `#22C55E`; `colors.successSoft` = `#DCFCE7` |
| Border | `colors.border` = `#E5E7EB` (no separate divider) |
| Disabled | `colors.disabledBackground` / `colors.disabledText` |
| Typography | `screenTitle`, `stackTitle`, `sectionTitle`, `cardTitle`, `body`, `bodySecondary`, `label`, `action`, `input`, `helper`, `error` |
| Spacing | `screenPaddingH` 20, `cardPadding` 24, `sectionGap` 24, `formFieldGap` 16, `rowGap` 12, `minTouchTarget` 44 |
| Radii | `radius.card` 16, `radius.control` 8, `radius.pill` 20 |
| Primary CTA | Accent-filled `#E85D4A`, white label, pill radius |
| Secondary CTA | Outlined border + navy text (Auth text-only secondary → Text action) |
| Soft pills | successSoft / dangerSoft pairs locked |
| Shadows | `shadows.card` preserved unchanged in Batch 0 |
| Warm canvas | **Not a target role** — `brandWarmBackground` legacy only |

### DEFER UNTIL FEATURE EXISTS

Do not invent tokens for Figma-only visualization before the feature ships:

- Chart palette
- Analytics visualization colors
- Advanced categorical icon-tile palette
- Tournament visualization colors
- Future streak visualization
- Soft accent pill beyond success/danger soft
- Separate `divider` token
- `metric` / Study Hub / Activity typography
- Other Figma-only visualization tokens

---

## Appendix A — Source map

| Kind | Path / source |
| --- | --- |
| This spec | `docs/design/IGNITE_UI_SYSTEM.md` |
| Theme colors / type / radius / shadows | `src/shared/theme/theme.ts` |
| Fonts | `src/shared/theme/fonts.ts` |
| Spacing | `src/shared/theme/spacing.ts` |
| Product truth | `docs/product/PRD.md` |
| Build process | `docs/development/Ignite_Development_Playbook.md` |
| Figma refs reviewed | Home, Profile, Activity, Settings, Study screenshots |

## Appendix B — Decision index

See §20. Summary:

| Timing | Decisions |
| --- | --- |
| Locked in Batch 0 | Cool-white canvas, surface, navy/secondary/muted, accent, danger, success, border, disabled, title/body type (incl. `stackTitle`), screen/section spacing, radii, CTAs, min touch target, soft pill pairs; primary CTA = accent-filled; `shadows.card` preserved |
| Defer until feature exists | Chart palette, analytics viz, advanced icon-tile palette, tournament viz, streak viz, soft accent, separate divider, metric type, other Figma-only viz tokens |
| Not a target decision | Separate warm Auth/onboarding background (`background.brand` as cream mode) |

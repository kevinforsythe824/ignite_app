# Ignite UI System

Permanent visual-language specification for the Ignite app UI redesign. This document defines how Ignite should look and feel across screens. It does **not** authorize product features, change navigation behavior, or modify theme/application code by itself.

**Status:** Batch 0 Main Product semantic tokens implemented — theme and this document are synchronized for Main Product Mode. **Two intentional presentation modes** (Auth / Onboarding Brand Mode vs Main Product Mode) are specified here. Auth Brand Mode tokens `authBackgroundStart` (`#FFF5F0`), `authBackgroundEnd` (`#FFFBFA`), and `authAccent` (`#D04925`) are **approved and locked** in theme. `authAccentSoft` remains deferred. Historical reference `#FF5A2E` is superseded for accessibility (not a theme token). Screen migration to Auth Brand Mode continues in later batches.

**Branch context:** `feature/s2-ui-redesign`  
**Theme sources of truth:**

- `src/shared/theme/theme.ts`
- `src/shared/theme/fonts.ts`
- `src/shared/theme/spacing.ts`

Semantic tokens are **additive** (extend theme; do not break existing consumers overnight). Auth UI primitives remain the de-facto shared layer for now; do **not** move or rename Auth UI, restructure feature folders, or create a parallel UI kit solely for visual cleanup. Shared components may be introduced or generalized only when an implementation batch demonstrates real duplication.

---

## 1. Purpose and Scope

### Purpose

Establish **one Ignite visual system with two intentional presentation modes** so Entry, Auth, consent, onboarding, loading/recovery, Home, Study, Practice, Profile, Settings, account forms, Help & Feedback, placeholders, and related surfaces share the same visual DNA (Nunito Sans, navy typography, existing flame identity, spacing, radius, accessibility) while using the correct canvas for their job — Auth / Onboarding Brand Mode vs Main Product Mode — and product behavior stays governed by the PRD and existing application logic.

This is **not** two brands and **not** inconsistency. Differentiated canvases are deliberate.

### In scope

- Visual language derived from Figma reference screens (Home, Profile, Activity, Settings, Study) for **Main Product Mode**
- Visual language cues from Auth / Welcome brand references (composition, gradient, CTA energy, hierarchy, spacing) for **Auth / Onboarding Brand Mode** — presentation only
- Semantic design roles (color, type, spacing, shape, controls), including locked Auth Brand Mode tokens (`authBackgroundStart` / `authBackgroundEnd` / `authAccent`)
- Screen-family guidance and migration sequencing
- Rules for interpreting Figma / screenshots vs product requirements
- Accessibility and application-state expectations for UI presentation

### Out of scope (this document)

- Implementing or authorizing features that appear only in Figma or marketing mocks
- Changing Firebase / Auth / Firestore / Functions
- Relocating or renaming Auth UI modules, restructuring feature folders, or creating a parallel UI kit without demonstrated duplication
- Applying Auth Brand Mode tokens to screens / splash (separate visual batches)

### Relationship to product truth

Product requirements live in `docs/product/PRD.md`. Figma screenshots and Auth brand references are **visual language only**. If a mock shows Offline Study, Dark Mode, streaks, analytics, tournaments, marketing badges, or similar, that does not make those features in-scope for implementation unless the PRD already requires them and a separate product authorization exists.

### Current functionality rule

> The UI redesign styles the product that exists today. Figma and brand screenshots determine visual language, not implementation scope. A visual migration must never make a future feature appear implemented.

---

## 2. Figma Visual Analysis

Five Figma reference screens were reviewed as **Main Product Mode** visual-language sources. Sample names, avatars, locations, stats, and copy are illustrative only.

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

### Cross-screen visual constants observed (Main Product Mode)

| Pattern | Observation |
| --- | --- |
| Canvas | Cool-white / near-white flat background behind white surfaces — **canonical for Main Product Mode** (`#F5F5F7`) |
| Surfaces | White cards, thin light borders, large rounding (~16–20 visual range) |
| Text | Dark navy primary; mid gray secondary/muted |
| Accent | One vibrant red/coral (`#E85D4A` family) for active nav, links, emphasis icons, trend callouts |
| Semantic pills | Soft green “Correct”; soft pink/red “Wrong” |
| Type | Rounded geometric sans (Nunito Sans); bold titles, regular supporting |
| Nav | Four-tab bar; inactive muted gray; active accent red (except Study top tabs use navy underline) |
| Elevation | Borders + background contrast first; shadows restrained or absent |

### Auth Brand reference analysis (visual language only)

A Welcome / Get-Started style mock informs **Auth / Onboarding Brand Mode** presentation cues. Adopt composition, canvas energy, CTA emphasis, hierarchy, and spacing — **not** alternate logos, marketing copy, feature backlog, or product behavior.

**Adopt as presentation cues:**

- Top-left brand lockup (existing Ignite flame + “Ignite” wordmark) with safe-area inset — **Welcome screen only**
- **Light warm blush/peach-to-near-white Auth gradient** (low contrast; highly readable; not saturated orange)
- Large confident multi-line headline; navy + bright-orange accent on a key phrase (visual energy only — not product copy)
- White rounded value/feature cards with soft elevation and peach-tinted icon wells
- Large bright-orange filled primary CTA (white label); secondary text link with orange action portion
- Generous vertical rhythm; polished youthful energy without childish decoration

**Explicitly do NOT adopt from the reference:**

- Alternate logo / circular badge flame (use **existing Ignite flame** — `assets/brand/ignite-flame.png` / `IgniteBrandMark`)
- Marketing badge copy (e.g. “COMPETITIVE SCRIPTURE RECALL”)
- Marketing headline / subcopy / “Get Started Free” / arrow affordance as product requirements
- Feature count, icons, or card content as product backlog
- Any new drills, streaks, tournaments, search, analytics, notifications, offline study
- Repeating the logo/wordmark on every Auth/Onboarding screen

**Typeface note:** Reference may appear geometric sans; Ignite keeps **Nunito Sans** as shared DNA.

Cool-white `#F5F5F7` remains the **Main Product** canvas. Auth / Onboarding uses the **light warm blush/peach-to-near-white Auth gradient**, not the cool-white product canvas as its final Brand Mode target.

---

## 3. Design Principles

1. **One system, two modes** — Entry, Auth, consent, onboarding, Home, Profile, Settings, Study, Practice, and stacks share one product family and shared visual DNA, with **two intentional presentation modes**: Auth / Onboarding Brand Mode and Main Product Mode. This is deliberate differentiation, not inconsistency.
2. **Two intentional canvases** — Auth / Onboarding Brand Mode uses a **light warm blush/peach-to-near-white Auth gradient** (low contrast, highly readable). Main Product Mode uses cool-white / near-white flat `colors.background` `#F5F5F7`. Do not force cool-white as the final Auth Brand look; do not use the Auth gradient as the default Main Product canvas.
3. **Semantic first** — Prefer roles (`background`, `surface`, `textPrimary`, `accent`, and Auth Brand roles `authBackgroundStart` / `authBackgroundEnd` / `authAccent`) over ad-hoc hex picks or screen-local color literals.
4. **Quiet structure** — Depth comes from canvas vs surface contrast and thin borders, not heavy shadows or decorative chrome.
5. **Soft geometry** — Large card radii, pill controls, and rounded icon tiles; avoid sharp, dense, dashboard clutter.
6. **Accent by mode** — Main Product uses one interactive accent coral (`#E85D4A`) for chrome emphasis. Auth / Onboarding Brand Mode uses brighter Auth Brand accent `authAccent` (`#D04925`) for primary CTAs, links, and selective highlights. Do not invent multiple oranges for the same job within a mode. Danger stays separate from both. Historical reference `#FF5A2E` is superseded for accessibility (not a theme token).
7. **Hierarchy over decoration** — Type weight/size and spacing carry hierarchy; avoid competing badges, chips, and callouts in the same viewport.
8. **Figma / screenshots are language, not backlog** — Visual patterns may be adopted; feature content and marketing copy may not. Do not add Figma-only or mock-only features (including disabled / “Coming Soon” shells) unless separately authorized.
9. **Current functionality only** — The UI redesign styles the product that exists today. A visual migration must never make a future feature appear implemented.
10. **Behavior stability** — UI passes may change appearance; they must not change actions, data behavior, or destinations for the same state and interaction.
11. **Additive evolution** — New tokens extend `src/shared/theme/*`; do not force a big-bang rename of Auth or existing consumers. Do not proactively move/rename Auth components, restructure feature folders, or create a parallel UI kit solely for visual cleanup. Shared components may be generalized only when a batch demonstrates real duplication.
12. **Inclusive by default** — Meet touch, contrast, and state requirements as first-class design constraints, not polish.
13. **Welcome-only brand lockup** — The top-left Ignite flame + wordmark lockup is the Welcome branded entry pattern. Secondary Auth / Onboarding screens use back/title hierarchy within the same Brand Mode canvas — no repeated logo/wordmark chrome.

---

## 4. Color System

Batch 0 **Main Product** semantic roles are **locked** in `src/shared/theme/theme.ts`. Flat keys only — no nested `colors.semantic.*`. Hex coincidence with legacy/domain keys is OK; ownership stays separate (see §4.1). Auth Brand Mode tokens `authBackgroundStart`, `authBackgroundEnd`, and `authAccent` are **approved and locked** (additive; Main Product hexes unchanged). `authAccentSoft` remains deferred.

### AUTH / ONBOARDING BRAND MODE

**Surfaces:** Native splash / IgniteEntry continuity; Welcome; Sign In; Forgot Password; Privacy / age gate; under-13 parental consent family; Create Account; Quizzer Name; onboarding/lifecycle loading, error, and recovery covers that belong to the pre-main-app flow.

**Canonical Auth canvas phrase:**

> **light warm blush/peach-to-near-white Auth gradient**

| Direction | Description |
| --- | --- |
| Top | Very light blush / peach / warm tint |
| Bottom | Soft near-white / very-light neutral |
| Contrast | Low-contrast canvas; highly readable; white/light cards and fields stay visually distinct; deep navy text retains strong contrast |

**The Auth background itself must NOT become:** saturated orange; strongly pink; high-contrast; visually competitive with content.

**Vivid orange belongs primarily to:** primary CTA buttons; interactive links; selective highlights — **not** the canvas fill.

**Approved Auth Brand tokens (locked in theme):**

| Role | Theme key | Locked value | Purpose |
| --- | --- | --- | --- |
| `authBackgroundStart` | `colors.authBackgroundStart` | `#FFF5F0` | Gradient top — very light blush / peach / warm tint (low contrast) |
| `authBackgroundEnd` | `colors.authBackgroundEnd` | `#FFFBFA` | Gradient bottom — soft near-white / very-light warm-neutral |
| `authAccent` | `colors.authAccent` | `#D04925` | Auth Brand orange for primary CTAs / emphasis links (white-on-accent ≈ 4.50:1) |

**Deferred:** `authAccentSoft` (soft peach highlight / icon-well fill) — not required yet; Welcome value rows may keep local multi-tone wells until a later unification batch.

**Historical reference only:** `#FF5A2E` was an earlier Auth CTA visual candidate. It is **superseded for accessibility** (white text ≈ 3.11:1, insufficient for robust CTA label contrast) and is **not** a theme token. Do not ship it as `authAccent`.

**Reuse without new tokens:** `surface` / white fields; navy / secondary / muted text; `border` `#E5E7EB`; `radius.*`, spacing, type roles. Do **not** add `authSurface` or `authBorder`.

**Splash continuity:** Native splash + IgniteEntry should align with Auth Brand Mode (prefer solid `authBackgroundStart` `#FFF5F0`), not cool-white product canvas. Splash/Entry may show the flame mark as launch continuity; that does **not** authorize repeating the Welcome brand lockup on secondary Auth forms. Splash wiring is a separate continuity pass from the token lock.

### MAIN PRODUCT MODE

**Surfaces:** Home, Study, Practice, Profile, Settings, account-management once inside the main shell, Help & Feedback, placeholders, future analytics/tournament product UIs.

**Canvas:** Flat `colors.background` `#F5F5F7` (cool-white / near-white). White cards, navy text, Ignite accent `#E85D4A` for chrome emphasis, thin neutral borders, restrained shadows, large rounded cards.

**Do not** use the Auth gradient as the default Main Product canvas.

### Locked Main Product semantic roles (Batch 0)

| Role | Theme key | Locked value | Purpose |
| --- | --- | --- | --- |
| `background` | `colors.background` | `#F5F5F7` | Canonical **Main Product** app canvas behind cards — cool white / near-white |
| `surface` | `colors.surface` | `#FFFFFF` | Cards, sheets, tab bar; also reusable white fields/cards on Auth gradient |
| `text.primary` | `colors.textPrimary` | `#0A2540` | Titles, primary labels, values |
| `text.secondary` | `colors.textSecondary` | `#6B7280` | Supporting body, subtitles |
| `text.muted` | `colors.textMuted` | `#9CA3AF` | Placeholders, inactive chrome, meta |
| `accent` | `colors.accent` | `#E85D4A` | Main Product active tab, text links, emphasis icons, positive trend callouts |
| `danger` | `colors.danger` | `#EF4444` | Destructive actions and error emphasis (general UI) |
| `danger.soft` | `colors.dangerSoft` | `#FEE2E2` | Soft error / Wrong-pill fill (general UI) |
| `success` | `colors.success` | `#22C55E` | Positive confirmation, Correct emphasis (general UI) |
| `success.soft` | `colors.successSoft` | `#DCFCE7` | Soft success / Correct-pill fill (general UI) |
| `border` | `colors.border` | `#E5E7EB` | Card outlines, dividers, outlined controls |
| `disabled` fill | `colors.disabledBackground` | `#E5E7EB` | Disabled control fill |
| `disabled` text | `colors.disabledText` | `#9CA3AF` | Disabled label |

No separate `divider` token — use `border`. Soft accent (`accent.soft`) is deferred for Main Product.

Legacy keys (`accentRed`, `cardWhite`, `navy`, `borderLight`, `practicingRed`, `masteredGreen`, `brandWarmBackground`, etc.) remain exported with unchanged values for existing consumers.

### Legacy warm flat canvas

`colors.brandWarmBackground` (`#F7F3EE`) is a **legacy flat warm interim** token — closer in spirit to Auth Brand Mode than cool-white, but still a **flat** cream, **not** the target soft **light warm blush/peach-to-near-white Auth gradient**. Target consumers should migrate to `authBackgroundStart` / `authBackgroundEnd`.

- Do **not** treat “any warm Auth canvas” as an anti-pattern.
- Do **not** treat flat cream as the Auth Brand Mode target.
- Keep `brandWarmBackground` until Auth Brand Mode gradient consumers migrate; remove only after audit (Batch 8+).
- Do not introduce `background.brand` as a separate cream mode alongside the Auth gradient tokens.
- Do not alias `brandWarmBackground` to the gradient endpoints.

### 4.1 General semantic vs study-domain ownership

Approved hex coincidence is OK; ownership must stay separate. Semantic keys are **independent string literals**, not references to study/mastery keys.

| General UI semantic | Literal | Related legacy/domain key (unchanged) | Ownership rule |
| --- | --- | --- | --- |
| `danger` | `#EF4444` | `practicingRed` | Semantic is **not** an alias of practicingRed; Study may later change mastery reds without redefining global error |
| `dangerSoft` | `#FEE2E2` | `practicingRedBg` | Same independence |
| `success` | `#22C55E` | `masteredGreen` | Semantic is **not** owned by mastery green |
| `successSoft` | `#DCFCE7` | `masteredGreenBg` | Same independence |
| `accent` | `#E85D4A` | `accentRed` | Main Product brand accent; Study must not redefine for mastery |
| `markQuestion` etc. | domain | — | Never promote to general chrome |

Study/mastery tokens continue to be imported only by flashcard/study UI. General screens should migrate to `danger` / `success` / `accent` (and Auth Brand roles where applicable) in later batches.

### Accent policy

- **Main Product:** One interactive accent coral (`#E85D4A`) for active navigation, primary emphasis links, and non-destructive highlight callouts.
- **Auth / Onboarding Brand Mode:** Brighter Auth Brand orange via locked `authAccent` (`#D04925`) for primary CTAs, interactive links, and selective highlights. Keep Main Product on `#E85D4A` unless a later product decision unifies accents. Prefer bold / action-weight for orange link text on the Auth gradient.
- **Danger is separate** (`#EF4444`). Never use product `accent` or Auth Brand orange for errors/destructive actions.
- Soft semantic pills (Correct / Wrong) use soft fills + darker semantic text; they are not a second brand accent.
- **Historical:** `#FF5A2E` superseded for accessibility — not a theme token.

### Domain colors (out of chrome system)

Keyword marks, verse highlights, mastery states, and similar learning-domain colors remain specialized tokens. They must not be used as general UI chrome.

---

## 5. Typography

### Family

**Nunito Sans** is the Ignite UI typeface across both modes (see `src/shared/theme/fonts.ts`: regular / medium / bold / extraBold).

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
- Fill: `surface` on the appropriate mode canvas (Auth gradient or Product cool-white)
- Stroke: thin `border` (~1pt visual); subtle warm borders on Auth only if a dedicated token is later approved
- Shadow: **restrained**; prefer border + canvas contrast. `shadows.card` is preserved unchanged in Batch 0; later batches may drop shadow *usage* for Figma parity. Soft restrained elevation is appropriate on Auth Brand value cards.

### Controls

- `radius.control` = **8** (semantic control radius; independent of legacy `badge`, which remains `8` for existing consumers)

### Pills and chips

- `radius.pill` = **20** (locked)
- Fully rounded / high radius for search fields, streak-style chips, Correct/Wrong badges, period selectors
- Soft semantic pills sit inside a muted track pill on deck cards (Home / Study)

### Icon tiles

- Rounded square tiles with solid fill and contrasting glyph
- Tile color is categorical decoration, not interactive accent by default
- Auth Brand value cards may use peach-tinted icon wells; shared `authAccentSoft` remains deferred

### Dividers

- Thin hairlines using `border` color inside grouped cards (Settings, Activity streak header)

### Sheets / tab bar

- Tab bar: `surface` with thin top border; no heavy elevation required (Main Product)

Settings raw `borderRadius: 12` migrates to `radius.card` in Batch 4.

---

## 8. Buttons and Interactive Controls

### Canonical hierarchy (locked for later migration)

Do **not** redesign `AuthPrimaryButton` in Batch 0. Wire these roles in later screen batches (Auth Brand Mode after Auth tokens lock):

| Role | Visual | Use |
| --- | --- | --- |
| **Primary CTA** | **Main Product:** filled Ignite **accent** `#E85D4A`, white label, pill radius. **Auth / Onboarding Brand Mode:** filled Auth Brand accent `authAccent` `#D04925`, white label, large/high-emphasis, rounded/pill | Highest-priority action |
| **Secondary CTA** | **Outlined**: subtle `border`, navy text/icon, transparent/white fill | Canonical secondary container treatment when a contained secondary is truly needed (Figma “Details”-style on Product) |
| **Text action / link** | No container; text only. **Auth:** `authAccent` (primary emphasis; prefer bold/action weight) or navy (lower emphasis). **Product:** accent or navy by emphasis | Inline navigation / low emphasis |
| **Destructive action** | `danger` fill or `danger` text | Never use product `accent` or Auth Brand orange for errors/destructive |
| **Disabled action** | `disabledBackground` / `disabledText` (or reduced interactivity) | Tokens exist from Batch 0; wire in later batches |

**Auth migration mapping (conceptual, later batches):** existing Auth `variant="secondary"` that is text-only / transparent maps to **Text action / link**, not to the canonical outlined Secondary CTA. Do not invent a second “secondary” brand style. When an outlined secondary is needed, use the Secondary CTA role above.

### Toggles

- Off: light gray track, white thumb (Settings Figma)
- On: accent track (exact specialty deferred; use product `accent` when Batch 4 needs it)

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
- Error: `danger` text below field (`typography.error`); do not use accent red / Auth Brand orange for errors
- Disabled: `disabledBackground` / `disabledText`; still readable
- **Auth / Onboarding Brand Mode:** forms sit on the **light warm blush/peach-to-near-white Auth gradient**; white/light fields remain visually distinct
- **Main Product Mode:** account and settings forms sit on cool-white `#F5F5F7`

### Selects / dropdowns

- Compact outlined control with label + chevron (“Weekly”)
- Same radius language as secondary buttons / pills

### Forms guidance

- One primary submit per form view
- Preserve existing Auth validation and navigation behavior during visual passes
- Auth, consent, and onboarding forms use Auth Brand Mode canvas; in-app account forms use Main Product canvas

---

## 10. Headers and Navigation

### Brand header pattern (Auth / Onboarding)

#### WELCOME — top-left Ignite brand lockup

Welcome is the **primary branded entry point**:

- Existing Ignite flame asset (not an alternate reference logo)
- Ignite wordmark / name
- Top-left alignment with intentional safe-area spacing
- Compact header scale (visual proportions inspired by brand reference — not centered splash-scale flame)

#### ALL OTHER AUTH / ONBOARDING SCREENS — no repeated logo/wordmark

Sign In, Forgot Password, Privacy Age, Create Account, Parent Consent Intro, Parent Email, Consent Pending, Consent Change Email, Consent Recovery, Consent Claim Pending, Quizzer Name, Quizzer Profile Loading, and Quizzer Profile Load Error use **normal title / back composition** within Auth / Onboarding Brand Mode.

Do **not** repeat the Ignite logo/wordmark on those screens. They express Brand Mode through the shared light warm blush/peach-to-near-white Auth gradient, navy typography, `authAccent` primary CTA, orange text actions where appropriate, white/light fields and cards, consistent spacing/rounded geometry, and task-first hierarchy.

Splash/Entry flame continuity for launch does **not** authorize Welcome-scale brand lockup chrome on secondary Auth forms.

### Page headers (Main Product and stacks)

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
- Active: accent icon + accent label (Main Product `accent`)
- Inactive: muted icon + muted label
- Surface bar with thin top border

### Visual consistency without behavior change

This system governs **appearance** of headers and tabs. It does **not** authorize changing route structure, tab order, auth gates, deep links, or navigation actions. A visual pass may restyle the tab bar and headers only if destinations and interactions remain identical for the same app state.

---

## 11. Cards, Sections and Rows

### Family resemblance (shared DNA, not identical canvas)

Entry, Auth, consent, onboarding, Home, Profile, Settings, Study, Practice, account forms, Help & Feedback, and placeholders should share:

- Shared DNA: Nunito Sans, navy primary text, surface/border/radius language, section title weight, horizontal inset, row/card padding rhythm, chevron/icon sizing, soft pill language when showing Correct/Wrong-style stats
- Mode-appropriate canvas: Auth Brand Mode gradient vs Main Product cool-white — **family resemblance ≠ identical canvas**

### Card types

| Type | Structure | Seen on |
| --- | --- | --- |
| Content card | Title block + body + optional secondary button | Home tournament |
| Media/list card | Icon tile + title + meta + stats strip | Home decks, Study recents |
| Nav row card | Icon + label + chevron (single action) | Profile |
| Grouped settings card | Section title + divided rows + chevron/toggle | Settings |
| Metric card | Icon + labels + large value | Activity |
| Analytics card | Header controls + chart + definition list rows | Activity |
| Auth value / feature card | White rounded card, soft elevation, optional peach icon well | Welcome (Auth Brand Mode) |

### Sections

- Section title outside or above the card group, left-aligned
- Optional trailing text action in accent (visual pattern; wire only if product already has the destination; use `authAccent` on Auth surfaces)

### Rows

- Leading icon (navy for settings chrome; accent for analytics emphasis — be consistent within a family)
- Primary label; optional secondary meta
- Trailing chevron, value, or control
- Dividers between rows inside a grouped card

---

## 12. Iconography

### Style

- Prefer **thin outline / line** icons for navigation and settings chrome
- Accent-filled or accent-tinted icons for emphasis metrics and active tab (product `accent` on Main Product; `authAccent` on Auth Brand Mode)
- White glyphs on solid rounded tiles for category markers (trophy, heart, etc.)

### Weight and size

- Keep stroke weight consistent within a screen
- Tab icons optically balanced; labels required for clarity
- Settings row icons: monochromatic primary/secondary, not accent (per Settings Figma)

### Semantics

- Do not use decorative category tile colors as status meaning
- Status meaning uses success/danger soft pills or explicit labels
- Flame / streak / trophy motifs in Figma are visual only unless product already implements those concepts
- Existing Ignite flame asset is identity for Welcome lockup (+ splash/Entry continuity), not chrome on every Auth form

---

## 13. Application States

UI must support required product states (see PRD §48) with system-consistent presentation:

| State | Presentation guidance |
| --- | --- |
| Loading | Skeleton or inline spinner on `surface` / mode canvas; preserve layout so content does not jump wildly. **Onboarding / pre-main-app** load covers use Auth Brand Mode canvas; **in-app** loading uses Main Product cool-white |
| Empty | Calm title + short explanation + optional single primary action; no fake charts/stats |
| Error | Clear message; danger styling for errors; retry action if applicable. Onboarding lifecycle errors (e.g. Quizzer Profile Load Error) stay on Auth Brand Mode canvas |
| Access / entitlement | Honest locked/unavailable messaging; do not fake data; UI hide ≠ authorization |
| Success / confirmation | Success soft color sparingly; prefer explicit copy |
| Disabled | Disabled controls per §8; explain why when critical |
| Offline (if product supports) | Banner or inline notice — **only if PRD/product already defines offline**; Figma Offline Study does not authorize it |

Do not invent streak/analytics empty states for features that are not productized. Do not present Figma-only features as disabled or “Coming Soon” unless separately authorized.

---

## 14. Accessibility

- Minimum **44×44 pt** touch targets for interactive elements (`spacing.minTouchTarget`)
- Text contrast: primary text on surface / mode canvas must meet readable contrast; muted text only for non-essential meta. Auth Brand Mode requires high content contrast on a **low-contrast** gradient canvas
- Do not convey meaning by color alone (Correct/Wrong pills include text; errors include text)
- Support Dynamic Type / large content where React Native patterns allow without breaking critical layouts — prefer wrapping over truncation where possible
- Icon-only buttons need accessibility labels
- Tab bar: expose selected state to assistive tech
- Focus order follows visual reading order on web targets
- Motion: keep transitions subtle; respect reduced-motion platform settings when animating

Accessibility and mobile UX are sprint-normal requirements (playbook §11), not deferred polish.

Auth Brand Mode locked contrast targets: white on `authAccent` CTA (~4.50:1); navy on gradient (AAA); prefer bold/action-weight for `authAccent` link text on the gradient (~4.2–4.4:1); white surfaces remain distinct via border/shadow; danger stays `#EF4444`. Historical `#FF5A2E` remains reference-only (insufficient white CTA contrast).

---

## 15. Screen Families

All families belong to the **same** Ignite UI system and shared visual DNA. Differences of canvas and chrome are **two intentional modes**, not alternate brands.

### AUTH / ONBOARDING BRAND MODE

| Family | Job | Mode usage |
| --- | --- | --- |
| Auth / entry / consent / onboarding | Sign-in, registration, recovery, consent, quizzer setup | **Light warm blush/peach-to-near-white Auth gradient** (`authBackgroundStart` → `authBackgroundEnd`); Nunito; existing Auth form patterns; Auth Brand primary/secondary/text actions via `authAccent`. **Welcome** = top-left Ignite brand lockup. **All other Auth/Onboarding screens** = Brand Mode without logo/wordmark chrome (back/title first) |
| Loading / recovery (pre-main-app) | Profile load, consent recovery, claim pending, Quizzer Profile Loading / Load Error | Same Auth Brand Mode canvas; system-consistent loading/error presentation; **no** repeated logo/wordmark |

### MAIN PRODUCT MODE

| Family | Job | Mode usage |
| --- | --- | --- |
| Home | Orient + resume | Cool-white canvas; greeting header, search, section cards — **style only what exists**; omit Figma-only modules |
| Study | Existing flashcard / study presentation | Cool-white; same type/color/radius; style existing Study screens only — **do not** build future Study Hub |
| Practice | Active learning / quiz flows | Cool-white; denser content OK; preserve domain verse styles correctly |
| Profile | Identity + account entry points | Cool-white; page title (`screenTitle`), avatar, nav cards — wire only real destinations |
| Settings / account / Help | Configuration and account forms | Cool-white; centered stack header (`stackTitle`), grouped cards, rows, toggles |
| Placeholders | Home / Practice / TournamentDetails placeholders | Cool-white; style existing placeholders only; do not invent dashboard content |
| Activity / progress (Figma-only today) | Metrics presentation | Visual patterns for a **future** sprint — **do not build now** |
| Modals / sheets | Focused tasks | Surface, radius, primary/secondary actions; use the surrounding mode’s accent rules |

Study is part of the system from day one of the spec. Existing Study / flashcard presentation migrates in Batch 7; future Study Hub features from Figma are out of scope until their sprint arrives.

---

## 16. Figma Interpretation Rules

### Screenshots = visual language only

Use Figma and Auth brand screenshots to learn:

- Color roles and accent restraint (product vs locked Auth Brand `authAccent`)
- Type hierarchy and Nunito Sans character
- Spacing rhythm and card geometry
- Row/card/nav patterns
- Soft semantic pills and chart styling motifs
- Auth Brand Mode composition: gradient canvas, Welcome-only lockup, CTA energy

### Screenshots ≠ product requirements

**If something exists only in Figma / marketing mock and is not implemented, do not add it** — including disabled or “Coming Soon” shells — unless separately authorized.

**Do not authorize or implement from visuals alone (examples):**

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
- Marketing badge / headline / “Get Started Free” / feature-card backlog from Auth brand references
- Alternate logo / circular badge flame (keep existing Ignite flame)

**Figma / mocks = how future features may look when their sprint arrives; not what gets built now.**

### Illustrative content

All names (“Faith Forsythe”), pets/avatars, locations (“Bakersfield”), counts, and timestamps are **placeholders**.

### When Figma and PRD conflict

**PRD wins** for behavior and scope. Figma / screenshots win only for visual treatment of in-scope surfaces.

### When Figma and current theme conflict

Establish semantic roles from visual language; map or replace tokens in a deliberate token pass. Do not blindly keep a legacy color because it already exists (e.g., dual reds, flat cream as permanent Auth target, `verseReference` as H1). Cool-white Auth after Batch 1 is an interim Product-migration outcome until Auth Brand Mode screen wiring lands — not proof that cool-white is the final Auth canvas.

---

## 17. Anti-Patterns

1. Using `verseReference` typography as a generic page H1  
2. Multiple arbitrary reds/oranges for the same interactive accent job **within** a mode  
3. Using product `accent` or Auth Brand orange for error/destructive messaging  
4. Heavy multi-layer shadows or glow effects as default elevation  
5. Sharp small-radius cards that break family resemblance  
6. Dashboard clutter: too many competing modules in the first viewport  
7. Cards-for-decoration (if removing border/fill does not hurt understanding or interaction, reconsider)  
8. Hard-coding hex/spacing in screen files instead of theme tokens  
9. Treating Figma-only features as committed backlog — including disabled / “Coming Soon” unless separately authorized  
10. Changing navigation destinations or auth behavior during a “visual only” pass  
11. Logging or displaying sensitive data in UI chrome  
12. UI-only entitlement hiding without backend authorization  
13. Mode bleed: using Main Product cool-white as the **final** Auth / Onboarding Brand Mode look  
14. Mode bleed: using the Auth Brand gradient as the default Main Product canvas  
15. Repeating the Ignite logo/wordmark on secondary Auth / Onboarding screens (Welcome-only brand lockup)  
16. Saturated orange or strongly pink Auth canvas fills (canvas must stay **light warm blush/peach-to-near-white**)  
17. Screen-local background colors that bypass semantic / approved mode canvas tokens  
18. Inventing false precision (“exactly 18px radius”) without token confirmation  
19. Moving/renaming Auth UI modules, restructuring feature folders, or creating a parallel UI kit solely for visual cleanup  
20. Making a future feature appear implemented during a visual migration  
21. Defining general `danger` / `success` as references to study-domain mastery keys  
22. Shipping historical `#FF5A2E` as an Auth CTA token (superseded for accessibility; locked `authAccent` is `#D04925`)  
23. Treating legacy flat `brandWarmBackground` as the Auth Brand Mode target (interim flat warm only; target is `authBackgroundStart` / `authBackgroundEnd`)

---

## 18. Migration Plan

Documentation and tokens first; screens in batches. Future semantic tokens are **additive**. Do not move/rename Auth UI, restructure feature folders, or create a parallel UI kit solely for visual cleanup. Shared components may be introduced or generalized only when an implementation batch demonstrates real duplication.

### Batch 0 — Semantic Tokens & Foundation

Establish Main Product semantic design roles additively. No full screen redesign yet. **Implemented:** semantic colors, typography roles (incl. `screenTitle` / `stackTitle`), spacing aliases (incl. `minTouchTarget`), `radius.control`, legacy notes on `brandWarmBackground`, and this document synced for Batch 0 product locks. **Auth Brand Mode tokens** (`authBackgroundStart` / `authBackgroundEnd` / `authAccent`) are **approved and locked**; screen/splash wiring follows in later batches. `authAccentSoft` remains deferred.

### Batches 1–3 — Auth / Onboarding Brand Mode (+ splash)

**Auth Brand Mode applies to Batches 1–3 and splash/Entry continuity** using locked Auth Brand tokens. Until screens are wired, cool-white Auth from an earlier Batch 1 pass remains an **interim** Product-migration outcome and needs an Auth Brand Mode follow-up.

#### Batch 1 — Entry + Authentication

- IgniteEntry, Welcome, SignIn, ForgotPassword

Target: Auth Brand Mode (light warm blush/peach-to-near-white Auth gradient; Welcome-only top-left brand lockup; no logo/wordmark on Sign In / Forgot Password). Preserve behavior.

#### Batch 2 — Privacy + Parental Consent + Create Account

- PrivacyAge, ParentConsentIntro, ParentEmail, ConsentPending, ConsentChangeEmail, ConsentRecovery, CreateAccount, ConsentClaimPending

Auth Brand Mode without repeated logo/wordmark; do not touch consent/authentication behavior.

#### Batch 3 — Quizzer Onboarding + Lifecycle States

- QuizzerName, QuizzerProfileLoading, QuizzerProfileLoadError

Auth Brand Mode canvas; back/title / state presentation only — no logo/wordmark chrome.

### Batches 4–8 — Main Product Mode

#### Batch 4 — Profile + Settings + About

- ProfileHome, Settings, About, SettingsRow presentation

Cool-white Main Product Mode.

#### Batch 5 — Account Forms + Help & Feedback

- EditName, ChangeEmail, ChangePassword, HelpAndFeedback, FeedbackCompose

Cool-white Main Product Mode (in-app account forms).

#### Batch 6 — Main Navigation + Existing Placeholder Surfaces

- BottomTabNavigator, Home/Practice/TournamentDetails placeholders, PlaceholderScreen

IMPORTANT: remain placeholders. Do NOT build Figma Home/Practice/Tournament/Activity/analytics/streak/dashboard functionality. Style only what currently exists. Cool-white Main Product Mode.

#### Batch 7 — Existing Study / Flashcard Presentation

- FlashcardStudyRoute UI states, FlashcardStudyScreen, existing Study components, loading/empty/error/session-complete

IMPORTANT: Do NOT implement future Study Hub from Figma. Do NOT add Study top-tabs, Recently Studied, deck browser, global search, tournament material, smart collections, new Study navigation. Only style existing functionality. Cool-white Main Product Mode.

#### Batch 8 — Full Existing-Screen Consistency Audit

Re-inventory every reachable screen and loading/empty/error/success/recovery/nav/header/tab states vs IGNITE_UI_SYSTEM.md — including mode membership (Auth Brand vs Main Product) and Welcome-only brand lockup. No legacy visual treatment left accidental.

### Migration rules

- One batch → review → next  
- No feature scope creep mid-visual-pass  
- Do not add Figma-only features (including disabled / “Coming Soon”) unless separately authorized  
- Automated tests / visual checks appropriate to each batch  
- Report what was and was not manually tested  
- Auth Brand Mode follow-up after token lock is expected where cool-white Auth already shipped  

---

## 19. Visual Regression Rule

A UI redesign pass is allowed to change layout, color, type, and component styling. It is **not** allowed to change product behavior.

> "A screen may look substantially different after a UI pass, but given the same application state and the same user interaction, it must perform the same action, preserve the same data behavior, and navigate to the same destination as before."

If a visual change would require a new destination, new data write, or new entitlement rule, stop and treat that as a product change outside this UI system document.

---

## 20. Token Decisions

### LOCKED — TWO-MODE ARCHITECTURE (documentation)

| Decision | Status |
| --- | --- |
| Two intentional modes | Auth / Onboarding Brand Mode vs Main Product Mode — one product family, shared DNA, differentiated canvases |
| Auth canvas phrase | **light warm blush/peach-to-near-white Auth gradient** (low contrast; highly readable; not saturated orange / strongly pink) |
| Main Product canvas | `colors.background` = `#F5F5F7` |
| Welcome brand header | Top-left Ignite brand lockup (existing flame + wordmark) — **Welcome only** |
| Secondary Auth chrome | No logo/wordmark on Sign In, Forgot Password, Privacy Age, Create Account, consent family, Quizzer Name, Quizzer Profile Loading/Error |
| Auth Brand tokens | **Approved and locked** — `authBackgroundStart`, `authBackgroundEnd`, `authAccent` |
| `authAccent` | Locked `#D04925` (white-on-accent ≈ 4.50:1). Historical `#FF5A2E` superseded for accessibility — not a theme token |
| `authAccentSoft` | **Deferred** — not required for current Auth Brand token set |
| `authSurface` / `authBorder` | **Do not add** — reuse `surface` / `border` |

### LOCKED IN BATCH 0 (Main Product foundation)

| Decision | Locked value / key |
| --- | --- |
| Main Product canvas | `colors.background` = `#F5F5F7` |
| Surface | `colors.surface` = `#FFFFFF` |
| Primary text | `colors.textPrimary` = `#0A2540` |
| Secondary text | `colors.textSecondary` = `#6B7280` |
| Muted text | `colors.textMuted` = `#9CA3AF` |
| Accent (Main Product) | `colors.accent` = `#E85D4A` |
| Danger / soft | `colors.danger` = `#EF4444`; `colors.dangerSoft` = `#FEE2E2` |
| Success / soft | `colors.success` = `#22C55E`; `colors.successSoft` = `#DCFCE7` |
| Border | `colors.border` = `#E5E7EB` (no separate divider) |
| Disabled | `colors.disabledBackground` / `colors.disabledText` |
| Typography | `screenTitle`, `stackTitle`, `sectionTitle`, `cardTitle`, `body`, `bodySecondary`, `label`, `action`, `input`, `helper`, `error` |
| Spacing | `screenPaddingH` 20, `cardPadding` 24, `sectionGap` 24, `formFieldGap` 16, `rowGap` 12, `minTouchTarget` 44 |
| Radii | `radius.card` 16, `radius.control` 8, `radius.pill` 20 |
| Primary CTA (Main Product) | Accent-filled `#E85D4A`, white label, pill radius |
| Secondary CTA | Outlined border + navy text (Auth text-only secondary → Text action) |
| Soft pills | successSoft / dangerSoft pairs locked |
| Shadows | `shadows.card` preserved unchanged in Batch 0 |
| Flat warm legacy | `brandWarmBackground` = legacy flat warm interim — **not** Auth Brand Mode target; migrate to `authBackgroundStart` / `authBackgroundEnd` |

### LOCKED — AUTH BRAND MODE TOKENS

| Role | Theme key | Locked value | Notes |
| --- | --- | --- | --- |
| Auth gradient top | `colors.authBackgroundStart` | `#FFF5F0` | Light warm blush/peach |
| Auth gradient bottom | `colors.authBackgroundEnd` | `#FFFBFA` | Soft near-white warm-neutral |
| Auth accent | `colors.authAccent` | `#D04925` | Primary CTAs / emphasis links; white label ≈ 4.50:1 |

Primary CTA on Auth surfaces uses `authAccent`. Danger remains `#EF4444`. Main Product tokens above are **unchanged**.

**Historical reference only:** `#FF5A2E` — earlier Auth CTA visual candidate; superseded for accessibility; do not implement as a token.

### DEFERRED (Auth Brand)

| Role | Status |
| --- | --- |
| `authAccentSoft` | Deferred until a batch unifies peach icon wells under one shared role |
| `authSurface` | Do not add — reuse `colors.surface` |
| `authBorder` | Do not add — reuse `colors.border` |

### DEFER UNTIL FEATURE EXISTS

Do not invent tokens for Figma-only visualization before the feature ships:

- Chart palette
- Analytics visualization colors
- Advanced categorical icon-tile palette
- Tournament visualization colors
- Future streak visualization
- Soft accent pill beyond success/danger soft (Main Product)
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
| Existing flame asset | `assets/brand/ignite-flame.png` / `src/features/auth/components/IgniteBrandMark.tsx` |
| Product truth | `docs/product/PRD.md` |
| Build process | `docs/development/Ignite_Development_Playbook.md` |
| Main Product Figma refs | Home, Profile, Activity, Settings, Study screenshots |
| Auth Brand visual ref | Welcome / Get-Started style mock (composition, gradient, CTA energy, hierarchy, spacing only — not logo substitution or marketing copy) |

## Appendix B — Decision index

See §20. Summary:

| Timing | Decisions |
| --- | --- |
| Locked (doc) | Two intentional modes; Auth = light warm blush/peach-to-near-white Auth gradient; Main Product = cool-white `#F5F5F7`; Welcome-only top-left Ignite brand lockup; no logo/wordmark on secondary Auth/Onboarding screens |
| Locked in Batch 0 | Main Product canvas/surface, navy/secondary/muted, product accent `#E85D4A`, danger, success, border, disabled, title/body type (incl. `stackTitle`), screen/section spacing, radii, CTAs, min touch target, soft pill pairs; primary CTA (Product) = accent-filled; `shadows.card` preserved; `brandWarmBackground` = legacy flat warm interim |
| Locked — Auth Brand tokens | `authBackgroundStart` `#FFF5F0`, `authBackgroundEnd` `#FFFBFA`, `authAccent` `#D04925`; `#FF5A2E` historical reference only |
| Deferred (Auth) | `authAccentSoft`; do not add `authSurface` / `authBorder` |
| Defer until feature exists | Chart palette, analytics viz, advanced icon-tile palette, tournament viz, streak viz, soft accent (Product), separate divider, metric type, other Figma-only viz tokens |

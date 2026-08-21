Ignite
Product Requirements & Architecture Document
(PRD) v3.3
Status: Canonical working specification — division/material-set/region and Study experience clarification revision
Product: Ignite
Platform: iOS and Android
Primary Technology: React Native + TypeScript
Backend: Firebase / Cloud Firestore
Local Persistence: Online-first MVP; SQLite planned for post-MVP offline learning
Architecture: Feature-oriented application architecture with domain and repository boundaries
Primary Core Experience: Flashcard-based Bible memorization
Document Purpose: Product, domain, architecture, data, UX, and development source of truth
Revision Scope: v3.3 preserves the v3.2 product/architecture decisions and incorporates targeted clarifications for the five official division material sets, Cadet eligibility, the age-19+ Study Track, region-aware season participation/tournaments, section-based curriculum organization, annotated scrollable Scripture reading, material-set-aware entitlements, and related Sprint 3+ roadmap adjustments.



# 1. Document Purpose
This document defines the product requirements, business rules, domain model, architecture,
data ownership, persistence strategy, feature boundaries, non-functional requirements, and
development roadmap for Ignite.
The PRD is intended to serve as the primary source of truth for:
  - Product decisions
  - User behavior
  - Business rules
  - Domain concepts
  - Data ownership
  - Feature boundaries
  - Architecture
  - Persistence
  - State management
  - Offline behavior
  - Security
  - Testing
  - Sprint planning
  - Future feature development

Implementation decisions should follow this document unless a deliberate architectural decision
is made to revise it.
The goal is to build Ignite in a way that allows the application to grow substantially without
requiring major architectural restructuring.



# 2. Product Definition
## 2.1 One-Sentence Definition
Ignite is a Bible verse memorization and Bible-quizzing preparation platform that uses active
recall, spaced repetition, flashcards, quiz practice, and analytics to help Quizzers permanently
memorize Scripture while preparing them to compete in Bible-quizzing tournaments.
The product is not simply a Scripture memorization application.
Memorization is the foundation.
The larger goal is to prepare a Quizzer to:
# 1. Memorize the official season material.
# 2. Retain that material over time.
# 3. Understand and practice Bible-quizzing rules.
# 4. Develop quizzing skills.
# 5. Prepare for tournament competition.
The core product loop is Flashcard study.

## 2.2 Initial Launch Market
The initial MVP launch market is the United States. International expansion is outside the initial launch scope and requires jurisdiction-specific privacy, child-safety, and platform-compliance review before release in additional markets.


# 3. Product Principles
## 3.1 Flashcards Are the Core Product
The Flashcard experience is the foundational feature of Ignite.
It must remain a permanent part of the product even as the application evolves.
The Flashcard system should continually improve in usability, engagement, memorization
effectiveness, and retention without abandoning its fundamental purpose.


## 3.2 Practice Is the Second Permanent Pillar
Practice functionality exists to help Quizzers apply what they have memorized.
The product therefore has two permanent pillars:
# 1. Memorization

# 2. Application / Quizzing Practice


## 3.3 Season Isolation
Every Bible Quiz year is treated as an independent learning environment.
A new season creates new:
  - Curriculum
  - Cards
  - Division configuration
  - Progress
  - Mastery state
  - Study activity
  - Practice history
  - Analytics
  - Achievements
Previous-season learning state must never participate in current-season learning calculations.


## 3.4 Season Is the Curriculum Boundary
A Season is the authoritative container for:
    - Official curriculum
    - Card numbering
    - Card content
    - Annotations
    - Quiz rules
    - Division requirements
    - Tournament configuration
    - Other official season-specific configuration
A new season is not an update to the previous season.
It is a new authoritative content environment.


## 3.5 Privacy by Design
Ignite may be used by children and teenagers.
Privacy and child safety are therefore architectural requirements rather than post-launch
compliance tasks.
Ignite should collect, store, process, and share only the minimum information required to
provide the product.

# 4. Target Users
## 4.1 Primary User: Quizzer
The primary product user is the Quizzer.
The Quizzer may be:
  - A younger child whose account was created by a parent/guardian.
  - An older child or teenager using their own device/account.
  - An adult using Ignite for Bible memorization.
The product does not initially create separate Parent and Child account experiences.


## 4.2 Account and Guardian Consent Context
The MVP does not create separate Parent and Child application experiences and does not ask every user whether an adult is assisting with account creation.

For the initial United States launch, applicable COPPA treatment must be confirmed through appropriate privacy/legal review, including whether Ignite may use a mixed-audience age screen or must apply child-directed protections more broadly.

If an age/privacy screen is used, it must occur before collecting the Quizzer's first/last name, account email, or other persistent personal profile information. A user identified as under 13 must be routed into any required parent/guardian notice and verifiable-consent process before normal account/profile provisioning continues. This compliance path does not create a Parent role, Parent Portal, or separate parent application experience.

The MVP account relationship is one authenticated Account → one Quizzer profile → one unique email address. Families with multiple Quizzers therefore use separate accounts/emails for each Quizzer in the MVP.

The exact verifiable-parental-consent mechanism for under-13 users must be finalized through appropriate privacy/legal review before production release and must not be invented as ordinary onboarding UI logic.


## 4.3 Future Coach
Coach functionality is a future capability.
Coaches may eventually:
  - Manage teams
  - View Quizzer progress
  - Interact with Quizzers
  - Manage team membership
  - Review analytics
  - Support tournament preparation
Coach functionality is explicitly outside the initial product scope.



# 5. Season Model
## 5.1 Season Definition
A Season represents one Bible-quizzing curriculum year.

Ignite targets approximately:
October → July

The Bible Quiz Board may release source material earlier during the transition/preparation period. Ignite uses that lead time to prepare, validate, test, and stage the next season before the material is made available in the app.

Ignite targets October 1 as the normal annual in-app material availability date. This is a product/operations target rather than a hard-coded application rule.

January → July represents the primary tournament period.
July ends with Nationals.
August and September are the transition/preparation period for the next season.

All relevant season dates remain configurable.


## 5.2 Season Dates
Each Season should support explicit configuration such as:

  seasonId
  name
  sourceMaterialReleaseDate
  igniteAvailabilityDate
  startDate
  endDate
  status

`igniteAvailabilityDate` should normally target October 1 unless an intentional season-specific decision changes it.

Dates must be configuration data.
The application must never hard-code rules such as:
  "The season ends seven days after Nationals."
  "Every season must publish on October 1."

Instead, the administrator/content process configures the actual dates for that season.


## 5.3 Season Lifecycle
The canonical lifecycle is:

  Draft
   ↓
  Committee Validated
   ↓
  Published
   ↓
  Active / Locked
   ↓
  Archived


Draft

Content is being prepared.

Committee Validated

The official material has been reviewed and approved by the Bible Quiz Committee.

Published

The approved season/material sets are entered into Ignite and may become available on the configured Ignite availability date.

Active / Locked

When the season/material sets become active, authoritative Scripture content, Card structure, sections, and annotations are immutable through ordinary application workflows.

Archived

After the configured season end date, the season becomes historical.


# 6. Season Content Immutability
Once a season/material set is locked, the following authoritative learning content cannot be modified during the active season through ordinary product workflows:
  - Division material sets
  - Cards
  - Card numbering/order within each material set
  - Scripture content
  - Curriculum sections/groupings
  - Annotations
  - Highlights
  - Underlines
  - Unique beginnings
  - Unique endings
  - Frequency markings
  - People
  - Proper names
  - Animals
  - Body parts
  - Keywords
  - Cross references
  - Quiz rules that define official competition behavior
  - Division eligibility/configuration
  - Other official season learning configuration

Normal users, Quizzers, and future Coaches cannot modify authoritative season content.

### Controlled Tournament Operational Updates
Tournament operational data is different from locked Scripture/curriculum content. Official tournament information may receive controlled updates during the season when the Board/region changes authoritative event information, including where applicable:
- Date/time
- Venue/location
- Registration information
- Event status/cancellation
- Division participation
- Division-specific tournament material scope

These changes must come through an authorized administrative/content process and must not be editable by ordinary users.

### Administrative Correction Policy
The normal active-season learning system does not support arbitrary curriculum mutation.
If a genuine official correction is ever required, it must be handled through a controlled administrative process outside ordinary user functionality and should preserve an audit trail.
The V1 application does not need to implement a general in-season curriculum editor.


# 7. Season Independence
The same Scripture reference may appear in multiple seasons and may also appear in multiple division material sets within the same season.

Those appearances must not be assumed to be the same learning object.

For example, the same verse may appear in Junior and Intermediate but have different:
- Card/order numbering
- Section placement
- Highlights/underlines
- Unique beginnings/endings
- Frequency markings
- Other annotations or quiz metadata

Each division's official material file is treated as an independent authoritative material set for that season.

A Scripture reference is descriptive metadata, not the identity of the Card across seasons or material sets.

This prevents one division's official structure or annotations from accidentally changing another division's material.


# 8. Division System
## 8.1 Official Divisions

Ignite supports five official competitive divisions:

Cadet

Generally ages 2–4. For ages 2–4, Ignite may present both Cadet and Beginner as eligible choices because a parent/coach may determine that the Quizzer is ready for Beginner material.

Beginner

Standard ages 5–8. Ages 2–4 may also select Beginner when appropriate.

Junior

Ages 9–11.

Intermediate

Ages 12–14 and first-year Quizzers ages 15–18.

Experienced

The official user-facing terminology is `Experienced` (not `Experienced`). Standard placement is the approved non-first-year 15–18 flow. Exceptional younger placements may be authorized by the appropriate real-world team/coach process, but Ignite does not expose an ordinary self-service exception option in MVP onboarding.

The exact material for each division may change every season. Lower divisions must not be modeled as simple subsets of Experienced material.


## 8.2 Competitive Eligibility and January 1 Age Basis
Competitive division eligibility uses the Quizzer's official age for the season based on the January 1 eligibility basis communicated by WPF.

Ignite does not need to store date of birth for this purpose. During current-season setup, the app may ask for the age that should be used for Bible Quizzing eligibility for that season and explain that users who are unsure should confirm with their Coach.

Current working eligibility behavior:
- Age 2–4 → Cadet or Beginner
- Age 5–8 → Beginner
- Age 9–11 → Junior
- Age 12–14 → Intermediate in the normal self-service flow
- Age 15–18 → Intermediate if first-year Quizzer; otherwise Experienced

Any officially authorized exceptional placement should be handled through a future controlled/admin/coach override rather than a general user-facing "choose any division" option.


## 8.3 Study Track for Users Age 19+
Users age 19+ do not join a competitive youth division.

They use a `Study Track` flow.

During current-season setup:
# 1. The user is identified as age 19+.
# 2. Ignite asks the user to choose a Study Track.
# 3. The user selects exactly one official division material set: Cadet, Beginner, Junior, Intermediate, or Experienced.
# 4. That Study Track determines the material offered for purchase/access for the season.
# 5. The selected Study Track remains locked for that season in the MVP.

This supports adults such as Coaches, parents, alumni, or independent Bible memorizers who want to study the exact material used by a specific division without representing the adult as a competitive member of that youth division.

Multiple Study Tracks/switching tracks are deferred from MVP.


## 8.4 Region Selection
Region is a first-class season-participation concept.

During current-season setup, users select their official WPF region. The selected region is season-scoped rather than permanent global Quizzer identity so it can change in a future season if the user moves or changes organizations.

Region should drive the tournament experience so the app primarily presents tournaments for the user's selected region.

Both competitive Quizzers and age-19+ Study Track users may select a region so parents/Coaches/adult users can see the relevant regional tournament calendar.


## 8.5 Division / Study Track Changes
A competitive Quizzer's division does not change during an active season in MVP.
An adult user's selected Study Track does not change during an active season in MVP.
Division or Study Track may be re-established for the next season.

This prevents mid-season transfer/material-entitlement complexity.


# 9. Purchase and Entitlement Model

## 9.1 Season Material Purchase
The primary product is purchased once per season for the user's selected/eligible material set.

The entitlement is therefore material-set-aware.

Examples:
- Junior competitive Quizzer → purchases/receives access to the Junior material set for that season.
- Age-30 user who selects Junior Study Track → purchases/receives access to the same Junior material set for that season.

A season/material-set purchase grants access to the included core product features for that material set and season, including:
  - Flashcards
  - Study functionality
  - Annotated Scripture List
  - Practice functionality included in MVP
  - Analytics
  - Achievements
  - Other included season features

The season purchase does not include future premium AI functionality.

For MVP, one account has one selected competitive division or Study Track material set for the active season. Access to multiple material sets is deferred.


## 9.2 AI Subscription
AI functionality is a separate optional subscription.
AI is supplemental.
The core Ignite experience must remain usable without AI.
AI can be disabled or unavailable without preventing use of the primary product.


## 9.3 Season Availability
Ignite targets October 1 as the normal annual date when the next season's prepared material becomes available for purchase/access in the app.

The Board may release source material earlier, allowing the developer to import, validate, test in DEV/STAGING, and prepare the season before Ignite availability.

The actual `igniteAvailabilityDate` remains configurable per season and must not be hard-coded.


## 9.4 Mid-Season Purchase
If a user purchases the active season after the season has begun, they receive the same access to their selected/eligible current-season material set and functionality.

Ignite does not fabricate historical activity for time before the user began using the application.
Example:
A Quizzer purchases in March.
They can access their current-season material set.
Their analytics begin when they begin using Ignite.
The system does not create artificial October–February activity.


## 9.5 Previous Seasons
Users may retain ownership records for previously purchased season/material-set entitlements.
However:
  - Previous curriculum is not available for active study.
  - Previous cards cannot be studied.
  - Previous season learning state does not become current state.
  - Previous analytics may be viewed in read-only form.
  - Historical achievements may remain available.
Only one season can be active for learning at a time.


# 10. Season-End Behavior
When the configured season end date is reached:
# 1. The active season becomes archived.
# 2. Flashcard study is disabled for that season.
# 3. Active learning state becomes read-only historical data.
# 4. Previous-season analytics remain accessible.
# 5. The user enters the transition state awaiting the next season.
# 6. Once the next season is available, the user can complete/purchase the new season.
The user should not continue studying archived curriculum.



# 11. Canonical Domain Model
The application domain is independent of Firebase.
The primary domain concepts are:

### Account
  Quizzer
### Season
  Region
  Division
  QuizzerSeasonParticipation
  MaterialSet
  CurriculumSection
  Curriculum
  Card
  Deck
  DeckMembership
  StudySession
  RecallEvent
  Progress
  Mastery

  PracticeSession
  PracticeGame
  PracticeQuestion
  PracticeAttempt
  PracticeResult
  Tournament
  TournamentDivisionScope
  Achievement
  SeasonEntitlement
  AnalyticsEvent

Not every domain concept is necessarily persisted as a standalone database entity.


# 12. Canonical Curriculum Model
## 12.1 Division Material Sets
Each Season contains independent authoritative material sets for:
- Cadet
- Beginner
- Junior
- Intermediate
- Experienced

Each material set is imported from its own official source file and owns its own ordering, Card numbering, section membership, annotations, and metadata.

A lower division is not modeled as a filtered subset of another division.


## 12.2 Card Is the Canonical Study Unit
A Card is the fundamental learning unit within one Season + MaterialSet.

A Card contains material-set-specific:
  - Card number/order
  - Scripture reference
  - Scripture text
  - Section membership
  - Annotation data
  - Highlighting
  - Underlining
  - Unique beginnings/endings
  - Frequency markings/levels where supplied
  - Quiz metadata
  - Keywords
  - People
  - Places
  - Animals
  - Body parts
  - Cross references
  - Other committee-provided metadata

The annotation model should be data-driven/extensible so new official annotation types can be introduced in future season transitions without requiring a redesign of the Card domain or persistence architecture.


## 12.3 Card Identity
The canonical identity is:

  seasonId + materialSetId + cardId

Card number/order is unique within a material set, not necessarily across the entire season.
Card number is not a global identifier.

The same Scripture reference in two material sets may represent two independent Cards because the official numbering, section, and annotations may differ.


## 12.4 Curriculum Sections
Official season material may be grouped into ordered thematic/content sections supplied by the Board.

A `CurriculumSection` should support concepts such as:
- sectionId
- materialSetId
- title
- description where supplied
- displayOrder
- Card membership/order

Sections organize the material but do not duplicate Cards.

"All Material" remains the primary complete material set. Sections are optional secondary groupings/filtering/navigation over those same Cards.


## 12.5 Scripture Reference
The Scripture reference is stored as content metadata.
It is not the identity of the Card across seasons or material sets.


## 12.6 KJV
The application uses the King James Version (KJV) as the Bible text source for the curriculum.


# 13. Deck Architecture
## 13.1 Official Season Material
The user's selected/eligible division MaterialSet is the authoritative collection of Cards available to that user for the active season.

"All Material" means all Cards in that MaterialSet, not all Cards from every division.


## 13.2 Custom Decks
Users may create custom collections of Cards.
A custom Deck contains references to Cards.
Cards are never copied into a Deck.
Therefore:

  Card
   ↑
  Deck Membership
   ↑
  User Deck

A custom Deck cannot modify the canonical Card.

## 13.3 Smart Collections
The following should be implemented as derived smart collections, not duplicate Card
storage:
   - Needs Work
   - Mastered
   - Review Due
   - Tournament Scope
   - Other dynamic collections
Membership is calculated from current learning state.
For example:

  Needs Work
  =
  Cards where mastery state = Learning

This prevents duplicated state and synchronization problems.


## 13.4 Decks Do Not Own Mastery
Mastery belongs to:

  Quizzer + Season + MaterialSet + Card

not:

  Quizzer + Deck + Card

Therefore, if a Card appears in five Decks, it still has one learning state.



# 14. Flashcard Experience
## 14.1 Core Loop
The primary loop is:

  Open Flashcards
    ↓
  Select study material

     ↓
  View Card
     ↓
  Attempt recall
     ↓
  Reveal/evaluate
     ↓
  Mark Correct or Needs Work
     ↓
  Record Recall Event
     ↓
  Update Progress/Mastery
     ↓
  Continue



## 14.2 Two-Sided Flashcard
The Flashcard supports:
  - Front/prompt state
  - Back/answer state
  - Tap-to-flip
  - Swipe interactions
  - Correct
  - Needs Work / Incorrect
  - Audio playback
  - Study/review context


## 14.3 Recall Definition
A recall attempt occurs when:
# 1. The Quizzer views the prompt.
# 2. The Quizzer attempts to recall the verse.
# 3. The Quizzer reveals/evaluates the answer.
# 4. The Quizzer explicitly marks the result.
The system does not attempt to determine whether the Quizzer actually recalled the verse
independently.

## 14.4 Study Mode
Study Mode focuses on:
  - Learning new material
  - Initial exposure
  - Active engagement
  - Building familiarity
  - Recording study activity


## 14.5 Review Mode
Review Mode is algorithm-driven.
It focuses on:
    - Recall
    - Spaced repetition
    - Retention
    - Long-term mastery
Study and Review are distinct application contexts but may use the same underlying Flashcard
UI and domain model.



## 14.6 Study Hub / Material Selection
Study is the product-level entry point into Scripture learning.

The Study landing page sits between the Study tab and the Flashcard engine. It should keep the full official material set easy to access while also exposing useful secondary views without making the page confusing.

Sprint 3 establishes three MVP ways to consume the same authoritative selected MaterialSet:

### 1. Study All Material — Flashcards
Launch the complete selected division/Study Track material set into the existing Flashcard engine.

### 2. Explore by Section
Show official Curriculum Sections as secondary navigation/filtering. Selecting a section launches or displays only the Cards belonging to that section without duplicating Cards.

### 3. View All Material — Annotated Scripture List
Provide a vertically scrollable Scripture-reading view of the same selected MaterialSet.

The Annotated Scripture List must:
- Group the material by the official Curriculum Sections/order supplied for that material set.
- Display every verse/card in the official order within its section.
- Display the Scripture reference and full Scripture text.
- Render the same official material-set-specific annotations used by the Flashcard experience, including highlights, underlines, unique beginnings/endings, frequency markings, and other supported annotation types.
- Read from the same Card/annotation source of truth as Flashcards rather than storing a second unannotated or duplicated Scripture dataset.
- Remain a reading/browsing presentation in MVP; it does not own separate progress/mastery state merely because the user scrolls through it.

The Study hub may progressively also contain:
- Custom Decks
- Tournament Scope
- Recently Studied
- Review Due
- Needs Work
- Mastered
- Other derived smart collections

Sprint 6 adds real recent-study/activity data. Sprint 7 adds mastery/review-driven smart collections and recommendations.

The Study hub and Annotated Scripture List do not own Card, annotations, Progress, Mastery, or Tournament data. They compose those authoritative sources through application/domain boundaries.


# 15. Flashcard Progress
Progress is scoped to:

  Quizzer + Season + MaterialSet + Card

Progress must never be shared across seasons.
Progress includes information such as:
  - Recall attempts
  - Correct attempts
  - Incorrect attempts
  - Accuracy
  - Consecutive success streak
  - Last reviewed
  - Next review
  - Mastery state
  - Study history
  - Other required learning metrics

# 16. Mastery System
## 16.1 Objective
The mastery system exists to drive durable long-term Scripture retention using active recall and
spaced repetition.


## 16.2 Operational States
Every Quizzer/Season/Card relationship has one operational mastery state:

  Learning
  Reviewing
  Mastered
  Needs Refresh



## 16.3 Learning
A Card is in Learning when:
  - It is new.
  - It has recently failed.
  - It has been reset from a higher mastery state.
Target review interval:
1–2 days


## 16.4 Reviewing
A Card enters Reviewing after successful early recall.
Target intervals:

  3 days
  7 days
  14 days

The system expands the review interval as the Quizzer demonstrates successful recall.

## 16.5 Mastered
A Card becomes Mastered only when all required conditions are satisfied:
# 1. At least 4 consecutive correct recall sessions.
# 2. At least 21 days have elapsed between the first successful recall and the qualifying fourth
      recall.
# 3. Successful recalls occurred across at least 4 separate calendar dates.
This prevents same-day cramming from qualifying as mastery.


## 16.6 Needs Refresh
A previously mastered Card enters Needs Refresh when the maintenance interval expires.
Target maintenance interval:
60 days
Needs Refresh Cards receive priority in review scheduling.


## 16.7 Failure During Reviewing
When a Reviewing Card is marked incorrect:
 - Consecutive success streak resets to 0.
 - State returns to Learning.
 - Next review is scheduled within 24 hours.


## 16.8 Failure During Needs Refresh
When a Needs Refresh Card fails:
 - Mastery is revoked.
 - State returns to Learning.
 - Two consecutive successful sessions are required to re-verify the Card.



# 17. Mastery Data Architecture
Historical recall events are the authoritative learning history.
A current Progress/Mastery record is a materialized state derived from those events.
Conceptually:

  Recall Events
     ↓

  Mastery Engine
     ↓
  Current Progress/Mastery Snapshot

This provides:
  - Efficient reads
  - Rebuildability
  - Historical analysis
  - Safer synchronization
  - Clear ownership
The application should not require recalculating a user's entire learning history every time the
Flashcard screen opens.



# 18. Study Sessions
A Study Session represents active Flashcard learning.
It records meaningful study activity rather than simply opening a screen.
A session may include:
    - Start time
    - End time
    - Cards studied
    - Recall attempts
    - Correct/incorrect results
    - Review activity
    - Session duration
Merely opening the application does not count as studying.
The user's streak is based on actual study activity.



# 19. Analytics
Analytics should be generated from actual product activity.
Important metrics include:
  - Daily study activity
  - Study streak
  - Review streak
  - Cards studied
  - Correct Cards

  - Cards needing work
  - Mastered Cards
  - Review activity
  - Practice sessions
  - Practice results
  - Daily/weekly learning trends
  - Progress toward tournament material requirements
The analytics UI may include:
  - Streak calendar
  - Flame/streak indicator
  - Verses learned
  - Mastery counts
  - Study trends
  - Practice history
  - Tournament preparation progress
Analytics should be derived from authoritative product data wherever possible.
Analytics must not become a second authoritative database of detailed user behavior.



## 19.1 Analytics Experience
The MVP Analytics screen is implemented primarily in Sprint 9 after Study, Mastery/Review, and Practice have produced authoritative activity data.

The Analytics UI may combine season-scoped information such as:
- Study time/activity
- Cards or verses learned/studied
- Streaks
- Mastery and review activity
- Practice history/performance
- Progress trends
- Tournament preparation/readiness

Metrics must only be shown when Ignite has a clear, testable definition and an authoritative data source for them. Product-design concepts such as a Focus Score, peak-performance time, or similar derived metrics must not be displayed as factual analytics until their definitions and data requirements are explicitly established.

# 20. Achievements
Achievements are generated from defined product milestones.
Examples include:
  - 50 Cards mastered
  - 100 Cards mastered
  - Study streak milestones
  - Consecutive study days
  - Other season-specific milestones
Achievements belong to the user's season.
They are historical records of accomplishments, not inputs into the mastery engine.



# 21. Tournament Progress
Tournament preparation is a major product concept.

The actual tournament schedule and material requirements are official configuration supplied by the Board/regions rather than hard-coded milestones.

Tournament configuration should support region-aware events and division/material-set-specific scopes so Ignite can compare the user's selected material set and later progress/mastery against the appropriate event requirements.


## 21.1 Tournament Visibility and Division Scope
Users should see the complete tournament calendar for their selected Region regardless of their competitive division or Study Track.

A tournament should not disappear merely because the user's division does not participate in that event.

This applies to Cadet as well: Cadet users can see every tournament in their Region even though Cadet competition currently occurs only in the first two official tournaments of the season. Cadet participation should be represented through tournament configuration rather than hard-coded as "tournament #1/#2" application logic.

Each Tournament may therefore define:
- Region
- Event identity/name
- Date/time
- Venue/location
- Operational status
- Participating divisions
- Division/material-set-specific required material scope
- Registration/other official operational information where needed

For a division that does not participate in a displayed tournament, the UI should show an appropriate informational state rather than hiding the event or inventing a material requirement.


## 21.2 Tournament Details Experience
Basic tournament information and preparation support are part of the Core MVP; full tournament simulation remains future scope.

Sprint 3 establishes tournament configuration as season-owned authoritative data.

Sprint 5 may surface regional tournament information on Home and provide a Tournament Details screen containing:
- Tournament name
- Date/time
- Venue/location information
- Map/location presentation where appropriate
- User-division/Study-Track material scope when one exists
- Study Now action when there is applicable material
- Get Directions action

Study Now should open the Study/Flashcard experience scoped to the tournament's configured required Cards without duplicating Cards.

Directions should hand off to the device/platform mapping experience where practical. Ignite does not need to collect or persist the Quizzer's precise location to provide tournament venue information or directions.

Sprint 6 may add studied/progress information, Sprint 7 may add mastery/review readiness, and Sprint 9 may add higher-level tournament preparation analytics.

Regional Finals/Nationals eligibility enforcement is not part of the MVP and is deferred to a future tournament feature track.


# 22. Practice System
Practice is a separate domain from Flashcard study.


## 22.1 Practice Session
A Practice Session represents a structured activity designed to apply knowledge.
Examples include:
  - Word/next-word games
  - Fill-in-the-missing-word / verse builder experiences
  - Matching
  - Multiple-choice practice
  - Games for younger Quizzers
  - Future official question-set practice
  - Future tournament-style practice
  - Future AI practice

Flashcard memorization is represented as a Study Session, not a Practice Game, although both contribute to the user's broader activity history.


## 22.2 Practice Architecture
All practice games should conform to a common model:

  Practice Session
     ↓
  Practice Game
     ↓
  Question/Challenge
     ↓
  Attempt
     ↓
  Result
     ↓
  Score

This allows future games to be added without restructuring the entire Practice system.


## 22.3 MVP Practice Content
The MVP does not depend on receiving an official tournament/practice question bank.

Sprint 8 should implement at least one strong Scripture-derived Practice mode that can be generated deterministically from the user's authoritative division MaterialSet, such as a Next Word, Verse Builder, or Fill in the Missing Word experience.

This lets Ignite ship a useful Practice MVP using the same approved Scripture material without inventing official Bible-quizzing questions or requiring the Rulebook/question-bank integration.


## 22.4 Official Questions
Official/predetermined WPF question sets may be added in a future release if they are explicitly provided/authorized for Ignite.

Ignite must not assume access to tournament question content and must not scrape or infer proprietary question banks.
AI-generated official-style questions remain deferred.


## 22.5 Practice Scoring
Practice scoring is separate from Flashcard correctness.
Flashcards use:
  - Correct
  - Needs Work
Practice games have game-specific scoring rules.
A shared Practice framework should allow each game to define its own:
  - Correctness
  - Partial correctness
  - Points
  - Penalties where applicable
  - Completion rules


## 22.6 Practice Hub
The Practice tab should include a Practice landing page that acts as the primary entry point into Practice experiences.

The Practice hub may show:
- Available Practice games/challenges
- Basic Practice progress or history where authoritative data exists
- Entry points into individual Practice modes

Sprint 8 builds the Practice hub, Practice architecture, and at least one strong functioning Scripture-derived Practice mode. The MVP does not require every game shown in product mockups to be implemented.

Sprint 9 may enrich the Practice hub with authoritative Practice summaries and analytics after PracticeSession and PracticeResult data exist.


# 23. Tournament Simulation
Tournament simulation is a future feature.
The envisioned experience may eventually include:
  - Two teams
  - Quiz board structure
  - Multiple Quizzers
  - Buzzer interaction
  - Question interruption
  - Question completion
  - Point values
  - Tournament-specific question rules
  - Voice quizmaster
This is intentionally deferred until the underlying Practice architecture and official rules are
established.



# 24. Official Quiz Rules
Official Bible-quizzing rules are provided by the committee/WPF.

The complete Rulebook is not required to ship the Core MVP because the MVP Practice experience does not attempt to fully reproduce tournament rules or simulation.

Where a current MVP feature genuinely requires a specific approved rule, that rule should be represented as structured configuration rather than scattered through UI code.

Full Rulebook ingestion/integration becomes more important for future capabilities such as:
- Advanced tournament Practice
- Buzzer-oriented games
- Penalties/timing/question-type simulation
- Tournament simulation
- AI Coach
- AI quizmaster

Conceptually, future structured rules may live under:

### Season
  └── QuizRules
     ├── QuestionTypes
     ├── PointValues
     ├── TimingRules
     ├── BuzzerRules
     ├── DivisionRules
     └── OtherOfficialRules

Profile may provide an Official Resources link to the WPF Bible Quizzing website so users can access current official resources/rulebook information outside Ignite.


# 25. Audio
## 25.1 Standard Audio
The Flashcard experience may provide an audio playback function for Scripture.
Audio playback is supplemental.
Playing audio does not count as a recall or mastery event.


## 25.2 AI-Generated Songs
The first major AI feature is expected to be Song Generation.
The envisioned experience:

  Flashcard
    ↓
  Generate Song
    ↓
  Choose style/genre
    ↓
  Choose tempo/options
    ↓
  Generate
    ↓
  Play

AI-generated audio is supplementary to learning.
Users cannot upload their own audio.
AI-generated songs are streamed and are not downloaded as permanent user files.



# 26. AI Architecture
## 26.1 AI Is Optional
Ignite must function fully without AI.
AI is a supplement, not the core product.

## 26.2 AI Is Never Authoritative
AI cannot:
   - Modify Quizzer learning data.
   - Modify official curriculum.
   - Modify mastery.
   - Change official rules.
   - Become the source of truth.
AI is always advisory.


## 26.3 AI Service Boundary
AI functionality must be isolated behind an application-level service interface.
Conceptually:

  Feature
    ↓
  AI Service
    ↓
  AI Provider

The Flashcard feature must not directly depend on a specific AI vendor.
This allows providers to change without rewriting product features.


## 26.4 AI Subscription
Future AI capabilities may require a recurring subscription.
The entitlement system must therefore support:

  Season Entitlement
  AI Entitlement

as separate capabilities.



# 27. Persistence Architecture
## 27.1 Backend Decision

Cloud Firestore is the canonical remote persistence system.

Why Firestore

Firestore is selected because Ignite requires:
   - Structured document-oriented data
   - Strong user/season/card relationships
   - Flexible queries
   - Future Coach queries
   - Season-scoped access
   - Fine-grained Firebase Security Rules
   - Scalable document storage
   - Offline-friendly mobile architecture
   - Future tournament/practice expansion
Firebase Realtime Database is not selected as the primary persistence system.


## 27.2 Firebase Is Infrastructure
Firebase must not define the application's domain model.
The architecture is:

  UI
  ↓
  Feature/Application Layer
  ↓
  Domain
  ↓
  Repository Interface
  ↓
  Persistence Implementation
  ↓
  Firestore

Features and business logic must not directly depend on Firestore documents or Firebase APIs.
This follows the repository/domain principle already established in the architecture notes.



# 28. Repository Architecture
Repositories provide stable application-facing interfaces.

Examples:

  SeasonRepository
  CurriculumRepository
  FlashcardRepository
  ProgressRepository
  StudySessionRepository
  PracticeRepository
  AchievementRepository
  EntitlementRepository
  AnalyticsRepository

The domain/application layer depends on interfaces.
Firebase implementations live below those interfaces.
Example:

  FlashcardRepository
       ↑
  FirestoreFlashcardRepository

The UI never calls Firestore directly.



# 29. Local Persistence Architecture
The MVP uses an online-first persistence model with Cloud Firestore as the canonical remote persistence system.

SQLite is the planned local persistence technology for post-MVP offline Flashcard learning. It is intentionally not required for the MVP.

When implemented post-MVP, SQLite will support:
- Flashcard curriculum required for offline study
- Flashcard progress
- Recall events
- Pending synchronization
- Queries by season/card
- Review scheduling
- Reliable transactional writes
- Future offline expansion

Simple key-value storage may be used for small non-domain preferences, but it should not become the primary learning database.


# 30. Offline Scope
Offline functionality is explicitly outside the Core MVP.

Post-MVP V1 Offline Learning is limited to Flashcard studying and Flashcard progress.

Planned Supported Offline:
- Flashcard curriculum required for the active season
- Flashcard viewing
- Study sessions
- Recall attempts
- Correct/Needs Work actions
- Local progress updates
- Review scheduling
- Pending synchronization

Not Supported in the initial offline release:
- Practice games
- Tournament simulation
- AI features
- AI Song Generation
- Other network-dependent services

Offline functionality should be implemented after the Core MVP has been validated. The repository and persistence boundaries established during the MVP must allow the local data source to be added without rewriting the Flashcard domain or application layer.


# 31. Offline Data Flow
Offline synchronization is a post-MVP capability.

When the offline feature is implemented:

When online:

  User Action
  ↓
  Domain Logic
  ↓
  Repository
  ↓
  Local SQLite Transaction
  ↓
  Optimistic UI Update
  ↓
  Sync Queue
  ↓
  Firestore

When offline:

  User Action
  ↓
  Domain Logic
  ↓
  Repository
  ↓
  SQLite Transaction
  ↓
  Local UI Update
  ↓
  Pending Sync Event

When connectivity returns:

  Pending Event
   ↓
  Sync Worker
   ↓
  Server
   ↓
  Idempotency Check
   ↓
  Authoritative Processing
   ↓
  Acknowledgement
   ↓
  Local Event Marked Synced

The MVP does not implement this synchronization system. MVP persistence must nevertheless be designed so this future architecture can be introduced without changing domain ownership or feature boundaries.


# 32. Recall Events
Every meaningful Flashcard recall should generate a unique event.
Conceptually:

  RecallEvent
  - eventId
  - userId
  - seasonId

  - cardId
  - sessionId
  - result
  - occurredAt
  - deviceId

The event ID must be unique and stable.
If the same event is submitted multiple times due to retry, the backend must recognize it as the
same event.
This prevents:
    - Duplicate progress
    - Inflated mastery
    - Duplicate activity
    - Incorrect analytics
The architecture specifically requires idempotent handling of retryable activity.



# 33. Multi-Device Synchronization
Ignite must eventually support the same Quizzer using multiple devices.
The system must not use:
  "Last device to sync wins."
Instead, independent legitimate RecallEvents are merged.
Example:

  Device A
  Card 12 → Correct

  Device B
  Card 12 → Incorrect

Both events remain part of the historical activity.
The authoritative Progress/Mastery state is recalculated/updated from the legitimate event
history.



# 34. Server Authority
The server is authoritative for:
  - Official Season content

  - Published Cards
  - Division configuration
  - Quiz rules
  - Entitlements
  - Synchronized learning events
  - Authoritative progress/mastery state after processing
The local device is authoritative only for:
  - Temporary offline state
  - Pending events
  - Local UI state
Local state must never overwrite authoritative season content.



# 35. Server-Side Event Processing
For synchronized learning events, authoritative processing should occur server-side.
Conceptually:

  Client
   ↓
  RecallEvent
   ↓
  Firestore
   ↓
  Server-side processing
   ↓
  Idempotency validation
   ↓
  Mastery calculation
   ↓
  Progress snapshot update

This protects the learning model from clients incorrectly modifying authoritative mastery values.



# 36. Firebase Data Model
The exact physical schema is an implementation detail, but the conceptual model is:

  seasons/{seasonId}
    ├── metadata
    ├── divisions
    ├── regions
    ├── quizRules
    ├── tournaments
    └── materialSets/{materialSetId}
          ├── metadata (division, order, source/version)
          ├── sections/{sectionId}
          └── cards/{cardId}

  users/{userId}
    ├── profile
    ├── preferences
    └── entitlements/{seasonId or entitlementId}

  users/{userId}/seasons/{seasonId}
    ├── participation
    │     ├── regionId
    │     ├── participationType
    │     └── divisionId or studyTrackMaterialSetId
    ├── progress/{materialSetId_cardId or equivalent}
    ├── recallEvents/{eventId}
    ├── studySessions/{sessionId}
    ├── decks/{deckId}
    ├── practiceSessions/{sessionId}
    ├── achievements/{achievementId}
    └── analytics summaries

The exact collection structure may evolve during implementation as long as the ownership boundaries, material-set identity, and domain contracts remain intact.


# 37. Data Ownership Matrix

Entity | Scope | Authority | Mutable
---|---|---|---
User | User | User/account system | Yes
User Preferences | User | User | Yes
Season | Global/official | Admin/content | Controlled; core content locks when active
Region | Official configuration / selected per User + Season | WPF/admin + user season setup | Official list controlled; selection per season
Division | Season | Official configuration | No once active except controlled official correction
MaterialSet | Season + Division | Official configuration | No once active
CurriculumSection | Season + MaterialSet | Official configuration | No once active
Card | Season + MaterialSet | Official configuration | No once active
Quiz Rules | Season | Official configuration | No once active except controlled official correction
Tournament | Season + Region | Official configuration | Controlled operational updates
TournamentDivisionScope | Tournament + MaterialSet/Division | Official configuration | Controlled operational updates
QuizzerSeasonParticipation | User + Season | User + official eligibility rules | Controlled
Season Entitlement | User + Season + MaterialSet | Purchase system | Controlled
Progress | User + Season + MaterialSet + Card | Derived/server | Yes
Recall Event | User + Season + MaterialSet + Card | User activity | Append-only
Mastery | User + Season + MaterialSet + Card | Derived/server | Materialized
Study Session | User + Season + MaterialSet | User activity | Append-only/controlled
Custom Deck | User + Season + MaterialSet | User | Yes
Deck Membership | User + Season + MaterialSet + Card | User | Yes
Practice Session | User + Season + MaterialSet | User activity | Append-only
Practice Attempt | User + Season + MaterialSet | User activity | Append-only
Achievement | User + Season | Derived | Recorded
Historical Summary | User + Season | Derived | Read-only after archive
Analytics Event | Minimum required scope | Analytics system | Append-only

This implements the principle that every persistent entity must have an explicit ownership/scope.


# 38. State Management
Ignite should not use one global application store for all domain state.
State is divided into:


UI State
Examples:
  - Card flipped/unflipped
  - Selected tab
  - Animation state
  - Modal visibility
  - Current interaction
This may use Zustand/local component state.


Session State
Examples:
  - Current Study Session
  - Current Practice Session
  - Current Card
  - Temporary game state
This is owned by the relevant feature.


Persistent Domain State
Examples:
  - Progress
  - Mastery
  - Decks

  - Study history
  - Entitlements
These are accessed through repositories.


Server State
Authoritative remote data is retrieved through repositories and synchronized into the local
application state.
The goal is to avoid a giant global state object containing the entire application.



# 39. Dependency Direction
The dependency direction must keep the Domain independent of infrastructure concerns.

Conceptually:

  Presentation
     ↓
  Application / Feature
     ├──→ Domain
     └──→ Repository Interfaces
              ↓
        Persistence Implementations
              ↓
        Firebase / SQLite

Application/use-case code may depend on Domain models and repository interfaces. Repository implementations satisfy those interfaces and may map persistence data to/from Domain models. Core Domain entities and business rules must not depend on repositories, Firebase, SQLite, or other infrastructure.

Never:

  UI
  ↓
  Firebase

and never:

  Domain
  ↓
  Firebase SDK / Repository Implementation

This keeps the Domain pure, Firebase replaceable, and infrastructure from becoming the application model.

# 40. Navigation Architecture
Navigation should be organized around product-level destinations rather than individual database concepts.

The preferred Core MVP bottom navigation is:
- Home
- Study
- Practice
- Profile

Study is the product-level destination for Flashcard learning. It contains the Study landing page/material-selection experience and launches the underlying Flashcard engine.

Profile is the product-level destination for Quizzer identity and user-level information. Settings lives beneath Profile rather than occupying a permanent bottom-navigation destination.

Analytics remains a full MVP experience but does not require a permanent bottom-navigation tab. It may be accessed from Home and/or Profile through appropriate entry points.

Authentication, onboarding, and purchase flows remain outside the main authenticated application experience.
Historical season analytics should be accessible through a read-only archive/history experience.


# 41. Home Experience
The Home experience should provide a concise overview of the Quizzer's current season.
Planned elements include:
- Greeting/banner
- Daily progress
- Study streak
- Flame indicator
- Verses learned/mastered
- Tournament preparation
- Next-tournament summary when configured
- Study overview
- Progress visualization
- Important review activity
- Entry points to Study, Practice, Analytics, and other relevant product areas

The Home experience may surface the next configured tournament. Selecting that tournament should open a Tournament Details experience when that screen becomes available in Sprint 5.

Home should primarily summarize information.
It should not become the owner of learning, analytics, tournament, or mastery logic.

## 41.1 Profile Experience
Profile is a Core MVP product destination.

The Profile foundation begins in Sprint 2 and should initially provide:
- Quizzer first and last name as the primary private display identity
- Basic account/profile information
- Initials and/or an optional controlled/preset avatar
- Entry point to Settings
- Official Resources entry point/link to the WPF Bible Quizzing website (may be introduced during later MVP integration rather than initial Sprint 2 account work)
- Appropriate account-level actions

Profile may progressively display real product activity as the underlying systems become available. Real study streak/activity data should come from Sprint 6, richer analytics from Sprint 9, and final integration/polish from Sprint 10.

Because Ignite may be used by minors, the MVP should not require user-uploaded profile photos. Initials are the default fallback and controlled/preset avatars may be offered as an optional lightweight personalization feature unless a later privacy-reviewed requirement changes this decision.

## 41.2 Settings Experience
Settings lives under Profile.

The Sprint 2 Settings Foundation should contain only account-related functionality that naturally belongs to the authenticated-user lifecycle, such as:
- First and last name management (Edit Name)
- Email/account controls, including secure reauthentication and verification of a new email when changing the account email
- Password controls
- Sign-out
- Appropriate account-lifecycle controls
- Basic About/version information where useful

Settings must not imply that deferred features already exist. Push-notification controls should not be functional until notification infrastructure is intentionally implemented. Offline Study controls such as Download Cards and Auto-download belong to Sprint 12 Post-MVP.


# 42. Authentication
Ignite requires an account.
The application is not usable anonymously.
Authentication is handled through Firebase Authentication.
The authentication layer should remain independent from Quizzer domain data.

The authenticated identity maps to the application's User/Quizzer record.

For the MVP, one authenticated account maps to one Quizzer profile and uses one unique email address. Firebase Authentication identity remains separate from Quizzer profile/domain data.



# 43. Security
Security must be enforced at the backend.
Firebase Security Rules and server-side processing must enforce:
   - User ownership
   - Season isolation
   - Card access
   - Entitlement access
   - Historical access
   - Administrative restrictions
A UI restriction is never considered sufficient authorization.
The architecture must prevent unauthorized cross-user access at the persistence layer.



# 44. Privacy and Child Safety
Ignite must follow privacy-by-design and privacy-by-default.

Ignite may collect a Quizzer's first and last name because they are required for account identity, Profile presentation, personalization, and future authorized Coach/Quizzer relationships. These names are private profile data and must not be exposed to unauthorized users, unnecessary telemetry, crash logs, or public discovery.

The application should not unnecessarily collect:
  - Additional name or identity information beyond the required first and last name
  - Address
  - Phone number
  - Precise location
  - Contacts
  - Photos
  - Unnecessary identifying information
The application should not use child data for:
  - Behavioral advertising
  - Targeted marketing
  - Unnecessary profiling
No precise location should be collected.
No unnecessary device permissions should be requested.
Notifications must not expose sensitive child information on shared lock screens.
Crash reporting and diagnostics must avoid unnecessary child personal data and learning data.
Applicable legal and platform requirements must be reviewed before launch.

# 45. Notifications
Notifications are a future/controlled capability and are not required for the Core MVP unless deliberately reprioritized.

Any notification system must:
- Avoid sensitive information on lock screens.
- Respect user settings.
- Avoid unnecessary notification permissions.
- Not expose detailed child learning information.
- Be evaluated for privacy before implementation.

Profile or Settings designs may reserve a future entry point, but the application must not present a functional Push Notifications control until the supporting notification capability exists.


# 46. Analytics and Telemetry
Analytics must be limited to product-essential information.
Analytics should support understanding:
  - Feature usage
  - Flashcard engagement
  - Study activity
  - Practice usage
  - Errors
  - Performance
  - Product health
Analytics must not become a second detailed behavioral database.
Any future analytics category involving new personal data requires privacy review.



# 47. Error Handling
Firebase/infrastructure errors must not leak directly into UI components.
The persistence layer translates infrastructure failures into application-level errors.
The application must intentionally handle:
   - Network failures
   - Authentication failures
   - Authorization failures
   - Missing data
   - Validation failures
   - Sync failures
   - Retry failures

  - Conflict scenarios
  - Unexpected infrastructure failures
This requirement is explicitly part of the persistence architecture.



# 48. Loading, Empty, and Error States
Every major asynchronous feature must define:

Loading

What the user sees while data is loading.

Empty

What the user sees when valid data exists but there is nothing to display.

Error

What the user sees when the requested operation fails.

Offline

What the user sees when Flashcard functionality is available locally but synchronization is
pending.

Archived

What the user sees when the season is no longer active.

No Entitlement

What the user sees when the current season has not been purchased.
These states must be treated as normal product states, not exceptional UI afterthoughts.



# 49. Test Data
Development fixtures should remain replaceable by official season material and should exercise the architecture expected from the five independent division MaterialSets.

Test data should cover:
  - Multiple MaterialSets/divisions
  - The same Scripture reference appearing in more than one MaterialSet with different annotations/order
  - Card numbering/order within a MaterialSet
  - Multiple books
  - Multiple chapters
  - Long verses
  - Short verses
  - Curriculum Sections and section ordering
  - Extensible annotations
  - Highlighting/underlining
  - Frequency markings
  - Keywords
  - Unique beginnings
  - Unique endings
  - Cross references
  - Deck membership
  - Progress
  - Mastery
  - Review scheduling
  - Season isolation
  - MaterialSet isolation
  - Region selection
  - Tournament visibility and division-specific material scope

The test dataset should remain replaceable by the official five-file season import without changing application/domain contracts.


# 50. Content Import
Official content is provided by the Bible Quiz Committee/WPF.
The developer is responsible for entering approved material into Ignite.

Each season should support five independent official material source files/material sets:
- Cadet
- Beginner
- Junior
- Intermediate
- Experienced

The importer must not assume that one division is a subset of another.

The same Scripture reference may appear in multiple files and should remain independent when the official numbering/sections/annotations differ.

The import process should validate:
   - Material-set/division identity
   - Card numbering/order within each material set
   - Required Scripture reference
   - Required Scripture text
   - Curriculum section identity/order/membership
   - Annotation structure/types
   - Highlight/underline/unique beginning/unique ending/frequency metadata where supplied
   - Quiz metadata where supplied
   - Region/tournament configuration
   - Division/material-set-specific tournament scope
   - Rules configuration where required
   - Duplicate/conflicting IDs within a material set

The annotation schema/import mapping should be extensible so future season-specific annotation types can be added intentionally without redesigning the domain model.

Invalid content should fail validation before publication.

The normal annual operations flow should allow Board source material released during the transition period to be imported and tested in DEV/STAGING before the configured Ignite availability date, normally targeted for October 1.


# 51. Testing Strategy

Testing is required at multiple levels.


## 51.1 Domain Tests
Test:
  - Mastery transitions
  - Recall rules
  - Review scheduling
  - Season isolation
  - Division eligibility
  - Tournament progress calculations
  - Smart collections


## 51.2 Repository Tests
Test:
  - Domain/persistence mapping
  - Reads
  - Writes
  - Authorization boundaries
  - Error translation


## 51.3 Synchronization Tests
Test:
  - Offline event creation
  - Queueing
  - Retry
  - Duplicate events
  - Multi-device events
  - Synchronization failures
  - Recovery


## 51.4 Security Tests
Test:
  - Cross-user access prevention
  - Cross-season access prevention
  - Unauthorized content modification

  - Entitlement enforcement
  - Administrative boundaries


## 51.5 UI Tests
Test critical Flashcard behavior:
  - Flip
  - Swipe
  - Correct
  - Needs Work
  - Study/review contexts
  - Offline behavior
  - Loading/error states
The persistence architecture must remain independently testable without requiring every test to
connect to Firebase.



# 52. Performance Requirements
The Flashcard screen is the highest-priority performance surface.
It should:
    - Open quickly.
    - Avoid unnecessary network calls during active study.
    - Read required Card content locally when possible.
    - Respond immediately to swipe/flip interactions.
    - Persist local learning events without blocking the UI.
    - Avoid re-rendering unrelated application state.
Flashcard interaction must remain responsive even when network connectivity is poor.



# 53. Scalability Requirements
The architecture must support future growth in:
  - Number of users
  - Number of seasons
  - Number of Cards
  - Number of Practice Sessions
  - Number of Recall Events
  - Number of tournaments

  - Number of analytics records
  - Number of AI interactions
The architecture must avoid assumptions such as:
  - All Cards fitting into one global state object.
  - All user history being loaded at once.
  - All analytics being calculated on the client from unbounded history.
  - All season content being shared globally.
  - All practice games sharing identical scoring logic.



# 54. Future Features
The following are intentionally supported by the architecture but deferred from the initial core
implementation:


Coach Portal
Future capabilities may include:
  - Teams
  - Team membership
  - Coach-to-Quizzer relationships
  - Coach analytics
  - Messaging
  - Team practice
  - Tournament management


Community
Future possibilities include:
  - Friends
  - Sharing
  - Team features
  - Social functionality
These are deferred because they introduce additional privacy and authorization complexity.


AI Coach
Future AI functionality may include:
  - Practice coaching

   - Questions
   - Weak-verse recommendations
   - Mock quizzes
   - Tournament simulation
   - Voice interaction
AI remains advisory.


AI Song Generation
Expected first major AI feature.


AI Tournament Quizmaster
Future voice-driven tournament simulation.



# 55. Explicitly Deferred Features
The following must not be pulled into early development merely because the architecture could
support them:
  - Coach Portal
  - Parent Portal
  - Community/social features
  - Messaging
  - AI Coach
  - AI-generated questions
  - AI tournament simulation
  - AI song generation
  - Offline Practice
  - Advanced tournament simulation
  - Advanced team management
  - Complex child/parent account relationships
  - Regional Finals/Nationals eligibility enforcement
  - Multiple Study Tracks or mid-season Study Track switching
  - Full Rulebook ingestion/tournament-rule simulation
  - Official tournament/practice question-bank integration unless explicitly provided/authorized
The architecture should accommodate these features without implementing them prematurely.



# 56. Architectural Decision Record
The following decisions are now canonical unless this PRD is intentionally revised.

Decision                Choice



Backend                 Firebase


Database                Cloud Firestore


Local learning persistence    None in Core MVP; SQLite planned post-MVP


Authentication          Firebase Authentication


Domain model            Application-owned


Persistence boundary    Repository interfaces


State management        Feature-local + Zustand for client/UI state


Flashcard offline       Post-MVP (Sprint 12)


Practice offline V1     No


Sync model              Event-based/idempotent


Server authority        Yes


Mastery history         Recall Events


Mastery current state   Materialized snapshot


Cross-season progress   Never transferred


Card identity           Season + MaterialSet + Card


Global Verse identity   Not used for learning state

 Decision                                  Choice



 Deck mastery ownership                    No


 Smart collections                         Derived


 Season learning content                   Immutable once active; tournament operational data controlled


 Division / Study Track                    Five division material sets; youth division season-scoped; age 19+ selects one Study Track


 Division / Study Track changes            Next season in MVP


 AI                                        Optional/advisory


 AI source of truth                        Never


 Coach portal                              Future


 Parent portal                             Not planned


 KJV                                       Yes



# 57. Architecture Diagram
The intended high-level architecture is:

  ┌──────────────────────────────────────────────┐
  │         PRESENTATION               │
  │                           │
  │ Home │ Study │ Practice │ Profile │ Analytics │
  └──────────────────────┬───────────────────────┘
              │
              ▼
  ┌──────────────────────────────────────────────┐
  │       FEATURE / APPLICATION             │

  │                             │
  │ Flashcard │ Practice │ Season │ Analytics │
  │ Entitlement │ Achievement │ AI          │
  └──────────────────────┬───────────────────────┘
                │
                ▼
  ┌──────────────────────────────────────────────┐
  │             DOMAIN               │
  │                             │
  │ Season │ Card │ Progress │ Mastery         │
  │ Recall │ Study │ Practice │ Tournament     │
  │                                             │
  │ Pure domain models/rules; no repository or  │
  │ infrastructure dependencies                 │
  └──────────────────────────────────────────────┘

  FEATURE / APPLICATION also depends on:
                │
                ▼
  ┌──────────────────────────────────────────────┐
  │          REPOSITORY INTERFACES             │
  │                             │
  │ SeasonRepository                     │
  │ FlashcardRepository                  │
  │ ProgressRepository                   │
  │ StudyRepository                    │
  │ PracticeRepository                  │
  └───────────────┬───────────────────┬──────────┘
             │           │
             ▼            ▼
  ┌──────────────────────┐ ┌───────────────────┐
  │ LOCAL PERSISTENCE │ │ REMOTE PERSISTENCE│
  │              │ │             │
  │ SQLite          │ │ Firestore       │
  │ Offline Events    │ │ Firebase Auth │
  │ Cached Curriculum │ │ Server Processing │
  └──────────────────────┘ └───────────────────┘




# 58. Development Roadmap

The roadmap is structured around architectural dependencies and the complete MVP product experience rather than simply implementing screens in the order they appear in the UI.

Development is divided into two phases:

Phase 1 — Core MVP
- Build the complete core product experience.
- Establish architecture incrementally as each feature requires it.
- Validate the core learning loop before expanding into AI and other future features.

Phase 2 — Post-MVP / Future
- Add offline Flashcard learning.
- Add AI.
- Add Coach functionality.
- Add advanced tournament functionality.
- Add social/community features.
- Add advanced engagement and other future capabilities.

Architecture is not a separate phase. Every sprint contains both product work and the architecture required to implement that product work correctly.

Development pattern:

Requirements
↓
Architecture/Foundation
↓
Feature Implementation
↓
Integration
↓
Testing
↓
Validation

The goal is to build the minimum architecture necessary for the current feature while ensuring current decisions do not prevent future features from being introduced cleanly.


Sprint Summary Table

| Sprint | Name | Phase | Status |
|---|---|---|---|
| 1 | Flashcard Foundation | MVP | Complete |
| 1.5 | Flashcard Architecture & Core Experience | MVP | In Progress |
| 1.75 | Flashcard Persistence & Data Foundation | MVP | Pending |
| 2 | Authentication, Onboarding, Profile & Settings Foundation | MVP | Pending |
| 3 | Season, Region, Material Sets & Study Hub Foundation | MVP | Pending |
| 4 | Season Purchase & Access | MVP | Pending |
| 5 | Home / Dashboard & Tournament Details Foundation | MVP | Pending |
| 6 | Study Progress & Activity | MVP | Pending |
| 7 | Mastery & Review System | MVP | Pending |
| 8 | Practice Foundation & Practice Hub | MVP | Pending |
| 9 | MVP Analytics | MVP | Pending |
| 10 | MVP Product Integration & Polish | MVP | Pending |
| 11 | MVP Stabilization & Release Readiness | MVP | Pending |
| 12 | Offline Flashcard Study & Synchronization | Post-MVP | Future |
| 13 | AI Architecture Foundation | Post-MVP | Future |
| 14 | AI Song Generation | Post-MVP | Future |
| 15+ | Additional AI Features | Post-MVP | Future |
| Future Track | Coach Experience | Post-MVP | Future |
| Future Track | Advanced Tournament Features | Post-MVP | Future |
| Future Track | Social / Community | Post-MVP | Future |
| Future Track | Advanced Engagement | Post-MVP | Future |


# 59. Sprint 1 — Flashcard Foundation

Status: Complete

### Objective

Establish the initial Flashcard experience and the architectural foundation for the core study experience.

### Product Features
- Flashcard screen
- Card presentation
- Tap-to-flip interaction
- Basic card navigation
- Initial Flashcard interactions
- Initial navigation integration

### Architecture Work
- Establish Flashcard as an independent feature boundary.
- Establish domain types for Flashcards.
- Separate UI components from business logic.
- Establish state ownership rules.
- Establish initial dependency direction.
- Establish reusable UI component conventions.
- Establish initial testing conventions.
- Avoid direct Firebase access from UI components.
- Establish the foundation for repository/persistence boundaries.

### Dependencies
None.

### Explicitly Do Not Build
- Practice
- Analytics
- Mastery engine
- AI
- Offline Flashcards
- Coach functionality
- Tournament systems

### Outcome

The Flashcard feature works as an independent feature with a clean enough boundary that additional Flashcard functionality can be added without embedding business logic directly into screens/components.


# 60. Sprint 1.5 — Flashcard Architecture & Core Experience

Status: In Progress

### Objective

Strengthen the existing Flashcard implementation so it can become the foundation for the rest of the application.

### Product Features
- Complete remaining core Flashcard interactions.
- Refine card navigation.
- Refine card presentation.
- Improve user feedback.
- Loading states.
- Empty states.
- Error states.
- Core Flashcard interactions.

### Architecture Work

Domain
- Establish the Card domain model.
- Establish season-aware Card relationships.
- Ensure a Card is not incorrectly treated as globally identical across seasons.
- Separate domain models from Firebase document structures.

State
- Separate UI state from domain/application state.
- Establish ownership of Flashcard state.
- Prevent global state from becoming a dumping ground.
- Define what state belongs to the screen versus the application/domain layer.

Persistence
- Establish repository boundary.
- Separate persistence implementation from domain logic.
- Establish Firebase as a persistence implementation rather than the domain model.

Testing
- Establish business-logic testing patterns.
- Add tests around important Flashcard behavior.
- Establish testing conventions that future Practice and progress systems can follow.

Dependency Direction
- UI
- Application / Feature Logic
- Domain
- Repository Interface
- Persistence Implementation

The exact implementation may vary, but UI code must not become directly dependent on Firebase.

### Explicitly Do Not Build
- Offline Flashcard support.
- Practice.
- AI.
- Advanced analytics.
- Coach functionality.
- Tournament simulation.

### Outcome

The existing Flashcard implementation is aligned with the approved architecture and can safely serve as the foundation for later persistence, progress, mastery, and Practice features.


# 61. Sprint 1.75 — Flashcard Persistence & Data Foundation

### Objective

Establish the online persistence and data foundation required for the MVP without implementing offline Flashcard functionality.

### Product Features
- Persistent Flashcard content.
- Persistent Flashcard-related user data as required.
- Loading states.
- Persistence errors.
- Data retrieval.
- Data refresh behavior.

### Architecture Work
- Finalize repository interfaces.
- Finalize Firebase/persistence boundary.
- Establish data mapping between Firebase and domain models.
- Establish data ownership.
- Establish season/content boundaries.
- Establish persistence error handling.
- Establish appropriate online caching behavior where needed.
- Ensure persistence logic is not embedded inside UI components.
- Establish patterns that a future local/offline data source can implement.

### Important Offline Decision

Offline functionality is not part of the MVP.

A future local data source may implement the same repository contracts without requiring a rewrite of the Flashcard domain/application layer.

### Explicitly Do Not Build
- Offline Flashcard studying.
- Offline progress recording.
- Synchronization engine.
- Conflict resolution.
- Offline Practice.
- SQLite learning database.

### Outcome

Flashcard content and required user data persist correctly through the intended online persistence architecture, with boundaries that allow post-MVP offline support to be added later.


# 62. Sprint 2 — Authentication, User Onboarding, Profile & Settings Foundation

### Objective

Create the complete account and Quizzer onboarding experience and establish the MVP Profile/Settings foundation for the authenticated user.

### Product Features
- Account creation.
- Sign-in.
- Sign-out.
- Authentication persistence.
- Forgot Password / Firebase password-reset email flow.
- Email + password authentication for MVP.
- Email verification is not required for MVP.
- User profile foundation.
- Quizzer onboarding.
- First and last name collection; Profile displays the full name and Home may later use the first name for personalization.
- Optional controlled/preset avatar selection with initials fallback; no user-uploaded profile photos.
- U.S. child-privacy/consent boundary that can support an approved early age/privacy screen before persistent personal information is collected, without storing date of birth.
- One authenticated Account → one Quizzer profile → one unique email address for MVP.
- Returning-user behavior.
- Interrupted/incomplete onboarding recovery.
- Basic Profile screen.
- Settings entry point from Profile.
- Settings Foundation for account-related controls.

### Profile Foundation
The Sprint 2 Profile experience should remain intentionally thin.

It should provide:
- Quizzer first and last name as the private display identity.
- Basic account/profile information.
- Initials and/or optional controlled/preset avatar presentation.
- Entry point to Settings.
- Appropriate account-level navigation/actions.

Do not fabricate streaks, activity, achievements, or analytics in Sprint 2. Real study streak/activity data arrives from Sprint 6, richer analytics from Sprint 9, and final integration/polish from Sprint 10.

The MVP should not require user-uploaded profile photos. Prefer initials or controlled/preset avatars unless a later privacy-reviewed requirement changes this decision.

### Settings Foundation
Sprint 2 Settings should include only account functionality that naturally belongs to the authenticated-user lifecycle, such as:
- First and last name management through an Edit Name flow.
- Email/account controls, including reauthentication and verification of a new email for email changes.
- Password controls.
- Sign-out.
- Appropriate account lifecycle/deletion architecture and controls as required before release.
- Basic About/version information where useful.

Do not build Offline Study settings in Sprint 2. Download Cards and Auto-download belong to Sprint 12 Post-MVP.

Do not implement a full push-notification system in Sprint 2. Notification functionality remains deferred unless deliberately reprioritized.

### Season Eligibility Handoff
Sprint 2 does not own season-scoped division assignment. It establishes the account/onboarding state and routing boundary required to hand an authenticated Quizzer into current-season setup.

Sprint 3 owns the season-scoped eligibility age, first-year status where applicable, youth division selection/validation, age-19+ Study Track selection, Region selection, MaterialSet resolution, and resulting current-season participation. Date of birth is not required.

Any still-unresolved committee rule, including exceptional Experienced placement criteria, must remain configurable rather than being guessed or scattered as hard-coded UI logic.

### Account Lifecycle / Routing
Sprint 2 should establish routing for:
- Signed-out users.
- Authenticated users with onboarding incomplete.
- Authenticated users with onboarding complete.
- Current-season setup/participation state.
- Future entitlement handoff/state without implementing Sprint 4 purchasing.
- Returning-user/new-season behavior.
- Expected error/maintenance/recovery states.

### Architecture Work
- Establish authenticated user state.
- Define user identity boundaries.
- Separate authentication state from application/domain state.
- Establish user repository/service boundaries.
- Establish onboarding state.
- Define persistence ownership for user profile data, including private first/last name and optional preset-avatar identity.
- Establish recoverable/idempotent profile provisioning so authentication success followed by profile-write failure, app interruption, or missing profile state can safely resume.
- Establish Profile and Settings feature boundaries without making them owners of study/analytics logic.
- Establish navigation guards for authenticated/unauthenticated/onboarding states.
- Apply privacy-by-design and child-safety requirements to account architecture.
- Collect only the minimum personal information necessary; do not store date of birth unless a later requirement explicitly requires it.
- Continue accessibility/UX validation during the sprint rather than deferring it to final stabilization.
- Maintain explicit bug-diagnosis/observability and realistic test-persona coverage.

### Important UX Principle
There is no separate Parent Portal or Parent role in MVP.

Ignite does not ask every user whether an adult is assisting with signup. For the initial U.S. launch, the final COPPA treatment must be privacy/legal reviewed. If an age screen is used, it occurs before persistent personal profile information is collected, and an under-13 user is routed through the required parent/guardian consent step before normal account/profile provisioning continues. That compliance step does not create a separate parent application experience.

### Preferred Main Navigation Direction
After the authenticated application shell is established, the preferred MVP product-level destinations are:
Home | Study | Practice | Profile

Settings lives under Profile. Analytics remains an MVP screen accessible from appropriate product entry points rather than requiring a permanent bottom-navigation tab.

### Explicitly Do Not Build
- Real study streak/activity calculations.
- Rich Profile analytics.
- Full push-notification infrastructure.
- Offline Study settings/functionality.
- Coach portal.
- Parent portal.
- Multiple dashboard experiences.
- Team relationships.
- Advanced role-management systems.
- Season purchase implementation.

### Dependencies
Sprint 1.5 and Sprint 1.75 architecture.

### Outcome
The user can securely create/sign into an account, complete/resume base Quizzer onboarding, reach the correct authenticated state, view a basic Profile with private name/identity information, manage appropriate account settings, and return to the application with account/onboarding state restored. Under-13 users can be routed into the required guardian-consent boundary without creating a Parent Portal. Current-season eligibility/division setup is handed off cleanly to Sprint 3. Future Study, Home, analytics, notification, offline, and purchase systems remain outside Sprint 2 ownership.


# 63. Sprint 3 — Season, Region, Material Sets & Study Hub Foundation

### Objective
Establish the authoritative current-season participation model, Region context, five independent division MaterialSets, section-based curriculum structure, and the first real Study landing experience that connects the user's selected material to both Flashcards and an annotated scrollable Scripture view.

### Product Features
- Current season identity/lifecycle/availability.
- Configurable source-material release and Ignite availability dates; October 1 remains the normal Ignite target.
- Region selection during current-season setup.
- Five official competitive divisions: Cadet, Beginner, Junior, Intermediate, Experienced.
- January 1 competitive age basis without storing date of birth.
- Cadet/Beginner flexible eligibility for ages 2–4.
- First-year Quizzer status where required for ages 15–18.
- Youth division eligibility/selection and validation.
- Age-19+ Study Track selection from Cadet, Beginner, Junior, Intermediate, or Experienced material.
- One Study Track per active season in MVP.
- Current-season Quizzer participation/setup state.
- Five independent authoritative division MaterialSets.
- Material-set-specific Card identity, order, annotations, and metadata.
- Extensible annotation architecture.
- CurriculumSection/grouping foundation.
- Study landing page / Study hub foundation.
- Study All Material via Flashcards.
- Explore material by Curriculum Section.
- View All Material via an Annotated Scripture List grouped by section and rendering the same annotations as Flashcards.
- Region-aware tournament configuration/data foundation.
- Tournament events remain visible to all divisions/Study Tracks in the user's Region, including Cadet.

### Season Eligibility, Region & Participation Setup
Sprint 3 completes current-season participation after base account onboarding.

Competitive youth flow:
1. Collect the minimum season-scoped eligibility age using the January 1 basis; date of birth is not required.
2. Determine eligible division options.
3. Collect first-year status only where required.
4. Allow ages 2–4 to select Cadet or Beginner.
5. Select the user's Region.
6. Persist the resulting season participation.

Standard working eligibility:
- 2–4 → Cadet or Beginner
- 5–8 → Beginner
- 9–11 → Junior
- 12–14 → Intermediate in normal self-service onboarding
- 15–18 → Intermediate when first-year; otherwise Experienced

Authorized exceptional younger Experienced placement is not exposed as ordinary self-service MVP onboarding.

Age-19+ flow:
1. Identify the user as Study Track rather than competitive youth division.
2. Select Region.
3. Choose exactly one Study Track: Cadet, Beginner, Junior, Intermediate, or Experienced.
4. Persist that material selection for the season.
5. Keep it locked for the active season in MVP.

### Division Material Architecture
Each Season has five independent authoritative MaterialSets, imported from five independent source files.

Do not assume lower divisions are subsets of another division.

If the same Scripture reference appears in two MaterialSets, each MaterialSet may own a different Card/order number, section, and annotation structure. Those Cards remain independent authoritative learning objects.

The architecture must support future seasonal changes to annotation types through extensible/data-driven mapping rather than scattered hard-coded display rules.

### Curriculum Sections
Official MaterialSets may contain ordered Curriculum Sections supplied by WPF/Board material.

Sections are metadata/grouping over the MaterialSet's existing Cards. They must not duplicate Cards.

"All Material" remains the primary complete Study option; sections are a secondary navigation/filtering experience.

### Study Hub Foundation
Sprint 3 should initially support:
- Study All Material — launch the complete selected MaterialSet into Flashcards.
- Explore by Section — launch/display a selected CurriculumSection using the same Cards.
- View All Material — open the Annotated Scripture List.

The Annotated Scripture List must be grouped by Curriculum Section, show Scripture reference + full Scripture text, and render the same material-set-specific annotations used in Flashcards (highlights, underlines, unique beginnings/endings, frequency markings, and other supported official annotation types).

The Flashcard and annotated-list presentations must read from the same authoritative Card/annotation source of truth.

Do not fabricate recent-study, mastery, or review data in Sprint 3. Sprint 6 provides real recent activity/progress; Sprint 7 provides mastery/review-driven smart collections and recommendations.

### Tournament Configuration Foundation
Tournament information is authoritative season/region configuration. Sprint 3 should establish the data/domain foundation needed for later tournament UI, including where provided:
- Tournament identity/name.
- Region.
- Date/time.
- Venue name/address/location text.
- Operational status.
- Participating divisions.
- Division/material-set-specific required material scope.
- Other official operational information where needed.

Every tournament in the user's selected Region should remain visible regardless of the user's division/Study Track. If a user's division does not participate, the event remains visible with an appropriate informational state.

Cadet currently competes only in the first two official tournaments of the season, but this must be represented through configured event participation rather than hard-coded tournament ordinal logic.

The complete Tournament Details UI belongs to Sprint 5.

### Critical Business Rule
Once an official division MaterialSet is confirmed and active, its Scripture/Card/section/annotation content is locked through ordinary user/application workflows.

Official tournament operational data may receive controlled updates through the authorized content/admin process.

### Season Isolation
Each season is independent.
Each MaterialSet inside a season is also an independent official curriculum boundary for Card structure/annotations.
No progress transfers between seasons.

### Architecture Work
- Establish Season domain model and configurable availability dates.
- Establish Region configuration and season-scoped user Region selection.
- Establish QuizzerSeasonParticipation ownership.
- Establish five MaterialSet domain/configuration records.
- Establish Season → MaterialSet → CurriculumSection → Card relationships.
- Change Card identity/queries to respect `seasonId + materialSetId + cardId`.
- Ensure progress/mastery/event ownership can remain material-set-aware.
- Build/validate the five-file import/seeding pipeline and content validation contract.
- Establish extensible annotation schema/mapping and shared rendering input for Flashcards + Annotated Scripture List.
- Establish section ordering/membership without Card duplication.
- Establish Study hub composition/application boundary.
- Establish Annotated Scripture List presentation boundary using the same Card data.
- Establish region-aware tournament/domain/configuration boundaries.
- Keep division, region, material scopes, tournament participation/scopes, dates, and annotation definitions data-driven rather than scattered hard-coded UI logic.
- Establish DEV → STAGING validation/promotion workflow for annual material preparation; no PROD automation assumption.

### Explicitly Do Not Build
- Recently Studied based on real study history (Sprint 6).
- Mastery/review smart collections (Sprint 7).
- Full Tournament Details/Home tournament UI (Sprint 5).
- Regional Finals/Nationals eligibility enforcement.
- Tournament simulation.
- Multiple Study Tracks per adult or mid-season Study Track switching.
- Full Rulebook ingestion/simulation.
- Official question-bank dependency.
- Mid-season ordinary-user curriculum editing.
- Cross-season progress transfer.
- Advanced content-management UI.

### Dependencies
Authentication and user identity.

### Outcome
The app understands the authoritative current Season and Region, completes season-scoped competitive-division or age-19+ Study Track setup, resolves one authoritative MaterialSet for the user, can import and present five independent division materials with sections/annotations, supports both Flashcards and a section-grouped Annotated Scripture List from the same Card source of truth, and has region-aware tournament configuration ready for later Home/Tournament Details and purchase/access flows.


# 64. Sprint 4 — Season Purchase & Access

### Objective
Allow the user to purchase/obtain access to the appropriate current-season MaterialSet selected/resolved during Sprint 3.

### Product Features
- Available season display.
- MaterialSet-aware purchase/access.
- Competitive division material access.
- Age-19+ Study Track material access.
- Purchase flow.
- Purchase state.
- Entitlement/access state.
- Locked/unlocked material.
- Restore purchase/access where applicable.
- Users without active-season access.
- Expired season handling.
- Purchase/access errors.

### User Flow

Base onboarding
↓
Current Season Setup
↓
Age / Eligibility or Study Track
↓
Region
↓
Resolved MaterialSet
↓
Purchase
↓
Season + MaterialSet Access
↓
Home

### Architecture Work
- Establish material-set-aware entitlement domain.
- Associate entitlement with User + Season + MaterialSet rather than Season alone where needed.
- Separate purchase provider implementation from application logic.
- Establish access-control boundaries.
- Establish purchase state.
- Establish entitlement persistence.
- Ensure UI does not directly own purchase business logic.
- Establish a clean boundary for future AI/subscription entitlements.
- Enforce backend authorization and user/season/material-set access rules.
- Preserve one selected/entitled MaterialSet per active season for MVP.

### Explicitly Do Not Build
- Multiple MaterialSet purchases/switching in one active season.
- AI subscription.
- AI entitlement.
- Advanced monetization.
- Complex subscription tiers.


# 65. Sprint 5 — Home / Dashboard & Tournament Details Foundation

### Objective
Create the primary post-onboarding experience and central navigation point, including a Region-aware tournament-information experience.

Home is a core MVP feature.

### Product Features
- Home screen.
- Greeting.
- Current season.
- Current competitive division or Study Track.
- Current Region.
- Study entry point.
- Current progress where available.
- Study goals.
- Streak information where available.
- Mastery summary where available.
- Review recommendations where available.
- Practice entry point.
- Analytics entry point.
- Profile access through main navigation.
- Region tournament summary/calendar entry point.
- Next-tournament summary/card when tournament configuration exists.
- Tournament Details screen.
- Tournament date/time.
- Tournament venue/location information.
- User material-scope summary where applicable.
- Study Now action into tournament-scoped material when applicable.
- Get Directions handoff to the platform/device mapping experience where appropriate.
- Loading states.
- Empty states.
- Error states.

### Tournament Details Foundation
Tournament data comes from the authoritative Sprint 3 season/Region configuration.

Every tournament configured for the user's selected Region remains visible regardless of the user's competitive division or Study Track, including for Cadet users.

The Tournament Details screen may show:
- Tournament name.
- Date/time/countdown presentation.
- Venue name and address/location text.
- Map/location presentation.
- Participating divisions where useful.
- Required material for the user's selected MaterialSet when the division participates.
- Informational "not participating/no material scope" state when the user's division does not participate.
- Study Now when applicable.
- Get Directions.

Study Now should scope the existing Study/Flashcard experience to configured tournament-required Cards rather than duplicating curriculum.

Ignite does not need to collect or persist the Quizzer's precise location to display a tournament venue or hand off directions.

Progress/readiness information should be progressively enhanced by later systems rather than fabricated in Sprint 5: Sprint 6 adds study progress/activity, Sprint 7 adds mastery/review readiness, and Sprint 9 may add higher-level tournament preparation analytics.

### Architecture Work
Home is a composition layer, not a business-logic container.

Home should consume data from the appropriate application/domain layers.

Home should NOT calculate:
- Mastery.
- Flashcard progress.
- Practice scores.
- Analytics.
- Season rules.
- Tournament requirements.
- Region/tournament filtering rules independently of the tournament application boundary.

Tournament details should consume season/Region-owned tournament configuration and existing Study/application boundaries rather than becoming a second source of curriculum truth.

Some Home sections may initially display empty states because their underlying systems are implemented in later MVP sprints.

### Explicitly Do Not Build
- Regional Finals/Nationals eligibility enforcement.
- Advanced recommendations.
- AI recommendations.
- Full tournament simulation/dashboard.
- Tournament competition mechanics.
- Social feed.
- Coach dashboard.

### Outcome
The application has a stable Home shell, can present the user's selected Region and its tournament calendar, can show applicable division/Study Track material requirements without hiding unrelated regional tournaments, and can navigate into Study without duplicating business logic.


# 66. Sprint 6 — Study Progress & Activity

### Objective

Establish the system that records and interprets Quizzer study activity and use that authoritative activity to begin populating previously established product surfaces.

### Product Features
- Study activity.
- Flashcard study events.
- Recall events.
- Card study history.
- Study progress.
- Study streak.
- Progress summaries.
- Recently Studied / Recents data for the Study hub.
- Real study streak/activity data for Profile where included.
- Study-progress information for tournament preparation/details where applicable.

### Architecture Work
- Establish Study Activity domain model.
- Establish RecallEvent model.
- Establish event ownership.
- Separate study activity from UI state.
- Establish progress calculation/application layer.
- Establish season-scoped progress.
- Establish repository boundaries.
- Establish testing patterns for business rules.
- Ensure historical events are treated as authoritative learning history.
- Ensure progress is scoped to Quizzer + Season + MaterialSet + Card.
- Establish server-side authoritative RecallEvent processing, including idempotency validation and authoritative Progress snapshot updates.
- Ensure Study, Profile, Home, and Tournament surfaces consume progress/activity rather than recalculating it independently.

### Important Business Rule
Study activity belongs to the Quizzer's experience within a specific season.

A new season starts new progress.

### Explicitly Do Not Build
- Advanced mastery algorithms.
- Rich analytics calculations owned by Sprint 9.
- AI analysis.
- Practice scoring.
- Offline synchronization.


# 67. Sprint 7 — Mastery & Review System

### Objective

Convert study activity into meaningful mastery/review behavior and use those outputs to enrich Study and tournament preparation experiences.

### Product Features
- Learning state.
- Reviewing state.
- Mastered state.
- Needs Refresh state.
- Recall-based mastery.
- Review scheduling.
- Review queue.
- Recommended study material.
- Needs Work cards.
- Mastery summaries.
- Study hub smart collections such as Review Due, Needs Work, and Mastered.
- Mastery/review readiness information for tournament material where appropriate.

### Architecture Work
- Establish Mastery domain model.
- Separate mastery rules from UI.
- Establish review scheduling service/use case.
- Establish mastery calculation/testing boundaries.
- Ensure Home consumes mastery rather than calculating it.
- Ensure Analytics consumes mastery rather than recalculating it independently.
- Ensure Study hub smart collections derive from mastery/review state rather than duplicating Cards.
- Ensure Tournament Details/Preparation consumes authoritative mastery/progress rather than owning its own learning state.
- Preserve RecallEvent history as the authoritative learning record.
- Establish server-side authoritative Mastery processing from RecallEvents, including idempotent event handling and authoritative materialized Progress/Mastery snapshot updates.
- Use materialized Progress/Mastery state for efficient reads.

### Dependencies
Sprint 6 Study Activity.

### Explicitly Do Not Build
- AI recommendations.
- AI Coach.
- Offline mastery synchronization.
- Advanced adaptive learning beyond MVP requirements.


# 68. Sprint 8 — Practice Foundation & Practice Hub

### Objective
Introduce Practice as the second core learning experience and build the Practice landing page that users enter from the main Practice tab without making MVP delivery depend on an external official question bank or full Rulebook integration.

### Product Features
- Practice landing page / Practice hub.
- Available challenge/game list.
- Practice navigation.
- Practice session.
- Practice challenge/question abstraction.
- Practice attempt/answer.
- Practice result.
- Practice scoring.
- Practice history foundation.
- At least one strong functioning Scripture-derived Practice experience using the user's authoritative MaterialSet (for example Next Word, Verse Builder, or Fill in the Missing Word).
- Appropriate loading/empty/error states.

### Practice Hub Scope
The Practice landing page may show multiple planned game/challenge types, but the MVP does not require every product-mockup game to be implemented.

Sprint 8 should prioritize the reusable Practice architecture and at least one excellent working Scripture-derived mode. Additional modes and authorized official question sets can be introduced later without restructuring the Practice domain.

Top-of-page Practice summaries should only display real values that can be derived from PracticeSession/PracticeResult data. Richer Practice analytics belong to Sprint 9.

### Architecture Work
Establish a separate Practice domain:

Practice
↓
Practice Session
↓
Question/Challenge
↓
Attempt
↓
Result

Practice must not reuse Flashcard business logic simply because both features involve Scripture/Cards.

Flashcard study and Practice represent different user actions and different business rules.

Practice scoring must remain separate from Flashcard correctness.

The initial Scripture-derived mode may read authoritative Card/MaterialSet content through the correct application/repository boundary, but it must not mutate official curriculum or invent authoritative Bible-quizzing questions.

### Explicitly Do Not Build
- Every possible Practice mode.
- Tournament simulation.
- Official tournament-question dependency unless explicitly provided/authorized later.
- Full Rulebook/tournament-rule simulation.
- AI-generated questions.
- Coach Practice.
- Advanced multiplayer Practice.
- Rich cross-feature analytics owned by Sprint 9.


# 69. Sprint 9 — MVP Analytics

### Objective

Give the Quizzer meaningful visibility into season progress through the dedicated Analytics experience and populate richer summaries on other established product surfaces using authoritative data.

### Product Features
- Dedicated Analytics screen.
- Study history.
- Practice history.
- Study frequency.
- Streak calendar.
- Cards studied.
- Cards mastered.
- Review activity.
- Practice performance.
- Practice summaries for the Practice hub where appropriate.
- Season progress.
- Progress trends.
- Tournament preparation/readiness analytics where supported by authoritative definitions/data.
- Richer Profile activity/analytics summaries where appropriate.
- Basic historical season view.
- Appropriate loading/empty/error states.

Analytics does not require a permanent bottom-navigation tab. It may be reached from Home and/or Profile through appropriate entry points.

### Metric Integrity
Only metrics with a clear, testable definition and authoritative source should be shown.

Concepts such as Focus Score, peak-performance time, break patterns, or similar derived metrics from product mockups should remain deferred unless their definitions, required data, privacy impact, and calculation rules are explicitly approved.

### Historical Season Behavior
Previous seasons may be retained for historical analytics/badges, but their curriculum does not become active again.

Progress does not transfer into a new season.

### Architecture Work
- Establish Analytics domain/application boundary.
- Define analytics data sources.
- Ensure Analytics consumes authoritative domain/application data rather than duplicating business logic.
- Establish historical data boundaries.
- Establish season-scoped analytics.
- Establish analytics query patterns.
- Establish testing for important calculations.
- Ensure analytics remain privacy-preserving and do not become a second source of truth.
- Ensure Profile, Practice, Home, and Tournament surfaces consume shared authoritative analytics outputs where appropriate rather than implementing separate competing calculations.


# 70. Sprint 10 — MVP Product Integration & Polish

### Objective

Connect all major MVP systems and established product surfaces into a coherent application experience.

### Product Features
Integrate and polish:
- Home.
- Study hub.
- Flashcard engine.
- Profile.
- Settings.
- Tournament Details.
- Official Resources link from Profile to the WPF Bible Quizzing website.
- Progress.
- Mastery.
- Review.
- Practice hub and Practice experiences.
- Analytics.
- Season.
- User state.
- Entitlement/access state.
- Main navigation: Home | Study | Practice | Profile.

### Architecture Work
- Validate feature boundaries.
- Validate dependency direction.
- Remove accidental cross-feature dependencies.
- Validate state ownership.
- Validate navigation architecture.
- Validate repository boundaries.
- Validate loading/error/empty-state patterns.
- Refactor duplicated business logic.
- Establish shared application patterns only where justified.
- Validate testing coverage.
- Validate privacy/security boundaries.
- Confirm future offline functionality can be added through repository/persistence boundaries without changing core domain ownership.

### End-to-End Experience
Account
↓
Base Onboarding
↓
Current Season Setup
↓
Age / Division or Study Track + Region
↓
Resolved MaterialSet
↓
Purchase
↓
Home
↓
Study / Tournament / Practice / Profile
↓
Flashcard Study + Study Activity
↓
Mastery / Review
↓
Practice
↓
Analytics
↓
Integrated Home/Profile summaries

### Outcome
The MVP product surfaces behave as one coherent application rather than a set of separately developed features, while retaining clean domain/repository boundaries.


# 71. Sprint 11 — MVP Stabilization & Release Readiness

### Objective

Prepare the complete core product for real-world MVP release.

### Functional Testing
- Authentication.
- Onboarding.
- Division/Study Track eligibility.
- Region selection/routing.
- Five MaterialSet resolution/import integrity.
- Curriculum Sections + Annotated Scripture List.
- Profile.
- Settings/account controls.
- Season access.
- Purchase/access.
- Study hub.
- Flashcards.
- Tournament Details/basic preparation flow.
- Progress.
- Mastery.
- Review.
- Practice hub and functioning Practice mode(s).
- Analytics.
- Main navigation and cross-feature routing.

Architecture Validation
- Domain boundaries.
- Feature boundaries.
- Dependency direction.
- State management.
- Persistence.
- Data integrity.
- Security boundaries.
- Repository boundaries.
- Privacy-by-design requirements.

### Quality
- End-to-end tests.
- Device testing.
- Performance testing.
- Accessibility review.
- Error handling.
- Loading states.
- Empty states.
- Regression testing.
- Crash/error monitoring.
- Production configuration.
- Release build validation.

### MVP Completion Criteria

At the completion of Sprint 11:

The Core MVP is considered complete.

No post-MVP feature should be required to declare the MVP complete.


# 72. Sprint 12 — Offline Flashcard Study & Synchronization

### Phase: Post-MVP

### Objective

Add offline Flashcard studying after the MVP has validated the core online experience, including the Settings controls needed to manage offline content.

### Product Features
- Offline Flashcard content.
- Offline Flashcard studying.
- Offline Flashcard progress.
- Offline recall events.
- Offline progress queue.
- Synchronization when connectivity returns.
- Settings: Download Cards.
- Settings: Auto-download where appropriate.
- Offline storage/status/error presentation.

### Architecture Work
- Local data source.
- SQLite persistence.
- Sync engine.
- Sync state.
- Conflict handling.
- Offline repository implementation.
- Online/local data coordination.
- Idempotent event processing.
- Multi-device synchronization behavior.
- Offline Settings/preferences boundary.

### Critical Tests
- Offline study.
- Reconnect.
- Duplicate events.
- Multi-device events.
- Season isolation.
- Mastery transitions after synchronization.
- Review scheduling after synchronization.
- Download/auto-download state and failure handling.

The architecture established in the MVP should allow this work to be introduced without rewriting the Flashcard domain.


# 73. Sprint 13 — AI Architecture Foundation

### Phase: Post-MVP

### Objective

Introduce the architectural boundary required for future AI functionality.

### Architecture Work
- AI feature boundary.
- AI service abstraction.
- Provider abstraction.
- AI request/response models.
- AI error handling.
- AI usage tracking.
- AI entitlement boundary.
- Privacy and child-safety review for AI data access.
- AI must never become the source of truth.

No major user-facing AI feature is required in this sprint.


# 74. Sprint 14 — AI Song Generation

### Phase: Post-MVP

### Objective

Introduce the first major AI user experience.

### Product Features
- Generate Song action on a Card.
- Verse/context input.
- Genre/style selection.
- Tempo/options.
- Song generation.
- Generated song handling.
- AI loading/error states.
- Usage limits where applicable.
- AI entitlement/subscription handling.

The generated song is supplemental learning functionality and does not modify official curriculum, Progress, Mastery, or authoritative learning data.


# 75. Sprint 15+ — Additional AI Features

### Phase: Post-MVP

Potential future features:
- AI Coach.
- AI study assistance.
- AI-generated Practice content.
- AI quizmaster.
- Voice interaction.
- Adaptive recommendations.
- Additional AI learning tools.
- Additional AI experiences.

Each should receive an appropriately scoped sprint rather than being bundled into one large AI sprint.


# 76. Future Feature Track — Coach Experience

### Phase: Post-MVP

Potential future work:
- Coach accounts.
- Quizzer/coach relationships.
- Team management.
- Coach analytics.
- Team progress.
- Coach Practice tools.
- Tournament preparation support.

A separate Coach Portal is intentionally not part of MVP.


# 77. Future Feature Track — Advanced Tournament Features

### Phase: Post-MVP

Potential future work:
- Regional Finals/Nationals eligibility enforcement.
- Tournament participation history.
- Tournament simulation.
- Tournament-specific advanced Practice.
- Official Rulebook-driven timing/scoring/penalty behavior.
- Authorized official question-set integration.
- Advanced tournament analytics.
- Competition features.
- Buzzer-oriented simulation.
- Voice quizmaster.

Basic region-aware tournament information, material requirements, and preparation flows exist within MVP where required by the product requirements, but eligibility enforcement and complete tournament simulation are not MVP requirements.


# 78. Future Feature Track — Social / Community

### Phase: Post-MVP

Potential future work:
- Community.
- Social interaction.
- Sharing.
- Teams.
- Leaderboards.
- Social competition.

These features require separate privacy and child-safety review before implementation.


# 79. Future Feature Track — Advanced Engagement

### Phase: Post-MVP

Potential future work:
- Expanded badges.
- Achievement systems.
- Advanced gamification.
- Advanced streak mechanics.
- Additional personalization.


# 80. MVP Definition

The MVP should be considered complete when the following are functional and reliable:

### Account / Profile
- Authentication
- Quizzer onboarding
- First and last name identity
- Optional preset avatar / initials fallback
- U.S. child-privacy/guardian-consent routing boundary, with final COPPA treatment privacy/legal reviewed before release
- Profile foundation
- Settings/account controls
- Official Resources link to WPF Bible Quizzing website
- Season/material-set purchase

### Main Navigation
- Home
- Study
- Practice
- Profile
- Settings accessible under Profile
- Analytics accessible through appropriate Home/Profile entry points

### Season / Participation
- Current season
- Configurable season/source/availability dates with October 1 as the normal Ignite target
- Region selection
- Five official divisions: Cadet, Beginner, Junior, Intermediate, Experienced
- Season-scoped eligibility age/minimum eligibility information
- Cadet/Beginner eligible choice for ages 2–4
- Youth division selection/validation
- Age-19+ Study Track selecting one division MaterialSet for the active season
- One active MaterialSet per user/season in MVP
- Five independent season MaterialSets
- Locked authoritative learning content
- Material-set-aware entitlement
- Season transition
- Region-aware authoritative tournament configuration

### Study / Flashcards
- Study landing page/material selection
- Study All Material via Flashcards
- Curriculum Sections / Explore by Section
- Annotated Scripture List grouped by section
- Scripture reference + text + official annotations rendered in the list view
- Shared Card/annotation source of truth between Flashcards and list view
- Full Flashcard experience
- Study
- Review
- Correct / Needs Work
- Progress
- Mastery
- Review scheduling
- Smart collections
- Tournament-scoped Study entry where configured

### Analytics
- Dedicated Analytics experience
- Study activity
- Streak
- Mastery
- Progress
- Practice performance/history as available
- Tournament preparation progress where supported
- Basic historical view

### Practice
- Practice landing page / hub
- At least one functioning Scripture-derived Practice experience based on the user's authoritative MaterialSet
- Practice session/result foundation
- No official question-bank or full Rulebook dependency required for MVP

### Home / Tournaments
- Primary Home experience
- Current season/Region/material context
- Study/progress summary
- Region tournament information
- Every tournament in the selected Region remains visible regardless of division/Study Track
- Tournament Details entry point
- Applicable division/Study Track material scope where configured
- Navigation to core product areas
- Appropriate loading, empty, and error states

### Profile / Settings
- Basic Quizzer identity/account presentation
- Settings entry point
- First and last name management (Edit Name)
- Optional preset avatar / initials presentation
- Email/password/account controls as implemented for MVP
- Sign-out
- Official WPF resource link
- Required account-lifecycle controls before release

### Security
- Authentication
- User isolation
- Season/material-set isolation
- Secure content access

### Privacy
- Required privacy controls
- Appropriate consent mechanisms
- Privacy-safe telemetry
- Privacy-safe diagnostics
- No requirement for user-uploaded profile photos

The MVP does not require:
- Offline Flashcard studying
- Offline progress synchronization
- Offline Study Settings such as Download Cards/Auto-download
- Offline Practice
- Full push-notification functionality
- Coach portal
- Parent portal
- Community
- AI
- Tournament simulation
- Regional Finals/Nationals eligibility enforcement
- Full Rulebook ingestion/tournament-rule simulation
- Official tournament/practice question-bank integration
- Multiple adult Study Tracks per season or mid-season Study Track switching
- Advanced gamification
- Undefined/unsupported analytics metrics such as Focus Score unless later explicitly specified


# 81. Definition of Done for Architectural Work

A feature is not considered architecturally complete merely because it works visually.

It must:
- Respect domain boundaries.
- Use repository interfaces.
- Avoid direct Firebase access from UI.
- Have loading/error/empty states.
- Have tests for important business logic.
- Respect season ownership.
- Respect user ownership.
- Avoid unnecessary global state.
- Handle persistence failures.
- Follow privacy requirements.
- Avoid creating duplicate sources of truth.
- Keep future feature boundaries clean.
- Avoid implementing speculative infrastructure solely for future features.


# 82. Architectural Non-Negotiables

The following rules should be enforced throughout development.

Rule 1
Firebase is infrastructure, not the domain model.

Rule 2
Season is the authoritative yearly curriculum boundary; MaterialSet is the division-specific curriculum sub-boundary.

Rule 3
Progress belongs to Quizzer + Season + MaterialSet + Card.

Rule 4
Mastery does not belong to Decks.

Rule 5
Cards are never duplicated into Decks.

Rule 6
Historical seasons never participate in current learning calculations.

Rule 7
Published authoritative learning content is immutable through ordinary workflows; official tournament operational data may receive controlled updates.

Rule 8
When offline functionality is implemented post-MVP, offline events must be safely retryable.

Rule 9
The backend enforces authorization.

Rule 10
AI never becomes the source of truth.

Rule 11
Practice scoring remains separate from Flashcard correctness.

Rule 12
Do not implement future features merely to prepare for them. Build stable interfaces instead.

Rule 13
The MVP is online-first. Offline infrastructure should not be implemented early merely because it is planned for post-MVP.


# 83. Future Architecture Expansion

The architecture should make it possible to add:
- Offline Flashcard learning
- Coach
- Team
- Tournament
- AI Coach
- Community
- Messaging
- Advanced Analytics
- Additional Practice Games
- Additional AI Providers

without changing the fundamental:
- Season
- Region
- MaterialSet
- CurriculumSection
- Quizzer
- Card
- Progress
- Practice
- Repository

relationships.


# 84. Product Success Criteria

Ignite succeeds when a Quizzer can:
# 1. Obtain the correct season material.
# 2. Study Cards easily.
# 3. Actively recall verses.
# 4. Know which verses need work.
# 5. Build long-term mastery.
# 6. See meaningful progress.
# 7. Prepare for upcoming tournament requirements.
# 8. Practice applying Scripture to Bible-quizzing questions.
# 9. Eventually use advanced tools such as offline learning and AI without making either necessary to use the core product.

### Post-MVP product success additionally includes:
- Continue studying without internet access.
- Synchronize Flashcard progress reliably across devices.

The core measure of product success is not the number of features.

It is whether Ignite helps Quizzers memorize, retain, and apply Scripture well enough to become better Bible Quizzers.


# 85. Current Implementation Priority

Because Sprint 1 is complete and Sprint 1.5 is underway, development should now proceed with caution.

Before adding significant new Flashcard functionality:
# 1. Review the current Sprint 1.5 implementation against this architecture.
# 2. Establish the domain models.
# 3. Establish repository interfaces.
# 4. Establish Season/Card boundaries.
# 5. Establish the online persistence boundary.
# 6. Establish the RecallEvent model.
# 7. Ensure the JSON test fixture operates behind the intended data/domain interfaces.
# 8. Then continue building the MVP learning functionality.

Do not implement SQLite, offline synchronization, or offline Flashcard study as part of Sprint 1.5 or Sprint 1.75.

The objective is not to discard existing work.

The objective is to ensure the existing Flashcard implementation evolves into the architecture defined here rather than becoming an accidental architectural foundation.


# 86. Source-of-Truth Hierarchy

When requirements conflict, use this hierarchy:
# 1. Explicit current product decisions from the product owner.
# 2. This PRD.
# 3. Architecture decisions recorded in this PRD.
# 4. Official committee-provided season material/rules.
# 5. Existing implementation.
# 6. Developer assumptions.

Existing code must not override an explicit product or architectural requirement.

If implementation conflicts with the PRD, the implementation should be evaluated for correction.


# 87. Open External Dependencies

The following are intentionally dependent on information outside the current product definition:
- Final official season material files for Cadet, Beginner, Junior, Intermediate, and Experienced
- Official section/category definitions supplied with each season's material
- Official annotation definitions/source formatting for each MaterialSet
- Official WPF Region configuration and updates
- Official tournament schedules and operational changes
- Final division/material-set-specific tournament requirements
- Final season/source/availability/end dates
- Applicable legal/privacy requirements, including the final U.S. under-13 parental-consent implementation
- App-store compliance requirements
- Official Rulebook and authorized official question sets for future advanced Practice/tournament/AI features
- Final AI provider/service contracts

These should be incorporated into the system through configuration/content models rather than hard-coded assumptions whenever possible.


# 88. Final Architectural Position

Ignite is now defined as a:

Season-aware, Region-aware, user-owned Bible memorization and Bible-quizzing platform built around division-specific authoritative MaterialSets, a durable Flashcard learning engine, an annotated Scripture-reading experience, and an extensible Practice system.

Its MVP architectural foundation is:

### Season
↓
Region + QuizzerSeasonParticipation
↓
Selected Competitive Division or Study Track
↓
MaterialSet
↓
Curriculum Sections
↓
Cards + Extensible Annotations
↓
Quizzer + Season + MaterialSet + Card
↓
Recall Events
↓
Progress / Mastery

with the same authoritative Card/annotation data presented through:

### Study
├── Study All Material — Flashcards
├── Explore by Section
└── View All Material — Annotated Scripture List

and:

### Practice
↓
Game
↓
Question/Challenge
↓
Attempt
↓
Result

as the application/competition loop.

Firebase provides the canonical remote persistence infrastructure for the MVP.

Repositories isolate infrastructure.

The MVP remains online-first.

Offline Flashcard learning is post-MVP.

AI is optional and advisory.

Official Scripture/material content remains authoritative and immutable through ordinary product workflows once active, while tournament operational information may receive controlled official updates.

The architecture is designed so future Coach, team, tournament, Rulebook-driven Practice, official question sets, offline learning, AI, community, and advanced analytics capabilities can be added without replacing the core product model.

Ignite
Product Requirements & Architecture Document
(PRD) v3.0
Status: Canonical working specification
Product: Ignite
Platform: iOS and Android
Primary Technology: React Native + TypeScript
Backend: Firebase / Cloud Firestore
Local Persistence: Online-first MVP; SQLite planned for post-MVP offline learning
Architecture: Feature-oriented application architecture with domain and repository boundaries
Primary Core Experience: Flashcard-based Bible memorization
Document Purpose: Product, domain, architecture, data, UX, and development source of truth



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


## 4.2 Account Creation Context
During onboarding, the application should ask whether:
   - The account is being created for the person using it.
   - The account is being created by an adult helping a Quizzer.
This distinction is onboarding/consent context.
It does not create separate Parent and Child application experiences.


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

The product season is approximately:
October → July
October is the preparation/start period when new curriculum becomes available.
January → July represents the primary tournament period.
July ends with Nationals.
August and September are the transition/preparation period for the next season.
The exact end date is configurable per season.


## 5.2 Season Dates
Each Season must contain explicit configuration:

  seasonId
  name
  startDate
  endDate
  status

Dates must be configuration data.
The application must never hard-code rules such as:
  "The season ends seven days after Nationals."
Instead, the administrator/content system configures the actual end date.


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

The approved season is entered into Ignite and made available for purchase/access.

Active / Locked

When the season becomes active, authoritative content is immutable.

Archived

After the configured season end date, the season becomes historical.



# 6. Season Content Immutability
Once a season is locked, the following cannot be modified during the active season:
  - Curriculum
  - Cards
  - Card numbering
  - Scripture content
  - Annotations
  - Highlights
  - Underlines
  - Unique beginnings
  - Unique endings
  - People
  - Proper names
  - Animals
  - Body parts
  - Keywords
  - Cross references
  - Quiz rules
  - Division requirements
  - Tournament configuration

  - Other official season configuration
Normal users, Quizzers, and future Coaches cannot modify authoritative season content.

Administrative correction policy

The normal active-season system does not support content mutation.
If a genuine official correction is ever required, it must be handled through a controlled
administrative process outside ordinary user functionality and must preserve an audit trail.
The V1 application does not need to implement an in-season correction workflow.



# 7. Season Independence
The same Scripture reference may appear in multiple seasons.
However, seasons must not share curriculum state.
For example:

  Season 2026–2027
  Card #13
  John 1:1
  Season-specific text/annotations/rules

and:

  Season 2027–2028
  Card #42
  John 1:1
  Different season-specific content/annotations/rules

These are independent curriculum entities.
A Scripture reference is descriptive metadata, not the identity of the learning object across
seasons.
Card #13 in one season does not imply any relationship with Card #13 in another season.



# 8. Division System
## 8.1 Official Divisions

Ignite supports:

Beginner

Ages 8 and under.

Junior

Ages 9–11.

Intermediate

Ages 12–14 and first-year Quizzers ages 15–18.

Experienced / Senior

Advanced Quizzers ages 12–18.
The exact number of cards/material required for each division may change every season
according to the committee's material and requirements.


## 8.2 Division Onboarding
During onboarding:
# 1. User provides age.
# 2. Ignite determines eligible divisions.
# 3. User selects their division.
# 4. Ignite associates that division with the current season.
# 5. Ignite displays the corresponding season/division material available for purchase.
The division is scoped to the season.


## 8.3 Division Changes
A Quizzer's division does not change during an active season in V1.
Division can change when the next season is established.
This prevents mid-season transfer complexity.



# 9. Purchase and Entitlement Model

## 9.1 Season Purchase
The primary product is purchased once per season.
A season purchase grants access to the core product for that season, including:
  - Flashcards
  - Study functionality
  - Practice functionality
  - Analytics
  - Achievements
  - Other included season features
The season purchase does not include future premium AI functionality.


## 9.2 AI Subscription
AI functionality is a separate optional subscription.
AI is supplemental.
The core Ignite experience must remain usable without AI.
AI can be disabled or unavailable without preventing use of the primary product.


## 9.3 Season Availability
New season material is targeted to be available for purchase around October 1.
This allows Quizzers to begin preparation before the main tournament period beginning in
January.


## 9.4 Mid-Season Purchase
If a user purchases the active season after the season has begun, they receive the same
access to the current season's available material and functionality.
Ignite does not fabricate historical activity for time before the user began using the application.
Example:
A Quizzer purchases in March.
They can access all current season material.
Their analytics begin when they begin using Ignite.
The system does not create artificial October–February activity.


## 9.5 Previous Seasons

Users may retain ownership records for previously purchased seasons.
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
  Division
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
  Achievement
  SeasonEntitlement
  AnalyticsEvent

Not every domain concept is necessarily persisted as a standalone database entity.



# 12. Canonical Curriculum Model
## 12.1 Card Is the Canonical Study Unit
A Card is the fundamental learning unit.
A Card belongs to exactly one Season.
A Card contains season-specific:
  - Card number
  - Scripture reference
  - Scripture text
  - Annotations
  - Highlighting
  - Underlining
  - Quiz metadata
  - Unique beginnings/endings
  - Keywords
  - People
  - Places
  - Animals
  - Body parts
  - Cross references
  - Other committee-provided metadata


## 12.2 Card Identity
The canonical identity is:

  seasonId + cardId

Card number is unique within a season.
Card number is not a global identifier.


## 12.3 Scripture Reference
The Scripture reference is stored as content metadata.
It is not the cross-season identity of the Card.
This allows the same Scripture to appear in different seasons with completely different
season-specific content.


## 12.4 KJV
The application uses the King James Version (KJV) as the Bible text source for the curriculum.



# 13. Deck Architecture
## 13.1 Official Season Material
The full season curriculum is the canonical collection of Cards available to the Quizzer.


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

  Quizzer + Season + Card

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



# 15. Flashcard Progress
Progress is scoped to:

  Quizzer + Season + Card

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
The application may define tournament milestones such as:

  Tournament 1
  Required Cards: 1–50


  Tournament 2
  Required Cards: 1–100

  Tournament 3
  Required Cards: ...

The actual tournament schedule and required Card ranges are season configuration provided
by the committee.
Ignite should compare the Quizzer's current mastery/progress against those requirements.
The purpose is to help a Quizzer understand whether they are prepared for upcoming
tournament material.



# 22. Practice System
Practice is a separate domain from Flashcard study.


## 22.1 Practice Session
A Practice Session represents a structured activity designed to apply knowledge.
Examples include:
  - Practice games
  - Quiz practice
  - Multiple-choice practice
  - Matching games
  - Word progression games
  - Tournament-style practice
  - Future AI practice
Flashcard memorization is represented as a Study Session, not a Practice Game, although both
contribute to the user's broader activity history.


## 22.2 Practice Architecture
All practice games should conform to a common model:

  Practice Session
     ↓
  Practice Game

      ↓
  Question
      ↓
  Attempt
      ↓
  Result
      ↓
  Score

This allows future games to be added without restructuring the entire Practice system.


## 22.3 Initial Practice Games
The product vision includes:
  - Word/next-word games
  - Matching
  - Multiple-choice questions
  - Games for younger Quizzers
  - Specific question-set practice
  - Buzzer-oriented practice


## 22.4 Official Questions
Initial question sets are predetermined.
Questions should be provided by the committee/quiz board rather than randomly generated by
AI.
AI-generated questions are deferred.


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

  - Penalties
  - Completion rules



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
Official Bible-quizzing rules are provided by the committee.
The rules should eventually be represented as structured season configuration rather than
embedded throughout application code.
For example:

### Season
  └── QuizRules
     ├── QuestionTypes
     ├── PointValues
     ├── TimingRules
     ├── BuzzerRules
     ├── DivisionRules
     └── OtherOfficialRules

This allows the product to support future seasons without rewriting core gameplay logic.

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
    ├── quizRules
    ├── tournaments
    └── cards/{cardId}

  users/{userId}
    ├── profile
    ├── preferences
    └── entitlements/{seasonId}

  users/{userId}/seasons/{seasonId}
    ├── participation
    ├── progress/{cardId}
    ├── recallEvents/{eventId}
    ├── studySessions/{sessionId}
    ├── decks/{deckId}
    ├── practiceSessions/{sessionId}
    ├── achievements/{achievementId}
    └── analytics summaries

The exact collection structure may evolve during implementation as long as the ownership
boundaries and domain contracts remain intact.



# 37. Data Ownership Matrix
 Entity                   Scope                 Authority                Mutable



 User                     User                  User/account system      Yes


 User Preferences         User                  User                     Yes


 Season                   Global/official       Admin/content            No once active


 Division                 Season                Official configuration   No once active

Entity               Scope             Authority                Mutable



Card                 Season            Official configuration   No once active


Quiz Rules           Season            Official configuration   No once active


Tournament           Season            Official configuration   No once active


Season Entitlement   User + Season     Purchase system          Controlled


Progress             User + Season +   Derived/server           Yes
                     Card


Recall Event         User + Season +   User activity            Append-only
                     Card


Mastery              User + Season +   Derived/server           Materialized
                     Card


Study Session        User + Season     User activity            Append-only/controll
                                                                ed


Custom Deck          User + Season     User                     Yes


Deck Membership      User + Season +   User                     Yes
                     Card


Practice Session     User + Season     User activity            Append-only


Practice Attempt     User + Season     User activity            Append-only


Achievement          User + Season     Derived                  Recorded


Historical Summary   User + Season     Derived                  Read-only after
                                                                archive

 Entity                   Scope                    Authority               Mutable



 Analytics Event          Minimum required         Analytics system        Append-only
                          scope

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
The dependency direction must be:

  Presentation
     ↓
  Application / Feature
     ↓
  Domain
     ↓
  Repository Interfaces
     ↓
  Persistence Implementations
     ↓
  Firebase / SQLite

Never:

  UI
  ↓
  Firebase

and never:

  Domain
  ↓
  Firebase SDK

This keeps Firebase replaceable and prevents infrastructure from becoming the domain model.

# 40. Navigation Architecture
Navigation should be organized around product-level destinations rather than individual
database concepts.
Initial major destinations include:
   - Home
   - Flashcards
   - Practice
   - Analytics
   - Settings
Authentication/onboarding/purchase flows remain outside the main authenticated application
experience.
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
    - Study overview
    - Progress visualization
    - Important review activity
Home should primarily summarize information.
It should not become the owner of learning logic.



# 42. Authentication
Ignite requires an account.
The application is not usable anonymously.
Authentication is handled through Firebase Authentication.
The authentication layer should remain independent from Quizzer domain data.

The authenticated identity maps to the application's User/Quizzer record.



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
The application should not unnecessarily collect:
  - Real name
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
Notifications are a future/controlled capability.
Any notification system must:
  - Avoid sensitive information on lock screens.
  - Respect user settings.
  - Avoid unnecessary notification permissions.
  - Not expose detailed child learning information.
  - Be evaluated for privacy before implementation.



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
Official curriculum is not currently available.
Development therefore uses a small JSON test curriculum.

The test dataset should be expanded beyond the current nine-verse fixture so that it exercises:
  - Card numbering
  - Multiple books
  - Multiple chapters
  - Long verses
  - Short verses
  - Annotations
  - Highlighting
  - Keywords
  - Unique beginnings
  - Unique endings
  - Cross references
  - Deck membership
  - Progress
  - Mastery
  - Review scheduling
  - Season isolation
  - Division requirements
The test dataset should remain replaceable by official season content.



# 50. Content Import
Official content is provided by the Bible Quiz Committee.
The developer is responsible for entering approved material into Ignite.
The import process should validate:
   - Card numbering
   - Required Scripture reference
   - Required Scripture text
   - Division assignments
   - Annotation structure
   - Quiz metadata
   - Tournament configuration
   - Rules configuration
Invalid content should fail validation before publication.



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
The architecture should accommodate these features without implementing them prematurely.



# 56. Architectural Decision Record
The following decisions are now canonical unless this PRD is intentionally revised.

Decision                Choice



Backend                 Firebase


Database                Cloud Firestore


Local V1 persistence    SQLite


Authentication          Firebase Authentication


Domain model            Application-owned


Persistence boundary    Repository interfaces


State management        Feature-local + Zustand for client/UI state


Flashcard offline       Yes


Practice offline V1     No


Sync model              Event-based/idempotent


Server authority        Yes


Mastery history         Recall Events


Mastery current state   Materialized snapshot


Cross-season progress   Never transferred


Card identity           Season + Card


Global Verse identity   Not used for learning state

 Decision                                  Choice



 Deck mastery ownership                    No


 Smart collections                         Derived


 Season content                            Immutable once active


 Division                                  User-selected within age eligibility


 Division changes                          Next season


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
  │ Home │ Flashcards │ Practice │ Analytics │
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
  └──────────────────────┬───────────────────────┘
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
| 2 | Authentication & User Onboarding | MVP | Pending |
| 3 | Season & Official Content System | MVP | Pending |
| 4 | Season Purchase & Access | MVP | Pending |
| 5 | Home / Dashboard Foundation | MVP | Pending |
| 6 | Study Progress & Activity | MVP | Pending |
| 7 | Mastery & Review System | MVP | Pending |
| 8 | Practice Foundation | MVP | Pending |
| 9 | MVP Analytics | MVP | Pending |
| 10 | MVP Home & Product Integration | MVP | Pending |
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


# 62. Sprint 2 — Authentication & User Onboarding

### Objective

Create the complete account and Quizzer onboarding experience.

### Product Features
- Account creation.
- Sign-in.
- Sign-out.
- Authentication persistence.
- User profile foundation.
- Quizzer onboarding.
- Age collection.
- Division selection.
- Age/division eligibility validation.
- Returning-user behavior.

### Division Requirement

The Quizzer provides:
# 1. Age.
# 2. Division selection.

The system enforces the eligibility rules for the selected division.

The selected division determines the appropriate material presented to the Quizzer.

### Architecture Work
- Establish authenticated user state.
- Define user identity boundaries.
- Separate authentication state from application/domain state.
- Establish user repository/service boundaries.
- Establish onboarding state.
- Define persistence ownership for user profile data.
- Establish navigation guards for authenticated/unauthenticated states.
- Apply privacy-by-design and child-safety requirements to account architecture.

### Important UX Principle

There is no separate Parent Portal in MVP.

An adult may create/use an account to assist a Quizzer, but the core application experience remains the same.

### Explicitly Do Not Build
- Coach portal.
- Parent portal.
- Multiple dashboard experiences.
- Team relationships.
- Advanced role-management systems.

### Dependencies

Sprint 1.5 and Sprint 1.75 architecture.


# 63. Sprint 3 — Season & Official Content System

### Objective

Establish the application's season and curriculum model.

### Product Features
- Current season.
- Season identity.
- Season lifecycle.
- Division-specific material.
- Official season content.
- Season-specific Card/content identity.
- Season-specific annotations.
- Season-specific quiz rules.
- Season activation.
- Season availability states.

Critical Business Rule

Once official season material is confirmed and released:

The season's official material is locked for the duration of that season.

The application must not support changing official material during an active season.

Season Isolation

Each season is independent.

The same verse may appear in multiple seasons, but those instances are not assumed to be the same domain content.

Each season may have different:
- Content
- Annotations
- Quiz rules
- Formatting
- Metadata

No progress transfers between seasons.

### Architecture Work
- Establish Season domain model.
- Establish Season → Division → Content relationships.
- Establish content ownership.
- Establish season context.
- Ensure Cards are season-specific.
- Ensure active-season selection is not scattered throughout the UI.
- Establish season-aware repository queries.
- Establish future season transition boundaries.
- Ensure published season content is immutable.

### Explicitly Do Not Build
- Mid-season content editing.
- Cross-season progress transfer.
- Cross-season active curriculum.
- Advanced content management systems.

### Dependencies

Authentication and user identity.


# 64. Sprint 4 — Season Purchase & Access

### Objective

Allow the Quizzer to obtain access to the appropriate current-season material.

### Product Features
- Available season display.
- Division-specific material.
- Purchase flow.
- Purchase state.
- Entitlement/access state.
- Locked/unlocked material.
- Restore purchase/access where applicable.
- Users without an active season.
- Expired season handling.
- Purchase/access errors.

### User Flow

Onboarding
↓
Age
↓
Division
↓
Eligible Material
↓
Purchase
↓
Season Access
↓
### Home

### Architecture Work
- Establish entitlement domain.
- Separate purchase provider implementation from application logic.
- Establish access-control boundaries.
- Establish purchase state.
- Establish entitlement persistence.
- Ensure UI does not directly own purchase business logic.
- Establish a clean boundary for future AI/subscription entitlements.
- Enforce backend authorization and season/user access rules.

### Explicitly Do Not Build
- AI subscription.
- AI entitlement.
- Advanced monetization.
- Complex subscription tiers.


# 65. Sprint 5 — Home / Dashboard Foundation

### Objective

Create the primary post-onboarding experience and central navigation point.

Home is a core MVP feature.

### Product Features
- Home screen.
- Greeting.
- Current season.
- Current division.
- Study entry point.
- Flashcard entry point.
- Current progress.
- Study goals.
- Streak information.
- Mastery summary where available.
- Review recommendations where available.
- Practice entry point.
- Analytics entry point.
- Loading states.
- Empty states.
- Error states.

### Architecture Work

Home is a composition layer, not a business-logic container.

Home should consume data from the appropriate application/domain layers.

Home should NOT calculate:
- Mastery.
- Flashcard progress.
- Practice scores.
- Analytics.
- Season rules.

Some Home sections may initially display empty states because their underlying systems are implemented in later MVP sprints.

### Explicitly Do Not Build
- Advanced recommendations.
- AI recommendations.
- Full tournament dashboard.
- Social feed.
- Coach dashboard.

### Outcome

The application has a stable Home shell that can progressively consume the outputs of the MVP's learning, Practice, and analytics systems.


# 66. Sprint 6 — Study Progress & Activity

### Objective

Establish the system that records and interprets Quizzer study activity.

### Product Features
- Study activity.
- Flashcard study events.
- Recall events.
- Card study history.
- Study progress.
- Study streak.
- Progress summaries.

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
- Ensure progress is scoped to Quizzer + Season + Card.

### Important Business Rule

Study activity belongs to the Quizzer's experience within a specific season.

A new season starts new progress.

### Explicitly Do Not Build
- Advanced mastery algorithms.
- AI analysis.
- Practice scoring.
- Offline synchronization.


# 67. Sprint 7 — Mastery & Review System

### Objective

Convert study activity into meaningful mastery and review behavior.

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

### Architecture Work
- Establish Mastery domain model.
- Separate mastery rules from UI.
- Establish review scheduling service/use case.
- Establish mastery calculation/testing boundaries.
- Ensure Home consumes mastery rather than calculating it.
- Ensure Analytics consumes mastery rather than recalculating it independently.
- Preserve RecallEvent history as the authoritative learning record.
- Use materialized Progress/Mastery state for efficient reads.

### Dependencies

Sprint 6 Study Activity.

### Explicitly Do Not Build
- AI recommendations.
- AI Coach.
- Offline mastery synchronization.
- Advanced adaptive learning beyond MVP requirements.


# 68. Sprint 8 — Practice Foundation

### Objective

Introduce Practice as the second core learning experience.

### Product Features
- Practice feature.
- Practice navigation.
- Practice session.
- Practice question.
- Practice answer.
- Practice result.
- Initial practice mode.
- Practice scoring.
- Practice history.

### Architecture Work

Establish a separate Practice domain:

### Practice
↓
Practice Session
↓
Question
↓
Answer
↓
Result

Practice must not reuse Flashcard business logic simply because both features involve Scripture/cards.

Flashcard study and Practice represent different user actions and different business rules.

Practice scoring must remain separate from Flashcard correctness.

### Explicitly Do Not Build
- Every possible Practice mode.
- Tournament simulation.
- AI-generated questions.
- Coach Practice.
- Advanced multiplayer Practice.


# 69. Sprint 9 — MVP Analytics

### Objective

Give the Quizzer meaningful visibility into their season progress.

### Product Features
- Study history.
- Practice history.
- Study frequency.
- Streak calendar.
- Cards studied.
- Cards mastered.
- Review activity.
- Practice performance.
- Season progress.
- Progress trends.
- Basic historical season view.

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


# 70. Sprint 10 — MVP Home & Product Integration

### Objective

Connect all major MVP systems into a coherent application experience.

### Product Features

Integrate:
- Home.
- Flashcards.
- Progress.
- Mastery.
- Review.
- Practice.
- Analytics.
- Season.
- User state.
- Entitlement/access state.

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

### Account
↓
Onboarding
↓
Age + Division
↓
### Season
↓
Purchase
↓
### Home
↓
### Flashcards
↓
Study Activity
↓
Mastery / Review
↓
### Practice
↓
### Analytics
↓
### Home


# 71. Sprint 11 — MVP Stabilization & Release Readiness

### Objective

Prepare the complete core product for real-world MVP release.

### Functional Testing
- Authentication.
- Onboarding.
- Division eligibility.
- Season access.
- Purchase/access.
- Flashcards.
- Progress.
- Mastery.
- Review.
- Practice.
- Analytics.

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

Add offline Flashcard studying after the MVP has validated the core online experience.

### Product Features
- Offline Flashcard content.
- Offline Flashcard studying.
- Offline Flashcard progress.
- Offline recall events.
- Offline progress queue.
- Synchronization when connectivity returns.

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

### Critical Tests
- Offline study.
- Reconnect.
- Duplicate events.
- Multi-device events.
- Season isolation.
- Mastery transitions after synchronization.
- Review scheduling after synchronization.

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
- Tournament simulation.
- Tournament-specific Practice.
- Tournament history.
- Advanced tournament analytics.
- Competition features.
- Buzzer-oriented simulation.
- Voice quizmaster.

Basic tournament-related progress/goals may exist within MVP where required by the product requirements, but a complete tournament simulation system is not an MVP requirement.


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

### Account
- Authentication
- Quizzer onboarding
- Age
- Division selection
- Season purchase

### Season
- Current season
- Season-specific curriculum
- Locked content
- Entitlement
- Season transition

### Flashcards
- Full Flashcard experience
- Study
- Review
- Correct / Needs Work
- Progress
- Mastery
- Review scheduling
- Smart collections

### Analytics
- Study activity
- Streak
- Mastery
- Progress
- Basic historical view

### Practice
- At least one functioning Practice experience based on official/predetermined material

### Home
- Primary Home experience
- Current season/context
- Study/progress summary
- Navigation to core product areas
- Appropriate loading, empty, and error states

### Security
- Authentication
- User isolation
- Season isolation
- Secure content access

### Privacy
- Required privacy controls
- Appropriate consent mechanisms
- Privacy-safe telemetry
- Privacy-safe diagnostics

The MVP does not require:
- Offline Flashcard studying
- Offline progress synchronization
- Offline Practice
- Coach portal
- Parent portal
- Community
- AI
- Tournament simulation
- Advanced gamification


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
Season is the authoritative curriculum boundary.

Rule 3
Progress belongs to Quizzer + Season + Card.

Rule 4
Mastery does not belong to Decks.

Rule 5
Cards are never duplicated into Decks.

Rule 6
Historical seasons never participate in current learning calculations.

Rule 7
Published season content is immutable.

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
- Final official season material
- Official quiz rules
- Official tournament schedules
- Final tournament material requirements
- Final season dates
- Applicable legal/privacy requirements
- App-store compliance requirements
- Final AI provider/service contracts

These should be incorporated into the system through configuration/content models rather than hard-coded assumptions whenever possible.


# 88. Final Architectural Position

Ignite is now defined as a:

Season-aware, user-owned Bible memorization and Bible-quizzing platform built around a durable Flashcard learning engine and an extensible Practice system.

Its MVP architectural foundation is:

### Season
↓
Season-specific Curriculum
↓
Cards
↓
Quizzer + Season + Card
↓
Recall Events
↓
Progress / Mastery

with:

Flashcard
↓
Study / Review

as the primary learning loop,

and:

### Practice
↓
Game
↓
Question
↓
Attempt
↓
Result

as the application/competition loop.

Firebase provides the canonical remote persistence infrastructure for the MVP.

Repositories isolate infrastructure.

Recall events provide historical learning truth.

Materialized Progress/Mastery provides efficient current state.

Season boundaries prevent cross-year contamination.

The MVP is intentionally online-first.

Post-MVP SQLite/local persistence and synchronization will extend the repository/persistence architecture without changing the core domain model.

AI remains optional and advisory.

Coach/community functionality remains future scope.

This architecture is intended to allow Ignite to grow substantially without requiring the core Flashcard feature, domain model, or persistence architecture to be replaced.

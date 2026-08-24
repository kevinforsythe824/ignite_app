# Ignite Firebase environments

Ignite uses **one codebase** and **three isolated Firebase projects**. A build must point at exactly one project. Development never defaults to production.

Sprint and release promotion flow: [SPRINT_PROMOTION.md](SPRINT_PROMOTION.md).

| Name | `EXPO_PUBLIC_IGNITE_ENV` | Firebase project ID | CLI alias |
|------|--------------------------|---------------------|-----------|
| Development | `dev` | `wpf-bible-qizzing` | `dev` (CLI default) |
| Staging | `staging` | `ignite-staging-01` | `staging` |
| Production | `prod` | `ignite-prod-01` | `prod` |

Project IDs are public identifiers. Client API keys, Auth domain, App ID, and Admin credentials are **not** stored in git. Copy `.env.<env>.example` to `.env.local` and fill values from the Firebase Console.

## Purpose of each environment

### Development (`dev`)

Fast iteration. Disposable/synthetic users. Seed and reset scripts are allowed. Holds test curriculum and edge-case data. Local Expo (`npm start`) should use this project.

### Staging (`staging`)

Production-like configuration for release-candidate builds. Synthetic users only unless a product owner explicitly approves otherwise. Use it for integration, purchase sandbox, security, and regression testing. Official season content is promoted here **before** production, through the content import workflow — not by copying the Firestore database.

### Production (`prod`)

Real users and authoritative published content. No casual console edits, seeds, or rule deploys. Data and config changes go through controlled workflows with an explicit production target.

## How the app chooses its Firebase project

The mobile app reads Expo public env vars (typically from `.env.local` in development):

1. `EXPO_PUBLIC_IGNITE_ENV` must be `dev`, `staging`, or `prod`. **There is no default.** Missing or invalid values fail startup. Production is never assumed.
2. `EXPO_PUBLIC_FIREBASE_*` must be the Firebase JS SDK web-app config for that environment.
3. `EXPO_PUBLIC_FIREBASE_PROJECT_ID` must match the project ID in the table above for the chosen env. A mismatch fails startup.

The mapping lives in `src/services/firebase/firebaseEnvironments.ts`. UI and domain code still talk to repositories; they do not select a Firebase project.

On a successful env-based init, Metro logs:

```text
[Ignite] Firebase environment=dev project=wpf-bible-qizzing
```

That line is the quick check that the running app is not pointed at production.

## How Firebase CLI aliases work

`.firebaserc` maps aliases to project IDs. The persistent CLI **default** is `dev` (`wpf-bible-qizzing`) so a bare `firebase` command does not target production.

```text
default  → wpf-bible-qizzing
dev      → wpf-bible-qizzing
staging  → ignite-staging-01
prod     → ignite-prod-01
```

```bash
npm run firebase:target          # show the active CLI project (should be dev)
npm run firebase:use:dev         # restore the default to development
npm run firebase:use:staging     # optional; changes the persistent default to staging — reset with firebase:use:dev afterward
```

`npm run firebase:use:staging` is convenient for a focused STAGING deploy session but **changes the persistent CLI default**. Prefer `--project staging` on individual commands when you do not need a persistent staging default. There is no `firebase:use:prod` script — that asymmetry is intentional. Do not run `firebase use prod`; that would rewrite the persistent default. Production CLI operations must pass an explicit project flag:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project prod
npx -y firebase-tools@latest deploy --only firestore:rules --project staging
```

If the local default is ever changed, reset it with `npm run firebase:use:dev` and do not commit a default of `prod`.

### After STAGING CLI work

When you used `firebase:use:staging` or ran staging-targeted CLI commands:

1. Run `npm run firebase:use:dev` before returning to normal development.
2. Verify with `npm run firebase:target` — should show `wpf-bible-qizzing` (dev).

## Verify the active target before deploying

Before any deploy or Admin script:

1. `npm run firebase:target` — confirm the CLI project.
2. Confirm `EXPO_PUBLIC_IGNITE_ENV` and `EXPO_PUBLIC_FIREBASE_PROJECT_ID` in the env file you are using.
3. Read the command you are about to run. If it says `prod` or `ignite-prod-01`, stop unless production change is explicitly intended.
4. Diff `firestore.rules` in git against the target environment before deploying. After reconciliation, **`firestore.rules` in this repo is the intended source of truth.** Console-only edits must be copied back into git. CLI `firebase deploy --only firestore:rules` **overwrites** the rules currently deployed in that project.

```bash
npx -y firebase-tools@latest firestore:rules:get --project dev
```

Do not run `firebase deploy` against `prod` as a habit. There is no npm script that deploys production. Production commands must always include `--project prod`.

## Firestore Security Rules

`firestore.rules` in git is the source of truth for rules changes. Current coverage:

- `seasons/{seasonId}` — client read allowed; writes denied
- `seasons/{seasonId}/cards/{cardId}` — client read allowed; writes denied
- `users/{userId}/profile/{profileId}` — authenticated owner read/create of `main`; owner may update only `first_name` and `last_name` (Sprint 2 Phase 6 Edit Name). Deletes denied. Cross-user and unauthenticated access denied.

**Workflow**

1. Edit rules in git (`firestore.rules`), not only in the Firebase Console.
2. Run automated rules tests: `npm run test:firestore-rules` (Firestore emulator + `@firebase/rules-unit-testing`).
3. Deploy to **dev** first: `--project dev` (manual operator step after review).
4. Promote the same git revision to **staging** after DEV verification: `--project staging`
5. Deploy to **prod** only after staging sign-off, with an explicit `--project prod` command.

Console edits without a matching git change will drift from the repo. Deploying from git overwrites whatever is currently in the console for that project.

### Rules unit tests

```bash
npm run test:firestore-rules
```

This starts the local Firestore emulator via `firebase emulators:exec`, then runs `__tests__/firestore-rules/*.rules.test.ts`.

**Prerequisites**
- A Java Runtime (JRE/JDK) on `PATH` — required by the Firestore emulator. Without Java, `npm run test:firestore-rules` fails before tests run.
- `@firebase/rules-unit-testing` (devDependency) and the `emulators.firestore` block in `firebase.json`.

Do not confuse these with application repository mocks — they exercise the real `firestore.rules` file. Main `npm test` excludes `__tests__/firestore-rules/` so unit CI does not require the emulator.

**Phase 4 DEV deploy (manual, after review):**

```bash
npm run firebase:target   # confirm active project is wpf-bible-qizzing (dev)
npx -y firebase-tools@latest deploy --only firestore:rules --project dev
npm run firebase:use:dev  # restore CLI default if needed
```

Do **not** deploy rules to staging or prod as part of ordinary Phase 4 work.

## How backend config/rules are promoted

Promote **reviewed files** from this repo, not live database contents.

```text
dev (validate rules/indexes against synthetic data)
        ↓
staging (same committed firestore.rules / indexes; release-candidate testing)
        ↓
prod (only after staging sign-off and an explicit --project prod command)
```

1. Change `firestore.rules` / `firestore.indexes.json` in git.
2. Deploy to **dev** with `--project dev`. Exercise the app.
3. Deploy the **same git revision** to **staging** with `--project staging`.
4. Production only after staging verification, using `--project prod` and an explicit human confirmation.

Never “fix prod” by deploying a revision that was not tested on staging.

## Firestore data is not copied between environments

Auth users, learning state, and season documents do **not** sync from `wpf-bible-qizzing` to staging or prod. Each project has its own Firestore. Do not export/import production data into development. Do not copy development dumps into production.

## Official season content

Official curriculum uses the committee → validate → import → approve workflow (PRD §50, playbook §9). That is separate from this environment layout. Test seeds (`npm run seed:firestore`) are for **dev** (and only staging if explicitly intended). They are not the production publishing path.

The seed script:

- Requires `EXPO_PUBLIC_IGNITE_ENV`
- Requires the Firebase project ID to match that env
- Prints `environment=` and `project=` before writing
- Allows **dev** and intentionally targeted **staging**
- **Always refuses `prod`.** There is no override flag. Official production season publishing is a separate workflow and must not reuse this script.

## Safeguards against accidental production changes

- No silent production default in the app.
- Project ID must match the named env.
- CLI default alias is `dev`. There is no npm script that switches the persistent default to prod.
- No production deploy npm script.
- Seed always refuses production. There is no override.
- `.env.local` and service-account JSON are gitignored.
- `firestore.rules` must stay aligned with git before any deploy; test on DEV before STAGING/PROD.

If a command or log line shows `prod` / `ignite-prod-01` and you did not mean production, stop.

## Local runbook

**DEV (normal local work)**

1. Copy `.env.dev.example` → `.env.local` and fill the web-app config for `wpf-bible-qizzing`.
2. `npm start`
3. Confirm the Metro log: `environment=dev project=wpf-bible-qizzing`
4. Optional seed: `npm run seed:firestore` (needs Application Default Credentials for that project)

**STAGING**

1. Copy `.env.staging.example` → `.env.local` and fill config for `ignite-staging-01`.
2. `npm start` and confirm `environment=staging project=ignite-staging-01`
3. CLI: `npx -y firebase-tools@latest … --project staging`

**PROD (later, release builds only)**

1. Do not use production as `.env.local` for daily development.
2. Production builds must set `EXPO_PUBLIC_IGNITE_ENV=prod` and the `ignite-prod-01` client config through the release pipeline, not a leftover local file.
3. CLI operations must use `--project prod`. Do not change the persistent CLI default to production. Do not seed production.

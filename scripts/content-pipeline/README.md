# Content pipeline tooling

Firebase-independent developer tooling for Sprint 3 Phase 2A.1.

This is **not** the Firestore seed importer and it does **not** write to Firebase.

## Why ExcelJS exists

`exceljs` is a **devDependency** only. Ignite’s authoring source is a standardized `.xlsx` workbook. ExcelJS reads and writes that format in local Node/`tsx` scripts and CI. `@types/node` (Node 22) is present so the pipeline TypeScript project can typecheck Node `fs`/`crypto` APIs.

It is compatible with this repo because:

- Expo SDK 57 / React Native never import it
- existing developer tooling already runs on Node via `tsx` (`scripts/`)
- no Google Sheets API, credentials, or network access are required

Do not add ExcelJS to the mobile app runtime.

## Commands

```bash
npm run content:validate-source -- --input content/authoring/synthetic
npm run content:generate-package -- --input content/authoring/synthetic --output content/packages
npm run content:validate-package -- --package content/packages/dev-synthetic-s3
npm run content:write-authoring-files
npm run content:typecheck
```

Defaults point at the synthetic DEV dataset. There is no admin UI and no STAGING/PROD write path.

## Flow

```text
Workbook rows → source validation → normalized content IR → package/domain validation
→ canonical generated package + fingerprint + reconciliation report
```

See [`content/authoring/README.md`](../../content/authoring/README.md) and [ADR-013](../../docs/architecture/decisions/ADR-013-content-package-and-authoring-source-boundary.md).

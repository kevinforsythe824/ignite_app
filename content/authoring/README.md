# Ignite MaterialSet authoring

**SYNTHETIC / DEV workbooks in `synthetic/` are NOT official WPF or Board material.**

## Human workflow (no Google API)

1. Copy `templates/ignite-materialset-workbook-v1.xlsx` once per MaterialSet.
2. Maintain the workbook in Google Sheets or any compatible spreadsheet editor.
3. Export / download as Microsoft Excel (`.xlsx`).
4. Place the five independent MaterialSet workbooks in a local folder.
5. Run Ignite content tooling (`npm run content:validate-source`, then `content:generate-package`).
6. Inspect `content/packages/{seasonId}/validation-report.json`.

The pipeline runs locally and in CI without Google credentials or network access.

## What humans enter

Required human fields:

- Season: `seasonId`, `name`, `startDate`, `endDate`, `status`, `sourceVersion`, `schemaVersion`
- MaterialSet: `seasonId`, `materialSetId`, `divisionId`, `displayName`
- Sections: `sectionId`, `title`, `displayOrder`
- Cards: `cardNumber`, `reference`, `verseText`, `sectionId`

Optional human fields: section `description`, card `indexCode`, `tags`, quiz metadata, cross references, annotation `notes`.

Optional technical identifier: `cardId`. If blank, tooling derives `c{cardNumber}`. The same local `cardId` may appear in different MaterialSets. Official committee ID mapping is Phase 2B.

## Generated package is derived

Corrections are made in the workbook, then validated and regenerated. Do not hand-edit `content.json` as source.

Logical content is fingerprinted with SHA-256 over canonical JSON (sorted keys, stable array order). `generatedAt` lives only in `manifest.json` and does not change the fingerprint.

## Annotation targeting (provisional)

Phase 2A.1 supports a synthetic strategy only:

```text
strategy: phraseOccurrence
phrase: "..."
occurrenceIndex: 2
```

The converter resolves `{ start, end }` and keeps the source-target record for audit. It will not silently pick the first match when a phrase repeats.

Synthetic types (`highlight`, `underline`, `keyword`, `uniqueBeginning`, `uniqueEnding`, `frequency`, `crossReference`) are **test vocabulary**. Official committee annotation mapping remains Phase 2B.

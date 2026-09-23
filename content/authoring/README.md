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

Optional human fields: section `description`, card `indexCode`, `tags`, quiz metadata, cross references, annotation `notes`, and annotation `occurrenceIndex` when the exact phrase occurs only once.

Optional technical identifier: `cardId`. If blank, tooling derives `c{cardNumber}`. The same local `cardId` may appear in different MaterialSets. Official committee ID mapping is Phase 2B.

## Generated package is derived

Corrections are made in the workbook, then validated and regenerated. Do not hand-edit `content.json` as source.

Logical content is fingerprinted with SHA-256 over canonical JSON (sorted keys, stable array order). `generatedAt` lives only in `manifest.json` and does not change the fingerprint.

## Annotation targeting (provisional)

Phase 2A.1 supports a synthetic strategy only. On the Annotations sheet, set `strategy` to `phraseOccurrence` and type the exact phrase from the verse.

`occurrenceIndex` is optional when the exact phrase occurs once in the verse. If the phrase occurs more than once, enter the 1-based occurrence number identifying the intended match (1 for the first time it appears, 2 for the second, and so on).

```text
strategy: phraseOccurrence
phrase: "the word"
occurrenceIndex: 2
```

Leave `occurrenceIndex` blank when the phrase appears only once. You do not need to type 1. Workbooks that already contain 1 remain valid. Either way, the generated package records occurrence 1.

The converter resolves `{ start, end }` and keeps that explicit occurrence for audit. It will not guess when a phrase repeats. If the phrase is not in the verse, or the number you enter does not match one of the occurrences, validation fails.

Matching is exact. Capitalization, punctuation, spacing, and quote characters must match the verse. The tool does not normalize or fuzzy-match the phrase.

Synthetic types (`highlight`, `underline`, `keyword`, `uniqueBeginning`, `uniqueEnding`, `frequency`, `crossReference`) are **test vocabulary**. Official committee annotation mapping remains Phase 2B.

## What is committed

The spreadsheet is the human source. A generated package is derived from it. Do not hand-edit `content.json` and treat that as the correction.

| Path | Version control |
|------|-----------------|
| `templates/` and `synthetic/` | Tracked. Synthetic fixtures are **not** official material. |
| `local/` | Not committed. This is where user-maintained official or in-progress workbooks live. |
| `content/packages/dev-synthetic-s3/` | Tracked synthetic package. |
| `content/packages/{real season}/` | Local derived output during this phase. Not committed. |

Official promotion and version-control policy for production content is still a later decision. This tooling does not publish to STAGING or PROD.

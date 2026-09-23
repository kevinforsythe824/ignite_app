# Generated content packages

Derived artifacts. The spreadsheet remains the human source. Edit the authoring workbooks and regenerate — do not treat these JSON files as source.

Phase 2A writes `content.json`, `manifest.json`, and `validation-report.json` under `{seasonId}/`.

`dev-synthetic-s3/` is a tracked synthetic fixture, not official material. Real-season directories (`2027`, `2028`, and so on) are locally generated derived artifacts during this phase and are not committed. Promoting an official package into version control is a later decision.

Nothing here is imported to Firebase. STAGING and PROD publishing are not implemented.

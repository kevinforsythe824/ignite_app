/**
 * @jest-environment node
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadValidatedContentPackage } from '../../scripts/content-import/loadPackage';
import { canonicalize, fingerprintContent, stablePrettyJson } from '../../scripts/content-pipeline/fingerprint';
import { runPipelineFromWorkbooks, validatePackageDirectory } from '../../scripts/content-pipeline/pipeline';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';
import type { ContentPackage, PackageManifest, ValidationIssue } from '../../scripts/content-pipeline/types';
import { validateContentPackage } from '../../scripts/content-pipeline/validatePackage';

function syntheticPackage(): { content: ContentPackage; manifest: PackageManifest } {
  const first = runPipelineFromWorkbooks(buildAllSyntheticWorkbooks(), {
    generatedAt: '2026-10-27T00:00:00.000Z',
  });
  const second = runPipelineFromWorkbooks(buildAllSyntheticWorkbooks(), {
    generatedAt: '2026-10-27T01:00:00.000Z',
  });
  if (!first.content || !first.manifest || !second.content || !second.manifest) {
    throw new Error('expected a synthetic package');
  }
  if (first.manifest.fingerprint !== second.manifest.fingerprint) {
    throw new Error('synthetic fingerprints diverged');
  }
  if (first.manifest.generatedAt === second.manifest.generatedAt) {
    throw new Error('expected generatedAt to stay outside the fingerprint');
  }
  return { content: first.content, manifest: first.manifest };
}

async function writePackage(
  directory: string,
  content: ContentPackage,
  manifest: PackageManifest,
): Promise<void> {
  await writeFile(path.join(directory, 'content.json'), stablePrettyJson(content), 'utf8');
  await writeFile(path.join(directory, 'manifest.json'), stablePrettyJson(manifest), 'utf8');
}

function clonePackage(content: ContentPackage, manifest: PackageManifest): {
  content: ContentPackage;
  manifest: PackageManifest;
} {
  return {
    content: JSON.parse(stablePrettyJson(content)) as ContentPackage,
    manifest: JSON.parse(stablePrettyJson(manifest)) as PackageManifest,
  };
}

describe('package directory manifest consistency', () => {
  it('accepts a five-MaterialSet package and reads the same fingerprint back', async () => {
    const built = syntheticPackage();
    const readBack = JSON.parse(stablePrettyJson(built.content)) as ContentPackage;
    expect(canonicalize(readBack)).toBe(canonicalize(built.content));
    expect(fingerprintContent(readBack)).toBe(built.manifest.fingerprint);

    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-package-ok-'));
    try {
      await writePackage(directory, built.content, built.manifest);
      const validated = await validatePackageDirectory(directory);
      expect(validated.status).toBe('passed');
      expect(validated.report.errors).toEqual([]);
      const loaded = await loadValidatedContentPackage(directory);
      expect(loaded.fingerprint).toBe(built.manifest.fingerprint);
      expect(loaded.content.materialSets).toHaveLength(5);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects manifest fields that disagree with content even when the fingerprint still matches', async () => {
    const built = syntheticPackage();
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-package-manifest-'));
    try {
      const cases: Array<{ label: string; mutate: (manifest: PackageManifest) => void; code: string }> = [
        {
          label: 'season',
          mutate: (manifest) => {
            manifest.seasonId = '1999';
          },
          code: 'manifest_metadata_mismatch',
        },
        {
          label: 'schema',
          mutate: (manifest) => {
            manifest.schemaVersion = '9.9.9';
          },
          code: 'manifest_metadata_mismatch',
        },
        {
          label: 'source version',
          mutate: (manifest) => {
            manifest.sourceVersion = 'not-the-package';
          },
          code: 'manifest_metadata_mismatch',
        },
        {
          label: 'division',
          mutate: (manifest) => {
            const entry = manifest.materialSets[0];
            if (!entry) {
              throw new Error('expected a manifest entry');
            }
            entry.divisionId = entry.divisionId === 'cadet' ? 'junior' : 'cadet';
          },
          code: 'manifest_material_set_mismatch',
        },
        {
          label: 'missing set',
          mutate: (manifest) => {
            manifest.materialSets = manifest.materialSets.slice(0, -1);
          },
          code: 'missing_manifest_material_set',
        },
        {
          label: 'duplicate set',
          mutate: (manifest) => {
            const first = manifest.materialSets[0];
            if (!first) {
              throw new Error('expected a manifest entry');
            }
            manifest.materialSets = [...manifest.materialSets, { ...first }];
          },
          code: 'duplicate_manifest_material_set',
        },
        {
          label: 'unexpected set',
          mutate: (manifest) => {
            const first = manifest.materialSets[0];
            if (!first) {
              throw new Error('expected a manifest entry');
            }
            manifest.materialSets = [
              ...manifest.materialSets,
              { ...first, materialSetId: 'not-in-the-package', divisionId: 'cadet' },
            ];
          },
          code: 'unexpected_manifest_material_set',
        },
        {
          label: 'counts',
          mutate: (manifest) => {
            const entry = manifest.materialSets[0];
            if (!entry) {
              throw new Error('expected a manifest entry');
            }
            entry.sectionCount = 99;
            entry.cardCount = 0;
            entry.annotationCount = 0;
            manifest.cardCounts.total = 1;
          },
          code: 'manifest_count_mismatch',
        },
        {
          label: 'order',
          mutate: (manifest) => {
            manifest.materialSets = [...manifest.materialSets].reverse();
          },
          code: 'manifest_material_set_mismatch',
        },
      ];

      for (const testCase of cases) {
        const copy = clonePackage(built.content, built.manifest);
        testCase.mutate(copy.manifest);
        expect(copy.manifest.fingerprint).toBe(built.manifest.fingerprint);
        await writePackage(directory, copy.content, copy.manifest);
        const validated = await validatePackageDirectory(directory);
        expect(validated.report.errors.some((item) => item.code === testCase.code)).toBe(true);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects a stale fingerprint, missing files, and malformed JSON', async () => {
    const built = syntheticPackage();
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-package-files-'));
    try {
      const stale = clonePackage(built.content, built.manifest);
      stale.manifest.fingerprint = 'a'.repeat(64);
      await writePackage(directory, stale.content, stale.manifest);
      const fingerprint = await validatePackageDirectory(directory);
      expect(fingerprint.report.errors.some((item) => item.code === 'fingerprint_mismatch')).toBe(true);

      await rm(path.join(directory, 'manifest.json'));
      const missingManifest = await validatePackageDirectory(directory);
      expect(missingManifest.report.errors.some((item) => item.code === 'missing_manifest')).toBe(true);

      await writeFile(path.join(directory, 'manifest.json'), '{', 'utf8');
      const malformedManifest = await validatePackageDirectory(directory);
      expect(malformedManifest.report.errors.some((item) => item.code === 'malformed_manifest')).toBe(true);

      await rm(path.join(directory, 'content.json'));
      const missingContent = await validatePackageDirectory(directory);
      expect(missingContent.report.errors).toEqual([
        expect.objectContaining({ code: 'missing_content', field: 'content.json' }),
      ]);

      await writeFile(path.join(directory, 'content.json'), 'not json', 'utf8');
      const malformedContent = await validatePackageDirectory(directory);
      expect(malformedContent.report.errors).toEqual([
        expect.objectContaining({ code: 'malformed_content' }),
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects corrupted targets, duplicate identities, and broken ownership through the directory check', async () => {
    const built = syntheticPackage();
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-package-content-'));
    try {
      const corrupted = clonePackage(built.content, built.manifest);
      const annotated = corrupted.content.materialSets[0]?.cards.find((card) => card.annotations.length > 0);
      const annotation = annotated?.annotations[0];
      if (!annotated || !annotation) {
        throw new Error('expected an annotation');
      }
      annotation.resolvedTarget = { start: 0, end: 1 };
      corrupted.manifest.fingerprint = fingerprintContent(corrupted.content);
      await writePackage(directory, corrupted.content, corrupted.manifest);
      const target = await validatePackageDirectory(directory);
      expect(target.report.errors.some((item) => item.code === 'invalid_annotation_target')).toBe(true);

      const duplicateCard = clonePackage(built.content, built.manifest);
      const materialSet = duplicateCard.content.materialSets[0];
      const first = materialSet?.cards[0];
      const second = materialSet?.cards[1];
      if (!materialSet || !first || !second) {
        throw new Error('expected two cards');
      }
      second.cardId = first.cardId;
      materialSet.sections = materialSet.sections.map((section) => ({
        ...section,
        cardIds: section.cardIds.map((cardId) => (cardId === 'c2' ? first.cardId : cardId)),
      }));
      duplicateCard.manifest.fingerprint = fingerprintContent(duplicateCard.content);
      await writePackage(directory, duplicateCard.content, duplicateCard.manifest);
      const cards = await validatePackageDirectory(directory);
      expect(cards.report.errors.some((item) => item.code === 'duplicate_card_id')).toBe(true);

      const duplicateAnnotation = clonePackage(built.content, built.manifest);
      const host = duplicateAnnotation.content.materialSets[0]?.cards.find((card) => card.annotations.length > 0);
      const existing = host?.annotations[0];
      if (!host || !existing) {
        throw new Error('expected an annotation to duplicate');
      }
      host.annotations = [...host.annotations, { ...existing }];
      duplicateAnnotation.manifest.fingerprint = fingerprintContent(duplicateAnnotation.content);
      await writePackage(directory, duplicateAnnotation.content, duplicateAnnotation.manifest);
      const annotations = await validatePackageDirectory(directory);
      expect(annotations.report.errors.some((item) => item.code === 'duplicate_annotation_id')).toBe(true);

      const ownership = clonePackage(built.content, built.manifest);
      const owned = ownership.content.materialSets[0]?.cards[0];
      if (!owned) {
        throw new Error('expected a card');
      }
      owned.materialSetId = 'someone-else';
      ownership.manifest.fingerprint = fingerprintContent(ownership.content);
      await writePackage(directory, ownership.content, ownership.manifest);
      const owner = await validatePackageDirectory(directory);
      expect(owner.report.errors.some((item) => item.code === 'card_ownership_mismatch')).toBe(true);

      const membership = clonePackage(built.content, built.manifest);
      const member = membership.content.materialSets[0]?.cards[0];
      if (!member) {
        throw new Error('expected a card');
      }
      member.sectionId = 'missing-section';
      membership.manifest.fingerprint = fingerprintContent(membership.content);
      await writePackage(directory, membership.content, membership.manifest);
      const section = await validatePackageDirectory(directory);
      expect(section.report.errors.some((item) => item.code === 'invalid_section')).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function cadetCard(content: ContentPackage, cardId: string) {
  const card = content.materialSets
    .find((item) => item.divisionId === 'cadet')
    ?.cards.find((item) => item.cardId === cardId);
  if (!card) {
    throw new Error(`expected cadet card ${cardId}`);
  }
  return card;
}

function exactReason(reason: string): RegExp {
  return new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

function cadetPhrase(content: ContentPackage, phrase: string): {
  cardId: string;
  annotation: Record<string, unknown>;
  sourceTarget: Record<string, unknown>;
  resolvedTarget: Record<string, unknown>;
} {
  const materialSet = content.materialSets.find((item) => item.divisionId === 'cadet');
  const card = materialSet?.cards.find((item) =>
    item.annotations.some((annotation) => annotation.sourceTarget.phrase === phrase),
  );
  const annotation = card?.annotations.find((item) => item.sourceTarget.phrase === phrase);
  if (!card || !annotation) {
    throw new Error(`expected cadet phrase ${phrase}`);
  }
  const record = annotation as unknown as Record<string, unknown>;
  const sourceTarget = record.sourceTarget;
  const resolvedTarget = record.resolvedTarget;
  if (!sourceTarget || typeof sourceTarget !== 'object' || Array.isArray(sourceTarget)) {
    throw new Error('expected sourceTarget');
  }
  if (!resolvedTarget || typeof resolvedTarget !== 'object' || Array.isArray(resolvedTarget)) {
    throw new Error('expected resolvedTarget');
  }
  return {
    cardId: card.cardId,
    annotation: record,
    sourceTarget: sourceTarget as Record<string, unknown>,
    resolvedTarget: resolvedTarget as Record<string, unknown>,
  };
}

async function expectRecomputedPackageRejected(
  directory: string,
  content: ContentPackage,
  manifest: PackageManifest,
  expected: { code: string; field: string; reason: RegExp; documentShape: boolean },
): Promise<ValidationIssue> {
  manifest.fingerprint = fingerprintContent(content);
  await writePackage(directory, content, manifest);
  const validated = await validatePackageDirectory(directory);
  expect(validated.status).toBe('failed');
  if (expected.documentShape) {
    expect(validated.content).toBeUndefined();
  } else {
    expect(validated.content).toBeDefined();
    expect(validated.report.errors.some((item) => item.code === 'fingerprint_mismatch')).toBe(false);
  }
  const match = validated.report.errors.find(
    (item) => item.code === expected.code && item.field === expected.field,
  );
  expect(match?.reason).toEqual(expect.stringMatching(expected.reason));
  expect(validated.report.errors).toHaveLength(1);
  await expect(loadValidatedContentPackage(directory)).rejects.toThrow(expected.reason);
  if (!match) {
    throw new Error(`missing ${expected.code} ${expected.field}`);
  }
  return match;
}

describe('package validation hardening', () => {
  it('rejects an annotation cardId that does not match its Card when the fingerprint is recomputed', async () => {
    const built = syntheticPackage();
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-annotation-owner-'));
    try {
      const copy = clonePackage(built.content, built.manifest);
      const target = cadetPhrase(copy.content, 'Light');
      target.annotation.cardId = 'not-this-card';
      const error = await expectRecomputedPackageRejected(directory, copy.content, copy.manifest, {
        code: 'annotation_ownership_mismatch',
        field: 'cardId',
        reason: /cardId "not-this-card" does not match containing Card "c1"/,
        documentShape: false,
      });
      expect(error.reason).toContain('not-this-card');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects a missing, non-positive, fractional, or wrong-type occurrenceIndex on a normalized package', async () => {
    const built = syntheticPackage();
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-occurrence-package-'));
    try {
      const cases: Array<{ label: string; value: unknown | 'delete'; reason: RegExp }> = [
        { label: 'missing', value: 'delete', reason: /It is missing/ },
        { label: 'zero', value: 0, reason: /Received 0/ },
        { label: 'negative', value: -1, reason: /Received -1/ },
        { label: 'fractional', value: 1.5, reason: /Received 1\.5/ },
        { label: 'string', value: '1', reason: /Received "1"/ },
        { label: 'null', value: null, reason: /Received null/ },
        { label: 'boolean', value: true, reason: /Received true/ },
      ];
      for (const testCase of cases) {
        const copy = clonePackage(built.content, built.manifest);
        const target = cadetPhrase(copy.content, 'Light');
        if (testCase.value === 'delete') {
          delete target.sourceTarget.occurrenceIndex;
        } else {
          target.sourceTarget.occurrenceIndex = testCase.value;
        }
        await expectRecomputedPackageRejected(directory, copy.content, copy.manifest, {
          code: 'invalid_occurrence_index',
          field: 'occurrenceIndex',
          reason: testCase.reason,
          documentShape: false,
        });
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('keeps a blank authoring occurrenceIndex for one match and rejects that omission on the package', async () => {
    const workbooks = buildAllSyntheticWorkbooks();
    const cadet = workbooks.find((workbook) => workbook.materialSet.divisionId === 'cadet');
    const light = cadet?.annotations.find((annotation) => annotation.phrase === 'Light');
    if (!cadet || !light) {
      throw new Error('expected the unique Light annotation');
    }
    delete light.occurrenceIndex;

    const built = runPipelineFromWorkbooks(workbooks, { generatedAt: '2026-10-27T00:00:00.000Z' });
    expect(built.status).toBe('passed');
    const normalized = built.content?.materialSets
      .find((materialSet) => materialSet.divisionId === 'cadet')
      ?.cards.find((card) => card.cardId === 'c1')
      ?.annotations.find((annotation) => annotation.sourceTarget.phrase === 'Light');
    expect(normalized?.sourceTarget.occurrenceIndex).toBe(1);
    expect(built.content && validateContentPackage(built.content)).toEqual([]);

    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-occurrence-authoring-'));
    try {
      if (!built.content || !built.manifest) {
        throw new Error('expected a normalized package');
      }
      const copy = clonePackage(built.content, built.manifest);
      delete cadetPhrase(copy.content, 'Light').sourceTarget.occurrenceIndex;
      await expectRecomputedPackageRejected(directory, copy.content, copy.manifest, {
        code: 'invalid_occurrence_index',
        field: 'occurrenceIndex',
        reason: /It is missing/,
        documentShape: false,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects malformed nested annotation values with a structured field error and does not throw', async () => {
    const built = syntheticPackage();
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-annotation-shape-'));
    try {
      const cases: Array<{
        label: string;
        field: string;
        reason: RegExp;
        mutate: (content: ContentPackage) => void;
      }> = [
        {
          label: 'null phrase',
          field: 'sourceTarget.phrase',
          reason: /sourceTarget\.phrase must be a string/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').sourceTarget.phrase = null;
          },
        },
        {
          label: 'numeric phrase',
          field: 'sourceTarget.phrase',
          reason: /sourceTarget\.phrase must be a string/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').sourceTarget.phrase = 12;
          },
        },
        {
          label: 'null sourceTarget',
          field: 'sourceTarget',
          reason: /sourceTarget is not an object/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').annotation.sourceTarget = null;
          },
        },
        {
          label: 'missing sourceTarget',
          field: 'sourceTarget',
          reason: /missing sourceTarget/,
          mutate: (content) => {
            delete cadetPhrase(content, 'Light').annotation.sourceTarget;
          },
        },
        {
          label: 'array sourceTarget',
          field: 'sourceTarget',
          reason: /sourceTarget is not an object/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').annotation.sourceTarget = [];
          },
        },
        {
          label: 'null annotation',
          field: 'annotations',
          reason: /must be an object/,
          mutate: (content) => {
            const card = content.materialSets
              .find((item) => item.divisionId === 'cadet')
              ?.cards.find((item) => item.cardId === 'c1');
            card?.annotations.push(null as unknown as (typeof card.annotations)[number]);
          },
        },
        {
          label: 'null resolvedTarget',
          field: 'resolvedTarget',
          reason: /resolvedTarget is not an object/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').annotation.resolvedTarget = null;
          },
        },
        {
          label: 'string start offset',
          field: 'resolvedTarget.start',
          reason: /resolvedTarget\.start must be a non-negative integer offset/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').resolvedTarget.start = '0';
          },
        },
        {
          label: 'null start offset',
          field: 'resolvedTarget.start',
          reason: /resolvedTarget\.start must be a non-negative integer offset/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').resolvedTarget.start = null;
          },
        },
        {
          label: 'negative start offset',
          field: 'resolvedTarget.start',
          reason: /resolvedTarget\.start must be a non-negative integer offset/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').resolvedTarget.start = -1;
          },
        },
        {
          label: 'fractional end offset',
          field: 'resolvedTarget.end',
          reason: /resolvedTarget\.end must be a non-negative integer offset/,
          mutate: (content) => {
            cadetPhrase(content, 'Light').resolvedTarget.end = 1.5;
          },
        },
      ];

      for (const testCase of cases) {
        const copy = clonePackage(built.content, built.manifest);
        testCase.mutate(copy.content);
        expect(() => validateContentPackage(copy.content)).not.toThrow();
        const direct = validateContentPackage(copy.content);
        expect(direct.some((item) => item.field === testCase.field)).toBe(true);
        await expectRecomputedPackageRejected(directory, copy.content, copy.manifest, {
          code: 'malformed_content',
          field: testCase.field,
          reason: testCase.reason,
          documentShape: true,
        });
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects impossible, malformed, missing, and reversed package dates and still ignores optional season dates', async () => {
    const built = syntheticPackage();
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-package-dates-'));
    try {
      const rejected: Array<{
        label: string;
        code: string;
        field: string;
        reason: RegExp;
        mutate: (season: Record<string, unknown>) => void;
      }> = [
        {
          label: 'impossible start',
          code: 'invalid_date',
          field: 'startDate',
          reason: /Season startDate "2027-02-31" is not a real calendar date/,
          mutate: (season) => {
            season.startDate = '2027-02-31';
          },
        },
        {
          label: 'impossible end',
          code: 'invalid_date',
          field: 'endDate',
          reason: /Season endDate "2027-02-31" is not a real calendar date/,
          mutate: (season) => {
            season.endDate = '2027-02-31';
          },
        },
        {
          label: 'non-leap day',
          code: 'invalid_date',
          field: 'startDate',
          reason: /Season startDate "2027-02-29" is not a real calendar date/,
          mutate: (season) => {
            season.startDate = '2027-02-29';
          },
        },
        {
          label: 'malformed start',
          code: 'invalid_date',
          field: 'startDate',
          reason: /Season startDate "2027\/01\/01" must be an ISO calendar date/,
          mutate: (season) => {
            season.startDate = '2027/01/01';
          },
        },
        {
          label: 'numeric start',
          code: 'invalid_date',
          field: 'startDate',
          reason: /Season startDate 20270101 must be an ISO calendar date/,
          mutate: (season) => {
            season.startDate = 20270101;
          },
        },
        {
          label: 'missing start',
          code: 'missing_required_field',
          field: 'startDate',
          reason: /Season startDate is required/,
          mutate: (season) => {
            delete season.startDate;
          },
        },
        {
          label: 'missing end',
          code: 'missing_required_field',
          field: 'endDate',
          reason: /Season endDate is required/,
          mutate: (season) => {
            delete season.endDate;
          },
        },
        {
          label: 'blank start',
          code: 'missing_required_field',
          field: 'startDate',
          reason: /Season startDate is required/,
          mutate: (season) => {
            season.startDate = '   ';
          },
        },
        {
          label: 'reversed',
          code: 'invalid_date_range',
          field: 'endDate',
          reason: /Season endDate 2027-01-01 is before startDate 2027-08-31/,
          mutate: (season) => {
            season.startDate = '2027-08-31';
            season.endDate = '2027-01-01';
          },
        },
      ];

      for (const testCase of rejected) {
        const copy = clonePackage(built.content, built.manifest);
        testCase.mutate(copy.content.season as unknown as Record<string, unknown>);
        await expectRecomputedPackageRejected(directory, copy.content, copy.manifest, {
          code: testCase.code,
          field: testCase.field,
          reason: testCase.reason,
          documentShape: false,
        });
      }

      const equalDates = clonePackage(built.content, built.manifest);
      equalDates.content.season.startDate = '2099-06-01';
      equalDates.content.season.endDate = '2099-06-01';
      equalDates.manifest.fingerprint = fingerprintContent(equalDates.content);
      await writePackage(directory, equalDates.content, equalDates.manifest);
      const equal = await validatePackageDirectory(directory);
      expect(equal.status).toBe('passed');
      expect(equal.report.errors).toEqual([]);

      const optional = clonePackage(built.content, built.manifest);
      const season = optional.content.season as unknown as Record<string, unknown>;
      season.igniteAvailabilityDate = '2027-02-31';
      season.sourceMaterialReleaseDate = '2027-04-31';
      optional.manifest.fingerprint = fingerprintContent(optional.content);
      await writePackage(directory, optional.content, optional.manifest);
      const preserved = await validatePackageDirectory(directory);
      expect(preserved.status).toBe('passed');
      expect(preserved.report.errors).toEqual([]);
      const loaded = await loadValidatedContentPackage(directory);
      expect(loaded.content.season.igniteAvailabilityDate).toBe('2027-02-31');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects numeric, boolean, object, null, missing, and empty verseText on annotated and unannotated Cards', async () => {
    const built = syntheticPackage();
    const annotated = cadetCard(built.content, 'c1');
    const unannotated = cadetCard(built.content, 'c3');
    expect(annotated.annotations.length).toBeGreaterThan(0);
    expect(unannotated.annotations).toEqual([]);

    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-verse-text-'));
    try {
      const samples: Array<{
        label: string;
        value: unknown | 'delete';
        code: string;
        detail: string;
      }> = [
        { label: 'numeric', value: 42, code: 'invalid_verse_text', detail: 'Received 42.' },
        { label: 'boolean', value: true, code: 'invalid_verse_text', detail: 'Received true.' },
        {
          label: 'object',
          value: { text: 'Light' },
          code: 'invalid_verse_text',
          detail: 'Received {"text":"Light"}.',
        },
        { label: 'null', value: null, code: 'missing_required_field', detail: 'Received null.' },
        { label: 'missing', value: 'delete', code: 'missing_required_field', detail: 'It is missing.' },
        { label: 'empty', value: '', code: 'missing_required_field', detail: 'It is empty.' },
      ];
      const cards = [
        { label: 'annotated', cardId: 'c1' },
        { label: 'unannotated', cardId: 'c3' },
      ] as const;

      for (const sample of samples) {
        for (const target of cards) {
          const copy = clonePackage(built.content, built.manifest);
          const card = cadetCard(copy.content, target.cardId) as { verseText?: unknown };
          if (sample.value === 'delete') {
            delete card.verseText;
          } else {
            card.verseText = sample.value;
          }
          const reason = `Card "${target.cardId}" verseText must be a non-empty string. ${sample.detail}`;
          expect(() => validateContentPackage(copy.content)).not.toThrow();
          const direct = validateContentPackage(copy.content);
          expect(direct).toEqual([
            expect.objectContaining({
              severity: 'error',
              code: sample.code,
              field: 'verseText',
              reason,
            }),
          ]);
          await expectRecomputedPackageRejected(directory, copy.content, copy.manifest, {
            code: sample.code,
            field: 'verseText',
            reason: exactReason(reason),
            documentShape: false,
          });
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects whitespace-only verseText on annotated and unannotated Cards', async () => {
    const built = syntheticPackage();
    const annotated = cadetCard(built.content, 'c1');
    const unannotated = cadetCard(built.content, 'c3');
    expect(annotated.annotations.length).toBeGreaterThan(0);
    expect(unannotated.annotations).toEqual([]);

    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-verse-text-blank-'));
    try {
      const samples = [
        { label: 'spaces', value: '   ' },
        { label: 'mixed whitespace', value: '\t \n' },
      ];
      const cards = [
        { label: 'annotated', cardId: 'c1' },
        { label: 'unannotated', cardId: 'c3' },
      ] as const;

      for (const sample of samples) {
        for (const target of cards) {
          const copy = clonePackage(built.content, built.manifest);
          const card = cadetCard(copy.content, target.cardId);
          card.verseText = sample.value;
          const reason = `Card "${target.cardId}" verseText must be a non-empty string. Received ${JSON.stringify(sample.value)}.`;
          expect(() => validateContentPackage(copy.content)).not.toThrow();
          const direct = validateContentPackage(copy.content);
          expect(direct).toEqual([
            expect.objectContaining({
              severity: 'error',
              code: 'invalid_verse_text',
              field: 'verseText',
              reason,
            }),
          ]);
          expect(card.verseText).toBe(sample.value);
          await expectRecomputedPackageRejected(directory, copy.content, copy.manifest, {
            code: 'invalid_verse_text',
            field: 'verseText',
            reason: exactReason(reason),
            documentShape: false,
          });
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('preserves leading and trailing whitespace on meaningful verseText', async () => {
    const built = syntheticPackage();
    const originalAnnotated = cadetCard(built.content, 'c1').verseText;
    expect(cadetCard(built.content, 'c1').annotations.length).toBeGreaterThan(0);
    expect(cadetCard(built.content, 'c3').annotations).toEqual([]);

    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-verse-text-pad-'));
    try {
      const cases: Array<{ cardId: string; verseText: string; shift: number }> = [
        { cardId: 'c3', verseText: ' Light', shift: 0 },
        { cardId: 'c3', verseText: 'Light ', shift: 0 },
        { cardId: 'c1', verseText: ` ${originalAnnotated}`, shift: 1 },
        { cardId: 'c1', verseText: `${originalAnnotated} `, shift: 0 },
      ];

      for (const testCase of cases) {
        const copy = clonePackage(built.content, built.manifest);
        const card = cadetCard(copy.content, testCase.cardId);
        card.verseText = testCase.verseText;
        for (const annotation of card.annotations) {
          annotation.resolvedTarget.start += testCase.shift;
          annotation.resolvedTarget.end += testCase.shift;
        }
        expect(validateContentPackage(copy.content)).toEqual([]);
        expect(card.verseText).toBe(testCase.verseText);
        copy.manifest.fingerprint = fingerprintContent(copy.content);
        await writePackage(directory, copy.content, copy.manifest);
        const validated = await validatePackageDirectory(directory);
        expect(validated.status).toBe('passed');
        expect(validated.report.errors).toEqual([]);
        const loaded = await loadValidatedContentPackage(directory);
        expect(cadetCard(loaded.content, testCase.cardId).verseText).toBe(testCase.verseText);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('accepts nonempty verseText on annotated and unannotated Cards', async () => {
    const built = syntheticPackage();
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-verse-text-ok-'));
    try {
      expect(validateContentPackage(built.content)).toEqual([]);
      await writePackage(directory, built.content, built.manifest);
      const original = await validatePackageDirectory(directory);
      expect(original.status).toBe('passed');
      expect(original.report.errors).toEqual([]);
      const loadedOriginal = await loadValidatedContentPackage(directory);
      expect(loadedOriginal.content.materialSets).toHaveLength(5);
      const loadedAnnotated = cadetCard(loadedOriginal.content, 'c1');
      expect(loadedAnnotated.verseText).toBe(cadetCard(built.content, 'c1').verseText);
      expect(loadedAnnotated.annotations.length).toBeGreaterThan(0);

      const copy = clonePackage(built.content, built.manifest);
      const plain = cadetCard(copy.content, 'c3');
      expect(plain.annotations).toEqual([]);
      plain.verseText = 'Hope remains.';
      expect(validateContentPackage(copy.content)).toEqual([]);
      copy.manifest.fingerprint = fingerprintContent(copy.content);
      await writePackage(directory, copy.content, copy.manifest);
      const replaced = await validatePackageDirectory(directory);
      expect(replaced.status).toBe('passed');
      expect(replaced.report.errors).toEqual([]);
      const loaded = await loadValidatedContentPackage(directory);
      expect(cadetCard(loaded.content, 'c3').verseText).toBe('Hope remains.');
      expect(cadetCard(loaded.content, 'c3').annotations).toEqual([]);
      expect(cadetCard(loaded.content, 'c1').verseText).toBe(cadetCard(built.content, 'c1').verseText);
      expect(cadetCard(loaded.content, 'c1').annotations.length).toBeGreaterThan(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

/**
 * @jest-environment node
 */
import { canonicalize, fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import { convertWorkbooksToPackage } from '../../scripts/content-pipeline/convert';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';
import type { ContentPackage } from '../../scripts/content-pipeline/types';

function syntheticPackage(): ContentPackage {
  const converted = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());
  if (!converted.content) {
    throw new Error(converted.errors.map((item) => item.reason).join('\n'));
  }
  return converted.content;
}

describe('content-pipeline fingerprint', () => {
  it('returns the same hash for the same logical content', () => {
    const content = syntheticPackage();
    expect(fingerprintContent(content)).toBe(fingerprintContent(content));
    expect(fingerprintContent(structuredClone(content))).toBe(fingerprintContent(content));
  });

  it('changes when logical content changes', () => {
    const content = syntheticPackage();
    const mutated = structuredClone(content);
    const card = mutated.materialSets[0]?.cards[0];
    if (!card) {
      throw new Error('expected a synthetic card');
    }
    card.verseText = `${card.verseText} changed`;

    expect(fingerprintContent(mutated)).not.toBe(fingerprintContent(content));
  });

  it('is unchanged by key order and does not hash execution timestamps', () => {
    const content = syntheticPackage();
    const reordered = JSON.parse(canonicalize(content)) as ContentPackage;
    expect(fingerprintContent(reordered)).toBe(fingerprintContent(content));
    expect(canonicalize(content)).not.toContain('generatedAt');
  });

  it('canonical JSON sorts object keys and omits undefined', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ a: undefined, b: 1 })).toBe('{"b":1}');
  });
});

import { cardToParseInput } from '../data/mapFixtureToCard';
import type { Card } from '../domain/card';
import { makeCardKey } from '../domain/card';
import type { VerseSegment } from '../types/verse';
import { parseVerseToSegments } from './parseVerseToSegments';

/** Per-session cache so revisiting a card does not re-parse. */
const segmentCache = new Map<string, VerseSegment[]>();

/** Parse once per season+materialSet+card; subsequent lookups reuse the cached segments. */
export function getVerseSegments(card: Card): VerseSegment[] {
  const cacheKey = makeCardKey(card.seasonId, card.materialSetId, card.cardId);
  const cached = segmentCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const segments = parseVerseToSegments(cardToParseInput(card));
  segmentCache.set(cacheKey, segments);
  return segments;
}

/** Clear when swapping curriculum so stale ids cannot leak across sessions. */
export function clearVerseSegmentCache(): void {
  segmentCache.clear();
}

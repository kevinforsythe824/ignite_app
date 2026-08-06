import type { Verse, VerseSegment } from '../types/verse';
import { parseVerseToSegments } from './parseVerseToSegments';

/** Per-deck-session cache so revisiting a card does not re-parse. */
const segmentCache = new Map<string, VerseSegment[]>();

/** Parse once per verse id; subsequent lookups reuse the cached segments. */
export function getVerseSegments(verse: Verse): VerseSegment[] {
  const cached = segmentCache.get(verse.id);
  if (cached !== undefined) {
    return cached;
  }

  const segments = parseVerseToSegments(verse);
  segmentCache.set(verse.id, segments);
  return segments;
}

/** Clear when swapping decks so stale ids cannot leak across sessions. */
export function clearVerseSegmentCache(): void {
  segmentCache.clear();
}

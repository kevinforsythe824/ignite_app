/**
 * Official Card.annotations → styled runs.
 *
 * Shared by the future Flashcard quote side and the Annotated Scripture List.
 * No session state and no matchedRules. Slice F chooses this path or the legacy
 * parser at the presentation boundary; this function does not.
 *
 * `verseText` is the displayed Scripture. Annotations only format existing
 * characters via half-open offsets (`verseText.slice(start, end)`). This module
 * does not search the verse for a phrase.
 *
 * Invalid annotations are dropped one at a time. They do not throw and they do
 * not invent a span. A frequency annotation with no tier, or a tier outside 1–5,
 * stays uncolored and has no superscript. When two frequency annotations put
 * different tiers on the same characters, every frequency annotation in that
 * conflict is omitted — color and superscript — so neither tier is treated as
 * authoritative. Unsupported types are ignored.
 *
 * A repeated `annotationId` is not a choice among copies. Every record with
 * that id is omitted before frequency indicators are emitted, whether the
 * copies match or disagree about type, span, or tier. Records with no
 * annotationId are independent. The same phrase, span, tier, or ending offset
 * does not make two annotations duplicates.
 *
 * Concatenating run text equals `verseText`. Frequency superscripts are returned
 * separately and are not part of that text.
 */

/** Matches `FrequencyTier` on Card. Kept here so shared code does not import the flashcards feature. */
export const OFFICIAL_FREQUENCY_TIERS = [1, 2, 3, 4, 5] as const;

export type OfficialFrequencyTier = (typeof OFFICIAL_FREQUENCY_TIERS)[number];

export function isOfficialFrequencyTier(value: unknown): value is OfficialFrequencyTier {
  return typeof value === 'number' && (OFFICIAL_FREQUENCY_TIERS as readonly number[]).includes(value);
}

export const OFFICIAL_SCRIPTURE_MARK_TYPES = ['uniqueBeginning', 'uniqueEnding', 'frequency'] as const;

export type OfficialScriptureMarkType = (typeof OFFICIAL_SCRIPTURE_MARK_TYPES)[number];

/**
 * Structural input. `CardAnnotation` and content-package annotation records
 * are assignable. Extra fields are ignored.
 */
export interface OfficialScriptureAnnotationInput {
  annotationId?: string;
  cardId?: string;
  type?: string;
  sourceTarget?: {
    phrase?: string;
  } | null;
  resolvedTarget?: {
    start?: number;
    end?: number;
  } | null;
  frequencyTier?: number;
}

export type OfficialAnnotationDiagnosticCode =
  | 'invalid_verse_text'
  | 'invalid_annotation'
  | 'invalid_annotations'
  | 'wrong_card'
  | 'invalid_span'
  | 'reversed_span'
  | 'zero_length'
  | 'out_of_bounds'
  | 'phrase_mismatch'
  | 'unsupported_type'
  | 'missing_frequency_tier'
  | 'invalid_frequency_tier'
  | 'conflicting_frequency_tiers'
  | 'duplicate_annotation_id';

export interface OfficialAnnotationDiagnostic {
  code: OfficialAnnotationDiagnosticCode;
  annotationId?: string;
  type?: string;
}

export interface OfficialScriptureRun {
  text: string;
  start: number;
  end: number;
  bold: boolean;
  underline: boolean;
  frequencyTier?: OfficialFrequencyTier;
}

/** Presentation-only. `offset` is the annotation end in `verseText`, not an index into a string that contains the numeral. */
export interface OfficialFrequencyIndicator {
  offset: number;
  tier: OfficialFrequencyTier;
  annotationId?: string;
}

export interface OfficialScriptureSegmentation {
  runs: OfficialScriptureRun[];
  indicators: OfficialFrequencyIndicator[];
  diagnostics: OfficialAnnotationDiagnostic[];
  /** Always the input verse, including when every annotation was dropped. */
  canonicalText: string;
}

export interface SegmentOfficialAnnotationsInput {
  verseText: string;
  annotations?: readonly OfficialScriptureAnnotationInput[] | null;
  /** When set, an annotation with a different cardId is dropped. */
  cardId?: string;
}

interface AcceptedAnnotation {
  annotationId?: string;
  type: OfficialScriptureMarkType;
  start: number;
  end: number;
  tier?: OfficialFrequencyTier;
}

function diagnostic(
  code: OfficialAnnotationDiagnosticCode,
  annotationId?: string,
  type?: string,
): OfficialAnnotationDiagnostic {
  return {
    code,
    ...(annotationId === undefined ? {} : { annotationId }),
    ...(type === undefined ? {} : { type }),
  };
}

function plainSegmentation(
  verseText: string,
  diagnostics: readonly OfficialAnnotationDiagnostic[],
): OfficialScriptureSegmentation {
  const runs: OfficialScriptureRun[] =
    verseText.length === 0
      ? []
      : [
          {
            text: verseText,
            start: 0,
            end: verseText.length,
            bold: false,
            underline: false,
          },
        ];

  return {
    runs,
    indicators: [],
    diagnostics: [...diagnostics],
    canonicalText: verseText,
  };
}

function classifyAnnotation(
  value: unknown,
  verseText: string,
  cardId: string | undefined,
): { accepted?: AcceptedAnnotation; diagnostic?: OfficialAnnotationDiagnostic } {
  if (value === null || typeof value !== 'object') {
    return { diagnostic: diagnostic('invalid_annotation') };
  }

  const raw = value as OfficialScriptureAnnotationInput;
  const annotationId = typeof raw.annotationId === 'string' ? raw.annotationId : undefined;
  const type = typeof raw.type === 'string' ? raw.type : undefined;

  if (cardId !== undefined && raw.cardId !== cardId) {
    return { diagnostic: diagnostic('wrong_card', annotationId, type) };
  }

  const span = raw.resolvedTarget;
  const start = span?.start;
  const end = span?.end;
  if (
    span === null ||
    span === undefined ||
    typeof span !== 'object' ||
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    !Number.isInteger(start) ||
    !Number.isInteger(end)
  ) {
    return { diagnostic: diagnostic('invalid_span', annotationId, type) };
  }

  if (end < start) {
    return { diagnostic: diagnostic('reversed_span', annotationId, type) };
  }
  if (end === start) {
    return { diagnostic: diagnostic('zero_length', annotationId, type) };
  }
  if (start < 0 || end > verseText.length) {
    return { diagnostic: diagnostic('out_of_bounds', annotationId, type) };
  }

  const phrase = raw.sourceTarget?.phrase;
  if (phrase !== undefined && phrase !== verseText.slice(start, end)) {
    return { diagnostic: diagnostic('phrase_mismatch', annotationId, type) };
  }

  if (type !== 'uniqueBeginning' && type !== 'uniqueEnding' && type !== 'frequency') {
    return { diagnostic: diagnostic('unsupported_type', annotationId, type) };
  }

  if (type === 'frequency') {
    if (raw.frequencyTier === undefined) {
      return { diagnostic: diagnostic('missing_frequency_tier', annotationId, type) };
    }
    if (!isOfficialFrequencyTier(raw.frequencyTier)) {
      return { diagnostic: diagnostic('invalid_frequency_tier', annotationId, type) };
    }
    return {
      accepted: { annotationId, type, start, end, tier: raw.frequencyTier },
    };
  }

  return { accepted: { annotationId, type, start, end } };
}

function rangesOverlap(left: AcceptedAnnotation, right: AcceptedAnnotation): boolean {
  return left.start < right.end && right.start < left.end;
}

function annotationIdOf(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const annotationId = (value as OfficialScriptureAnnotationInput).annotationId;
  return typeof annotationId === 'string' ? annotationId : undefined;
}

function annotationTypeOf(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const type = (value as OfficialScriptureAnnotationInput).type;
  return typeof type === 'string' ? type : undefined;
}

/** Ids present on more than one input record. Identity is the id, not span or tier. */
function repeatedAnnotationIds(annotations: readonly unknown[]): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const value of annotations) {
    const annotationId = annotationIdOf(value);
    if (annotationId === undefined) {
      continue;
    }
    counts.set(annotationId, (counts.get(annotationId) ?? 0) + 1);
  }

  const repeated = new Set<string>();
  for (const [annotationId, count] of counts) {
    if (count > 1) {
      repeated.add(annotationId);
    }
  }
  return repeated;
}

/**
 * Segments `verseText` by annotation boundaries. Safe to call for every card;
 * there is no module-level cache.
 */
export function segmentOfficialAnnotations(
  input: SegmentOfficialAnnotationsInput,
): OfficialScriptureSegmentation {
  if (typeof input.verseText !== 'string') {
    return plainSegmentation('', [diagnostic('invalid_verse_text')]);
  }

  const verseText = input.verseText;
  const annotations = input.annotations;
  if (annotations == null) {
    return plainSegmentation(verseText, []);
  }
  if (!Array.isArray(annotations)) {
    return plainSegmentation(verseText, [diagnostic('invalid_annotations')]);
  }

  const diagnostics: OfficialAnnotationDiagnostic[] = [];
  const accepted: AcceptedAnnotation[] = [];
  const repeatedIds = repeatedAnnotationIds(annotations);

  for (const value of annotations) {
    const annotationId = annotationIdOf(value);
    if (annotationId !== undefined && repeatedIds.has(annotationId)) {
      diagnostics.push(diagnostic('duplicate_annotation_id', annotationId, annotationTypeOf(value)));
      continue;
    }

    const classified = classifyAnnotation(value, verseText, input.cardId);
    if (classified.diagnostic !== undefined) {
      diagnostics.push(classified.diagnostic);
    }
    if (classified.accepted !== undefined) {
      accepted.push(classified.accepted);
    }
  }

  const conflicted = new Set<AcceptedAnnotation>();
  const frequencies = accepted.filter((item) => item.type === 'frequency');
  for (let index = 0; index < frequencies.length; index += 1) {
    const current = frequencies[index];
    if (current === undefined) {
      continue;
    }
    for (let otherIndex = index + 1; otherIndex < frequencies.length; otherIndex += 1) {
      const other = frequencies[otherIndex];
      if (other === undefined || current.tier === other.tier || !rangesOverlap(current, other)) {
        continue;
      }
      conflicted.add(current);
      conflicted.add(other);
    }
  }

  for (const item of frequencies) {
    if (!conflicted.has(item)) {
      continue;
    }
    diagnostics.push(diagnostic('conflicting_frequency_tiers', item.annotationId, item.type));
  }

  const active = accepted.filter((item) => !conflicted.has(item));
  const boundaries = new Set<number>([0, verseText.length]);
  for (const item of active) {
    boundaries.add(item.start);
    boundaries.add(item.end);
  }

  const points = [...boundaries].sort((left, right) => left - right);
  const runs: OfficialScriptureRun[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (start === undefined || end === undefined || end <= start) {
      continue;
    }

    let bold = false;
    let underline = false;
    let frequencyTier: OfficialFrequencyTier | undefined;
    let suppressFrequency = false;

    for (const item of active) {
      if (item.start > start || end > item.end) {
        continue;
      }
      if (item.type === 'uniqueBeginning') {
        bold = true;
      } else if (item.type === 'uniqueEnding') {
        underline = true;
      } else if (item.tier !== undefined) {
        if (frequencyTier === undefined) {
          frequencyTier = item.tier;
        } else if (frequencyTier !== item.tier) {
          suppressFrequency = true;
        }
      }
    }

    if (suppressFrequency) {
      frequencyTier = undefined;
    }

    runs.push({
      text: verseText.slice(start, end),
      start,
      end,
      bold,
      underline,
      ...(frequencyTier === undefined ? {} : { frequencyTier }),
    });
  }

  const indicators: OfficialFrequencyIndicator[] = active
    .filter((item): item is AcceptedAnnotation & { tier: OfficialFrequencyTier } =>
      item.type === 'frequency' && item.tier !== undefined,
    )
    .map((item) => ({
      offset: item.end,
      tier: item.tier,
      ...(item.annotationId === undefined ? {} : { annotationId: item.annotationId }),
    }))
    .sort(
      (left, right) =>
        left.offset - right.offset || (left.annotationId ?? '').localeCompare(right.annotationId ?? ''),
    );

  return {
    runs,
    indicators,
    diagnostics,
    canonicalText: verseText,
  };
}

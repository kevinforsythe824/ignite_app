import { PHRASE_OCCURRENCE_STRATEGY } from './constants';
import { issue } from './errors';
import type {
  AnnotationSourceTarget,
  ResolvedAnnotationSpan,
  ValidationIssue,
} from './types';

export interface AnnotationTargetResolution {
  resolved?: ResolvedAnnotationSpan;
  error?: ValidationIssue;
}

/**
 * Finds non-overlapping exact (case-sensitive) occurrences of phrase in verseText.
 * Does not silently pick the first match when the phrase appears more than once.
 */
export function findPhraseOccurrences(
  verseText: string,
  phrase: string,
): ResolvedAnnotationSpan[] {
  if (phrase.length === 0) {
    return [];
  }

  const matches: ResolvedAnnotationSpan[] = [];
  let from = 0;
  while (from <= verseText.length - phrase.length) {
    const start = verseText.indexOf(phrase, from);
    if (start === -1) {
      break;
    }
    const end = start + phrase.length;
    matches.push({ start, end });
    from = end;
  }
  return matches;
}

export function resolveAnnotationTarget(input: {
  verseText: string;
  sourceTarget: AnnotationSourceTarget;
  workbook?: string;
  sheet?: string;
  row?: number;
}): AnnotationTargetResolution {
  if (input.sourceTarget.strategy !== PHRASE_OCCURRENCE_STRATEGY) {
    return {
      error: issue({
        code: 'unsupported_annotation_strategy',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: 'strategy',
        reason: `Unsupported annotation target strategy "${String(
          (input.sourceTarget as { strategy?: string }).strategy,
        )}". Phase 2A.1 supports only "${PHRASE_OCCURRENCE_STRATEGY}". Official mapping is Phase 2B.`,
      }),
    };
  }

  const phrase = input.sourceTarget.phrase;
  const occurrenceIndex = input.sourceTarget.occurrenceIndex;
  const matches = findPhraseOccurrences(input.verseText, phrase);

  if (matches.length === 0) {
    return {
      error: issue({
        code: 'unresolved_phrase_target',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: 'phrase',
        reason: `Unresolved phrase target — "${phrase}" does not appear in the verse text.`,
      }),
    };
  }

  if (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 1) {
    return {
      error: issue({
        code:
          matches.length > 1
            ? 'ambiguous_phrase_target'
            : 'invalid_occurrence_index',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: 'occurrenceIndex',
        reason:
          matches.length > 1
            ? `Ambiguous phrase target — "${phrase}" occurs ${matches.length} times; occurrenceIndex must select exactly one match (1-based).`
            : 'occurrenceIndex must be a 1-based integer.',
      }),
    };
  }

  if (occurrenceIndex > matches.length) {
    return {
      error: issue({
        code:
          matches.length > 1
            ? 'ambiguous_phrase_target'
            : 'unresolved_phrase_target',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: 'occurrenceIndex',
        reason:
          matches.length > 1
            ? `Ambiguous phrase target — "${phrase}" occurs ${matches.length} times; occurrenceIndex ${occurrenceIndex} is out of range.`
            : `Unresolved phrase target — "${phrase}" occurs ${matches.length} time(s); occurrenceIndex ${occurrenceIndex} is out of range.`,
      }),
    };
  }

  const resolved = matches[occurrenceIndex - 1];
  if (!resolved) {
    return {
      error: issue({
        code: 'unresolved_phrase_target',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: 'occurrenceIndex',
        reason: `Unresolved phrase target — occurrenceIndex ${occurrenceIndex} could not be resolved.`,
      }),
    };
  }

  return { resolved };
}

import { PHRASE_OCCURRENCE_STRATEGY } from './constants';
import { issue } from './errors';
import type { ResolvedAnnotationSpan, ValidationIssue } from './types';

export interface AnnotationTargetResolution {
  resolved?: ResolvedAnnotationSpan;
  /**
   * Explicit 1-based occurrence used for this match.
   * Set when resolution succeeds. A blank authoring cell for a unique phrase
   * is normalized to 1 so generated packages stay deterministic.
   */
  occurrenceIndex?: number;
  error?: ValidationIssue;
}

/** Spreadsheet input. occurrenceIndex is omitted when the author left the cell blank. */
export interface PhraseOccurrenceResolutionInput {
  strategy: string;
  phrase: string;
  occurrenceIndex?: number;
}

function formatOccurrenceChoices(count: number): string {
  const numbers = Array.from({ length: count }, (_, index) => String(index + 1));
  if (numbers.length <= 1) {
    return numbers[0] ?? '1';
  }
  if (numbers.length === 2) {
    return `${numbers[0]} or ${numbers[1]}`;
  }
  return `${numbers.slice(0, -1).join(', ')}, or ${numbers[numbers.length - 1]}`;
}

function invalidOccurrenceReason(value: number): string {
  if (Number.isNaN(value)) {
    return 'occurrenceIndex must be a whole number of 1 or greater.';
  }
  return `occurrenceIndex must be a whole number of 1 or greater. "${value}" is not valid.`;
}

/**
 * Finds non-overlapping exact (case-sensitive) occurrences of phrase in verseText.
 * Matching is exact: capitalization, punctuation, Unicode, quotes, and whitespace
 * are significant. A blank occurrenceIndex resolves only when there is one match.
 * Repeated phrases are never guessed.
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
  sourceTarget: PhraseOccurrenceResolutionInput;
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

  if (occurrenceIndex === undefined) {
    const onlyMatch = matches[0];
    if (matches.length === 1 && onlyMatch) {
      return { resolved: onlyMatch, occurrenceIndex: 1 };
    }
    return {
      error: issue({
        code: 'ambiguous_phrase_target',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: 'occurrenceIndex',
        reason: `Phrase "${phrase}" occurs ${matches.length} times. Enter occurrenceIndex ${formatOccurrenceChoices(matches.length)}.`,
      }),
    };
  }

  if (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 1) {
    return {
      error: issue({
        code: 'invalid_occurrence_index',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: 'occurrenceIndex',
        reason: invalidOccurrenceReason(occurrenceIndex),
      }),
    };
  }

  if (occurrenceIndex > matches.length) {
    const timesLabel = matches.length === 1 ? 'time' : 'times';
    return {
      error: issue({
        code: matches.length > 1 ? 'ambiguous_phrase_target' : 'unresolved_phrase_target',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: 'occurrenceIndex',
        reason: `Phrase "${phrase}" occurs ${matches.length} ${timesLabel}. occurrenceIndex ${occurrenceIndex} is outside that range. Enter occurrenceIndex ${formatOccurrenceChoices(matches.length)}.`,
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

  return { resolved, occurrenceIndex };
}

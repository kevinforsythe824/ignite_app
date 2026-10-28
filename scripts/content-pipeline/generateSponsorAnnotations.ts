import { PHRASE_OCCURRENCE_STRATEGY } from './constants';
import { issue } from './errors';
import { findPhraseOccurrences, resolveAnnotationTarget } from './resolveAnnotationTarget';
import { SPONSOR_FREQUENCY_SHEET, type SponsorFrequencyWords } from './sponsorFrequencyTypes';
import { SPONSOR_VERSE_LIST_SHEET, type SponsorVerseList, type SponsorVerseListRow } from './sponsorSourceTypes';
import { findWholeWordOccurrences, leadingPunctuationLength, trailingPunctuationLength } from './sponsorWordMatch';
import type { AnnotationRow, ValidationIssue } from './types';

/**
 * Builds AnnotationRows for one sponsor workbook.
 *
 * Unique beginnings and unique endings come from the Verse List. Frequency
 * annotations come from All Frequency Words. Phrases are exact slices of the
 * original verse so the shared phraseOccurrence matcher can resolve them.
 * This module does not rewrite verse text and does not invent a blank phrase.
 */

export type SponsorAnnotationGenerationResult =
  | {
      readonly ok: true;
      readonly annotationsByCardNumber: ReadonlyMap<number, readonly AnnotationRow[]>;
    }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

export function generateSponsorAnnotations(input: {
  verseList: SponsorVerseList;
  frequencyWords: SponsorFrequencyWords;
}): SponsorAnnotationGenerationResult {
  const { verseList, frequencyWords } = input;
  if (verseList.workbookName !== frequencyWords.workbookName) {
    return {
      ok: false,
      errors: [
        issue({
          code: 'workbook_mismatch',
          workbook: verseList.workbookName,
          sheet: SPONSOR_VERSE_LIST_SHEET,
          reason: `Verse List workbook "${verseList.workbookName}" does not match frequency workbook "${frequencyWords.workbookName}".`,
        }),
      ],
    };
  }

  const errors: ValidationIssue[] = [];
  const annotationsByCardNumber = new Map<number, AnnotationRow[]>();
  const cardsByReference = new Map<string, SponsorVerseListRow>();

  for (const row of verseList.rows) {
    if (cardsByReference.has(row.reference)) {
      errors.push(
        located(verseList.workbookName, {
          code: 'duplicate_reference',
          sheet: SPONSOR_VERSE_LIST_SHEET,
          row: row.sourceRow,
          field: 'Reference',
          reason: `Reference "${row.reference}" is already used by another Verse List card.`,
        }),
      );
      continue;
    }
    cardsByReference.set(row.reference, row);

    if (row.uniqueBeginning) {
      const beginning = targetUniqueBeginning(verseList.workbookName, row);
      if ('error' in beginning) {
        errors.push(beginning.error);
      } else {
        pushAnnotation(annotationsByCardNumber, beginning.annotation, verseList.workbookName, errors);
      }
    }
    if (row.uniqueEnding) {
      const ending = targetUniqueEnding(verseList.workbookName, row);
      if ('error' in ending) {
        errors.push(ending.error);
      } else {
        pushAnnotation(annotationsByCardNumber, ending.annotation, verseList.workbookName, errors);
      }
    }
  }

  for (const entry of frequencyWords.entries) {
    let occurrenceTotal = 0;
    for (const reference of entry.references) {
      const card = cardsByReference.get(reference);
      if (!card) {
        errors.push(
          located(verseList.workbookName, {
            code: 'unresolved_frequency_reference',
            sheet: SPONSOR_FREQUENCY_SHEET,
            row: entry.sourceRow,
            field: 'References',
            reason: `Reference "${reference}" for word "${entry.word}" is not a Verse List card.`,
          }),
        );
        continue;
      }

      const spans = findWholeWordOccurrences(card.verseText, entry.word);
      if (spans.length === 0) {
        errors.push(
          located(verseList.workbookName, {
            code: 'frequency_word_not_in_verse',
            sheet: SPONSOR_FREQUENCY_SHEET,
            row: entry.sourceRow,
            field: 'Word',
            reason: `Word "${entry.word}" has no whole-word occurrence in "${reference}".`,
          }),
        );
        continue;
      }

      occurrenceTotal += spans.length;
      for (const span of spans) {
        const phrase = card.verseText.slice(span.start, span.end);
        const exact = findPhraseOccurrences(card.verseText, phrase);
        const matchIndex = exact.findIndex((match) => match.start === span.start && match.end === span.end);
        if (matchIndex === -1 || card.verseText.slice(span.start, span.end) !== phrase) {
          errors.push(
            located(verseList.workbookName, {
              code: 'frequency_target_mismatch',
              sheet: SPONSOR_FREQUENCY_SHEET,
              row: entry.sourceRow,
              field: 'Word',
              reason: `Word "${entry.word}" in "${reference}" could not be reproduced by an exact phrase occurrence.`,
            }),
          );
          continue;
        }

        const occurrenceIndex = matchIndex + 1;
        const resolved = resolveAnnotationTarget({
          verseText: card.verseText,
          sourceTarget: {
            strategy: PHRASE_OCCURRENCE_STRATEGY,
            phrase,
            occurrenceIndex,
          },
          workbook: verseList.workbookName,
          sheet: SPONSOR_FREQUENCY_SHEET,
          row: entry.sourceRow,
        });
        if (
          resolved.error ||
          !resolved.resolved ||
          resolved.resolved.start !== span.start ||
          resolved.resolved.end !== span.end ||
          card.verseText.slice(resolved.resolved.start, resolved.resolved.end) !== phrase
        ) {
          errors.push(
            resolved.error ??
              located(verseList.workbookName, {
                code: 'frequency_target_mismatch',
                sheet: SPONSOR_FREQUENCY_SHEET,
                row: entry.sourceRow,
                field: 'Word',
                reason: `Word "${entry.word}" in "${reference}" could not be reproduced by an exact phrase occurrence.`,
              }),
          );
          continue;
        }

        pushAnnotation(
          annotationsByCardNumber,
          {
            cardNumber: card.seq,
            type: 'frequency',
            strategy: PHRASE_OCCURRENCE_STRATEGY,
            phrase,
            occurrenceIndex,
            frequencyTier: entry.tier,
            sourceRow: entry.sourceRow,
          },
          verseList.workbookName,
          errors,
        );
      }
    }

    if (occurrenceTotal !== entry.occurrences) {
      errors.push(
        located(verseList.workbookName, {
          code: 'frequency_occurrence_mismatch',
          sheet: SPONSOR_FREQUENCY_SHEET,
          row: entry.sourceRow,
          field: 'Occurrences',
          reason: `Word "${entry.word}" has ${occurrenceTotal} whole-word occurrence(s) but Occurrences is ${entry.occurrences}.`,
        }),
      );
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, annotationsByCardNumber };
}

function targetUniqueBeginning(
  workbookName: string,
  row: SponsorVerseListRow,
): { annotation: AnnotationRow } | { error: ValidationIssue } {
  const phrase = row.uniqueBeginning ?? '';
  const matches = findPhraseOccurrences(row.verseText, phrase);
  if (matches.length === 0) {
    return {
      error: located(workbookName, {
        code: 'unresolved_phrase_target',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        row: row.sourceRow,
        field: 'Unique Beginning',
        reason: `Unique Beginning "${phrase}" does not appear in the verse text.`,
      }),
    };
  }
  if (matches.length !== 1) {
    return {
      error: located(workbookName, {
        code: 'repeated_unique_beginning',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        row: row.sourceRow,
        field: 'Unique Beginning',
        reason: `Unique Beginning "${phrase}" occurs ${matches.length} times. Official unique beginnings are a single occurrence.`,
      }),
    };
  }

  const match = matches[0];
  const expectedStart = leadingPunctuationLength(row.verseText);
  if (!match || match.start !== expectedStart || row.verseText.slice(match.start, match.end) !== phrase) {
    return {
      error: located(workbookName, {
        code: 'unique_beginning_position',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        row: row.sourceRow,
        field: 'Unique Beginning',
        reason: `Unique Beginning "${phrase}" does not start at the beginning of the verse after leading punctuation.`,
      }),
    };
  }

  const confirmed = confirmExactTarget(workbookName, row, phrase, 1, 'Unique Beginning');
  if ('error' in confirmed) {
    return confirmed;
  }
  return {
    annotation: boundaryAnnotation(row, 'uniqueBeginning', phrase, 1),
  };
}

function targetUniqueEnding(
  workbookName: string,
  row: SponsorVerseListRow,
): { annotation: AnnotationRow } | { error: ValidationIssue } {
  const phrase = row.uniqueEnding ?? '';
  const matches = findPhraseOccurrences(row.verseText, phrase);
  if (matches.length === 0) {
    return {
      error: located(workbookName, {
        code: 'unresolved_phrase_target',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        row: row.sourceRow,
        field: 'Unique Ending',
        reason: `Unique Ending "${phrase}" does not appear in the verse text.`,
      }),
    };
  }

  const expectedEnd = row.verseText.length - trailingPunctuationLength(row.verseText);
  const matchIndex = matches.findIndex((match) => match.end === expectedEnd);
  const selected = matchIndex === -1 ? undefined : matches[matchIndex];
  const endingsAtSuffix = matches.filter((match) => match.end === expectedEnd);
  if (!selected || endingsAtSuffix.length !== 1 || row.verseText.slice(selected.start, selected.end) !== phrase) {
    return {
      error: located(workbookName, {
        code: 'unique_ending_position',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        row: row.sourceRow,
        field: 'Unique Ending',
        reason: `Unique Ending "${phrase}" has no exact occurrence ending at the verse suffix.`,
      }),
    };
  }

  const occurrenceIndex = matchIndex + 1;
  const confirmed = confirmExactTarget(workbookName, row, phrase, occurrenceIndex, 'Unique Ending');
  if ('error' in confirmed) {
    return confirmed;
  }
  return {
    annotation: boundaryAnnotation(row, 'uniqueEnding', phrase, occurrenceIndex),
  };
}

function confirmExactTarget(
  workbookName: string,
  row: SponsorVerseListRow,
  phrase: string,
  occurrenceIndex: number,
  field: 'Unique Beginning' | 'Unique Ending',
): { ok: true } | { error: ValidationIssue } {
  const resolved = resolveAnnotationTarget({
    verseText: row.verseText,
    sourceTarget: {
      strategy: PHRASE_OCCURRENCE_STRATEGY,
      phrase,
      occurrenceIndex,
    },
    workbook: workbookName,
    sheet: SPONSOR_VERSE_LIST_SHEET,
    row: row.sourceRow,
  });
  if (
    resolved.error ||
    !resolved.resolved ||
    row.verseText.slice(resolved.resolved.start, resolved.resolved.end) !== phrase
  ) {
    return {
      error:
        resolved.error ??
        located(workbookName, {
          code: 'unresolved_phrase_target',
          sheet: SPONSOR_VERSE_LIST_SHEET,
          row: row.sourceRow,
          field,
          reason: `${field} "${phrase}" could not be reproduced by an exact phrase occurrence.`,
        }),
    };
  }
  return { ok: true };
}

function boundaryAnnotation(
  row: SponsorVerseListRow,
  type: 'uniqueBeginning' | 'uniqueEnding',
  phrase: string,
  occurrenceIndex: number,
): AnnotationRow {
  return {
    cardNumber: row.seq,
    type,
    strategy: PHRASE_OCCURRENCE_STRATEGY,
    phrase,
    occurrenceIndex,
    sourceRow: row.sourceRow,
  };
}

function pushAnnotation(
  annotationsByCardNumber: Map<number, AnnotationRow[]>,
  annotation: AnnotationRow,
  workbookName: string,
  errors: ValidationIssue[],
): void {
  const cardNumber = annotation.cardNumber;
  if (cardNumber === undefined) {
    errors.push(
      located(workbookName, {
        code: 'missing_annotation_card',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        row: annotation.sourceRow,
        field: 'cardNumber',
        reason: 'Annotation is missing a card number.',
      }),
    );
    return;
  }

  const key = [annotation.type, annotation.strategy, annotation.phrase ?? '', String(annotation.occurrenceIndex)].join(
    '\u001f',
  );
  const existing = annotationsByCardNumber.get(cardNumber) ?? [];
  if (
    existing.some(
      (item) =>
        [item.type, item.strategy, item.phrase ?? '', String(item.occurrenceIndex)].join('\u001f') === key,
    )
  ) {
    errors.push(
      located(workbookName, {
        code: 'duplicate_annotation',
        sheet: annotation.type === 'frequency' ? SPONSOR_FREQUENCY_SHEET : SPONSOR_VERSE_LIST_SHEET,
        row: annotation.sourceRow,
        field: annotation.type === 'frequency' ? 'Word' : annotation.type,
        reason: `Card ${cardNumber} already has a ${annotation.type} annotation for "${annotation.phrase ?? ''}" at occurrence ${String(annotation.occurrenceIndex)}.`,
      }),
    );
    return;
  }
  existing.push(annotation);
  annotationsByCardNumber.set(cardNumber, existing);
}

function located(
  workbookName: string | undefined,
  partial: { code: string; reason: string; sheet: string; row?: number; field?: string },
): ValidationIssue {
  return issue({
    code: partial.code,
    reason: partial.reason,
    workbook: workbookName,
    sheet: partial.sheet,
    row: partial.row,
    field: partial.field,
  });
}

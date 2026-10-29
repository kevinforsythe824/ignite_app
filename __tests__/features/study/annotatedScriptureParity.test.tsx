import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import type { Card, CardAnnotation } from '../../../src/features/flashcards/domain/card';
import { AnnotatedScriptureVerse } from '../../../src/features/study/components/AnnotatedScriptureVerse';
import { OfficialScriptureText } from '../../../src/shared/scripture';
import { FREQUENCY_SUPERSCRIPT_GLYPH } from '../../../src/shared/scripture/officialFrequencyStyle';
import { officialFrequencyTextColor } from '../../../src/shared/scripture/officialFrequencyStyle';
import {
  officialAnnotation,
  officialAnnotationWithTier,
  officialStudyCard,
} from '../../../test-utils/officialFlashcardFixtures';

function studyCard(verseText: string, annotations: CardAnnotation[], cardId = 'parity'): Card {
  return officialStudyCard({
    cardId,
    reference: 'Test 1:1',
    verseText,
    annotations,
  });
}

function runSignature(text: string) {
  const node = screen.getAllByTestId('scripture-run').find((item) => item.props.children === text);
  if (!node) {
    throw new Error(`missing scripture run of length ${text.length}`);
  }
  return StyleSheet.flatten(node.props.style);
}

async function renderSurface(card: Card, surface: 'list' | 'direct') {
  if (surface === 'list') {
    return render(<AnnotatedScriptureVerse card={card} />);
  }
  return render(
    <OfficialScriptureText
      verseText={card.verseText}
      annotations={card.annotations}
      cardId={card.cardId}
    />,
  );
}

async function expectSameScripture(card: Card): Promise<void> {
  for (const surface of ['list', 'direct'] as const) {
    const view = await renderSurface(card, surface);
    const scripture = screen.getByTestId('official-scripture-text');
    expect(scripture.props.accessibilityLabel).toBe(card.verseText);
    const joined = screen
      .getAllByTestId('scripture-run')
      .map((node) => node.props.children)
      .join('');
    expect(joined).toBe(card.verseText);
    expect(scripture.props.accessibilityLabel).not.toContain(FREQUENCY_SUPERSCRIPT_GLYPH[1]);
    await view.unmount();
  }
}

describe('annotated scripture annotation parity', () => {
  it('matches OfficialScriptureText for a unique beginning and a unique ending', async () => {
    const beginning = studyCard('Alpha walks.', [
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'beg',
        type: 'uniqueBeginning',
        start: 0,
        end: 5,
      }),
    ]);
    const ending = studyCard('Alpha walks.', [
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'end',
        type: 'uniqueEnding',
        start: 6,
        end: 11,
      }),
    ]);

    const beginningSignatures = [];
    for (const surface of ['list', 'direct'] as const) {
      const view = await renderSurface(beginning, surface);
      beginningSignatures.push({
        alpha: runSignature('Alpha'),
        rest: runSignature(' walks.'),
      });
      await view.unmount();
    }
    expect(beginningSignatures[0]).toEqual(beginningSignatures[1]);
    expect(beginningSignatures[0]?.alpha.fontWeight).toBe('700');
    expect(beginningSignatures[0]?.rest.fontWeight).toBe('400');
    expect(beginningSignatures[0]?.rest.textDecorationLine).not.toBe('underline');

    const endingSignatures = [];
    for (const surface of ['list', 'direct'] as const) {
      const view = await renderSurface(ending, surface);
      endingSignatures.push({
        walks: runSignature('walks'),
        lead: runSignature('Alpha '),
      });
      await view.unmount();
    }
    expect(endingSignatures[0]).toEqual(endingSignatures[1]);
    expect(endingSignatures[0]?.walks.textDecorationLine).toBe('underline');
    expect(endingSignatures[0]?.lead.textDecorationLine).not.toBe('underline');
  });

  it('matches all five frequency tiers and multiple frequencies', async () => {
    for (const tier of [1, 2, 3, 4, 5] as const) {
      const card = studyCard('Alpha walks.', [
        officialAnnotation({
          cardId: 'parity',
          annotationId: `freq-${tier}`,
          type: 'frequency',
          start: 6,
          end: 11,
          frequencyTier: tier,
        }),
      ]);
      const signatures = [];
      for (const surface of ['list', 'direct'] as const) {
        const view = await renderSurface(card, surface);
        const indicator = screen.getByTestId('scripture-frequency-indicator', {
          includeHiddenElements: true,
        });
        signatures.push({
          walks: runSignature('walks'),
          glyph: indicator.props.children,
          indicatorStyle: StyleSheet.flatten(indicator.props.style),
          accessible: indicator.props.accessible,
        });
        await view.unmount();
      }
      expect(signatures[0]).toEqual(signatures[1]);
      expect(signatures[0]?.walks.color).toBe(officialFrequencyTextColor[tier]);
      expect(signatures[0]?.glyph).toBe(FREQUENCY_SUPERSCRIPT_GLYPH[tier]);
      expect(signatures[0]?.accessible).toBe(false);
    }

    const multiple = studyCard('Alpha walks.', [
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'freq-a',
        type: 'frequency',
        start: 0,
        end: 5,
        frequencyTier: 1,
      }),
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'freq-b',
        type: 'frequency',
        start: 6,
        end: 11,
        frequencyTier: 5,
      }),
    ]);
    await expectSameScripture(multiple);
    const multipleView = await renderSurface(multiple, 'list');
    expect(screen.getAllByTestId('scripture-frequency-indicator', { includeHiddenElements: true })).toHaveLength(2);
    expect(runSignature('Alpha').color).toBe(officialFrequencyTextColor[1]);
    expect(runSignature('walks').color).toBe(officialFrequencyTextColor[5]);
    await multipleView.unmount();
  });

  it('matches an overlapping structural mark and frequency, and targets one occurrence', async () => {
    const overlap = studyCard('Alpha walks.', [
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'beg',
        type: 'uniqueBeginning',
        start: 0,
        end: 5,
      }),
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'freq',
        type: 'frequency',
        start: 0,
        end: 5,
        frequencyTier: 2,
      }),
    ]);
    const signatures = [];
    for (const surface of ['list', 'direct'] as const) {
      const view = await renderSurface(overlap, surface);
      signatures.push(runSignature('Alpha'));
      await view.unmount();
    }
    expect(signatures[0]).toEqual(signatures[1]);
    expect(signatures[0]?.fontWeight).toBe('700');
    expect(signatures[0]?.color).toBe(officialFrequencyTextColor[2]);

    const targeted = studyCard('Alpha and Alpha.', [
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'second',
        type: 'uniqueBeginning',
        start: 10,
        end: 15,
      }),
    ]);
    const targetedView = await renderSurface(targeted, 'list');
    const runs = screen.getAllByTestId('scripture-run');
    const lead = runs.find((node) => node.props.children === 'Alpha and ');
    const marked = runs.find((node) => node.props.children === 'Alpha');
    expect(StyleSheet.flatten(lead?.props.style).fontWeight).toBe('400');
    expect(StyleSheet.flatten(marked?.props.style).fontWeight).toBe('700');
    expect(screen.getByLabelText('Alpha and Alpha.').props.accessibilityLabel).toBe('Alpha and Alpha.');
    await targetedView.unmount();
  });

  it('preserves canonical text when annotations are duplicated, malformed, unsupported, or empty', async () => {
    const verse = 'Alpha walks.';
    const duplicate = studyCard(verse, [
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'same',
        type: 'uniqueBeginning',
        start: 0,
        end: 5,
      }),
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'same',
        type: 'uniqueEnding',
        start: 6,
        end: 11,
      }),
    ]);
    const malformed = studyCard(verse, [
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'bad-span',
        type: 'uniqueBeginning',
        start: 0,
        end: 80,
      }),
    ]);
    const unsupported = studyCard(verse, [
      officialAnnotation({
        cardId: 'parity',
        annotationId: 'highlight',
        type: 'highlight',
        start: 0,
        end: 5,
      }),
    ]);
    const missingTier = studyCard(verse, [
      officialAnnotationWithTier(
        {
          cardId: 'parity',
          annotationId: 'tier',
          type: 'frequency',
          start: 0,
          end: 5,
        },
        9,
      ),
    ]);
    const empty = studyCard(verse, []);

    for (const card of [duplicate, malformed, unsupported, missingTier, empty]) {
      await expectSameScripture(card);
      const view = await renderSurface(card, 'list');
      expect(runSignature(verse).fontWeight).toBe('400');
      expect(screen.queryByTestId('scripture-frequency-indicator', { includeHiddenElements: true })).toBeNull();
      expect(screen.queryByTestId('rich-verse-text')).toBeNull();
      await view.unmount();
    }
  });
});
